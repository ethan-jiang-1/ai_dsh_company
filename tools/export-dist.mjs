#!/usr/bin/env node
// 状态：常驻
// 何时跑：需要交付 tarball 给仓库外的人时（版本号变动后、给无仓库权限者、风险变更前快照）；无 key，秒级。
// 用法：node tools/export-dist.mjs
//
// 手动分发导出（精神借 ai_dsh_architect 的 export-dist，2026-09-28）：把 company-pack 打成
// _dist/ 下的 tarball + 同目录生成《安装手册》。三条规矩照搬：
//   ① _dist/ 是导出目的地不是源——tgz 全 gitignore，手册是唯一 tracked 例外（版本门禁防漂）；
//   ② 打包步 = release-smoke 每轮证明的同一个 `npm pack`（npm cache 钉 scratch，不碰 ~/.npm），
//      导出后对产物本体再跑一遍清单边界断言（必备条目在场、无 package/ 外文件）；
//   ③ 手册由脚本生成、注入版本与日期，永不手改——手册和旁边的 tarball 不可能漂。
// 导出 ≠ 发布：不 bump 版本、不跑门禁（除清单）、不发布任何 registry——按工作树现状打包。
import { repositoryRoot as repoRoot } from './lib/repository-layout.mjs'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const packDir = join(repoRoot, 'packages', 'company-pack')
const distDir = join(repoRoot, '_dist')
const manualName = '安装手册.md'

const failed = []
const report = (name, ok, detail) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failed.push(name)
}

try {
  const pkg = JSON.parse(readFileSync(join(packDir, 'package.json'), 'utf8'))
  const version = pkg.version
  const tarballName = `dsh-company-pack-${version}.tgz`
  // 验证基线的事实家 = checks/gates/lib/pin.mjs（2026-10-14 拆分轮自 run-gates.mjs §0 迁出）；先核对输入，再替换已有导出。
  const pinText = readFileSync(join(repoRoot, 'checks', 'gates', 'lib', 'pin.mjs'), 'utf8')
  const expectedTag = /const expectedTag = '([^']+)'/.exec(pinText)?.[1]
  if (!expectedTag) throw new Error('pin.mjs 缺 expectedTag；未替换已有导出')

  // 只清本脚本自己的旧产物，不动 _dist/ 里别人放的东西
  mkdirSync(distDir, { recursive: true })
  for (const name of readdirSync(distDir)) {
    if (name === manualName || /^dsh-company-pack-.*\.tgz$/.test(name) || /^dsh-company-pack-.*\.tgz\.sha256$/.test(name)) {
      rmSync(join(distDir, name), { force: true })
    }
  }

  // 1. 打包——与 release-smoke 同一条 `npm pack`，cache 钉 scratch（§11：npm 不碰 ~/.npm）
  const scratch = mkdtempSync(join(tmpdir(), 'dsh-export-dist-'))
  const packed = spawnSync('npm', ['pack', '--pack-destination', distDir, '--cache', join(scratch, 'npm-cache')], { cwd: packDir, encoding: 'utf8' })
  rmSync(scratch, { recursive: true, force: true })
  const packedName = (packed.stdout ?? '').trim().split('\n').filter(Boolean).pop()
  report('npm pack', packed.status === 0 && packedName === tarballName,
    `exit ${packed.status}, ${packedName ?? 'no tarball'}${(packed.stderr ?? '').trim() ? `: ${packed.stderr.trim().split('\n')[0]}` : ''}`)

  // 2. 清单边界——对导出的产物本体再断言一次发布形状
  const tarball = join(distDir, tarballName)
  const listed = spawnSync('tar', ['-tzf', tarball], { encoding: 'utf8' })
  const entries = (listed.stdout ?? '').split('\n').filter(Boolean)
  const must = ['package/cordis.patch.yml', 'package/package.json', 'package/lib/index.js', 'package/lib/client.js',
    'package/workspace/AGENTS.md', 'package/workspace/kb/org.md', 'package/workspace/kb/owners.md',
    'package/locale/en.json', 'package/locale/zh.json', 'package/icon.svg']
  const missing = must.filter((entry) => !entries.includes(entry))
  const presetFiles = entries.filter((entry) => entry.startsWith('package/presets/')).length
  const outside = entries.filter((entry) => !entry.startsWith('package/'))
  // run bundle 不进包（2026-10-24）：扩张数据/凭据/会话一律不许出现在 tarball。
  const forbidden = entries.filter((entry) => /^package\/(company-workspace|sessions|deliverables|cultivation|profiles)\//.test(entry)
    || /credentials/.test(entry))
  report('tarball inventory', listed.status === 0 && missing.length === 0 && outside.length === 0 && presetFiles > 0 && forbidden.length === 0,
    missing.length ? `missing: ${missing.join(', ')}` : `${entries.length} entries, presets ×${presetFiles}${outside.length ? `, outside package/: ${outside.join(', ')}` : ''}${forbidden.length ? `, forbidden: ${forbidden.slice(0, 3).join(', ')}` : ''}`)

  // 2b. 产物身份（2026-10-25，RFC distribution-lifecycle）：tgz 的 sha256 是收件人唯一的
  // 字节级凭证；手册与旁文件必须同源，不靠“下载后看起来一样”。
  const digest = createHash('sha256').update(readFileSync(tarball)).digest('hex')
  writeFileSync(`${tarball}.sha256`, `${digest}  ${tarballName}\n`, 'utf8')
  report('sha256', /^[0-9a-f]{64}$/.test(digest), `${digest}  ${tarballName}`)

  // 3. 手册——脚本生成，版本/日期/条目数注入；步骤镜像 release-smoke 验证过的安装路径
  // 手册日期按部署时区（Asia/Shanghai）落；UTC 跨日会把 10-26 写成 10-25，与 CHANGELOG 不一致。
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const manual = `# dsh-company-pack 手动安装手册

| | |
|---|---|
| 版本 | ${version} |
| 安装包 | \`${tarballName}\`（与本手册同目录） |
| 校验（sha256） | \`${digest}\` |
| 打包日期 | ${date} |
| 验证基线 | DSH \`${expectedTag}\`（Node ≥ 22.19） |
| 许可 | \`UNLICENSED\`（内部交付，未授予再分发权） |

这个安装包是自包含的：bundle 补丁、五个角色 preset、浏览器端、**出厂公司盘骨架 workspace/**
（手册 / 章程 / org / 模板 / 起动件），共 ${entries.length} 个条目。

**一次安装 = 一个 run bundle**：一个 DSH home + 一个公司盘（\`company-workspace/\`）+ \`bundle.json\`
（身份 / pack 版本 / 基部指纹）。bundle 不进 git；给另一个 CEO 装 = 新开一个 \`DSH_HOME\`，
不要复用（sessions / 凭据 / 方法层 / workspace 登记都在 home 里）。

## 零、前置

- **Node.js** ≥ 22.19（与 DSH 基线一致）。
- **pnpm 11**（或 \`corepack enable pnpm\`）：profile 的 \`plugin add\` 需要 \`pnpm\` 在 PATH；
  没有它时安装会报 \`dsh: pnpm was not found\`。
- **DSH 运行时**：本手册只在 \`${expectedTag}\` 上验证过；用同版本安装包或源码 checkout
  （例如 \`npx @deepseek-ai/dsh@${expectedTag.replace(/^dsh-v/, '')} web\`）。版本不匹配时安装会被拒绝。
- **一个独立的 \`DSH_HOME\`**：不要复用日用 home，也不要让两个 CEO 共用一个 home。
- **许可**：本包为内部交付（\`UNLICENSED\`），未授予再分发权；支持窗口 = 当前版本。

## 一、安装（给这个 CEO 一个独立的 home）

\`\`\`sh
command -v pnpm >/dev/null 2>&1 || { echo 'pnpm 11 不在 PATH；先 corepack enable pnpm'; exit 1; }
export DSH_HOME="$HOME/dsh-bundles/<你的 CEO 名>"
dsh plugin --profile web add /path/to/${tarballName}
\`\`\`

> **profile 不是隔离单位**：公司包要求含 \`@deepseek-ai/dsh-web-app\` 的 web profile；自定义 profile 名可以，
> 但要把 web-app 加进 \`dsh.profile.bundles\`。base-only 自定义 profile 会让 preset 行 pending。
> 一个 \`DSH_HOME\` 只对应一个 run bundle；同 home 多 profile 共享 \`bundle.json\`/sessions/workspace，
> 第二家公司/第二个 CEO 请用第二个 \`DSH_HOME\`。

空 home 会自建 \`web\` profile。装进日常环境也可以（不设 \`DSH_HOME\`），但那样第二个 CEO
必须另开 home——**一个 home 只装一个 CEO**。

日期通道与定时提醒随五个角色 preset 自带（0.2.1 起），不需要另装节律 bundle。

## 二、第一次启动（run bundle 在这里出现）

\`\`\`sh
DSH_HOME="$HOME/dsh-bundles/<你的 CEO 名>" dsh web
\`\`\`

首次启动会：

- 落 \`<DSH_HOME>/company-workspace\`（出厂骨架；已有盘一个字节不动，只补缺）；
- 写 \`<DSH_HOME>/bundle.json\`（只创建、不覆盖）；
- 你在侧栏 \`Workspaces\` 把该目录加成工作区（人手点一次），新建会话选 \`ceo\`。

**干净判据**：新安装的公司盘只有骨架——没有 journal、没有交付物、没有培养记录、没有会话；
这些是装完之后你自己长出来的（扩张能力）。

## 三、验证

先核对字节，再启动：

\`\`\`sh
shasum -a 256 ${tarballName}          # macOS；Linux 用 sha256sum
cat ${tarballName}.sha256              # 必须与上行一致
shasum -a 256 -c ${tarballName}.sha256
\`\`\`

启动后：

\`\`\`sh
cat "$DSH_HOME/bundle.json"          # id / pack.version / skeleton.files
dsh --profile web --dump-config      # 插件层 + preset-ceo + company-client
\`\`\`

## 四、升级

替换 profile 里的包后重启。基部（手册 / 章程 / 模板 / 起动件）按哈希判定：
**没改过的**随新包替换，**你改过的**保留并在 \`<DSH_HOME>/logs/company-pack-upgrade.log\` 里点名；扩张面
（journal / 交付物 / 台账 / 方法层 / 会话）一个字节不动。\`bundle.json\` 的 \`skeleton.version\` 随升级前移。

## 五、备份 / 迁移

整个 \`DSH_HOME\` 就是 bundle（含公司盘、sessions、方法层、凭据）。归档时排除
\`.credentials.yaml\` 与含启动 token 的日志；换机器时连 home 一起搬。
搬完后若 profile 的依赖目录失效，按第二节重新 \`plugin add\` 一次；公司盘、sessions、
\`bundle.json\` 都不动。

## 六、卸载

\`\`\`sh
dsh plugin --profile web remove dsh-company-pack
\`\`\`

只卸插件、不动 bundle 数据；要彻底删除一个 CEO 的 bundle，确认备份后删除它的整个
\`DSH_HOME\`。

## 七、安装失败与回退

- **版本不匹配**：安装会被拒绝并报 \`incompatible-version\`；换匹配的 DSH，不要用
  \`allow-version\` 绕过（会带来崩溃/数据风险）。
- **包损坏/下载不完整**：用上面的 sha256 复核；删除 profile 里的包后重装。
- **回退**：先备份整个 \`DSH_HOME\`；卸载当前包，装回上一个 tgz。基部升级只做
  create/update/keep，不删除扩张面；回退不会自动降级已改过的基部文件（它们会保留）。

## 常见问题

| 现象 | 原因与处理 |
|---|---|
| 刷新后什么都没出现 | 浏览器刷新不加载新模块：重启 \`dsh web\`，再硬刷新页面 |
| 两个 CEO 看到彼此的历史 | 复用了同一个 \`DSH_HOME\`：新开 home，bundle 之间不共享 |
| 想确认装了什么版本 | \`dsh plugin --profile web list\`，或看 \`bundle.json\` 的 \`pack.version\` |
| 成员会话内容被截断 | 宿主注入预算（maxBytes）需 ≥ 常驻注入链（见 pack README 已知限制），dsh 默认 65,536B 够用 |
`
  writeFileSync(join(distDir, manualName), manual)
  report('manual generated', true, `${manualName}（tracked，版本 ${version}）`)
} catch (error) {
  failed.push('unexpected')
  console.error(`export-dist: ${error.message}`)
}

if (failed.length) {
  console.error(`export-dist: ${failed.length} step(s) failed: ${failed.join(', ')}`)
  process.exit(1)
}
console.log('export-dist: ALL PASS')
