# 2026-10-05 · RFC：入口与运行态地图——人与 Coding Agent 共用的首屏（毕业拆分 1/6）

> 状态：RFC（已批准待实施；实施次序由用户逐条点名，D32）｜批准：2026-10-05 用户对话拍板（来源 = 推敲卡
> [repository-steerability](../../_backlog/_done/_closed_plans/2026-10-05-repository-steerability.md)
> 毕业；同批六项拍板见卡状态行，本条不含独立裁决项）

## 问题

新读者（人或新 Coding Agent）首次进入本仓需要一次大范围端到端探索才能建立正确模型；没有共享首屏：

- 首跑易把 `pnpm dsh --profile headless` 误认为完整公司运行——headless 只证明通用 CLI；完整 Web 链 =
  `source dev/env.sh` → `pnpm dsh web` → profile bundles/patches → company-pack bundle → Web host/client →
  人连接 company-workspace → session/create 选 preset → agent loop → session log → workspace 产物 →
  replay/audit/snapshot 证据。
- 反直觉事实无处首屏警告：进程 cwd ≠ 会话 cwd；启动成功 ≠ 五角色已装配；名册角色名 ≠ 加载了对应 preset。
- 运行状态至少四条主轴（代码与构建 / DSH 运行状态 / 会话事实与业务产物 / 验证与历史证据）+ 补充轴
  （排练盘、浏览器 localStorage、系统 tmp 出口），无单一 owner 文档说清各轴权威位置、生命周期与
  「不能从这里推断什么」。
- 现状盘点（2026-10-05 核验）：根 [README.md](../../README.md) 仅 12 行入口卡；[docs/project-map.md](../../docs/project-map.md)
  有地图但首屏未按「五分钟回答驾驭问题」组织；拟新增的运行态地图（**docs/runtime-map.md**，名字实施时可再定）不存在。

## 方案

1. **扩充根 [README.md](../../README.md) 为首屏**：项目是什么、四条主轴的一段话版、最小启动路径
   （Web 观察窗一条 + headless 一条，各自证明什么）、常用局部验证导航、五个驾驭问题的答案指针。
   只做入口不复制政策（一处事实一个家；政策 owner 不动）。
2. **收紧根 [AGENTS.md](../../AGENTS.md) 入口路由**（当前 94/105 行预算内）：明写「维护 repo 的 Coding Agent」
   与「运行在 DSH 会话中的公司角色」不是同一主体；按任务类型（首次进入 / 运行 Web / 改角色 / 改 host/client /
   选测试 / 查运行态）各指向唯一 owner 文件。
3. **[docs/project-map.md](../../docs/project-map.md) 首屏重排**：happy path 置顶、headless ≠ 公司 Web 警告、
   四轴状态表引用；详细历史、成本与脚本头注继续下沉在各 owner。
4. **新增运行态地图（拟落 docs/，实施时定名）**：profile、bundle、preset、session、cwd、日志、projection、
   workspace、snapshot、replay tmp、browser state 的关系与时序；Web 链全图（问题节所列）；「错误入口」
   提示段（headless 只证明通用 CLI；未 source env.sh 时日用 home 同名 web profile 陷阱引 [docs/demo.md](../../docs/demo.md)）。
   退役 profile 标记行的事实 owner 在
   [运行态与 run bundle RFC](2026-10-05-steerability-runtime-runbundle.md)，本文件只导航。
5. **交叉链接**：四个入口文件互链各答其一，不重复事实。

## 输掉的方案（留尸）

- **巨型单一 README**：复制政策必漂（D26 文档卫生既定，doc-budget 棘轮同向）。
- **运行态地图并入 project-map**：受众不同（空间导航 vs 时序状态轴），合写两长。
- **新造第二套入口文档树**：与 docs/ 既有分层（D10）冲突。

## 验收

- 一名未参与的读者（人或新 Agent）只读根 README + project-map + 运行态地图，能回答五个驾驭问题：
  怎么启动、改哪里、用什么局部验证、运行卡点先查什么、产物/证据从哪来——走查记录进实施 Note。
- `pnpm verify` 全绿（含 doc-budget：AGENTS.md ≤105、md-links、bare-path）。
- 抽查无事实复制：四轴表唯一家，README 只有链接。
