# AGENTS.md — 文档层的规范

> 什么时候读：写/改/搬 `docs/` 下的文档、判断某事实该住哪层时。

本文件是 `docs/` 的**分层规矩唯一家**：哪层放什么、**哪层不放什么**、写多长、写完了怎么更新。
文档地图 = [docs/README.md](./README.md)；决策台账 = [decisions.md](./decisions.md)；写作风格（一次一句、不复述代码）= 根 [AGENTS.md](../AGENTS.md) 纪律表。
**本文件管形状，不管事实**——各主题的现在时语义住各合同文件，本文件不复述。

## 一处事实一个家（顶层 6 文件 + 三分区）

每个事实住**该管它的那一层**；别处只链接，不复述。目录深度上限为 2（`docs/<分区>/<文件>.md`），分区目录内**不建子 `README.md`**（树本身即清单）。

| 层 | 目录 / 文件 | Job（这层管什么） | **不属于这层** |
|---|---|---|---|
| 导航 | [docs/README.md](./README.md) | 30 秒按问题路由、推荐阅读顺序与顶层书架 | 决定正文与理由（→ Note）；逐份枚举 tier 内文件（→ 目录树） |
| 架构总纲 | [architecture.md](./architecture.md) | 系统分层、组合链、Web 运行时序、四条状态轴与技术入口 | 逐行工具/文件枚举（→ 实现自己）；历史备选与理由（→ Note） |
| 决策台账 | [decisions.md](./decisions.md) | D 号纯路由双表（现行 / 已退役，每格 ≤100 字，锚点 `#dN`） | 决定正文、备选与验证证据（→ Note 或合同） |
| 政策 | [policy.md](./policy.md) | 常设规则：授权与材料性、门禁升格、自动化上限、越界写入、自主协议、维护面契约 | 操作步骤与命令（→ 指南）；机制依据（→ `notes/implemented/`） |
| 测试宪法 | [testing.md](./testing.md) | 测试分层、完成定义证据门槛、pre-push 与真入口契约 | 单次测试跑法日志（→ Note）；逐 spec 清单（→ `tests/`） |
| 规范 | [AGENTS.md](./AGENTS.md) | 文档层自身的分层、长度、单向依赖与更新规矩 | 主题事实（→ 合同层）；操作步骤（→ 指南） |
| 合同层 | [contracts/](./contracts/) | **是什么**：子系统与代码面**现在时**语义（含 [content-charter.md](./contracts/content-charter.md)、[repo-hygiene.md](./contracts/repo-hygiene.md)、[host-and-lib.md](./contracts/host-and-lib.md)、[client-ui.md](./contracts/client-ui.md) 等），随代码同 diff | 历史决策（→ Note）；迁移计划；未来设想 |
| 指南层 | [guides/](./guides/) | **怎么操作**：引导、开发环、环境与排障 runbook、演示、发布交接 | 机制依据（→ `notes/implemented/`）；枚举清单（→ 实现自己）；常设禁令（→ 政策层） |
| 参考层 | [reference/](./reference/) | **纯查表与登记**：自动生成目录、命令表、术语映射、外部材料、面例外 | 决定正文（→ Note）；主题事实（→ 合同）；手工抄写的易漂清单 |

- **单向依赖规则**：`docs/` 只依赖代码实现与已定型的 `notes/`，**禁止出现指向 `_backlog/` 的 Markdown 链接**（`_backlog/` 是上游探索与缺陷跟踪沙盒，重要结论须先升格进 `notes/` 再由 `docs/` 引用；机械门 = `doc-taxonomy`）。
- **「理由」的边界**：为什么选 A 不选 B、输掉的方案、验证证据 → `notes/implemented/`（Agent Note）；`docs/` 只留当前语义（合同/架构）、操作（指南）、查表（参考），理由正文不留第二份。
- **不留考古脚注**：`docs/` 正文只写现在时，不写「2026-10-27 自 §X 迁出」「某轮实证删过 N 份」等变更史注记（历史归 git 与 `notes/`）。

## 长度：UTF-8 字节预算与反正文墙

字节上限唯一源 = [`checks/gates/doc-budget.mjs`](../checks/gates/doc-budget.mjs) 的 `DOC_BYTE_BUDGETS`（本文件不复述数字），并禁止 `AGENTS.md` 与 `docs/**` 出现单行超过 350 字符的非表格/非代码块正文墙（按语义拆段或列表，不做句中硬折行）。

- **棘轮语义**：只降不升；上限长期高于内容 20% 由反向棘轮报红；`docs/`（除 `docs/reference/`）保留 ≥5% headroom。
- **超限处置次序**：**① 搬**（内容属别层 → 迁走，原处留指针）→ **② 压**（确属本层但可更短）→ **③ 提额**（仅前两步不成立时，在 Note 论证）。

## 更新时机与新文档

- **合同层**：随代码**同 diff** 更新；改了行为没改合同 = 谎报。
- **指南层**：步骤变了就改，不留“旧步骤 + 新注记”。
- **理由层（`notes/`）**：机制被推翻时归档旧 Note 并记 D 号；`docs/` 不叠新旧依据。
- **新文档**：先定位分区 → 放进 `contracts/`、`guides/` 或 `reference/`（顶层 6 文件封闭，不随意增建顶层文档）；tier 内文档由目录树承载，**不建集中清单**（D28/D34）。

## 负知识（本仓明确不借的）

| 不借 | 为什么 |
|---|---|
| 按时间分目录（"初始化"一类） | 必然长出烂尾层：始终为真归合同，已失真归 `notes/` 或 git（见 [docs/README.md](./README.md)） |
| 集中 `INDEX.md` 或分区子 `README.md` | 违反 DSH no-index 教义（目录树本身即工作清单，D34） |
| 在文档里复述枚举型清单或写死计数 | 实测多份清单同病必漂（D28；导航文档计数禁令见 [nav-count Note](../notes/implemented/2026-11-16-nav-count-doc-class.md)）：家 = 实现自己或自动生成物 |
| 用物理行数当预算或完成门槛 | 行数预算反噬出单行压缩正文墙（改 UTF-8 字节）；完成门槛 = 最小真检查通过（D15/D26） |
