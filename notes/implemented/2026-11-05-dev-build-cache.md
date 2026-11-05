# 构建缓存：源未变时复用 tarball（boot 8.46s → 3.84s）

状态：implemented（2026-11-05）

## 决定

1. `pnpm company` 默认在构建指纹匹配时跳过 `tsc`/`tsdown`/`npm pack`，复用上次 tarball；仍走
   `plugin add file:` 的同形安装（不换路径、不改 `--link`）。
2. 指纹 = 包源（与 release 共用同一份清单）⊕ vendor HEAD ⊕ 根 `pnpm-lock.yaml`；戳住
   `<DSH_HOME>/tmp/dev-pack/build-stamp.json`（runtime，gitignored）。
3. 复用前逐项校验：戳 schema/version/指纹、tarball 在场且 sha 相符、`lib/index.js` + `lib/client.js`
   在场；vendor sha 取不到 → 强制重建；`--rebuild` 是逃生门。
4. 单一 owner：`tools/lib/pack-source.mjs`（release 与 dev 共用）；release 指纹语义不变（只搬家）。
5. 边界：缓存只发生在**安装前**的构建/打包段；`plugin add file:` 与 `dsh --profile company` 的
   boot 次序原样保留（[runtime-map §一](../../docs/runtime-map.md#一完整-web-链时序)）。
6. **启动次序守卫**（同日加）：`dev-product-parity` 门禁新增两条判据——启动器必须
   `spawn [cli, '--profile', 'company', '--', ...]`（不得旁路起服务）且必须走 `planDevStart`（安装判定不得被旁路）。
   反证：把 spawn 改成 `[cli, 'web', ...]` → `FAIL dev-product-parity: dev 启动器没有经 DSH CLI 启动…`；
   还原即绿。

## 输掉的方案

- **换掉 `npm pack`**（pnpm pack / 直接 tar）：能再省约 2s，但削弱"用户侧同形安装"的打包面验证。
- **只缓存 tsc/tsdown**：`npm pack` 仍占约 3s，收益太小。
- **用 mtime 判变化**：`git checkout` 换内容不改 mtime 会漏；换分支又会误判。
- **默认 `--link`**：违反同形安装，且用户此前明确否过。
- **让人手动传 tarball**：易漂、忘构建、zsh 里复活旧产物。

## 后果

- 热启动 **3.84s**（冷构建 5.6s；被去掉的是 tsc/tsdown/pack 三段）。
- 源/vendor pin/lockfile 变、戳缺失/损坏、产物缺失、`--rebuild` → 重建；冷重建 6–19s（受 npm pack 与
  pnpm install 缓存影响），不是缓存路径的稳态。
- 跳过时打印复用哪只 tgz，可审计；`--rebuild` 强制重打。

## 验证（全部实跑，2026-11-05）

- 单测 16 条绿（`dev-install.spec.ts` 12 条 / `pack-source.spec.ts` 4 条）；**反证**：删掉
  `if (force === true) return false` → `--rebuild` 用例红 → 还原绿。
- 真实启动：Boot A（无戳）5.6s 且输出构建行；Boot B 3.84s 且输出
  「源未变，跳过构建打包（复用 …/dsh-company-pack-0.8.8-*.tgz）」；Boot C（改包源）重建 10.2s。
- 最终窗口 `cdp-probe`：9 页签全开、零 `tabFailures`、console/exceptions 零。
- **2026-11-05 17:36 收尾实跑**（当前树，缓存命中）：输出「源未变，跳过构建打包」；boot **8.46s**——
  同机 load avg ~18，服务器段被系统负载抬高（低负载同路径样本 3.84s）；窗口 `cdp-probe` 仍全绿。
- `pnpm verify` ALL PASS；`pnpm test` **143 files / 1131 tests**；`pnpm typecheck` 通过。
- 经验落点：启动序列 = [demo.md §前置](../../docs/demo.md#前置本机)（快序列 + 缓存一句）；
  dev/产品差异表 = [dev-product-parity](../../docs/guides/dev-product-parity.md)。
