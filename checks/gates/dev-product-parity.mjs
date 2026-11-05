// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// ── dev 与产品路径 parity 门禁（dev-product-parity，2026-11-02 立）──────────────
// 为什么：`pnpm company` 曾默认用 `link:` 装包——绕过 npm pack / files 过滤 / 安装副本 peer 解析，
// 于是"dev 里看着对"推不出"用户装上对"（类 deep-research 的 dev/product parity 卡）。2026-11-02
// 改为默认 tarball + `--link` 显式快速通道；本门禁把这条契约钉在实现上，防回潮。
// 判据（每条都有可指回的文件）：
//   ① dev 启动器默认路径含 npm pack + `plugin add file:` + **经 DSH CLI 启动**（`--profile company`），
//      模式从 resolveDevMode 取；启动次序 = DSH 原生（runtime-map §一），缓存只允许在安装前；
//   ② parity 指南在场，且差异表覆盖必须登记的机制点（安装源/版本门/runtime/workspace/凭据/probe）；
//   ③ bootstrap 不再把 link 写成 dev 默认（三处实测漂移：观察窗「装进 web profile」、插拔速查
//      「dev = link:」、升级行「重指 link」）；
//   ④ market index 未发布期：`market-index.staged.json` 在场时，面向用户的 README/手册不得出现
//      `market-index.json`（不得引导用户加一个 registry 里还不存在的版本源）。
// 负例留证 2026-11-02（真树植入，`pnpm verify` 原话，逐条还原即绿）：
//   ① launcher 默认改回 link → `dev 启动器默认模式不是 tarball`;
//   ② 删 parity 指南的「允许差异」行 → `parity 指南缺机制点「允许差异」`;
//   ③ bootstrap 三处各一条：写回「装进 **web profile**」→ `bootstrap 仍写「装进 web profile」`;
//      插拔速查写回「dev = link:」→ `bootstrap 仍把 link 写成 dev 默认`；
//      升级行写回「重指 link」→ `bootstrap 升级配方仍写「重指 link」`;
//   ④ staged 标记在场时在包 README 临时加 `market-index.json` → `未发布期不得在面向用户文档里出现 market-index.json`。
//   ⑤ 2026-11-05 启动次序守卫（真树植入，`pnpm verify` 原话）：把 `spawn(process.execPath, [cli, '--profile',
//      'company', '--', ...])` 改成直接 `[cli, 'web', ...]`（旁路 profile）→
//      `dev 启动器没有经 DSH CLI 启动（缺 spawn [cli, --profile, company, --]）`；还原即绿。
export function run({ root, ok, fail }) {
  const problems = []

  // ① 启动器：默认 tarball + pack/add 都在
  const launcherPath = join(root, 'tools/company.mjs')
  if (!existsSync(launcherPath)) {
    problems.push('缺 tools/company.mjs（dev 启动器）')
  } else {
    const launcher = readFileSync(launcherPath, 'utf8')
    if (!/resolveDevMode\(args\)/.test(launcher)) problems.push('dev 启动器没有从 resolveDevMode 取安装模式')
    if (!/npm'\s*,\s*\['pack'/.test(launcher)) problems.push('dev 启动器缺 npm pack（用户侧同形安装的第一步）')
    if (!/'plugin', '--profile', 'company', 'add'/.test(launcher)) problems.push('dev 启动器缺 plugin add（roster 由 DSH 写，不手改 profile）')
    if (!/spawn\(process\.execPath, \[cli, '--profile', 'company', '--'/.test(launcher)) {
      problems.push('dev 启动器没有经 DSH CLI 启动（缺 spawn [cli, --profile, company, --]）——启动次序必须走 DSH 原生，不得旁路起服务')
    }
    if (!/planDevStart\(/.test(launcher)) problems.push('dev 启动器没有再走 planDevStart——安装判定被旁路')
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

  // ③ bootstrap 不再把 link 写成 dev 默认（观察窗 profile / 插拔速查 / 升级配方三处漂移）
  const bootstrapPath = join(root, 'docs/guides/bootstrap.md')
  if (existsSync(bootstrapPath)) {
    const bootstrap = readFileSync(bootstrapPath, 'utf8')
    for (const [pattern, message] of [
      [/装进 \*\*web profile\*\*/, 'bootstrap 仍写「装进 web profile」（观察窗 profile 是 company；与 docs/profile.md 矛盾）'],
      [/dev = link:/, 'bootstrap 仍把 link 写成 dev 默认（dev = link:；日常通道应是 tarball，link 只作 --link 快速通道）'],
      [/重指 link/, 'bootstrap 升级配方仍写「重指 link」（默认安装是 tarball，重跑即构建 + 重装）'],
    ]) {
      if (pattern.test(bootstrap)) problems.push(message)
    }
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
        if (!existsSync(file)) continue
        const text = readFileSync(file, 'utf8')
        if (/market-index\.json|(^|[^-\w])index\.json|Add index source/.test(text)) {
          problems.push(`未发布期不得在面向用户文档里出现可加的市场源（${rel}）`)
        }
      }
    }
  }

  // ⑤ 分发/安装/初始化 current docs 退役词：防旧说法回潮（2026-11-02）。
  // 负例留证：在 run/README.md 写回「一 home 一 workspace」→ 本门禁红；还原即绿。
  const retired = [
    ['README.md', /插件即产品|产品形状|产品安装|产品入口|产品 home|产品文件|产品承诺/],
    ['packages/company-pack/README.md', /产品形状|产品安装|产品入口|产品 home|产品文件|产品承诺|run bundle/],
    ['_dist/安装手册.md', /产品形状|产品安装|产品入口|产品 home|产品文件|产品承诺|run bundle/],
    ['run/README.md', /一 home 一 workspace|启动器强制|第二个 CEO 新开 home|v2/],
    ['docs/orient.md', /一次安装一个|第二个 CEO 新开 home|run bundle 四件套/],
    ['docs/external-research.md', /26_plugin-data-model|26_plugin-as-product/],
  ]
  for (const [rel, pattern] of retired) {
    const file = join(root, rel)
    if (existsSync(file) && pattern.test(readFileSync(file, 'utf8'))) {
      problems.push(`current docs 仍有退役说法（${rel} / ${pattern.source}）`)
    }
  }

  problems.length === 0
    ? ok('dev-product-parity（启动器默认 tarball + parity 指南 + bootstrap/profile 一致 + 市场 staged 规则 + 退役词）')
    : fail('dev-product-parity', problems.join('；'))
}
