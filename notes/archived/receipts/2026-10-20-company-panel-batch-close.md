# 公司面板批次收尾：六张卡 + 四个收敛 + 一个真红（2026-10-20）

状态：implemented（2026-10-20；2026-10-19/20 公司面板批次收口；不是新决定，是句号与现状）

## 句号覆盖了什么

2026-10-19/20 的六张卡全部有结论并归档：

- [issue 卡质量（A 收口）](../../../_backlog/_archive/settled_issues/2026-10-19-issue-card-quality.md)：A 已执行；B（Card v2）触发复核未发生，维持以后做；C = 执行协议。
- [公司面优先级](../../../_backlog/_archive/settled_issues/2026-10-19-company-panels-ux-priority.md)：拍「看板 → 任务板 → 台账」；成品台账拆出。
- [看板 + 依赖图](../../../_backlog/_archive/settled_issues/2026-10-19-board-dag-ux-deep-dive.md)：新鲜度文案、DAG 徽章、真 21 节点复看（宽图只横向，无纵向双滚动）。
- [任务板](../../../_backlog/_archive/settled_issues/2026-10-19-taskboard-table-ux-deep-dive.md)：依赖列 `owner · subject`、入口探针。
- [台账](../../../_backlog/_archive/settled_issues/2026-10-19-ledger-ux-deep-dive.md)：40 行/全文入口/30s/人读接受（收口时的数）。
- [成品台账](../../../_backlog/_archive/settled_issues/2026-10-19-deliverables-ledger.md)：生成索引 + 第 9 页签「成品」+ `present` 状态 + `converge` 自动重建。

关键 Note：[成品目录](../../implemented/2026-10-19-deliverables-catalog.md)、[新鲜度 + DAG 徽章](../../implemented/2026-10-19-company-panel-freshness-and-dag-badge.md)、[任务板依赖](../../implemented/2026-10-19-taskboard-dependency-labels.md)。决策行 = [D44](../../../docs/index.md)。

## 这次清理（2026-10-20）

1. **收敛八个已闭合动议**：`ai-transformation-2026-v2`、`ai-coding-security-2026-v3`、`lingang-recon`、`role-kit-2026`、`private-deploy-reserve-2026`、`token-account-pool-2026`、`hefeng-recon-2026`、`kid-ai-2026`。每个都走 dry-run → 真收敛 → `--charter-backfill`；交付物进归档家、journal 进 `snapshots/archive/convergence-2026-10-20/`、台账行/CHARTER 登记完。
2. **成品目录数字**：47 份 = **活跃 0 / 归档 47 / 台账外 1**；present **46 / 未 present 1 / 未核 0**；台账 **47 行 / 46 ✅**。
3. **role-kit 类型修正**：`类型: 执行` → `生产`（合法词表 = 决策/生产/诊断/口径问答）；审计对应的 `meta-shape-bad` 消失。
4. **收敛就绪误判修复**：旧 `concl.includes('回填')` 把 v2 真结论里提到的「未回填」当成占位，导致 v2 被计划档判「未备」。新增 `isPlaceholderConclusion`（只认整值占位），v2 由「未备」变「可收敛」；键盘可跑，spec 见 `tests/harness/converge-rules.spec.ts`。
5. **自动重建真跑**：八件收敛每次都由 `converge` 自动重建索引，活跃数 5→4→3→2→1→0；不再只靠 `--rebuild-index` 单点验证。
6. **private-deploy 的 present 已补并收敛**：真 CEO 会话 `session-a87b177b…`（preset ceo，cwd = company-workspace）读取已有 final 并调 `present`，未改文件、未新建交付物；随后按正常收敛进归档家。
7. **审计绝对路径修复**：present 工具把路径写成 `/…/company-workspace/deliverables/…`，`parseSessionLog` 原来不按 cwd 归一 ⇒ 新 present 审计不到。修为按会话 cwd 剥前缀；新增 keyless spec。修后 `presented` 46/47、**违规 0**。

## 只剩什么（不藏）

- **private-deploy 已不红**：2026-10-20 真 CEO 会话补了 present；`deliverables-check --json` 违规 **0**。
- **kid-ai-2026 已收口（已采纳）**：真 CEO 会话组队 VP-Sales/VP-Eng/COO，T1–T3 + R1–R3 全完成，final/present/meta 齐，已收敛。
- **hefeng-recon-2026 已收口（判不了）**：真 CEO 会话写 final/present/meta，已收敛。
- **light 已废弃/无 final**：按用户轻量纪律处置，四稿收齐即停；不入目录。
- **recon-pack 归档 legacy 未 present**：唯一 `未 present`（1/47）；审计仅 legacy 观察项。
- **边界**：成品目录是静态索引 + 重读，不实时订阅；任务板窄栏折叠、台账日期分组/筛选是未开的可选功能，不是本轮 todo。

## 证据

- `pnpm verify` ⇒ **ALL PASS**；`pnpm test` ⇒ **70 files / 695 tests**。
- `client-load-smoke` ⇒ **ALL PASS**。
- `deliverables-check --json` ⇒ **0 违规**；46/47 present（唯一未 present = recon-pack legacy）；`role-kit` 0 违规。
- 八件收敛 + backfill 的日志在 `/tmp/converge-*.log` / `/tmp/backfill-*.log`；证据副本 `snapshots/archive/convergence-2026-10-20/`。
- 成品目录真 app 探针 `deliverables-catalog-probe` ⇒ ALL PASS（47 行、present 统计、未 present 筛选、打开 final、窄栏）。
- `replay-smoke --ui` ⇒ **r3-delegation ALL PASS**（33s；委派卡渲染/aria 树/金样零 diff；workspace 未认证）。
- 真 21 节点 DAG `dag-midflight-probe --session session-133c5cde… --narrow` ⇒ 1716×321、390 窄栏只横向滚动。

## 不要再重开的事

- 不要为「993 份成品」再开卡（那是文件数；final 47）。
- private-deploy 的 present 已由真 CEO 会话补上；不要再用维护脚本伪造 present（事件必须来自 Lead 的 `present` 工具）。
- 不要把成品目录改成实时 Remote / 新建第二份手写清单（D44/D28 已判）。
- 不要为 B（Card v2）扩结构——触发复核未发生。


## 交接（只有人/客户/公司能做的，不由维护脚本代做）

- **token-account-pool-2026**：向 9 家现有客户问一句「有没有把 AI 接进业务系统的计划、走谁采购」——零成本，需用户放行；不代联系客户。
- **private-deploy-reserve-2026**：拍板机器来源 / “flash”指哪类 / 是否升级窄验证 / 本机是否算稳定测试机；8.5 人天、$0 新增现金，缺机器与具名 owner。
- **role-kit-2026**：W1 开跑件已就绪，卡在 5 席点人头与姓名册（CEO/CFO 动作）。
- **lingang-recon**：缺客户侧五件事实（接入方式/鉴权/时间戳与时区/流水唯一号/退款冲正形状）与合规书面授权。
- **kid-ai-2026**：家庭方案已收口（主选豆包免费版 + 未成年人模式，¥0/月；家长每天 2 分钟、每周 40 分钟硬顶），无对外动作。
- **light**：已废弃/无 final；**recon-pack**：归档 legacy；均不再动。
