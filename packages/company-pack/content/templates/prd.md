# PRD（产品需求 · 需求账本 + 一页纸）

> 主笔 = **VP-Eng**；输入 = 同目录 `drafts/mrd.md`（CMO 的市场机会）；落 `drafts/prd.md`。
> **它不是文章**：研发按 slice 一批一批吃，**一 REQ 一任务**；每条 REQ 必须指回 MR id。
> 机械校验 = `/prd check <deliverables 目录名>`；字段写不出就写"未定"，别用形容词填。
> 技术方案 ≠ 本文件（那是 `review-note.md`）；定价 ≠ 本文件（归 VP-Sales / CFO）。

```json
{
  "prd": {
    "version": "0.1",
    "status": "draft",
    "slices": [
      { "id": "S1", "goal": "最小端到端：<能演示/能验收的最小闭环>", "requirements": ["REQ-001"] }
    ],
    "requirements": [
      {
        "id": "REQ-001",
        "title": "<一句话需求>",
        "type": "functional",
        "priority": "P0",
        "status": "draft",
        "source": ["MR-001"],
        "slice": "S1",
        "userStory": "作为<谁>，我要<做什么>，以便<得到什么>",
        "acceptance": [
          { "id": "AC-001-1", "given": "<前置>", "when": "<动作>", "then": "<可观测结果>" }
        ],
        "dependsOn": [],
        "verification": "test",
        "openQuestions": [],
        "changeLog": []
      }
    ]
  }
}
```

## 一分钟摘要（说人话）

<结论 ≤3 条业务语言 / 下一步（谁·何时）/ 要 CEO 或用户拍板的事>

## 范围与非范围

| 这一版要 | 这一版明确不要 |
|---|---|
| | |

## 约束

- 时间 / 人力 / 预算：<引用 `.dsh-company/kb/org.md`，标【事实】/【假设】>
- 技术前提：<引用 `.dsh-company/kb/vp-eng/CHARTER.md`>
- 合规 / 认证 / 安全：<按产品类型，引用 CFO / COO 口径>

## 依赖与风险

| 依赖（不在我们手里的） | 谁给 | 什么时候要 | 缺失时兜底 |
|---|---|---|---|
| | | | |

- **最可能翻车的一件事**：……　**兜底**：……

## 里程碑与 slice

| slice | 目标 | 包含 REQ | 出口条件 |
|---|---|---|---|
| S1 | | | |

## 需求详述（每个 REQ 一节，与 JSON 账本一一对应）

### REQ-001 <标题>

- 来源：MR-001｜slice：S1｜优先级：P0｜状态：draft｜验证：test
- 用户故事：…
- 验收：
  - **AC-001-1** given … / when … / then …
- 依赖：REQ-…（无写"无"）
- 未决：…

## 未决（禁止当结论用）

- …

## 下一步（一 REQ 一任务）

| 任务 | REQ | 依赖 | 验收 |
|---|---|---|---|
| | REQ-001 | | AC-001-1 |
