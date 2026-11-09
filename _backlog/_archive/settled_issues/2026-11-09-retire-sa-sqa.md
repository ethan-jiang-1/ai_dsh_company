---
status: 已结
opened: 2026-11-09
---

# 推敲：退役 system-architect / system-qa presets

> 立卡：2026-11-09 ｜ 状态：已结 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：是
>
> 审查：agent — 用户明确要求清理两个旧 preset；删除后 worker family 保留；全门禁绿。
>
> **结论/去向**：note — [退役 Note](../../../notes/implemented/2026-11-09-retire-sa-sqa.md)。

**问题与期望结果：** 前一轮把 `system-architect` / `system-qa` 升成 specialist，但用户要求清理这两个旧思路 preset。需要删除目录与所有接线，让 worker family 成为唯一执行面，并同步测试资产/文档，避免死引用。

**决定：** 删除两份 preset 目录（含 skills）、CEO/vp-eng 命名委托行、package patch/support、`PRESET_IDS/SUPPORT_PRESET_IDS/COMPOSITIONS`、`specialist` archetype 与 `skills/authority` 校验；保留 worker / worker-researcher / worker-orchestrator。SyRS/IRS/V&V 降为可选文档，owner 由 CEO 按需指派。

**输掉的方案：** 保留 specialist（继续旧语义）；把 SA/SQA 折成 worker profile（仍保留 V 模型/veto 职责）；保留目录只删父行（死 preset 留包）。

**验收标准：**

- 两个 preset 目录、patch、support、父行、模型 specialist 均消失；活跃面零死引用。
- `pnpm test tests/presets` 73、`preset-smoke` 6+3、`pnpm test` 1297、`typecheck`、`verify`、`lint`、`dup` 全绿。
- 红配方：把 `system_architect` 行临时加回 CEO → `delegation-composition` 的 namedProfiles 红；还原绿。

**关闭条件：** 以上全绿，且新 [退役 Note](../../../notes/implemented/2026-11-09-retire-sa-sqa.md) 已写入；当前文档不再声称 SA/SQA 存在。历史 SA/SQA Notes 已归档，证据保留。
