# 2026-09-22 · 轮间待办①②：按问题组队 + 练习场 ≠ 运行场

> 归属：roadmap「轮间待办（R4 → R5a）」两条，不占轮。出处：
> ① [dynamic-team-assembly](./2026-09-22-dynamic-team-assembly.md)（已毕业到 implemented/）
> ② [implemented/workspace-hygiene](./2026-09-22-workspace-hygiene.md) 条目去向 #3。

## 本轮交付（外部可观察）

1. **②练习场 ≠ 运行场**（先落地，为 ① 的真跑腾出干净场）：
   - `scripts/lib/rehearsal.mjs` + `scripts/rehearsal-init.mjs`：`dev/rehearsal-workspace/` 幂等成型
     （CHARTER/org/templates 参考镜像每次刷新；**journal 不镜像**——排练记忆不混真记忆；
     `AGENTS.md` 符号链接指真盘手册，注入基线不变；排练产物永不触碰）。
   - `preset/probe/handbook/delegation` 四个 smoke 脚本默认 cwd 翻转到排练场（`--cwd` 可覆盖，
     启动时自建）；`snapshot-motion` / `deliverables-check` 默认不动——归档与审计属于运行场。
   - 机制依据：workspace 归属按 `SessionHeader.cwd`（vendor workspace.md），零新功能。
   - 文档：guides/60 §6.7、公司手册「工作纪律」一行、根 AGENTS.md 命令表、.gitignore。
2. **①按问题组队**：
   - 新 skill `presets/ceo/skills/assembling-the-team/SKILL.md`（五步：要不要叫人 / 要谁 /
     不叫谁也写下 / 走哪条通道 / 定 slug）。
   - persona 挂钩（`agent.cordis.yml`）：「接到动议先加载 assembling-the-team……组队定下来之前
     不 spawn 任何 teammate。名单里没有的职能一个都不叫——超编与漏编都是你的失败」，
     排在 `chairing-staff-meeting` 之前。
   - 旧 skill 去重：步骤 2 的职能归属**搬进新 skill 不并存**；front-matter 与标题去掉「R2 五角色版」。
   - `docs/design/40` §1 CEO skills 清单补行。
3. **U1 活体探针（顺路完成，R6 前置全清）**：结论 = 三档之②**只有新会话变**
   （profile 真拷贝插标记 → 同会话下一轮仍旧文、新会话见新文；探针自改自还原）。
   详见 [research/digital-twin §5.5](../research/2026-09-22-digital-twin-cultivation-and-self-learning.md)。

## 实际跑过的验证

| 检查 | 结果 |
|---|---|
| `pnpm verify` / `pnpm test`（38 条） | ALL PASS（②、① 两个阶段各跑过） |
| ②验收：`rehearsal-init` + `probe-smoke` 快档 | 5/5 PASS；`git status --porcelain company-workspace/` **0 行**；会话目录名 `--…-dev-rehearsal-workspace--` 证明 cwd 真在排练场 |
| ②验收：`handbook-smoke`（ceo） | PASS——符号链接下指令基线仍 = 公司手册，未混入开发仓库 AGENTS.md |
| ①验收：preset-smoke（重装后） | ALL PASS（5 preset 可挂载、skills 隔离保持、新 skill 挂载成功） |
| ①验收：双向对照·第一场（两职能，不许超编） | **PASS**：prompt 无名单 ⇒ 只拉 `vp-eng` + `coo`；「不叫 CFO/VP-Sales：动议没问，不为稳妥陪跑」写入正文；CEO `present` 出 `deliverables/kanban-onprem-assessment/final.md`；390s |
| ①验收：双向对照·第二场（四职能，不许漏人） | **PASS**：prompt 无名单（轻量档：各职能只回要点）⇒ `vp-sales` / `vp-eng` / `coo` / `cfo` **全部到场**；345s；CEO `present` 出 `deliverables/mobile-companion-line/final.md`（四问结论 + CEO 裁定 + 四闸门 + 分歧保留） |
| 产物三态判据（排练场） | **PASS**：成品 2 份（两场各 1）/ 过程稿 11 份 / **违规 0 条**（`deliverables-check --workspace dev/rehearsal-workspace`，扫 32 份会话日志） |
| 真盘零新增（两场动议后复查） | **PASS**：`git status --porcelain company-workspace/` 0 行——两场带 spawn 的真动议跑完，共享盘一字未动 |

## 判据外的实证收获（skill 措辞迭代一次）

第一场首跑**超编**（4/4 全员）：CEO 确实加载了新 skill 并给每个 spawn 写了职能理由，
但把动议里的"客户想把…"扩张解读出了销售/财务问题。⇒ 措辞收紧（step 2 加
「**超编与漏编都是失败**：只数动议文本**明确要求回答的问题**，不做扩张解读；拿不准时**少叫**」；
persona 加「名单里没有的职能一个都不叫」），重装后复跑即达标。这正好实证了提案预言的
"advisory 靠行为验收、迭代是常态"（D15）——验收落在行为上，不在文件写得好不好。

## 环境状态（下轮判断"什么已就绪"只读这里）

- `DSH_HOME=dev/harness-home`；pack 已重装进 web profile（含新 skill）。
- 排练场 `dev/rehearsal-workspace/`（gitignored）已有两场动议的真实产物。
- ⚠ **事故记录（网络断连把 profile 弄成半损坏）**：`remove` 成功后 `add` 赶上网络断、进程被杀，
  锁文件被重写成"无 pack"、`node_modules/@deepseek-ai` 被清空。恢复配方 = 网络恢复后
  重跑 `pnpm dsh plugin --profile web add file:./packages/company-pack`（本轮实测 12.6s 完事）。
  教训：**remove + add 尽量同批执行，中途断网会留下半损坏状态**；临时诊断脚本在
  `dev/harness-home/tmp/`（gitignored，可随时删）。
- ⚠ 清理欠账：排障期间向 `~/Library/Caches/pnpm/v11/metadata*` 注入过合成元数据
  （937 包 × 若干目录形状，etag 均为 `synthetic-from-store`）——网络恢复后已无用，
  可按该标记清理（对 pnpm 无害，不清也只是过期缓存）。

## 未做 / 移出本轮

- R5a 全部内容（replay harness / release-smoke / sync-dsh / peers 欠账）——下一轮，起点
  readiness §9 P1（先窄研究再落）。
- CEO 计划中的另两个 skill（`task-decomposition` / `synthesizing-deliverables`）仍未建，
  其职责实际由 chairing 步骤 2/5 承担（design/40 §1 已注明）。
