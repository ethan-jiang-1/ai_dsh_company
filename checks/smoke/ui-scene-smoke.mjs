#!/usr/bin/env node
// 状态：常驻
// ui-scene 冒烟：**自起观察窗** → 真浏览器跑完整公司页签扫（含浏览器错误环）→ 成功/失败都留证。
// 何时跑：client 面改动后、呈现给用户前、或用户报「页面某个面板不对」要复现时。
//   成本 keyless（boot ~10–30s + cdp-probe ~15s）；前置 = client/前端已构建 + dev 模式有 company profile
//   （`pnpm company` 首跑建；`--isolated` 自建临时 profile，不依赖 dev home）。
//   `--keep` 保留实例与他人接着看；`--ask` 透传给 cdp-probe（真模型一次调用，会建测试会话）。
//   `--steps <file>` 透传给 cdp-probe（受控动作：clickText / waitText / expectText / typeText）。
//   `--lang en`（必须配 --isolated）：隔离 home 写 locale.preference=en，跑 9 页签并断言无中文残留；不与 zh 金样同跑。
//   `--isolated`：官方 web 模板建临时 `company` profile + `plugin add <pack 目录>`（link）再起
//   （不读 dev 盘，也不读用户 OS 默认 workspace；`.dsh-company/` 由 host 首启自举，文本确定）。
//   `--expected` / `--refresh-expected`：与 `snapshots/visual/company-shell/ui.expected.json` 比对/更新
//   （必须配 --isolated；金样只覆盖无会话的公司壳，会话数据面归 keyless 渲染 spec）。
//
// 为什么需要它（R3-04 + 六维 D5）：cdp-probe 只能在「你手动起好的实例 + 手抄 token URL」上跑；
//   replay --ui 的金样场景已随真实证据移出产品仓。本脚本把**起实例 + 断言 + 证据**收成一条命令；
//   断言本体复用 cdp-probe（页签清单从注册源解析、错误环、失败截图），不另写第二套。
//
// 退出码：0 = 页面断言（及金样）全绿；1 = 断言/金样失败；2 = 环境未就绪（未登录/构建缺失/参数不符）。
// 证据：failure → runtime/harness-home/diagnosis/cdp-probe-<ts>/；success 带 --evidence 同样落盘；
//   web stdout/stderr + 场景回执 → runtime/harness-home/diagnosis/ui-scene-smoke-<ts>/{web.log,scene.json}。
import { spawn, spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { startWeb } from '../../tools/lib/probe-web.mjs'
import { requireDevHome } from '../../tools/lib/runtime-home.mjs'
import { diagnosisDir } from '../../tools/lib/diagnosis.mjs'
import { buildGolden, compareGolden, firstTextDiff } from '../../tools/lib/ui-expected.mjs'

const args = process.argv.slice(2)
const KEEP = args.includes('--keep')
const ISOLATED = args.includes('--isolated')
const EXPECTED = args.includes('--expected')
const REFRESH_EXPECTED = args.includes('--refresh-expected')
const langIndex = args.indexOf('--lang')
const LANG = langIndex === -1 ? 'zh' : (args[langIndex + 1] ?? '')
const askIndex = args.indexOf('--ask')
const ASK = askIndex === -1 ? undefined : (args[askIndex + 1] ?? '用一句话自报角色与职责。')
const stepsIndex = args.indexOf('--steps')
const STEPS = stepsIndex === -1 ? undefined : args[stepsIndex + 1]
if (stepsIndex !== -1 && (STEPS === undefined || STEPS.startsWith('--'))) {
  console.error('ui-scene-smoke: --steps 需要一个 JSON 文件路径')
  process.exit(2)
}
const EXPECTED_PATH = join(ROOT, 'snapshots/visual/company-shell/ui.expected.json')

if ((EXPECTED || REFRESH_EXPECTED) && !ISOLATED) {
  console.error('ui-scene-smoke: --expected/--refresh-expected 必须配 --isolated（隔离盘才能保证每页签文本确定）。')
  process.exit(2)
}
if (EXPECTED && REFRESH_EXPECTED) {
  console.error('ui-scene-smoke: --expected 与 --refresh-expected 只能二选一。')
  process.exit(2)
}
if (LANG !== 'zh' && LANG !== 'en') {
  console.error('ui-scene-smoke: --lang 只认 zh / en')
  process.exit(2)
}
if (LANG === 'en' && !ISOLATED) {
  console.error('ui-scene-smoke: --lang en 必须配 --isolated（英文页面检查不能污染日用 home）')
  process.exit(2)
}
if (LANG === 'en' && (EXPECTED || REFRESH_EXPECTED)) {
  console.error('ui-scene-smoke: 金样是 zh；--lang en 走独立「无中文残留」检查，不跑 --expected')
  process.exit(2)
}

const redact = text => String(text ?? '').replace(/([?&]token=)[^\s&"'<>]+/g, '$1<redacted>')

/** 隔离场景的临时根（runtime/tmp 下，gitignored；--keep 保留）。 */
let isolatedRoot
let isolatedEnv
/** 预置失败时先回收临时根再退出：否则失败的隔离盘会留在 runtime/tmp 里被其他门禁扫到。 */
const failSetup = (message) => {
  console.error(message)
  if (isolatedRoot !== undefined) rmSync(isolatedRoot, { recursive: true, force: true })
  process.exit(2)
}
if (ISOLATED) {
  mkdirSync(join(ROOT, 'runtime/tmp'), { recursive: true })
  isolatedRoot = mkdtempSync(join(ROOT, 'runtime/tmp/ui-scene-'))
  const home = join(isolatedRoot, 'home')
  const userHome = join(isolatedRoot, 'user')
  const company = join(home, 'company-workspace')
  const cli = join(ROOT, 'vendor/dsh/apps/cli/lib/bin.js')
  if (!existsSync(cli)) {
    failSetup(`ui-scene-smoke: vendor CLI 未构建：${cli}（先按 docs/guides/bootstrap.md 构建）`)
  }
  if (!existsSync(join(ROOT, 'packages/company-pack/lib/client.js'))) {
    failSetup('ui-scene-smoke: pack client 未构建（packages/company-pack/lib/client.js 缺失）——先按 bootstrap 跑 tsc -b + tsdown')
  }
  mkdirSync(userHome, { recursive: true })
  mkdirSync(company, { recursive: true })
  const provisionEnv = { ...process.env, HOME: userHome, DSH_HOME: home, DSH_COMPANY_BROWSER: 'off' }
  const errorHint = (text) => {
    const lines = String(text ?? '').trim().split('\n')
    return lines.find(line => /Cannot find module|ENOENT|Error:/.test(line)) ?? lines[0] ?? ''
  }
  // 隔离 home 走产品同形路径：官方 web 模板建 profile → `plugin add <pack 目录>`（link）→ boot。
  // 不再依赖已删除的独立启动器；v3 起 content/ 由 host 首启自举，不复制骨架。
  const init = spawnSync(process.execPath, [
    cli, '--profile', 'company', '--from-default-profile', 'web', '--dump-default-config',
  ], { cwd: ROOT, env: provisionEnv, encoding: 'utf8', timeout: 180_000 })
  if (init.status !== 0) {
    failSetup(`ui-scene-smoke: 隔离 profile 初始化失败（exit ${String(init.status)}）：${errorHint(init.stderr)}`)
  }
  const added = spawnSync(process.execPath, [
    cli, 'plugin', '--profile', 'company', 'add', join(ROOT, 'packages/company-pack'),
  ], { cwd: ROOT, env: provisionEnv, encoding: 'utf8', timeout: 180_000 })
  if (added.status !== 0) {
    failSetup(`ui-scene-smoke: 隔离 profile 安装 pack 失败（exit ${String(added.status)}）：${errorHint(added.stderr)}`)
  }
  // 空公司盘也要有可读的 records 目录；否则培养面板把“目录缺失”渲染成“尚未读到”，不是空态。
  // 状态根 = `.dsh-company/`（v3）；host 首启按 if-missing 落其余骨架。
  mkdirSync(join(company, '.dsh-company/cultivation/records'), { recursive: true })
  // 真隔离：不读用户 OS Documents 下的默认 workspace（那是真人的盘，既会泄数据也会让金样漂）。
  // 预置 workspace registry，把 defaultWorkspaceId 指到隔离公司盘；app 首启就不会去建 OS 默认盘。
  const workspaceId = randomUUID()
  const now = new Date().toISOString()
  mkdirSync(join(home, 'storages'), { recursive: true })
  writeFileSync(join(home, 'storages/workspace.json'), `${JSON.stringify({
    unit: { name: 'workspace', version: 2 },
    global: {
      initialized: true,
      workspaceIds: [workspaceId],
      archivedSessionIds: [],
      pinnedSessionIds: [],
      defaultWorkspaceId: workspaceId,
    },
    tables: {
      workspaces: {
        [workspaceId]: {
          path: company,
          title: 'company-workspace',
          sessionIds: [],
          createdAt: now,
          updatedAt: now,
        },
      },
    },
  }, null, 2)}\n`, 'utf8')
  // 不覆盖 HOME：真浏览器探针要按 homedir() 找 playwright 缓存；隔离只针对 DSH/公司状态。
  // English page check: Home user-settings override the bundle default zh.
  // The locale row is a per-home cordis.patch.yml layer; it does not change the committed pack.
  if (LANG === 'en') {
    writeFileSync(join(home, 'cordis.patch.yml'), '- id: locale\n  config:\n    preference: en\n', 'utf8')
  }
  isolatedEnv = {
    ...process.env,
    DSH_HOME: home,
    DSH_COMPANY_HOME: company,
    DSH_COMPANY_BOOTSTRAP: 'if-missing',
    DSH_COMPANY_BROWSER: 'off',
  }
  console.log(`ui-scene-smoke: 隔离场景 ${isolatedRoot}（官方模板 profile + pack link + 空公司盘；不读 dev home）`)
}

let home
if (ISOLATED) {
  home = isolatedEnv.DSH_HOME
} else {
  try {
    home = requireDevHome('ui-scene-smoke')
  } catch (error) {
    console.error(error.message)
    process.exit(2)
  }
}

let webOutput = ''
const web = await startWeb({
  spawn,
  root: ROOT,
  home,
  env: isolatedEnv ?? process.env,
  // 产品入口 = `dsh --profile company`；不传 profile 会 boot `web`，页面就没有公司页签。
  profile: 'company',
  port: 0,
  onOutput: text => { webOutput += text },
}).catch(error => {
  const dir = diagnosisDir(ROOT, 'ui-scene-smoke')
  writeFileSync(join(dir, 'web.log'), redact(webOutput), 'utf8')
  console.error(`ui-scene-smoke: 起观察窗失败（${String(error?.message ?? error)}）——先按 docs/guides/bootstrap.md 构建；web.log = ${join(dir, 'web.log')}`)
  process.exit(2)
})
const url = `${web.base}/?token=${web.token}`
console.log(`ui-scene-smoke: 实例 ${web.base}（home = ${home}）`)
if (KEEP) console.log(`ui-scene-smoke: --keep 实例 ${url}（token 在 URL 中；勿入 git）`)

const receiptDir = diagnosisDir(ROOT, 'ui-scene-smoke')

/** 跑 cdp-probe 子进程，逐行转发输出，返回 {code, output}。 */
function runProbe(jsonOut) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [
      join(ROOT, 'probes/browser-visual/cdp-probe.mjs'), url, '--evidence',
      ...(jsonOut === undefined ? [] : ['--texts', '--json-out', jsonOut]),
      ...(ASK === undefined ? [] : ['--ask', ASK]),
      ...(STEPS === undefined ? [] : ['--steps', STEPS]),
      ...(LANG === 'zh' ? [] : ['--lang', LANG]),
    ], { cwd: ROOT, env: isolatedEnv ?? process.env, stdio: ['ignore', 'pipe', 'pipe'] })
    let output = ''
    const onData = (chunk) => {
      const text = String(chunk)
      output = `${output}${text}`.slice(-24_000)
      process.stderr.write(text)
    }
    child.stdout.on('data', onData)
    child.stderr.on('data', onData)
    child.on('exit', code => { resolve({ code: code ?? 1, output }) })
    child.once('error', error => { resolve({ code: 1, output: String(error) }) })
  })
}

function stopWeb() {
  if (KEEP) return
  try { web.child.kill('SIGTERM') } catch { /* 已退出 */ }
}

const verdictPath = join(tmpdir(), `ui-scene-verdict-${String(process.pid)}.json`)
let code = 1
let output = ''
let verdict = null
try {
  const wantVerdict = EXPECTED || REFRESH_EXPECTED || LANG === 'en'
  const result = await runProbe(wantVerdict ? verdictPath : undefined)
  code = result.code
  output = result.output
  if (wantVerdict) {
    try { verdict = JSON.parse(readFileSync(verdictPath, 'utf8')) } catch { verdict = null }
  }
} finally {
  stopWeb()
  if (!KEEP && isolatedRoot !== undefined) rmSync(isolatedRoot, { recursive: true, force: true })
  try { rmSync(verdictPath, { force: true }) } catch { /* 不存在 */ }
  writeFileSync(join(receiptDir, 'web.log'), redact(webOutput), 'utf8')
}

/** 场景回执（诊断区，供后续 agent 发现）；golden 结果必须在比对之后才算数。 */
function writeReceipt(extra = {}) {
  const receipt = {
    scene: 'company-shell',
    mode: ISOLATED ? 'isolated' : 'dev-home',
    goldenMode: EXPECTED ? 'compare' : REFRESH_EXPECTED ? 'refresh' : 'off',
    goldenResult: 'not-run',
    url,
    probeExit: code,
    at: new Date().toISOString(),
    evidence: /证据目录 = (.+)/.exec(output)?.[1]?.trim() ?? null,
    webLog: join(receiptDir, 'web.log'),
    ...extra,
  }
  writeFileSync(join(receiptDir, 'scene.json'), JSON.stringify(receipt, null, 2), 'utf8')
  console.log(`ui-scene-smoke: 场景回执 = ${receiptDir}`)
}

if (code === 2) {
  writeReceipt()
  console.error('ui-scene-smoke: 环境未就绪（cdp-probe exit 2——未登录/未配凭据/构建缺失），不是页面断言失败。')
  process.exit(2)
}
if (code !== 0) {
  const evidence = /证据目录 = (.+)/.exec(output)?.[1]?.trim()
  writeReceipt()
  console.error(`ui-scene-smoke: FAIL（真实页面断言失败${evidence === undefined ? '' : `；证据 = ${evidence}`}）`)
  process.exit(1)
}

if (REFRESH_EXPECTED) {
  if (verdict === null || typeof verdict.tabTexts !== 'object') {
    writeReceipt({ goldenResult: 'fail' })
    console.error('ui-scene-smoke: --refresh-expected 拿不到逐页签文本（cdp-probe verdict 缺 tabTexts）。')
    process.exit(1)
  }
  const golden = buildGolden({ catalog: verdict.catalog, tabTexts: verdict.tabTexts })
  mkdirSync(join(ROOT, 'snapshots/visual/company-shell'), { recursive: true })
  writeFileSync(EXPECTED_PATH, `${JSON.stringify(golden, null, 2)}\n`, 'utf8')
  writeReceipt({ goldenResult: 'refresh' })
  console.log(`ui-scene-smoke: 金样已更新 → ${EXPECTED_PATH}（${String(golden.catalog.length)} 个页签）`)
}

if (EXPECTED) {
  let golden
  try { golden = JSON.parse(readFileSync(EXPECTED_PATH, 'utf8')) } catch (error) {
    writeReceipt({ goldenResult: 'fail' })
    console.error(`ui-scene-smoke: 读不到金样 ${EXPECTED_PATH}（${String(error?.message ?? error)}）——先跑 --isolated --refresh-expected。`)
    process.exit(1)
  }
  const { catalogProblems, tabProblems } = compareGolden(golden, { catalog: verdict?.catalog ?? [], tabTexts: verdict?.tabTexts ?? {} })
  if (catalogProblems.length > 0 || tabProblems.length > 0) {
    for (const problem of catalogProblems) console.error(`  EXPECTED FAIL ${problem}`)
    for (const problem of tabProblems.slice(0, 9)) {
      const diff = firstTextDiff(problem.expected, problem.actual)
      console.error(`  EXPECTED FAIL 页签「${problem.tab}」第 ${String(diff.at)} 字符起不同：金样「${diff.expected}」/ 现在「${diff.actual}」`)
    }
    writeReceipt({
      goldenResult: 'fail',
      goldenProblems: {
        catalog: catalogProblems,
        tabs: tabProblems.map(problem => ({ tab: problem.tab, expected: problem.expected, actual: problem.actual })),
      },
    })
    console.error(`ui-scene-smoke: 金样比对失败；确认是有意改动后跑 --isolated --refresh-expected 更新（金样 = ${EXPECTED_PATH}）。`)
    process.exit(1)
  }
  writeReceipt({ goldenResult: 'pass' })
  console.log(`ui-scene-smoke: 金样一致（${String((golden.catalog ?? []).length)} 个页签）`)
} else if (!REFRESH_EXPECTED) {
  writeReceipt({ goldenResult: 'off' })
}

if (LANG === 'en') {
  const texts = Object.entries(verdict?.tabTexts ?? {}).filter(([title]) => title !== '(attached)')
  const cjk = texts.filter(([, text]) => /[\u3400-\u9fff]/u.test(String(text ?? '')))
  if (cjk.length > 0) {
    for (const [title] of cjk.slice(0, 9)) console.error(`  EN FAIL 页签「${title}」仍有中文`)
    writeReceipt({ englishResult: 'fail' })
    console.error('ui-scene-smoke: en 页面仍有中文残留')
    process.exit(1)
  }
  writeReceipt({ englishResult: 'pass' })
  console.log(`ui-scene-smoke: en 页面无中文残留（${String(texts.length)} 个页签）`)
}

console.log('ui-scene-smoke: ALL PASS（自起实例 + 全部公司页签 + 浏览器错误环零命中）')
