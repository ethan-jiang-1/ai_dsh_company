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
  const manual = `# dsh-company-pack 安装手册

| | |
|---|---|
| 版本 | ${version} |
| 安装包 | @@${tarballName}@@（与本手册同目录） |
| 校验（sha256） | @@${digest}@@ |
| 打包日期 | ${date} |
| 验证基线 | vendor @@${expectedTag}@@ + npm 发布版 @@0.2.1-rc.3@@（Node ≥ 22.19；pnpm 11/12） |
| 许可 | @@UNLICENSED@@（内部交付，未授予再分发权） |

这个安装包是自包含的：bundle 补丁、五个角色 preset、浏览器端、**出厂公司盘骨架 workspace/**
（手册 / 章程 / org / 模板 / 起动件）、以及产品启动器 @@bin/dsh-company.mjs@@，共 ${entries.length} 个条目。

**产品形状（0.5.0 起）**：一次安装 = 一个 DSH home + 一个 @@company@@ profile + **一个用户 workspace**。
workspace 拥有公司身份与业务产物（@@bundle.json@@、@@kb/@@、@@deliverables/@@、@@cultivation/@@、
升级日志、治理导出）；home 只留 DSH 运行时与 host 治理（sessions / 凭据 / workspace 登记 / lease /
方法层 / 审计账本）和一份身份备份。换项目 = 新建一个 home，不要复用旧 home 的第二份盘。

## 零、前置

- **Node.js** ≥ 22.19（DSH 自身基线；先 @@node -v@@）。
- **pnpm 11 或 12**：@@dsh plugin@@ 在 profile 目录调 pnpm。@@corepack enable pnpm@@ 只保证有 pnpm，
  实际版本由 corepack 从 profile 目录解析（0.3.9 实测无 @@packageManager@@ 时会取 12.x）。先 @@pnpm -v@@。
- **DSH 运行时**：已验证 vendor @@${expectedTag}@@ 源码构建与 npm 发布版 @@0.2.1-rc.3@@；
  运行时硬门是 @@engines.dsh@@。**真实 npm 包不含 browser 两包**，见下方“可选：浏览器能力”。
- **一个独立的 @@DSH_HOME@@**：不要复用日用 home，也不要让两个公司共用一个 home。
- **一个 workspace 目录**：已存在、可写；启动器会先确认再 seed，**不会静默建默认盘**。
- **许可**：内部交付（@@UNLICENSED@@），未授予再分发权。

## 一、安装（独立 home + company profile）

\`\`\`sh
command -v pnpm >/dev/null 2>&1 || { echo 'pnpm 不在 PATH；先 corepack enable pnpm'; exit 1; }
node -e "const v=process.versions.node.split('.').map(Number); if(v[0]<22||(v[0]===22&&v[1]<19)){console.error('Node '+process.versions.node+' < 22.19');process.exit(1)}"
export DSH_HOME="$HOME/.dsh-company/<你的公司名>"
dsh --profile company --from-default-profile web --dump-default-config
dsh plugin --profile company add /path/to/${tarballName}
\`\`\`

> **profile 不是隔离单位**：@@company@@ profile 是产品启动组合；数据隔离靠独立 @@DSH_HOME@@。
> @@--from-default-profile web@@ 只在 profile 缺失时用；已有 profile 上再用会替换它的依赖与用户 patch。
> 公司包要求含 @@dsh-web-app@@ 的 web template；base-only 自定义 profile 会让 preset 行 pending。

### 可选：浏览器能力（0.3.10 起条件启用）

npm 发布的 @@dsh@@ 不含 @@dsh-browser-use@@ 与 @@dsh-experimental-browser-use-playwright-mcp@@，
所以五个角色默认**不带** browser 工具。要开浏览器：

\`\`\`sh
DSH_VER=$(dsh --version)
dsh plugin --profile company add   "@deepseek-ai/dsh-browser-use@$DSH_VER"   "@deepseek-ai/dsh-experimental-browser-use-playwright-mcp@$DSH_VER"
\`\`\`

装进 profile 后 preset 自动探测并启用；也可用 @@DSH_COMPANY_BROWSER=on/off@@ 强制。**不要**在没装包时
设 @@on@@——五个角色会报 @@browser-use-def ... never started@@。

## 二、第一次启动（先指定 workspace）

用启动器（推荐）：

\`\`\`sh
DSH_HOME="$HOME/.dsh-company/<你的公司名>"   "$DSH_HOME/profiles/company/node_modules/.bin/dsh-company" --workspace /path/to/your-project
\`\`\`

或直接（fallback）：

\`\`\`sh
DSH_HOME="$HOME/.dsh-company/<你的公司名>"   DSH_COMPANY_HOME=/path/to/your-project dsh --profile company
\`\`\`

首次启动会：

- 确认 workspace（不存在时询问/@@--yes@@ 才创建）；
- 打印“将创建/将跳过”的骨架摘要，确认后写 @@.dsh-company/.seed-consent@@；
- 落出厂骨架：@@AGENTS.md@@（若目标已有 @@AGENTS.md@@，则写 @@COMPANY.md@@，不覆盖）、@@kb/@@、
  @@templates/@@、@@deliverables/@@、@@deliverables-archive/@@、@@cultivation/@@；
- 写 @@.dsh-company/bundle.json@@（v2：id / createdAt / pack / handbookTarget / 基部 sha256）；
- 把 workspace 登记进 DSH Workspace，浏览器首屏自动选中目标盘（无默认 Documents 盘）；
- home 只写运行时与治理：sessions、@@.credentials.yaml@@、workspace 登记、方法层、账本、lease、身份备份。

**没有 workspace / 未确认 seed**：host 不写骨架、不写身份、不登记；只打可操作告警。
**干净判据**：新 workspace 只有骨架——没有 journal、交付物、培养记录、会话；这些是装完之后自己长出来的。

## 三、验证

先核对字节，再启动：

\`\`\`sh
shasum -a 256 ${tarballName}          # macOS；Linux 用 sha256sum
cat ${tarballName}.sha256              # 必须与上行一致
shasum -a 256 -c ${tarballName}.sha256
\`\`\`

启动后：

\`\`\`sh
cat "/path/to/your-project/.dsh-company/bundle.json"   # v2 / handbookTarget / skeleton.files
cat "$DSH_HOME/company/settings.json"                  # 当前 workspace
dsh --profile company --dump-config                     # 插件层 + 五个 preset + company-client
\`\`\`

## 四、升级

\`\`\`sh
dsh plugin --profile company add /path/to/<新版本>.tgz
\`\`\`

装完重启 @@dsh --profile company@@，并硬刷新页面（浏览器模块不会热加载）。基部（手册/章程/模板/起动件）
按哈希判定：**没改过的**随新包替换，**你改过的**保留并在
@@<workspace>/.dsh-company/logs/company-pack-upgrade.log@@ 点名；扩张面（journal / 交付物 / 台账 /
培养记录 / 会话 / 方法层 / 账本）不动。@@bundle.json@@ 的 @@pack/skeleton.version@@ 随升级前移。

**降级**：先备份 → 装回旧 tgz → 重启；改过的基部保留，未改的回旧版；扩张面不动。更高 schema 的
manifest/账本/记录不会被旧版静默改写。

## 五、备份 / 迁移

先选姿势，别把“可分享归档”和“整机迁移”混成一件：

| 姿势 | 打包什么 | 不包含 / 会丢什么 | 用途 |
|---|---|---|---|
| **business** | 公司 workspace（公司盘 + @@.dsh-company/@@ 身份/导出/日志）+ home 的 @@company/methods/@@ 与 @@storages/company_deliverables.json@@（或已导出的 @@exports/@@） | sessions、@@.credentials.yaml@@、缓存 | 交接 / 换机器 / 业务归档 |
| **full** | 整个 @@DSH_HOME@@ + workspace | 无；含会话正文、密钥、绝对路径 | 整机迁移 / 灾难恢复；加密、限权、不共享 |

\`\`\`sh
# business（workspace 在 home 外时把第一条换成对应 workspace 目录）
tar -czf company-business-workspace.tgz -C "$(dirname /path/to/your-project)" "$(basename /path/to/your-project)"
[ -d "$DSH_HOME/company/methods" ] && tar -czf company-business-methods.tgz -C "$DSH_HOME" company/methods
[ -f "$DSH_HOME/storages/company_deliverables.json" ] && tar -czf company-business-ledger.tgz -C "$DSH_HOME" storages/company_deliverables.json
\`\`\`

恢复 business：新 home → 解 workspace → @@dsh plugin --profile company add@@ 同版本/新版本 → 以该
workspace 启动；**没有 sessions，旧会话不会回来**；方法层/账本按 home 恢复（或由 host 重新导出）。
恢复 full：整 home + workspace 搬移；profile 依赖失效时重装；DSH 自己的 workspace 登记与 session cwd 是
绝对路径，搬完要重新添加工作区/接受旧会话不可续。

**搬 home/workspace**：不用旧 @@DSH_COMPANY_REBIND@@（已退役，设了只告警）。搬 workspace 后重新用
启动器指定路径并让 host 重新登记；旧 session 仍锚旧绝对路径。

## 六、卸载

\`\`\`sh
dsh plugin --profile company remove dsh-company-pack
\`\`\`

只卸插件、不动 workspace/home 数据；要彻底删除一个公司，确认备份后删除它的整个 @@DSH_HOME@@ 和
workspace。产品不代删用户项目。

## 七、安装失败与回退

- **版本不匹配**：安装会被拒绝并报 @@incompatible-version@@；换匹配的 DSH，不要用 @@allow-version@@ 绕过。
- **包损坏/下载不完整**：用 sha256 复核；删除 profile 里的包后重装。
- **回退**：备份整个 home + workspace；卸载当前包，装回上一个 tgz。基部升级只做 create/update/keep，
  不删除扩张面；回退不会自动降级已改过的基部文件（它们会保留）。
- **workspace 没有出现/未 seed**：检查 @@DSH_COMPANY_HOME@@ 是否指向已存在目录、@@.dsh-company/.seed-consent@@
  是否存在；首次请用启动器确认 seed。
- **manifest 损坏**：host 会停写并保留原文件；从 @@$DSH_HOME/company/identity/<id>.json@@ 恢复或备份后让 host 重建。

## 常见问题

| 现象 | 原因与处理 |
|---|---|
| 刷新后什么都没出现 | 浏览器刷新不加载新模块：重启 @@dsh --profile company@@，再硬刷新页面 |
| 两个公司看到彼此的历史 | 复用了同一个 @@DSH_HOME@@：新开 home |
| 浏览器首屏要求 Choose workspace | 启动时没登记/没设 @@DSH_COMPANY_HOME@@：用启动器，或检查 workspace 登记 |
| 公司数据停写 | workspace 未指定/落点不安全/manifest 坏/lease 冲突：看启动输出 |
| 成员会话内容被截断 | 宿主注入预算需 ≥ 常驻注入链（见 pack README 已知限制） |
| 五角色报 @@browser-use-def ... never started@@ | 没装 browser 两包却设了 @@DSH_COMPANY_BROWSER=on@@：装包或 unset/off |
| @@dsh: pnpm was not found@@ | pnpm 不在 PATH；先 @@corepack enable pnpm@@ 并 @@pnpm -v@@ |
| 升级后页面还是旧模块 | 重启 @@dsh --profile company@@ + 硬刷新；浏览器模块不热加载 |
`.replaceAll('@@', String.fromCharCode(96))
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
