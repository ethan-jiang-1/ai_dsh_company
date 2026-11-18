# 2026-11-18 · C16 管线指纹 + 关键件闭包 + 低置信运行态

状态：implemented（2026-11-18 落地；任务源 = 用户「继续新的bug……系统性修起来」）

> 上游 = [C16 探索卡](../../_backlog/issues/2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md) + [20 张缺陷卡](../../_backlog/bugs/README.md)（BUG-243..262）。BUG-212 保持活跃，不并入本批。

## 决定

1. **管线指纹**（243）：release manifest 增 `pipelineFingerprint`（sanitizer/export-dist/release-build/pack-source/CLI）；`release:shape` 同时比对 `sourceFingerprint` 与 pipeline，只改 sanitizer 也要求 `--prepare`。
2. **content inventory 是 shipped 关键件的单一源**（244-247/261/262）：`content/manifest.json` 增 `inventory`（content/** 84 件）；checker 要求每件在 tarball、非空、JSON 可解析；tiers 引用安全/存在/在 inventory；`content-manifest` gate 与盘面双向对账。
3. **关键件 JSON/YAML 的最小 schema**（248-250）：delivery-rules 要 deliveryMode/kind/documents；seed 要非空 seeds/source/target；check-rules 要 productType/layers/files；preset YAML 用 js-yaml（含 `!!js` scalar tag）parse，空/坏 YAML 红。
4. **dev 命令是 source shape 的一部分**（251/252）：vp-eng persona 的 `pnpm methods:init` 改成运行时「安装方法包」；`checkSourceShape` 扫非注释行的 `pnpm <script>`/`node tools|checks|tests`/`run/env.sh`，安装器命令白名单。
5. **降级理由绑定提交**（253）：`--allow-stale=<sha>:<reason>`；裸旗标/任意词红，CI 禁。
6. **lease 读失败 fail-closed**（254）：EACCES/EPERM 不删除、不抢占；ENOENT 重试；空/坏 JSON 才是 stale。
7. **bundle 身份对账**（255/256）：createdAt 必须 ISO 往返（v2 升级坏日期归一 now）；read 只把 pack **name** 不符判 corrupt，同 name 的 **version** 变化走 upgrade（保留 id/createdAt，重写 pack.version），boot 用 `currentPackMetadata()` 且不 block。
8. **presence 未知/删除语义**（257/258）：未知 status 保留事件并标 `revisionGap`；deleted 投影可被显式事件重建并标 gap；completed 仍不被旧 pending 降级。
9. **catalog 坏形状**（259/260）：零字节 final → warning + 无 final；catalog 输出 symlink → warning + 拒绝写。

## 输掉的方案

- 继续手写 REQUIRED 43 条：每次新增运行时文件都漏；改用 content inventory。
- JSON 只 `JSON.parse`：`{}` 通过但运行时缺字段；加最小 schema。
- YAML 只看非空：坏 preset 过门；用 js-yaml 解析。
- `--allow-stale` 任意非空：等于没门；绑定 sha+reason。
- lease 读失败按 stale：权限修复期会双 writer；fail-closed。
- deleted 永久终态：任务无法重建；显式事件 + revisionGap。
- catalog symlink 静默替换：丢用户链接/可能写外；拒绝写。

## 状态事实与载体

- **事实**：content inventory 84；checker 137 entries PASS；pipeline fingerprint 已写入 manifest。
- **唯一入口**：`pnpm test tests/repo/release/shipped-shape.spec.ts`、`tests/host/run-bundle/lease.spec.ts`、`tests/host/run-bundle/bundle-manifest.spec.ts`、`tests/lib/presence/presence-board.spec.ts`、`tests/host/ledger/catalog.spec.ts`；`pnpm verify`（content-manifest/shipped-links）；`pnpm release:shape`。
- **读载体 / 写载体**：先补 spec 负例，再改 checker/运行态；manifest inventory 由 content 盘生成。
- **环境坏法**：权限测试在 root 下不生效；pipeline 指纹只覆盖列出的管线文件；inventory 需要新增文件同 diff 更新。

## 验证

- `pnpm release --prepare --force`：ALL PASS（137 entries；pipeline fingerprint 写入）。
- `pnpm release:shape`：PASS（source + pipeline 匹配）。
- `pnpm test`：262 files / 2281 tests（见收口实测）；`verify`/`typecheck`/`lint`/`coverage` 绿。
- 真入口：`company-entry`/`client-load` ALL PASS。
- 负例：坏 YAML/空 JSON/缺 inventory、dev 命令、lease chmod、bundle 坏日期/pack、presence unknown/deleted、catalog 空/symlink 均有 spec。

## 未覆盖轴

- [covered] shipped inventory/schema/YAML：`pnpm test tests/repo/release/shipped-shape.spec.ts` → `tests/repo/release/shipped-shape.spec.ts`
- [covered] lease/bundle：`pnpm test tests/host/run-bundle/lease.spec.ts` → `tests/host/run-bundle/lease.spec.ts`
- [covered] presence：`pnpm test tests/lib/presence/presence-board.spec.ts` → `tests/lib/presence/presence-board.spec.ts`
- [covered] catalog：`pnpm test tests/host/ledger/catalog.spec.ts` → `tests/host/ledger/catalog.spec.ts`
- [environment-gap] chmod 000 在 root/容器不生效；root CI 可能假绿 → `tests/host/run-bundle/lease.spec.ts`
- [unprovable] pipeline 指纹只覆盖显式列出的管线文件；新增工具需同 diff 加 → `tools/lib/core/pack-source.mjs`
- [policy] BUG-212 仍独立活跃，未修 → `_backlog/_archive/suspended_bugs/BUG-212-pre-push-and-release-tail-budget-overrun.md`
