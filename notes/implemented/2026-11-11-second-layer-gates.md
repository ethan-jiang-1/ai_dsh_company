# 2026-11-11 · 第二轮收口：untracked 门禁、market hosted 守卫、config fail-loud

状态：implemented（2026-11-11 落地；验证见下）

上游 = 用户 2026-11-11 第二轮评估后的指令（“这些问题你来都修改了”）。
相关 = [0.11.0 接手面卫生](2026-11-11-handoff-hygiene.md)（第一轮；本 Note 只记第二轮差异）。
后续（2026-11-11）：第三轮 pre-publish READY 闸/config 未知键/READY 边界见 [third-layer Note](2026-11-11-third-layer-publish-scope.md)。

## 决定

1. **内容门禁改扫 working-tree，而不是只扫索引。** 四个 `tracked-*` 门禁
   （portability / token / secrets / file-size）统一用 `git ls-files -co --exclude-standard`：
   tracked + untracked 非 ignored。理由 = 本地收尾常先 verify 再 commit，只扫 tracked 会让
   新文件在 verify 时不可见，commit 后才红（2026-11-11 实测）。
2. **market index 的 READY 与“可托管”分开。** 根 `market-index.json` 仍是发布前预览，不移动
   （moving 会破坏 `market-index.spec` 与 bump 流程）；新增 `pnpm market:hosted` =
   `market-index.mjs --check --hosted`，并在 `release --check` 的 READY 后打印 staged 警告。
   staged 在场时 hosted 检查拒绝，发布后删 staged 再托管。
3. **host config 做运行时类型闸，但不新增 `Config` schema。** 校验搬到
   `host/run-bundle/config.ts`，`apply` 首行调用；只校验类型/空值，不判路径存在性
   （方法层可能尚未创建）。避免为两个可选旋钮新增 `@deepseek-ai/schemastery` peer。
4. **owner 文档路径测试扩面。** `src-readme-pointers.spec` 从单文件扩到 `src/**/*.md` +
   pack README；排除生成物 `lib/**`（fresh clone 未构建时不存在）与 `<...>` 占位符。
   这同时修掉旧测试在 fresh clone 上会因 `lib/client.js` 不存在的隐患。
5. **README/发布合同的 SHA 以 manifest 为准。** Note 不再重复一个会随 Note commit 变化的
   READY SHA；`release --check` 的当前输出是唯一收据。

## 输掉的方案

- **只把根 market index 移到 `_dist`。** 会破坏 `market-index.spec`、`--bump` 流程和
  `release-ready` 的现有形状；本轮用显式 hosted 命令 + READY 警告收口，迁移另起条目。
- **加 `export const Config` schema。** 需要新增 schemastery peer，收益只是两个可选旋钮；
  用内部 fail-loud 校验足够挡住空串/错类型。
- **把 `validateHostConfig` 留在 `index.ts` 导出。** `pack-exports` 明确要求公开面只有
  `apply`/`inject`；已搬到 host 内部模块。
- **只修 `src/README` 一个文件。** 已发生一次 host 分组重排漂移；测试扩到 src 全部 README
  + pack README，避免再靠人记。
- **让 hosted 检查进默认 verify。** staged 在场时它必然红，会把“未发布”误报成“不可收口”；
  它属于 publish handoff，不是每次 verify。

## 后果

- 版本：`0.11.1`；tarball 259 entries，11 个 preset，19 个 delivery-mode 文件。
- 门禁：untracked 探针会同时触发 `tracked-token` / `tracked-secrets` / `tracked-portability`；
  `tracked-file-size` 同源。
- 配置：`cultivationRoot` 空串/非字符串、`handbookSkipPresets` 非数组/含空值 → `apply` 前 throw。
- 发布：`pnpm market:hosted` 成为托管前命令；`release --check` 在 staged 存在时打印 WARN。
- 测试：新增 `tests/host/index/config.spec.ts`；owner 文档测试 3 例；pack 公开面仍只有 apply/inject。

## 验证

实测 2026-11-11：

- 造红（untracked 探针 `docs/zz-second-layer-probe.md`，未 commit）：
  `FAIL tracked-token: working-tree 文件含 token URL … docs/zz-second-layer-probe.md`
  `FAIL tracked-secrets: … key=API_KEY`
  `FAIL tracked-portability: docs/zz-second-layer-probe.md:3 绝对 home 路径`
  删除探针 → `verify: ALL PASS`。修前同一文件 untracked 时 verify 全绿，commit 后才红。
- `pnpm verify` → `ALL PASS；2 门无对象`，exit 0。
- `pnpm test` → `Test Files 187 passed (187)` / `Tests 1545 passed (1545)`，exit 0。
- `pnpm typecheck` → exit 0；`pnpm lint` → 0 warnings/0 errors；`pnpm dup` → 0 clones。
- `pnpm release --verify` → 全绿：`release-smoke` / `company-entry-smoke` / `client-load-smoke` /
  `preset-smoke` / `present-catalog-smoke` 全 PASS。
- `pnpm market:hosted` → 当前 staged 0.11.1 未发布，按设计 exit 1：
  `market-index: served index 仍列着未发布版本 0.11.1 …`；发布后删 staged 才应转绿。
- `pnpm release --check` → READY 0.11.1（最终 SHA 以 `_dist/release-manifest.json` 为准；
  staged 在场时 READY 后另有 WARN）。

## 未验证

- `npm publish` 未执行；staged 保留，registry 上仍没有 0.11.1。
- Desktop/其他 OS、真模型会话未跑；`preset-smoke` 只证挂载。
- dev home 的 3 profile / 2 条失效 workspace 登记未清（运行态，非包内容）。
- 根 market index 仍是发布前预览；本轮用命令 + 警告收口，未改成“发布后才生成”的物理隔离。
