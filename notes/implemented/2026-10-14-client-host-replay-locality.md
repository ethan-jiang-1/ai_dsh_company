# 客户端页签、培养 Host seam 与 replay 判据的局部化

状态：implemented（2026-10-14；授权 = 用户批准行为保持的源码结构重构：「好的, setup goal 后推进吧, 记得这都是重构, 别弄完后破坏了原来的逻辑」；沿用 [前一轮代码重构决定](./2026-10-14-code-restructure.md) 未覆盖的约束：不改业务行为，不刷新 replay 夹具。）

## 决定与关系

这是新一轮后续决定，覆盖 Client 页签装配、Host cultivation 命令/存储、Replay 判据三个切面；对 [2026-10-14-code-restructure](./2026-10-14-code-restructure.md) **部分后续**，旧 Note 的六项决定、理由和旧验证收据保持原文不动。旧 Note 增加本轮指针；本 Note 记录新增 seam 与当前事实。Replay normalization 的历史决定仍在 [2026-10-10-replay-posture-redaction](./2026-10-10-replay-posture-redaction.md)，该 Note 的实现路径已更新到当前落点。

1. **Client Lead/follow 适配器**：[company-session-adapters.ts](../../packages/company-pack/src/client/company-session-adapters.ts) 集中 child→parent Lead 寻址及 follow 快照/live-event 帧投影；消费面仍按既有作用域组装。
2. **Client 页签注册目录**：[company-tab-registration.ts](../../packages/company-pack/src/client/company-tab-registration.ts) 的固定 `TAB_REGISTRATIONS` 并置八个页签的身份/元数据与 body/title/guide keyed 回调；`index.ts` 仍是 composition root。三个 slot group 仍分别 `slots.inject`，由 Cordis 各自管理声明等待、销毁与重装。
3. **Host cultivation seam**：[cultivation.ts](../../packages/company-pack/src/host/cultivation.ts) 在模块内用固定 Node `CultivationStorage` 适配器承载文件操作，并把命令 handler 从注册体移出；`registerCultivation` 仍注册工具与命令。存储接口不是调用方可注入的公开替代面；没有把 correct/suggest 等规则抽为共享纯模块。
4. **Replay 纯逻辑**：[replay-logic.mjs](../../tools/lib/replay-logic.mjs) 仅承载 `normalizeReplayTimeContext` 与 full/presence `judgeReplaySessions`；[replay-smoke.mjs](../../checks/smoke/replay-smoke.mjs) 仍负责会话构造/归一外壳、sidecar、UI 判据、CLI 与输出，`replay-ui.mjs` 不变。缺少 expected session 时的空夹具语义、full 首差异、presence 排序后的 member/task 集合判据保持原样。

## 输掉的方案

- **继续维护平行的 Lead/follow 包装实现**：被否，两个消费面容易在子会话归并与 follow 帧过滤上漂移；改为共享适配器，header action 仍只复用 Lead lookup，不引入 follow 依赖。此取舍已在本轮结构讨论中明确。
- **把整个 Client `apply` 或每个页签分别拆成模块**：本轮选择让 `apply` 保留 composition root，只把页签注册组收成一个模块，避免过度拆分和跨文件跳转。
- **整体重写 replay runner 或按 mode 拆 CLI**：被否，保留既有 CLI、副作用与 `replay-ui` 分层；只抽可 keyless 验证的纯 normalizer/judges，不改运行流程、标签与共享状态边界。

## 后果与覆盖边界

- 页签身份与三种贡献集中在一个目录；Cordis slot 声明 epoch 仍彼此独立。真实 `Context`/`SlotRegistry`/`SidebarRightTabRegistry` 测试覆盖声明等待、key/component/props、折叠后独立重装与卸载，但不代替完整 Client Loader/profile 装配。
- cultivation handler 可在隔离的真实临时文件上观察；当前新增命令行为仅覆盖提案纠正写盘、跨角色 adoption 拒绝、目标角色 adoption 成功，不声称 reject/verify/revoke 全分支覆盖，也不声称完整 Host runtime 装配。
- replay 纯规则可 keyless 直测；第三档 runner 与 fixture 未拆分，未刷新 snapshots。默认 r3 重放仍有基线中三类 FAIL（normalized log、两个 tool-schema sidecars）；UI lane 有相同三类再加 centerCol 金样差异。

## 验证（实际执行）

| 命令 / 试验 | 断言 | 红 / 绿形态 |
|---|---|---|
| `pnpm exec vitest run tests/client/company-tab-registration.spec.ts tests/client/company-session-adapters.spec.ts tests/company/cultivation.spec.ts tests/harness/replay-logic.spec.ts` | 四个 seam 的 targeted specs | 4 files / 25 tests PASS（初次聚焦运行） |
| 临时把 `company-tab-registration.ts` 的 attention id 改为 `attention-mutated`；跑 `pnpm exec vitest run tests/client/company-tab-registration.spec.ts`；还原后重跑 | 注册 key 漂移能否被独立期望抓住 | 红：1 test failed，expected `dsh-company-pack/attention`、收到 `attention-mutated`；还原绿：1/1 PASS |
| 临时让 `createLeadLookup` 返回当前 session 而非 parent；跑 `pnpm exec vitest run tests/client/company-session-adapters.spec.ts`；还原后重跑 | child 路由是否归到 Lead | 红：1 test failed，expected `lead-session`、收到 `child-session`；还原绿：1/1 PASS |
| 临时反转 adoption 的 target-role guard；跑 `pnpm exec vitest run tests/company/cultivation.spec.ts`；还原后重跑 | 跨角色不得采纳、目标本人可以采纳 | 红：2 failed / 17 passed，跨角色请求错误成功、目标本人反被拒；还原绿：19/19 PASS |
| 临时停用 `TIME_CONTEXT_SAMPLE` 正则；跑 `pnpm exec vitest run tests/harness/replay-logic.spec.ts`；还原后重跑 | 时间样本归一化合同 | 红：1 failed / 3 passed，时间戳未替换；还原绿：4/4 PASS |
| `set -o pipefail && pnpm verify && pnpm test` | 门禁、Note/link/path/doc-budget 与全量 keyless 回归 | ALL PASS：verify ALL PASS；59 files / 550 tests PASS |
| `pnpm exec tsc -b packages/company-pack --pretty false && (cd packages/company-pack && ../../node_modules/.bin/tsdown)` | 两半类型检查与构建 | 通过；Host/Client build complete；仅 `external` deprecation warnings |
| `source run/env.sh && node checks/smoke/client-load-smoke.mjs` | 真实浏览器插件挂载与 loader 健康 | ALL PASS：无 mount failure、无 loader error、品牌槽在场 |
| `source run/env.sh && node checks/smoke/replay-smoke.mjs --scenario r2-motion`；`source run/env.sh && node checks/smoke/replay-smoke.mjs --ui --scenario r2-motion` | presence 判据及驾驶舱端到端 | 两项 ALL PASS；后者验证五角色在场行及点击成员进入会话 |
| `source run/env.sh && node checks/smoke/replay-smoke.mjs` | 默认 full lane 与已知失败基线做签名核对 | exit 1：三类失败签名与保存基线一致（normalized log、两个 tool-schema sidecars）；未刷新 fixture |
| `source run/env.sh && node checks/smoke/replay-smoke.mjs --ui` | 默认 full + 委派 UI | exit 1：相同三类 replay FAIL + 一项既有 centerCol UI 金样差异；委派卡 render/aria 判据 PASS，未刷新金样 |

为运行完整 pre-change 基线，在当前 HEAD 建立了隔离 worktree；但该 worktree 的 shell 命令报 `spawn sandbox-exec ENOENT`，未能在其中执行基线测试或 replay，临时 worktree 已移除。因此不声称完成全仓逐文件 pre-change 对照；证据为已保存的 replay 失败签名基线、keyless contract specs、四项真实变异红/还原绿及当前认证 smoke。

## 语义审与未验面

按授权原文、源码图与 `tests/README.md`、证据层级及当前 diff 复核：**blocker 0**；独立盲审也未发现行为漂移。`tests/README.md` 已把 Host registered callback 行为路由到 `tests/company`、Client slot 注册路由到 `tests/client`、`tools/lib` replay seams 路由到 `tests/harness`。未做固定 GUI URL `http://127.0.0.1:3080` 的人工视觉走查，也未核验 `dev:web` watcher；`client-load-smoke` 是本轮真实浏览器装载证据。`docs/design/ui-demo.md` 的旧 polling 与 CompanyView「用量」子页描述属于既有文档 drift，未纳入本轮；不相关的 CEO journal untracked 文件亦未纳入。

- 测试资产：新增/扩展 4 个 seam spec/用例组，覆盖 tab catalog/lifecycle、Lead/follow projection、cultivation registered callbacks 三条行为路径、replay normalization/judges；未新增 replay 场景或视觉金样。
- 收割三问：①未发现新异常，replay FAIL 与已知基线相同；②需要固定的行为由上述 keyless specs 覆盖，未新增场景或夹具；③确认 Seatbelt 不可用时 `run/env.sh` 导出 `danger-full-access`，属于已有运行环境事实，不是本轮修复目标。

## 指针

- 前一轮六项结构决定（保留原文）：[2026-10-14-code-restructure](./2026-10-14-code-restructure.md)
- Replay normalization 原始取舍：[2026-10-10-replay-posture-redaction](./2026-10-10-replay-posture-redaction.md)
- 当前源码导航：[company-pack src README](../../packages/company-pack/src/README.md)
- 测试分区与改动面路由：[tests README](../../tests/README.md)
