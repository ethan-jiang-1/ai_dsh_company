#!/usr/bin/env node
// 状态：常驻
// 何时跑：需要交付 tarball 给仓库外的人时（版本号变动后、给无仓库权限者、风险变更前快照）；无 key，秒级。
// 用法：node scripts/tools/export-dist.mjs
//
// 手动分发导出（精神借 ai_dsh_architect 的 export-dist，2026-09-28）：把 company-pack 打成
// _dist/ 下的 tarball + 同目录生成《安装手册》。三条规矩照搬：
//   ① _dist/ 是导出目的地不是源——tgz 全 gitignore，手册是唯一 tracked 例外（版本门禁防漂）；
//   ② 打包步 = release-smoke 每轮证明的同一个 `npm pack`（npm cache 钉 scratch，不碰 ~/.npm），
//      导出后对产物本体再跑一遍清单边界断言（必备条目在场、无 package/ 外文件）；
//   ③ 手册由脚本生成、注入版本与日期，永不手改——手册和旁边的 tarball 不可能漂。
// 导出 ≠ 发布：不 bump 版本、不跑门禁（除清单）、不发布任何 registry——按工作树现状打包。
import { repositoryRoot as repoRoot } from '../lib/repository-layout.mjs'
import { spawnSync } from 'node:child_process'
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
  // 验证基线的事实家 = run-gates.mjs；先核对输入，再替换已有导出。
  const gatesText = readFileSync(join(repoRoot, 'scripts', 'run-gates.mjs'), 'utf8')
  const expectedTag = /const expectedTag = '([^']+)'/.exec(gatesText)?.[1]
  if (!expectedTag) throw new Error('run-gates.mjs 缺 expectedTag；未替换已有导出')

  // 只清本脚本自己的旧产物，不动 _dist/ 里别人放的东西
  mkdirSync(distDir, { recursive: true })
  for (const name of readdirSync(distDir)) {
    if (name === manualName || /^dsh-company-pack-.*\.tgz$/.test(name)) {
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
  const must = ['package/cordis.patch.yml', 'package/package.json', 'package/lib/index.js', 'package/lib/client.js']
  const missing = must.filter((entry) => !entries.includes(entry))
  const presetFiles = entries.filter((entry) => entry.startsWith('package/presets/')).length
  const outside = entries.filter((entry) => !entry.startsWith('package/'))
  report('tarball inventory', listed.status === 0 && missing.length === 0 && outside.length === 0 && presetFiles > 0,
    missing.length ? `missing: ${missing.join(', ')}` : `${entries.length} entries, presets ×${presetFiles}${outside.length ? `, outside package/: ${outside.join(', ')}` : ''}`)

  // 3. 手册——脚本生成，版本/日期/条目数注入；步骤镜像 release-smoke 验证过的安装路径
  const date = new Date().toISOString().slice(0, 10)
  const manual = `# dsh-company-pack 手动安装手册

| | |
|---|---|
| 版本 | ${version} |
| 安装包 | \`${tarballName}\`（与本手册同目录） |
| 打包日期 | ${date} |
| 验证基线 | DSH \`${expectedTag}\`（Node ≥ 22.19） |

这个安装包是自包含的：bundle 补丁（cordis.patch.yml）、五个角色 preset（presets/）、浏览器端
（lib/）、README，共 ${entries.length} 个条目——不需要 npm registry，不需要克隆仓库，拿到这一个文件就能装。
下面的步骤与仓库发布冒烟（release-smoke）每轮自动验证的路径一致，是被证明过的顺序。

## 一、安装

默认装进你日常的 \`web\` profile（DSH 出厂默认名），装完重启就能用：

\`\`\`sh
dsh plugin --profile web add /path/to/${tarballName}
dsh plugin --profile web add @deepseek-ai/dsh-experimental-schedule-bundle
\`\`\`

第二行装**节律 bundle**（日期通道 time-context + 定时提醒 schedule + 任务页 ui-schedule——
行归它所有，装完自动启用）。不开它角色会话就没有日期注入与定时能力（公司手册「日期口径」
按 fail-closed 口径执行）；之后想关，网页插件页一键开关即可。
\`\`\`sh
\`\`\`

想先隔离试用、不动日常环境？换一个名字，多一步一次性初始化：

\`\`\`sh
dsh --profile try-company --from-default-profile web --dump-config   # 只需第一次
dsh plugin --profile try-company add /path/to/${tarballName}
\`\`\`

（后文以 \`web\` 为例；用了别的名字，把命令里的 \`web\` 换成它即可。）

## 二、验证安装

\`\`\`sh
dsh --profile web --dump-config
\`\`\`

输出里应能看到：

- 插件的补丁层（\`dsh-company-pack\`）；
- \`id: preset-ceo\`（五个角色 preset 之一；CEO/VP-Eng/VP-Sales/COO/CFO 都应在场）；
- \`id: company-client\`（浏览器端公司面板的挂载行）。

## 三、让它出现在界面上

重启 \`dsh web\`（浏览器刷新本身不会加载新模块），然后**硬刷新**页面（⌘⇧R / Ctrl⇧R）。之后：

- 侧栏出现公司面板（在场 / 依赖图 / 用量 / 任务板 / 台账）；
- 新会话把 preset 切到任一角色（如 \`preset-ceo\`）即可按该角色工作。

## 四、卸载（干净，无残留）

\`\`\`sh
dsh plugin --profile web remove dsh-company-pack
\`\`\`

卸载后 \`--dump-config\` 不再提及插件，profile 的 package.json 也不留痕迹。

## 常见问题

| 现象 | 原因与处理 |
|---|---|
| 刷新后什么都没出现 | 浏览器刷新不加载新模块：重启 \`dsh web\`，再硬刷新页面 |
| 想确认装了什么版本 | \`dsh plugin --profile web list\`，或看本手册表头的版本号 |
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
