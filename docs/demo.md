# demo · R1 动议操作合同（雏形）

> 顶层合同：demo 的剧本、分镜与观测点。R1 雏形只覆盖两人公司单动议；R2 扩编到四人后并入
> [design/30-ui-demo.md](./design/30-ui-demo.md) §3 分镜 v0；R4 定稿。

## 动议（Q4 已定）

> 给我们公司要不要自建知识库写一页技术评估

## 前置（本机）

1. `source dev/env.sh`（双 home；**新 shell 必须**）
2. `pnpm dsh web -- --port 3081 --no-open`（3080 被本 GUI 占用；启动横幅打印带 token 的 URL）
3. 浏览器打开该 URL
4. 新建会话：preset 选 **wochen CEO**（`ceo` 已是 profile 默认，未指定时自动挂载）；
   工作目录选 `company-workspace`（kb/ 与 deliverables/ 的相对路径依赖它）

## 分镜与观测点

| # | 谁 | 做什么 | 观测点（外部可验证） |
|---|---|---|---|
| 1 | 你 → CEO | 发上面那句动议 | CEO 以 persona 回应：先澄清目标/约束/验收，而不是直接开写 |
| 2 | CEO | `spawn_teammate` 拉起 VP-Eng | UI 名册出现 VP-Eng；任务板出现任务（含验收标准） |
| 3 | VP-Eng | 出稿 | 读 `kb/vp-eng/CHARTER.md`；按 `templates/review-note.md` 出结论先行的一页纸；写入 `deliverables/` |
| 4 | CEO | 收口 + `present` | 交付卡片出现；`company-workspace/deliverables/` 有文件；分歧被保留而非抹平 |
| 5 | 收尾 | 记账 | `kb/ceo/journal/` 与 `kb/vp-eng/journal/` 各追加一篇 |

## 验收判据（R1）

- 一场完整会话日志（`$DSH_HOME/sessions/`）
- `company-workspace/deliverables/` 第一份交付物
- （归档）该会话 JSONL 存 `snapshots/` 作为首份回归资产

## 已知边界

- 动议必须在 **Web 面**跑：preset 只在 Web 面挂载（[10 §6](./design/10-architecture.md) 要点 6），
  headless 会话永远是部署默认人格。
- VP-Eng 在团队里是**软隔离**（名册身份 + `team:policy` + KB 约定），不是 preset 级硬隔离——
  硬隔离在独立 preset 会话里成立（见 [design/20](./design/20-roles-isolation.md) §4 分水岭）。
