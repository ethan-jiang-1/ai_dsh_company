# presets · 角色 preset 的语义合同（R1：CEO + VP-Eng）

> 顶层合同：四个角色 preset 的"现在时"语义（persona 定稿、skills 清单、验证方式）。
> 内容来源 [design/40-role-content-plan.md](./design/40-role-content-plan.md)；命名约定见台账 D14
> （显示名 `wochen <角色>`，preset id 保持 kebab）。R1 只覆盖 CEO / VP-Eng；VP-Sales / COO 仍是
> 占位，R2 补全后并入本文件。

## 名册（运行时实测）

| id | 显示名 | trust | 默认 | 状态 |
|---|---|---|---|---|
| `ceo` | wochen CEO | system | ✅ `isDefault` | R1 定稿 |
| `vp-eng` | wochen VP-Eng | system | — | R1 定稿 |
| `vp-sales` | wochen VP-Sales（占位） | system | — | R2 |
| `coo` | wochen COO（占位） | system | — | R2 |

实测方式：web 观察窗的 `agentPresets/list` RPC（返回 8 条 = DSH 出厂 4 + 本 pack 4，零 broken）。
UI 按 trust 分组，故四张卡出现在 **Built-in** 组（`AgentPresetSection.tsx`）。

## CEO（个体：动议的唯一入口与出口）

- **persona 要点**：对全局结果负责；语气简短、决断、结论先行；接到动议先澄清目标/约束/验收
  再拆解；亲自组建会议、亲自分派、亲自收口；**不代笔**（稿子由职能出）；只有 CEO 能说
  "这家公司不做了"。
- **skills**：`chairing-staff-meeting`——五步节奏：澄清 → 拆解分派（单一 owner + 可验收）→
  追进度（不抢活）→ 收口（保留分歧、`present` 交付）→ 记账。R2 起在第 3、4 步之间插入互审。
- **KB**：`company-workspace/kb/ceo/CHARTER.md`（决策原则：一页纸 / 分歧保留 / 不代笔）+ `journal/`。
- **验证**：Web 会话选 `ceo` → 身份探针（答出 CEO 视角与 veto 边界）；动议跑通见 [demo.md](./demo.md)。

## VP of Engineering（职能化身：研发）

- **persona 要点**：视角=可行性 / 成本 / 技术风险；对技术方案有 veto；产出结论先行的一页纸；
  需要深挖时生 one-shot workers 并署自己的判断；**不替别的职能下结论**。
- **skills**：`tech-feasibility-review`——选项枚举（≥3：自建/现成/混合）→ 逐项可行性·成本·风险 →
  结论先行 → 按 `templates/review-note.md` 落 `deliverables/`。
- **KB**：`kb/vp-eng/CHARTER.md`（技术栈事实：8 人团队、无专职运维、$200/月预算、Node 22 + SQLite；
  历史评审三问）+ `journal/`。
- **验证**：Web 会话选 `vp-eng` → 身份探针 + 产出探针（半页 PRD 出评审意见，不得越权替销售/运营下结论）。

## 验证方式（分层）

| 层 | 手段 | 现状 |
|---|---|---|
| keyless | `pnpm test`（roster 零 broken、行依赖、内容定稿、命名系列、bundle 语法、roots 语义） | ✅ 6 条 |
| 运行时 roster | web 观察窗 `agentPresets/list` RPC | ✅ 实测 8 条零 broken |
| 会话级（persona 生效、skills 隔离） | Web 会话手动探针（**headless 不挂 preset**，见 [10 §6](./design/10-architecture.md) 要点 6） | R1 跑动议时一并做 |
| 回归资产 | 动议会话日志归档 `snapshots/` | R1 收尾 |
