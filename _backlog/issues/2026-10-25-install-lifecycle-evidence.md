---
status: 推敲中
opened: 2026-10-25
---

# 推敲：安装生命周期证据（升级 / 卸载 / 迁移）

> 立卡：2026-10-25 ｜ 状态：推敲中 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：否

**问题与期望结果：** 手册承诺“升级只动没改过的基部、改过的保留并点名；卸载不动数据；备份/迁移连 home 一起搬”。现在只有首启/二启的真安装证据，升级只有单测、卸载与迁移没有证据。期望：用真 tarball 把这三条承诺跑成可复现的 keyless 检查。

**当前情况：**
- [release-smoke.mjs](../../checks/smoke/release-smoke.mjs) 覆盖：真 tarball 安装 → 首启落骨架 + `bundle.json` → 二启零变更；没有 v1→v2、卸载、挪 home。
- 升级逻辑在 [bundle-manifest.ts](../../packages/company-pack/src/host/bundle-manifest.ts)：逐文件 create/update/keep，`applySkeletonUpgrade` 逐文件写；单测在 [bundle-manifest.spec.ts](../../tests/company/bundle-manifest.spec.ts)。
- 手册第四/五/六节（[_dist/安装手册.md](../../_dist/安装手册.md)）写了升级/备份/卸载，但没有对应验收。
- 升级日志只到 `ctx.logger.info`（host 入口），没有断言“保留了哪些文件”。
- 半途失败/中断时，已写文件与 `bundle.json` 可能不同步；没有恢复测试。

**未决问题：**
- v2 测试包怎么造：临时复制 pack、改版本、改一个骨架文件，再 `npm pack`；是否允许测试夹具进入仓库（建议只进 `runtime/` 临时区，不进 git）。
- 迁移的边界：home 在盘内（`workspace` 记相对）与盘外（记绝对）两种都要测，还是只测默认？
- 卸载后的再安装：是否要保留 `bundle.json`/workspace，还是要求用户显式清理？

**下一步：** 等卡 1 的版本/回滚语义定稿；写 RFC，扩 release-smoke（或新增 `lifecycle-smoke`），用两个临时 tarball 跑红→绿。

## 范围与排除项
- 范围：真安装的升级/卸载/迁移证据；必要的升级日志断言；失败恢复的最小检查。
- 排除：registry 升级、降级、并发升级、跨 OS；这些另立卡。

## 已知与未决
- 已知：`dsh plugin remove` 只摘依赖和层，不碰数据（DSH 行为）。
- 未决：升级半途崩溃的恢复语义（重跑幂等 / 回滚到旧版本 / 备份）。

## 方案与取舍
- A 扩展现有 `release-smoke`：复用安装/启动设施，但脚本会变长；推荐。
- B 新建 `lifecycle-smoke`：职责更清楚，代价是重复启动/清理代码；可共享 `tools/lib`。
- C 只做单测：不满足“真安装”的证明边界，不采用。

## 验收标准

（初稿；RFC 时定稿。）

- v1 真装 → 改 `AGENTS.md` + `kb/org.md` + 加 journal/交付物 → v2 真装 → 启动：未改的基部替换、改过的保留并在日志点名、扩张面一个字节不动、`bundle.json` 版本前移、二启零变更。
- 卸载：`plugin remove` 后 profile 无该 bundle，home/workspace 数据仍在；再装可恢复。
- 迁移：把 home 挪到新路径后启动，`bundle.json` 的 workspace 记录仍能解析，sessions/workspace 可见。
- 负例：升级中断/写失败后，下一次启动能诊断或重跑，不静默半套。

## 关闭条件
- 卡 1 的版本/回滚语义已定；RFC 已批；上述检查实跑红→绿；卡顶写结论与去向。

## 裁决（2026-10-25）

- 按卡 1 的版本/回滚语义实施；v1/v2 夹具只落 `runtime/` 临时区，不进 git；升级日志断言保留清单。
- 去向：`notes/implemented/2026-10-25-distribution-lifecycle.md`。
