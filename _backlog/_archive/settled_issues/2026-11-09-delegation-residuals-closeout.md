---
status: 已结
opened: 2026-11-09
---

# 推敲：委派面三条残差收口

> 立卡：2026-11-09 ｜ 状态：已结 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：是 ｜ 审查：agent — 用户要求零残留；三条均有决定/证据
>
> **结论/去向**：note — [残差收口 Note](../../../notes/implemented/2026-11-09-delegation-residuals-closeout.md)。

**问题：** P-H/P-I 真失败注入、worker-workflow planned、host interrupted/lost 终态三条残差。

**决定：** P-H/P-I 用 tool-boundary fake-subagents 确定性注入 + 真实采用；worker-workflow no-go；host terminal 用 `companyDelegationTerminal` session projection，客户端树精确显示 reason，缺时回退/ unavailable。

**验收：** `pnpm test` 1300；`preset-smoke` 6+3；typecheck/verify/lint/dup 绿；ui-scene 9 页签金样一致；`lost` 仅当 host 投影提供，workflow run lost 不在 session tree。

**关闭条件：** 所有未决 todo 清空，且上述证据写入 Note；不再有 planned `worker-workflow` / 真 LLM failure 门禁 / host 终态待补条目。
