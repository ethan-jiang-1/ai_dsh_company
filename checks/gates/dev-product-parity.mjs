// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// ── dev 与产品路径 parity 门禁（dev-product-parity，2026-11-02 立）──────────────
// 为什么：`pnpm company` 曾默认用 `link:` 装包——绕过 npm pack / files 过滤 / 安装副本 peer 解析，
// 于是"dev 里看着对"推不出"用户装上对"（类 deep-research 的 dev/product parity 卡）。2026-11-02
// 改为默认 tarball + `--link` 显式快速通道；本门禁把这条契约钉在实现上，防回潮。
// 判据（每条都有可指回的文件）：
//   ① dev 启动器默认路径含 npm pack + `plugin add file:`，模式从 resolveDevMode 取；
//   ② parity 指南在场，且差异表覆盖必须登记的机制点（安装源/版本门/runtime/workspace/凭据/probe）；
//   ③ bootstrap 观察窗一节不再写「装进 web profile」（活文档漂移，实测与 profile.md 矛盾）；
//   ④ market index 未发布期：`market-index.staged.json` 在场时，面向用户的 README/手册不得出现
//      `market-index.json`（不得引导用户加一个 registry 里还不存在的版本源）。
// 负例留证 2026-11-02（真树植入，`pnpm verify` 原话，逐条还原即绿）：
//   ① launcher 默认改回 link → `dev 启动器默认模式不是 tarball`;
//   ② 删 parity 指南的「允许差异」行 → `parity 指南缺机制点「允许差异」`;
//   ③ bootstrap 临时写回「装进 **web profile**」→ `bootstrap 仍写「装进 web profile」`;
//   ④ staged 标记在场时在包 README 临时加 `market-index.json` → `未发布期不得在面向用户文档里出现 market-index.json`。
export function run({ root, ok, fail }) {
  const problems = []

  // ① 启动器：默认 tarball + pack/add 都在
  const launcherPath = join(root, 'tools/company.mjs')
  if (!existsSync(launcherPath)) {
    problems.push('缺 tools/company.mjs（dev 启动器）')
  } else {
    const launcher = readFileSync(launcherPath, 'utf8')
    if (!/resolveDevMode\(args\)/.test(launcher)) problems.push('dev 启动器没有从 resolveDevMode 取安装模式')
    if (!/npm'\s*,\s*\['pack'/.test(launcher)) problems.push('dev 启动器缺 npm pack（产品同形安装的第一步）')
    if (!/'plugin', '--profile', 'company', 'add'/.test(launcher)) problems.push('dev 启动器缺 plugin add（roster 由 DSH 写，不手改 profile）')
    const planner = join(root, 'tools/lib/dev-install.mjs')
    if (!existsSync(planner)) problems.push('缺 tools/lib/dev-install.mjs（安装规划纯函数）')
    else if (!/argv\.includes\('--link'\) \? 'link' : 'tarball'/.test(readFileSync(planner, 'utf8'))) {
      problems.push('dev 启动器默认模式不是 tarball（resolveDevMode 首选项被改）')
    }
  }

  // ② parity 指南 + 必登记机制点
  const parityPath = join(root, 'docs/guides/dev-product-parity.md')
  if (!existsSync(parityPath)) {
    problems.push('缺 docs/guides/dev-product-parity.md（差异必须有家，不能只存在口头约定）')
  } else {
    const parity = readFileSync(parityPath, 'utf8')
    for (const point of ['安装源', '版本门', 'runtime', 'workspace', '凭据', 'probe', '允许差异']) {
      if (!parity.includes(point)) problems.push(`parity 指南缺机制点「${point}」`)
    }
    if (!/^\|.+\|$/m.test(parity)) problems.push('parity 指南没有差异表')
  }

  // ③ bootstrap 不再把观察窗装进 shipped web profile
  const bootstrapPath = join(root, 'docs/guides/bootstrap.md')
  if (existsSync(bootstrapPath) && /装进 \*\*web profile\*\*/.test(readFileSync(bootstrapPath, 'utf8'))) {
    problems.push('bootstrap 仍写「装进 web profile」（观察窗 profile 是 company；与 docs/profile.md 矛盾）')
  }

  // ④ 未发布期不得引导加市场源
  const stagedPath = join(root, 'market-index.staged.json')
  if (existsSync(stagedPath)) {
    let staged
    try {
      staged = JSON.parse(readFileSync(stagedPath, 'utf8'))
    } catch (error) {
      problems.push(`market-index.staged.json 不可解析：${String(error).split('\n')[0]}`)
    }
    if (staged !== undefined) {
      const pack = JSON.parse(readFileSync(join(root, 'packages/company-pack/package.json'), 'utf8'))
      if (staged.version !== pack.version) problems.push(`staged 标记版本 ${String(staged.version)} ≠ package ${pack.version}`)
      if (staged.requiresPublish !== true) problems.push('staged 标记缺 requiresPublish: true（语义：索引声明的版本尚未发布）')
      for (const rel of ['README.md', 'packages/company-pack/README.md', '_dist/安装手册.md']) {
        const file = join(root, rel)
        if (existsSync(file) && readFileSync(file, 'utf8').includes('market-index.json')) {
          problems.push(`未发布期不得在面向用户文档里出现 market-index.json（${rel}）`)
        }
      }
    }
  }

  problems.length === 0
    ? ok('dev-product-parity（启动器默认 tarball + parity 指南 + bootstrap/profile 一致 + 市场 staged 规则）')
    : fail('dev-product-parity', problems.join('；'))
}
