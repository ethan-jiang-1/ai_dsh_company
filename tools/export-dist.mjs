#!/usr/bin/env node
// 状态：常驻
// 何时跑：需要交付 tarball 给仓库外的人时（版本号变动后、给无仓库权限者、风险变更前快照）；无 key，构建+打包秒级。
// 用法：node tools/export-dist.mjs
//
// 手动分发导出（精神借 ai_dsh_architect 的 export-dist，2026-09-28）：把 company-pack 打成
// _dist/ 下的 tarball + 同目录生成《安装手册》。三条规矩照搬：
//   ① _dist/ 是导出目的地不是源——tgz 全 gitignore，手册是唯一 tracked 例外（版本门禁防漂）；
//   ② 打包前先 tsc -b + tsdown（lib/ 是 gitignored；不 build 会打出旧产物）；打包步 = release-smoke 同一条 `npm pack`（npm cache 钉 scratch，不碰 ~/.npm），
//      导出后对产物本体再跑一遍清单边界断言（必备条目在场、无 package/ 外文件）；
//   ③ 手册由脚本生成、注入版本与日期，永不手改——手册和旁边的 tarball 不可能漂。
// 导出 ≠ 发布：不 bump 版本、不跑门禁（除清单）、不发布任何 registry——按工作树现状打包。
import { repositoryRoot as repoRoot } from './lib/repository-layout.mjs'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

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


  // 0. 产物必须由当前源码构建：lib/ 整目录 gitignored，直接 npm pack 会静默打旧代码。
  //    tsc -b 是 solution root 的 build 模式；tsdown 再产出 lib/index.js + lib/client.js。
  const tsc = spawnSync(process.execPath, [join(repoRoot, 'node_modules/typescript/bin/tsc'), '-b', 'packages/company-pack'], {
    cwd: repoRoot, encoding: 'utf8', timeout: 180_000,
  })
  report('build (tsc -b)', tsc.status === 0, (tsc.status === 0 ? '' : `${tsc.stdout ?? ''}${tsc.stderr ?? ''}`.trim().split('\n').slice(-3).join(' | ')))
  if (tsc.status !== 0) throw new Error('tsc -b 失败；保留旧的 _dist 不替换')
  const require = createRequire(join(repoRoot, 'package.json'))
  const tsdown = join(dirname(require.resolve('tsdown/package.json')), 'dist/run.mjs')
  const bundled = spawnSync(process.execPath, [tsdown], { cwd: packDir, encoding: 'utf8', timeout: 180_000 })
  report('bundle (tsdown)', bundled.status === 0, (bundled.status === 0 ? '' : `${bundled.stdout ?? ''}${bundled.stderr ?? ''}`.trim().split('\n').slice(-3).join(' | ')))
  if (bundled.status !== 0) throw new Error('tsdown 失败；保留旧的 _dist 不替换')

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
  // 发布面只留 runtime 两半 + 声明（2026-10-26）：tsc 的中间 .js/.map/.tsbuildinfo 不进包。
  const buildLeak = entries.filter((entry) => /^package\/lib\/(?:tsconfig\..*\.tsbuildinfo|.*\.map)$/.test(entry)
    || /^package\/lib\/types\/.*\.js$/.test(entry))
  report('tarball inventory', listed.status === 0 && missing.length === 0 && outside.length === 0 && presetFiles > 0 && forbidden.length === 0 && buildLeak.length === 0,
    missing.length ? `missing: ${missing.join(', ')}` : `${entries.length} entries, presets ×${presetFiles}${outside.length ? `, outside package/: ${outside.join(', ')}` : ''}${forbidden.length ? `, forbidden: ${forbidden.slice(0, 3).join(', ')}` : ''}${buildLeak.length ? `, build leak: ${buildLeak.slice(0, 3).join(', ')}` : ''}`)

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
| 验证基线 | vendor \`${expectedTag}\` + npm 发布版 \`0.2.1-rc.3\`（Node ≥ 22.19；pnpm 11/12） |
| 许可 | \`UNLICENSED\`（内部交付，未授予再分发权） |

这个安装包是自包含的：bundle 补丁、五个角色 preset、浏览器端、**出厂公司盘骨架 workspace/**
（手册 / 章程 / org / 模板 / 起动件），共 ${entries.length} 个条目。

**一次安装 = 一个 run bundle**：一个 DSH home + 一个公司盘（\`company-workspace/\`）+ \`bundle.json\`
（身份 / pack 版本 / 基部指纹）。bundle 不进 git；给另一个 CEO 装 = 新开一个 \`DSH_HOME\`，
不要复用（sessions / 凭据 / 方法层 / workspace 登记都在 home 里）。

## 零、前置

- **Node.js** ≥ 22.19（DSH 自身基线；先 \`node -v\`，低于此版本不要装）。
- **pnpm 11 或 12**：\`dsh plugin\` 在 profile 目录调 pnpm。\`corepack enable pnpm\` 只保证有 pnpm，
  实际版本由 corepack 从 profile 目录解析（0.3.9 实测无 \`packageManager\` 时会取 12.x）。先 \`pnpm -v\`；
  要钉 11 用 \`corepack prepare pnpm@11.7.0 --activate\`。没有 pnpm 时安装会报 \`dsh: pnpm was not found\`。
- **DSH 运行时**：已验证 vendor \`${expectedTag}\` 源码构建与 npm 发布版 \`0.2.1-rc.3\`；
  运行时硬门是 \`engines.dsh\`，版本不匹配会被拒绝。**真实 npm 包不含 browser 两包**，见下方“可选：浏览器能力”。
- **一个独立的 \`DSH_HOME\`**：不要复用日用 home，也不要让两个 CEO 共用一个 home。
- **许可**：本包为内部交付（\`UNLICENSED\`），未授予再分发权；支持窗口 = 当前版本。

## 一、安装（给这个 CEO 一个独立的 home）

\`\`\`sh
command -v pnpm >/dev/null 2>&1 || { echo 'pnpm 不在 PATH；先 corepack enable pnpm'; exit 1; }
node -e "const v=process.versions.node.split('.').map(Number); if(v[0]<22||(v[0]===22&&v[1]<19)){console.error('Node '+process.versions.node+' < 22.19');process.exit(1)}"
export DSH_HOME="$HOME/dsh-bundles/<你的 CEO 名>"
dsh plugin --profile web add /path/to/${tarballName}
\`\`\`

> **profile 不是隔离单位**：公司包要求含 \`@deepseek-ai/dsh-web-app\` 的 web profile；自定义 profile 名可以，
> 但要把 web-app 加进 \`dsh.profile.bundles\`。base-only 自定义 profile 会让 preset 行 pending。
> 一个 \`DSH_HOME\` 只对应一个 run bundle；同 home 多 profile 共享 \`bundle.json\`/sessions/workspace，
> 第二家公司/第二个 CEO 请用第二个 \`DSH_HOME\`。

空 home 会自建 \`web\` profile。装进日常环境也可以（不设 \`DSH_HOME\`），但那样第二个 CEO
必须另开 home——**一个 home 只装一个 CEO**。

### 可选：浏览器能力（0.3.10 起条件启用）

npm 发布的 \`@deepseek-ai/dsh\` 不含 \`@deepseek-ai/dsh-browser-use\` 与
\`@deepseek-ai/dsh-experimental-browser-use-playwright-mcp\`，所以五个角色默认**不带** browser 工具，
但角色本身可用。要开浏览器：

\`\`\`sh
DSH_VER=$(dsh --version)
dsh plugin --profile web add \
  "@deepseek-ai/dsh-browser-use@$DSH_VER" \
  "@deepseek-ai/dsh-experimental-browser-use-playwright-mcp@$DSH_VER"
\`\`\`

装进 profile 后 preset 自动探测并启用；也可用 \`DSH_COMPANY_BROWSER=on/off\` 强制。**不要**在没装包时
设 \`on\`——五个角色会报 \`browser-use-def ... never started\`。源码 checkout/vendor 通道两包在安装侧，
本仓库 \`run/env.sh\` 已设 \`on\`。

日期通道与定时提醒随五个角色 preset 自带（0.2.1 起），不需要另装节律 bundle。

## 二、第一次启动（run bundle 在这里出现）

\`\`\`sh
DSH_HOME="$HOME/dsh-bundles/<你的 CEO 名>" dsh web
\`\`\`

首次启动会：

- 落 \`<DSH_HOME>/company-workspace\`（出厂骨架；已有盘一个字节不动，只补缺）；
- 写 \`<DSH_HOME>/bundle.json\`（只创建、不覆盖）；
- 你在侧栏 \`Workspaces\` 把该目录加成工作区（人手点一次），新建会话选 \`ceo\`。
- \`DSH_COMPANY_HOME\` 建议用绝对路径或 \`~/...\`；相对路径会按启动 cwd 归一（0.3.10 起）。生产部署建议绝对路径。
- **已有 bundle.json 时改 \`DSH_COMPANY_HOME\`**：启动会明确警告并拒绝在新路径建第二份盘。
  确认旧盘已搬走/改名后，用 \`DSH_COMPANY_REBIND=1\` 做一次性换盘（自动备份 \`bundle.json\`、改写 workspace、写升级日志）；
  不想显式换盘就用新 \`DSH_HOME\`（先备份）。

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

\`\`\`sh
dsh plugin --profile web add /path/to/<新版本>.tgz
\`\`\`

装完重启 \`dsh web\`，并硬刷新页面（浏览器模块不会热加载）。基部（手册 / 章程 / 模板 / 起动件）按哈希判定：
**没改过的**随新包替换，**你改过的**保留并在 \`<DSH_HOME>/logs/company-pack-upgrade.log\` 里点名；扩张面
（journal / 交付物 / 台账 / 方法层 / 会话）一个字节不动。\`bundle.json\` 的 \`skeleton.version\` 随升级前移。
降级同样走“装回旧 tgz + 重启”：改过的基部保留，未改的回到旧版；扩张面不动。

培养记录可用 \`/cultivation archive <天数>\` 把已处理（非 open）且早于该天数的记录移到
\`<公司盘>/cultivation/records-archive/\`；open 与读不动的记录不动，面板会点名坏记录。
一个公司请固定用一个 web profile：同 home 多 profile 会在启动输出里点名，方法层不跨 profile 共享。

## 五、备份 / 迁移

先选姿势，别把“可分享归档”和“整机迁移”混成一件：

| 姿势 | 打包什么 | 不包含 / 会丢什么 | 用途 |
|---|---|---|---|
| **business** | 公司盘（含 \`kb/deliverables-presented.json\` 审计账本）、\`<DSH_HOME>/bundle.json\`、\`<DSH_HOME>/profiles/<p>/company-cultivation/\` | sessions、\`.credentials.yaml\`、\`profiles/<p>/session-search.db\`、DSH workspace 登记 | 交接 / 换机器 / 公司数据归档 |
| **full** | 整个 \`DSH_HOME\` | 不丢；但含会话正文、密钥、绝对路径 | 整机迁移 / 灾难恢复；加密、限权、不共享 |

business 示例（公司盘在 home 内时；在外则把第一条换成
\`tar -czf company-business-company.tgz -C "$(dirname "$DSH_COMPANY_HOME")" "$(basename "$DSH_COMPANY_HOME")"\`）：

\`\`\`sh
tar -czf company-business.tgz -C "$DSH_HOME" bundle.json company-workspace
# 方法层只有在采纳过方法时存在；没有就跳过，不要用缺路径让 tar 报错
if [ -d "$DSH_HOME/profiles/web/company-cultivation" ]; then
  tar -czf company-business-methods.tgz -C "$DSH_HOME" profiles/web/company-cultivation
fi
\`\`\`

恢复 business：新 home 解包（有方法层就一起解）→ 按第二节 \`plugin add\` 同版本/新版本 → 启动。
**没有 sessions，旧会话不会回来**；公司盘、方法层（若打包）、presented 审计账本会回来。

恢复 full：整 home 搬移；搬完若 profile 的依赖目录失效，按第二节重新 \`plugin add\` 一次。
\`bundle.json\` 里的相对 workspace 会随新 home 解析；但 DSH 自己的 \`storages/workspace.json\`
与 session 目录名存的是**绝对旧路径**，不会自动迁移——搬完在侧栏重新添加工作区，
旧 session 仍在旧路径下，别把“文件还在”当成“UI 已迁移”。启动输出会点名 \`storages/workspace.json\` 里
已不存在的旧路径；照提示重新添加即可。

### 显式换盘（公司盘搬了位置）

确认**旧盘已搬走/改名**（旧路径不存在），新盘有 \`AGENTS.md\` 与 \`kb/company.md\` 或 \`kb/org.md\`：

\`\`\`sh
DSH_HOME=/path/to/home DSH_COMPANY_HOME=/new/company DSH_COMPANY_REBIND=1 dsh web
\`\`\`

它先备份 \`bundle.json\` 为 \`bundle.json.bak-<时间>\`，再改写 \`workspace\` 并写
\`<DSH_HOME>/logs/company-pack-upgrade.log\`。**不迁 DSH session 的绝对 \`header.cwd\`**——
旧会话仍锚旧路径；要连历史一起搬，只能保持原绝对路径或接受旧会话不可续。旧盘仍在时请求会被拒绝。
最后手段才是备份后删除 \`bundle.json\` 重建：那会丢掉基部哈希，之后基部升级不再能区分“改过/没改过”。

Windows 未验证：不要按本节的 \`shasum\` 路径执行；PowerShell 用
\`Get-FileHash -Algorithm SHA256 <file>\` 校验。

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
| 五角色报 \`browser-use-def ... never started\` | 没装 browser 两包却设了 \`DSH_COMPANY_BROWSER=on\`：装包或 unset/\`off\` |
| \`bundle.json 记录的公司盘是 ...，当前 DSH_COMPANY_HOME ...\` | 已有 bundle 后改了落点：旧盘已搬走则用 \`DSH_COMPANY_REBIND=1\`；旧盘仍在会拒绝，避免两份盘 |
| \`dsh: pnpm was not found\` | pnpm 不在 PATH；先 \`corepack enable pnpm\` 并 \`pnpm -v\` |
| 升级后页面还是旧模块 | 重启 \`dsh web\` + 硬刷新；浏览器模块不热加载 |
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
