---
status: 调查中
severity: P1
opened: 2026-11-27
---

# BUG-388：待办「等你处理」对活体挂起审批显示重复条目，且有扫描边界时小节标题下留整片空白

> 严重级别：P1（跨源去重契约失效导致同一挂起审批在「等你处理」渲染两条一模一样的条目；叠加 BUG-328 后零挂起 + 边界提示时「等你处理」标题下直接悬空）｜发现：2026-11-27｜状态：调查中

## 症状

1. **活体 + 历史双重出现**：在真实模型会话（`Phase3 双签验证 61099`）触发 `request_signoff` 挂起并切回其他会话看「团队 → 待办」时，`等你处理` 列表对同一条 `Phase3 双签验证 61099` 双签审批并列渲染了**两条完全相同的待批条目**（均带 `刚刚 去处理`）；等到页面重新加载或脱离活体登记后才缩回一条；
2. **标题下留白**：当 `waiting.length === 0` 且存在 `还有 N 个会话没扫` 等边界提示时（如 dev 盘 `新产品标准化包定义验证` 场景），`等你处理` 小节标题下方既无条也无说明文案，形成一整块突兀空白（`attention-panel-probe.mjs` 实测 `A2 FAIL: empty=0 goButtons=0`）。

## 运行面

- **面 = client + lib**：[attention-observers.ts](../../packages/company-pack/src/client/wiring/attention-observers.ts#L54-L68)、[attention.ts](../../packages/company-pack/src/lib/presence/attention.ts#L197-L206) 与 [第 259-323 行](../../packages/company-pack/src/lib/presence/attention.ts#L259-L323)、对比上游 [vendor/dsh/.../ui-approval/src/client/index.ts](../../vendor/dsh/packages/client/ui-approval/src/client/index.ts#L45-L53)；[AttentionTab.tsx](../../packages/company-pack/src/client/tabs/AttentionTab.tsx#L228-L235)。

## 复现

```sh
source run/env.sh && node runtime/tmp/ux-audit/phase3-live-ux.mjs
source run/env.sh && node probes/browser-visual/attention-panel-probe.mjs --title "新产品标准化包定义验证"
```

实测证据：
- 实测 `phase3-live-ux.mjs` 首次运行（批准前）截屏 `runtime/tmp/ux-audit/out/shots/32-phase3-live-req-command.png`：右栏 `等你处理` 下前两行同为 `Phase3 双签验证 61099：request_signoff：discount sign line ... · 刚刚 去处理`；
- `runtime/human-exits-evidence/attention-panel/desktop.png` 显示「等你处理」标题正下方为纯空白区域。

## 根因与证据

1. 上游 `remote.$on('approval/request')` 传入的 `ClientApprovalRequest` 只含 `{ toolName, callId, reason, displayReason, signal }`，**没有 `id` 字段**（见 [vendor/dsh ui-approval index.ts](../../vendor/dsh/packages/client/ui-approval/src/client/index.ts#L45-L53)）。
2. `attention-observers.ts` 对 `approval/request` 调 `approvalFromPayload(request)` 提取 `id`，导致活体条目 `id` 恒为 `undefined`，在 `attentionItemKey` 回退到 `${kind}\0${jumpTo}\0${since}`（毫秒时间）；而 `ownAsks.items` / `history.items` 来自持久化事件 `approval/asked`，带真实 `#id`（[attention.ts](../../packages/company-pack/src/lib/presence/attention.ts#L228-L237)）。
3. `mergeAttention()` 的 `seen.has(key)` 因此永远无法将 `live` 活体项与 `history` / `ownAsks` 历史重建项匹配，同一审批被显示两遍。
4. 空态方面，[AttentionTab.tsx](../../packages/company-pack/src/client/tabs/AttentionTab.tsx#L229-L234) 为防谎报 `没有等你的事` 直接返回 `null`，未在有边界时给出带限定语的空态提示（如「已扫的近期会话里暂无待办」）。

## 期望判据

- 活体 `approval/request`（可借助 `callId` 或与历史同源的内容配额，同 `liveQuestionBudget` 思路）与历史 `approval/asked` 在 `mergeAttention()` 中严格 1:1 消重，只渲染 1 条（保留两条不同 `callId`/同摘要审批仍各自分立）；
- `waiting.length === 0 && hasBoundary(boundaries)` 时展示如实带边界限定的占位文案，不再悬空标题。
