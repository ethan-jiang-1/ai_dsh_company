---
status: 已定性
opened: 2026-11-07
---

# VP-Eng 组队：三种门的能力边界（根门 / 命名 child / CEO teammate）

> 问题：VP-Eng 能不能像 CEO 一样组队解决研发问题——简单自己处理、复杂依赖 CMO/SA/SQA，产出 MRD/PRD 与细节，同时不破坏 CEO 组队？
> 消费者：用户 2026-11-07 直接提出；[落地拆法卡](../../issues/2026-11-07-requirements-teaming-landing.md)（B1/B2）。
> 产出的卡：[程序伞卡](../../issues/2026-11-07-requirements-teaming-landing.md) + [B1 组队能力](../../issues/2026-11-07-vpeng-teaming.md) / [B2 E2E + 收口](../../issues/2026-11-07-vpeng-evidence-closeout.md)。
> 结论：**VP-Eng 在自己的根门里可以带“同组合的研发小队”，但不能把 CMO/SA/SQA 拉成 teammate**——teammate 继承 Lead 的 preset，只有命名 child 才由 `agentPreset` 给真人格；跨角色依赖走命名委托。CEO 的组队不动，VP-Eng 组队是“多门模式”的延伸，不是 CEO team 的替代。

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-07-three-doors.md](2026-11-07-three-doors.md) | 机制事实、三种门的能力表、旧文案/测试的修正点、B1/B2 设计与证据计划 | 2026-11-07 |

## 一句话

**根门 = Lead**：VP-Eng 根会话能 `spawn_teammate`，带的是 VP-Eng 组合的工程师（适合并行拆 PRD/细节），但不能让 teammate 冒充 CMO/SA/SQA。要真人格，走 `vp_cmo` / `system_architect` / `system_qa` 命名委托；要反复改稿就再委托一次、带上一稿。
