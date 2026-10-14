# replay 姿态脱敏 + r3 重录：把「能修都修」的遗留清掉

状态：已交付（2026-10-10；授权 = 用户令「发现的东西能修都修」——收上一轮回执未验证面里的
replay 5 失败与 entry-probe 残留 token 交换）。

## 决定

三件，都源于同一发现：r3-delegation（默认 lane、当时声明 archived）的 5 个失败不是单一原因——
1 个是**机器姿态敏感**，4 个是**内容演进**（persona 改名 wochen→梦之队 ×2、工具表
cordis_inspect_list→bash ×2）。

1. **姿态事件值脱敏**（`tools/lib/replay-logic.mjs` 的 `normalizeReplayTimeContext`，由 replay runner 调用）：
   `sandbox/mode` / `approval/policy` / `permission/preset` 的**值**脱敏为 `{{posture}}`，`source`
   字段（delegation 语义）保留，事件类型与位置照比。理由：值 = env.sh 探测 Seatbelt 的结果，
   是机器策略不是场景语义；与该缝已有的 time-context 脱敏同一哲学（「录制与重放必然不同且非
   场景语义」对称抹平）。
2. **r3-delegation 重录**（`--record`，真模型 2 段 7s+13s）：persona/工具表/事件序列刷新到当前
   （旧录制 2026-09-24，中间隔两次 persona 演进 + 一次工具表演进）；UI 金样 `--ui --refresh-ui`
   同步刷新（wochen→梦之队，头注明示「有意变更时用」）。声明 archived → **runnable**（新判定日期
   + 理由），回归门从 1 个 runnable 场景变 2 个。
3. **entry-probe 残留 token 交换补收**：下游卡当时留下的 3 行本地块（报文 `认证缺 cookie` 不在
   批准统一清单）换成 `companyCookie({ onEmptyCookie: 'throw' })`——本轮授权覆盖，空 cookie 报文
   统一为模块文案，退出码 2 不变。至此 checks/smoke 十个启动块**全部**走模块。

## 输掉的方案

- **场景 patch 钉 sandbox-policy: workspace-write（foundation 同款）。** 实测被否：本机 Seatbelt
  损坏 ⇒ 钉值让 permission 三条事件**整体不发射**（lead 连 permission/preset 都消失）⇒ 比较更红。
  钉值只在后端可用的机器上成立，不解决「基线随机器漂」。
- **降 presence 档**（10-09 判 archived 时写明的另一修法）。**否**：r3 是唯一保住「归一化全量 +
  sidecar 逐字节」保真的场景（脚本注释明说全量形态保真归 r3 full 档），降档等于永久放弃这层判据；
  重录路线保留它。presence 降档适合「不再重录的历史录制」（r2/r6 先例），不适合还能重录的场景。
- **在本机姿态（danger-full-access）下裸录新基线。** 否：基线会随 env.sh 未来翻回 workspace-write
  （Seatbelt 修复后）再次变红——脱敏才是「绿得稳定」而非「今天绿」。
- **给空 cookie 报文加参数。** 否：单调用方不值得第六个参数；按已批准的失败路径文本统一处理。

## 后果与边界

- 脱敏是**比较语义变更**：r3 的 full 档不再检测姿态值回归（`sandbox/mode` 的值漂移不再由 replay
  抓）——姿态回归的检测归权限面自己的检查（entry-probe 的 read-only 档、permission presets 的
  keyless spec），不归 replay 场景。序列与 `source` 仍比。
- 重录后 lead 37 行（旧 33）+ 1 child；录制流 bash 调用 0 条（与旧录制一致）⇒ 工具结果面无姿态
  依赖。`sessions/` 首录归档保留。
- entry-probe 的空 cookie 报文从「认证缺 cookie」变为「token 交换没有拿到 cookie」（失败路径诊断
  文本，退出码不变）。
- **更正前一份 Note 的错误结论**：[sandbox-backend-probe](2026-10-10-sandbox-backend-probe.md) 曾写
  「replay-smoke 与沙箱后端无关」——本轮第三次实跑证伪：那只对 headless lane 成立，web lane 姿态
  敏感。该 Note 已就地更正并互链本 Note。

## 验证（全部实跑）

| # | 命令 | 断言 | 红/绿形态 |
|---|---|---|---|
| 1 | `node checks/smoke/replay-smoke.mjs`（修前对照） | 5 FAILURE：归一化日志 session#0/#1 姿态值差 + 4 sidecar（wochen / cordis_inspect_list） | 红 = 问题清单本身 |
| 2 | 钉值对照实验（stash 前后各跑一次 `--keep`） | 钉 workspace-write ⇒ lead 三条 permission 事件全消失（实测 dump：session/agent/inbox/spliced 直连） | 证伪钉值路线 |
| 3 | 脱敏后、重录前 | dump 显示实际侧 `preset:{{posture}}`、`mode:{{posture}}+source:delegation`——脱敏生效且 source 保留；期望侧仍裸值（旧 fixture）⇒ 仍红 = 对称性缺口如预期 | 半绿 = 管道对、基线旧 |
| 4 | `--record`（真模型） | 「录制 + fixture + sidecar 完成（1 lead + 1 child；lead 37 行）」 | — |
| 5 | `node checks/smoke/replay-smoke.mjs` | **ALL PASS**（归一化零 diff + 4 sidecar 零 diff，13s 无 key） | 修后绿 |
| 6 | `--ui` → `--ui --refresh-ui` → `--ui` | 金样红（wochen）→ 写入 → **ALL PASS** | 有意变更刷新路径 |
| 7 | `node checks/run-gates.mjs` | replay-scene-liveness「runnable 2 / archived 3 / baseline 4」+ ALL PASS | 声明↔磁盘一致 |
| 8 | `pnpm verify` + `pnpm test`（pipefail） | ALL PASS / 全绿 | — |
| 9 | entry-probe 换装后 `node --check` + 全量 `pnpm test` | 语法过、466 绿 | （真模型全跑未执行——探针改的是启动面，形状归 probe-web.spec 管） |

## 指针

- 场景声明：[snapshots/replay/r3-delegation/snapshot.yml](../../snapshots/replay/r3-delegation/snapshot.yml)
- 脱敏实现：[tools/lib/replay-logic.mjs](../../tools/lib/replay-logic.mjs) 的 `normalizeReplayTimeContext`（runner 调用：[checks/smoke/replay-smoke.mjs](../../checks/smoke/replay-smoke.mjs)）
- 后续结构整理：[2026-10-14-code-restructure](2026-10-14-code-restructure.md)；本轮 replay helper 迁移见 [2026-10-14-client-host-replay-locality](2026-10-14-client-host-replay-locality.md)。
