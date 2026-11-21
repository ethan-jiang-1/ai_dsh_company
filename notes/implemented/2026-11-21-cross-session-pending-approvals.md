状态：implemented（2026-11-21）｜上游 = [BUG-292](../../_backlog/_archive/fixed_bugs/BUG-292-cross-session-pending-approvals-not-aggregated.md)

# 跨会话挂起审批：走 `session/page`，不新增宿主 API

## 决定

待办面板的「等你处理」要覆盖**同工作区其它会话**里挂着的审批。实现路径：

1. **数据通道 = `remote.session.page`**（网关按 `gateway` source 自己取会话，对**未打开**的会话同样可读）。
   游标沿用 lane 的 `readRecords` 形状：先用 `throughSeq = MAX_SAFE_INTEGER` 探一次（成功取末条 `seq`，
   失败从 `past cursor N` 读），再按游标取一页（800 条）。
2. **候选 = 同 workspace 的 root 会话**（`sessions.byId` 过滤 `origin !== 'subagent'` 与同 `cwd`，
   按 `updatedAt` 倒序 cap 20）；`jumpTo` 指回那条会话，点「去处理」跳过去。
3. **周期重读 15s**：别的会话里新挂起的审批不会像活体那样推过来（观察者只覆盖本页在场期），
   慢周期补上；会话内活体仍是 2s 内存读。
4. **单会话读失败降级**：少那一份历史，不整体失败、不把面板闪成空。

## 输掉的方案

- **`sessions.retain()`**：`SessionReferenceSource` 是 vendor 的封闭联合（`controllerOperation | gateway | …`），
  本包不能自造 source。否。
- **`session/follow` 跨会话**：对**未打开**的会话零 history 帧（两轮实跑，20 候选零帧）。否。
- **新增宿主聚合查询（`@Remote`）**：本包目前一个 `@Remote` 都没有，等于给插件引入一套远程 API；
  用 `session/page` 已经能读，不必新增面。暂不做（若将来 page 的 N 次往返成为瓶颈，再立项）。
- **只把文案写成「本会话」（上一版 C）**：跨会话其实可做，文案缩水是错的方向；本轮把 C 的文案改回
  「本会话与同工作区其它会话里挂着的审批都会出现在这里」。否。

## 状态事实与载体

| 事实 | 唯一入口 | 读载体 | 写载体 |
|---|---|---|---|
| 跨会话重建（探游标 + 取一页 + asked/decided 配对） | `packages/company-pack/src/client/presence/attention-history.ts` | 待办页签的 `pageHistory` 注入面 | `remote.session.page` |
| 候选范围与 cap 20 / 15s 重读 | `packages/company-pack/src/client/tabs/AttentionTab.tsx` | 同上 | 会话列表快照（`sessions.byId`） |
| 接线（page 面下沉） | `packages/company-pack/src/client/index.ts` + `tabs/company-tab-registration.ts` | 页签注入 | 注册处闭包 |

## 验证

- `vitest run tests/client/presence/attention-history.spec.ts`：5/5；**红证**：把探游标那一步改成固定失败
  → 4 failed / 1 passed（重建不出任何挂起项），还原 → 5/5。
- `vitest run tests/client/tabs/attention-tab.spec.ts`：8/8（含「别的会话里挂着的审批经 page 面出现在
  等你处理」与「page 面缺席时退回只覆盖本会话」）。
- 真页面（dev home，默认 never 策略；挂起项来自一条早先以 `ask` 跑的会话）：打开会话
  「连通性检查问候」→ 右栏「待办」→ 渲染
  `待批审批 审批闸门 e2e A 35973：bash：escalate sandbox to danger-full-access: … · 02:49 PM 去处理`
  ——**被看的会话不是那条会话**，跨会话重建生效。

## 未覆盖轴

- [environment-gap] 造「挂起审批」需要 `DSH_PERMISSION_MODE=workspace-write`（本机 `sandbox-exec` 被禁，默认 `never` 会同毫秒自动拒），所以本机复现必须显式设它 → `run/env.sh`
- [policy] 候选只取同工作区 root 会话、cap 20、15s 重读——更大会更全也更贵，属取舍，不是覆盖 → `packages/company-pack/src/client/tabs/AttentionTab.tsx`
- [covered] 探游标两种形态 / asked-decided 配对 / 单会话失败降级 → `tests/client/presence/attention-history.spec.ts`
