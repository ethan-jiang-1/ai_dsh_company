# 2026-10-05 · company-pack 的 pack/source/generated 边界（steerability 毕业拆分 2/6，已实施）

状态：已消化（2026-10-05 实施完成；来源 = 推敲卡 [repository-steerability](../../_backlog/_done/_closed_plans/2026-10-05-repository-steerability.md) 毕业拆分第 2 条；含同批拍板：src/lib 的 host/domain 物理拆分延后——重启条件见文末）

## 交付（现在时）

- **pack owner 表立**（[packages/company-pack/README.md](../../packages/company-pack/README.md)）：五件各是什么/谁消费——`presets/`（persona+skills 声明）、`src/`（自写实现两半）、`lib/`（**generated 发布产物 read-only** + 刷新顺序 + 「改 src ≠ 浏览器已重建」警示 + 「lib 先变 = 你改错了地方」一行）、`cordis.patch.yml`（bundle 装配行）、`package.json`（发布/注入声明，peer 版本唯一家）。
- **[src/README](../../packages/company-pack/src/README.md) 重写**：两处失效指针修正（`routing.ts` 从未存在；`delegation-keys` 实际住 `src/client/`，旧文误归 lib/）；三入口分列（host 注册入口 / 共享读模型 / client 注册入口）各带消费方向；lib 九模块实名录 + 内部依赖链。
- **lib/ generated 标识**落 owner 表行 + 警示行（不放 lib/ 目录内——`files: lib/**` 会把它打进 tarball）。

## 依赖图（2026-10-05 实测 import 面，归档备拆分裁决）

| 消费者 | → 消费 | 形态 |
|---|---|---|
| `src/index.ts`（host 入口） | `lib/signoff`、`lib/presence`（`export *` 再导出） | 源码 import |
| `src/client/`（company-tabs / company-panels） | `lib/presence`、`lib/board`、`lib/budget` | 类型为主 + 少量纯函数（`UNASSIGNED_LABEL` / `formatTokens`） |
| `tests/company/`（11 spec） | lib 八模块 + `apply` from `src/index.ts` | 源码相对路径直测（不经构建产物） |
| 发布面 | `lib/index.js` + `lib/client.js` ← `tsc -b` + tsdown 两面 | `exports` 字段（`.` / `./client`） |
| lib 内部 | `dag → board → presence`（唯一依赖链） | 源码 import |

## 验证记录

- **判据先行（文档面 = 四问走查）**：上轮 fresh-agent 六入口只读走查已实测四问（改 persona/skill、改 host 工具、改 client 页签、排查会话产物）各给出唯一文件/最窄命令/完成定义——本条交付后走查答案与盘面一一对应：src/README 所列模块/位置全部真实存在（`ls src/lib/` 九文件逐一对照；delegation-keys 位置 grep 实证 client/；内部链 grep 实证）。
- `pnpm verify` ALL PASS（bare-path/md-links 硬档扫两个 README）+ `pnpm test` 316/316。
- 四问最窄验证口径与 [tests/README](../../tests/README.md) 改动面表同构，无第二事实家。

## 输掉的方案（留尸）

- **现在就物理拆 `src/host` + `src/domain`**：同日刚落过 scripts/tests/snapshots 大迁移；盘点显示 lib 消费面清晰（host 两模块、client 三模块、测试八模块、内部一条链）——「位置导致错误修改」的证据不足，拆分延后（用户拍板⑤）。
- **owner 表复制进 docs/**：pack README 唯一家，docs/ 只导航。
- **lib/ 挪出包或改名**：发布合同（release-smoke 验收 lib 形状）不动。
- **lib/ 目录内放 generated README**：`files: lib/**` 会随包发布——标识住 owner 表一行。

## 重启条件（物理拆分；拍板⑤延后）

依赖图或实施证据显示「目录名/位置导致错误修改」（按 README 找错文件复发、或 ≥2 独立消费者经同一 interface 用共享模块且误改面扩大）→ 新卡/新 RFC 引用本条；原卡阶段 5 毕业条件仍然有效：只改视觉不降错误概率即否决；迁移须路径门禁 / keyless / 构建 / 发布形状 / 真实入口全绿。
