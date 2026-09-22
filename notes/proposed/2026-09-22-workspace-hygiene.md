# 2026-09-22 · 共享盘卫生（交付物三态、归档判据与练习场隔离）

状态：proposed（2026-09-22）
进轮：R4 成品流程（2026-09-22 起，见 [roadmap](../../docs/plans/roadmap.md)）

## 背景

`company-workspace/` 是公司的共享盘（会话 cwd）：`kb/<role>/`（CHARTER + journal）、
`templates/`、`deliverables/`。它现在 **27 个文件全部在 git 里**，但全仓 `docs/` + `notes/` 里
没有任何一条 workspace 归档/清理规则——"归档"目前只指 `snapshots/` 和文档分层。

后果已经在盘里：`deliverables/` 7 份文件里只有 `kb-rag-assessment.md`（+ `-vp-eng.md`）是 R1
动议的正品，其余（`agent-workflow`、`agentic-coworker`、`finance-agent-workflow`）是排练/探针
产物，和成品平铺在一起，靠 `-vp-eng` 后缀区分过程稿与合稿。轮次一多，共享盘会长成垃圾场，
而且"哪些是交付物"这个事实没有机器可读的来源。

## 提案

1. **交付物三态判据**（写进 R4"成品流程"轮）：
   - **成品** → `deliverables/<slug>/final.md`，必须来自一次 `present` 调用；
   - **过程稿** → `deliverables/<slug>/drafts/<role>.md`；
   - **演练/探针产物** → `snapshots/<round>-*/`（当回归资产）或删除，**不进 `deliverables/`**。
2. **交付物目录化**：一个交付物一个目录，替代现在的平铺 + `-vp-eng` 后缀。
3. **练习场 ≠ 运行场**：排练与探针换一个 workspace 目录。机制天然支持——workspace 归属按
   `SessionHeader.cwd`，`ctx.workspaceRegistry` 按它分组
   （`vendor/dsh/docs/subsystems/workspace.md`），不需要新功能。
4. **journal 收敛**：轮次收尾时把 `kb/<role>/journal/<动议>.md` 压成 CHARTER 的一条附录
   （保留结论与日期），原文件随该轮快照归档。
5. **清理执行者**：待定（见风险与未决）——人做，还是给分身一条 skill + fs 工具。

## 依据（实际查过）

- 交付物 ↔ `present` 事件**可机械回溯**：`present` 的交付记录是会话事件
  `deliverables/presented`，其 `data.files[]` 是 `PresentedFile { path, description? }`
  （`vendor/dsh/packages/client/ui-deliverables/src/presented.ts:54` 的
  `presentedFileUrl(sessionId, seq, index)` 按事件 seq 取文件；工具本体在
  `vendor/dsh/packages/fs/tool-present`）。
- **判据今天就能 keyless 验证**：`snapshots/r1-motion/session.jsonl` 里已有 1 条
  `deliverables/presented` 事件，录制日志可直接扫，不需要 API key。
- workspace registry **对模型不可见**（无工具、无 prompt 文本、无会话事件）——所以"清理"不是
  模型能自发做的事，除非另给它一条 skill + fs 工具。
- "Files changed" 行只列 mutation 工具（`write` / `edit` / `str_replace_editor`）改过的文件；
  **只有 `present` 才算最终交付**（`vendor/dsh/packages/client/ui-deliverables/README.md`）。

## 输掉的方案

- **维持平铺 + `-vp-eng` 后缀**：改动最小，但判据要靠命名约定，"成品/过程稿"无法机器区分
  ——正是本提案要消灭的模糊。
- **只靠 git 历史清理**：git 能回滚，但回答不了"这份文件算不算交付物"，也不会阻止下一轮继续
  平铺。
- **给 workspace 加自建归档机制**：DSH 没有 workspace 归档 seam；自建等于发明本地流程
  （D13 禁止），且 registry 对模型不可见，自建也只能停在 host 侧脚本。
- **一次大扫除不留判据**：清理完还会脏。

## 验收判据

1. 一条 keyless 检查（进 `pnpm verify` 或独立 script）：`deliverables/` 下每个 `final.md` 都能在
   某个会话日志里找到指向它的 `deliverables/presented` 事件；反向也查（presented 但不在
   `deliverables/` 的报出来）。
2. 用 `snapshots/r1-motion/session.jsonl` 做 oracle：该检查对 R1 资产给出"1 份成品 + 0 违规"，
   且**故意加一份无 `present` 的文件即变红**（反证，D15）。
3. `snapshots/` 每轮有且只有一份录制；排练产物不出现在 `deliverables/`。
4. 四角色动议（R4 端到端）跑完后，`deliverables/<slug>/` 结构与判据一致。

## 风险与未决

- **动 R1 已有产物**：目录化要迁移 `kb-rag-assessment.md` 两份。倾向**旧资产不动、判据从下一个
  交付物开始**——不为整洁重写历史。
- **`-vp-eng` 后缀承载了"谁写的"**：目录化后这个信息落到 `drafts/<role>.md`；要确认
  `docs/demo.md` 等处对旧路径的引用不断。
- **未决：清理执行者**。人做 = 零机制成本但依赖人；分身做 = 需要一条 skill + fs 工具
  （model-visible、进日志、可回放），代价是把删文件的权限交给模型。建议 R4 先人做 + 脚本检查，
  跑两轮后再决定是否交给分身。
- **未决：归档还是删除**。进 `snapshots/` 有回归价值但仓库会膨胀，删除只靠 git 历史。建议
  "有回归价值的进快照，其余删"，判据由 R4 定。
