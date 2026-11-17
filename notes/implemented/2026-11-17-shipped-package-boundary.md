# 2026-11-17 · 运行时/发布面分离：tarball 是被构造出来的

状态：implemented（2026-11-17 落地；任务源 = 用户「不少脚本/代码发布到运行时的不应该那么多，运行时的代码/脚本不应该依赖开发时刻的脚本」+「systematically 修起来」）

> 上游 = [C13 运行时/发布面探索卡](../../_backlog/issues/2026-11-17-runtime-shipped-boundary-exploratory.md) + [10 张缺陷卡](../../_backlog/bugs/README.md)（BUG-213..222）。

## 决定

1. **发布面有自己的构建产物**：`export-dist` 不再直接 `npm pack` 源码 manifest；先打包、解包、`sanitizePackage()` 成运行时形状，再从 sanitized 目录重打。判据纯逻辑 =
   [`tools/lib/release/shipped-shape.mjs`](../../tools/lib/release/shipped-shape.mjs)，
   管线 = [`tools/release/export-dist.mjs`](../../tools/release/export-dist.mjs)，
   手动/CI 入口 = `pnpm release:shape`。
2. **类型只 ship `exports.types` 可达闭包**（BUG-213）：两个入口 `.d.ts` 引用了
   `host/cultivation/cultivation.d.ts` 一个内部声明；闭包 = 3 个 `.d.ts`（原 135 个），
   sanitizer 把相对 import 的 `.ts` 改写为 `.js`（消费方按 `.js`→`.d.ts` 解析）。checker 递归读
   `.d.ts` 的相对 import，目标缺失或仍带 `.ts` 后缀即红。
3. **manifest 去 dev 元数据**（BUG-214/219）：tarball `package.json` 删除 `scripts` 与
   `devDependencies`；源码 `package.json` 保留 `prepack` 与 workspace devDeps（仓库 dev 仍用）。
   `npm pack --dry-run --ignore-scripts` 在解包目录成功；`npm install --dry-run --omit=peer`
   不再 `EUNSUPPORTEDPROTOCOL`。
4. **client 声明从 bundle 与平台基线派生**（BUG-217/221/222）：`dsh.client.inject` = factory 实际
   require 的 package row（`@deepseek-ai/dsh-client-ui-primitives`）+ 有 `peerDependencies` 背书的
   组合/排序边；`react` / `react/jsx-runtime` 由 vendor `PLATFORM_MODULES` 基线提供，不误加为包
   row。删掉 8 条内联边会让 `tests/client/company-client-composition.spec.ts` 红（等待
   `slots/remote/sessions/locale`），所以保留并写清「inject 不是 factory require 的一一镜像」。
5. **shipped 文本与运行时字节分离**（BUG-215/216/218）：tarball `README.md` 来自
   [`README.shipped.md`](../../packages/company-pack/README.shipped.md)（包内链接/稳定外链）；
   bundle 的注释与字符串内 dev 路径在打包前剥离/替换；`cordis.patch.yml` 与 presets 的 dev
   指针加「仓库内，不随包」。pnpm 只作为**DSH 插件安装器**的依赖出现，并给出 vendor CLI 的
   `dsh: pnpm was not found…` 诊断。
6. **source map 不随包**（BUG-220）：tsdown `sourcemap: false`；tarball 无 `.map` 与
   `sourceMappingURL`。代价是安装面调试只能回到源码构建；`company-entry`/`client-load` 不需要 map。

## 输掉的方案

- **直接删 `lib/types/**` 并提供 no types**：可以，但 `exports.types` 是现有公开合同；闭包只有两个
  文件，保留比删掉更没有破坏性。
- **在 source `package.json` 删 `devDependencies`/`prepack`**：会让仓库 dev/构建失去 workspace
  devDeps 与手工 pack 保护；dev 元数据只在 tarball 里清，source 保持可开发。
- **把 8 条 inject 全删、只留 primitives**：实测 `company-client-composition` 三个用例红
  （entry pending：`slots, remote, sessions, locale`）；它们是有 peer 背书的组合边，不是幽灵。
- **把 react 加进 `peerDependencies`/inject**：vendor 其它 client 包不这么做；react 是
  `PLATFORM_MODULES` 基线，checker 以平台基线为准。
- **只在 README 里警告 dev 路径**：tarball 仍然带着 76 处不可解析路径；必须 sanitize/剥离，
  并由 checker 守着。
- **把 pnpm 从 README 完全删掉**：DSH CLI 的 plugin 子命令确实转发给 pnpm；删掉会让缺失诊断
  更不可发现。保留为安装器依赖 + 诊断。

## 状态事实与载体

- **事实**：tarball 0.11.9 = 137 entries（原 268）；`lib/types` 3（两个 exports 入口 + 被引用的 cultivation 声明）；无 `.map`/`sourceMappingURL`；
  manifest 无 scripts/devDeps/workspace；client inject = 9 条组合边 + primitives；shipped README
  = README.shipped.md；shipped 文本的未限定 dev 路径 = 0（cordis 的 3 处带「不随包」）。
- **唯一入口**：`pnpm release --prepare`（`export-dist` 内 sanitize + check）；
  `pnpm release:shape`（对现有 `_dist` 复跑判据）；`pnpm company` / `company-entry` /
  `client-load`（真安装/真页面）。
- **读载体 / 写载体**：读 = `packages/company-pack/README.shipped.md` + `tools/lib/release/shipped-shape.mjs`
  + `tests/repo/release/shipped-shape.spec.ts`；写 = 新增/改 shipped 字节先改 sanitizer/checker，
  再改 source，最后 `pnpm release --prepare` 重打。
- **环境坏法**：README 链接在仓库内和包内是两套判定；bundle 注释可能在字符串/模板里；`inject`
  两种语义（factory arrival / 组合排序）；`PLATFORM_MODULES` 是 vendor 钉树的只读事实。

## 验证

- `pnpm release --prepare --force`：ALL PASS（shipped-shape 137 entries；tarball inventory 137；
  sha/手册同源）。
- `pnpm release:shape`：PASS。
- 解包形状：`npm pack --dry-run --ignore-scripts` 成功；`npm install --dry-run --omit=peer` 成功；
  假 module table 只提供 inject + `PLATFORM_MODULES`，`missing == []`。
- 真入口：`company-entry-smoke: ALL PASS`；`client-load-smoke: ALL PASS`。
- `pnpm test` 262 files / 2218 tests；`pnpm verify` ALL PASS；`pnpm typecheck` exit 0；
  `pnpm coverage:ratchet` PASS（200 文件）。

## 未覆盖轴

- [covered] tarball 字节/元数据/文本：`pnpm release:shape` 对 `_dist` 逐条判 → `tools/release/shipped-shape.mjs`
- [covered] client 组合：`tests/client/company-client-composition.spec.ts`（删 8 条 inject 会红） → `tests/client/company-client-composition.spec.ts`
- [covered] 真安装/真页面：`checks/lanes/company-entry.entry.mjs` + `checks/lanes/client-load.entry.mjs` → `checks/lanes/company-entry.entry.mjs`
- [unprovable] `npm install --dry-run --omit=peer` 不覆盖完整 peer 解析（网络/registry 依赖另记） → `tests/repo/release/shipped-shape.spec.ts`
- [environment-gap] `release:shape` 只在发布期生效：需要 `_dist` 在场；fresh clone/CI 不导出 `_dist` 时只能跳过 → `tools/release/shipped-shape.mjs`
- [policy] source map 关闭降低安装面可调试性；需要时在仓库构建临时改回 → `packages/company-pack/tsdown.config.ts`
