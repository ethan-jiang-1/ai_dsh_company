# 培养面板 GUI 行动面 v1（采纳 / 拒绝 / 验证 / 撤回 / 创作）

状态：已交付（2026-10-17 用户令「setup goal，按我们的研发流程推进直到完全结束」；六条待裁点采推荐项）

> 本 Note = 决定 + 实跑证据 + 未验残留。UX 推敲（时刻地图 / 人的输入清单把手审计 / 迭代框架 / 体验协议）的家 =
> [推敲卡](../../_backlog/_archive/settled_issues/2026-10-17-cultivation-gui-actions.md)（已归档，含裁定表）；
> 机制核证（UI→host 通道、槽 scope、命令多行能力）同卡，不在此复述。

## 决定

1. **人侧动作走平台通用命令执行面**：面板按钮与创作表单都经 `remote.commands.execute` 发**与人手敲逐字一致**的
   `/cultivation …` 行——不是 pack 自有 business Remote（仍然做不到：remote 选择面由 vendor 组装），也不经模型。
   host 照旧记 `command/run` + `command/done`（`source: { kind: 'user' }`）、角色闸照旧在 host 生效 ⇒
   「采纳/拒绝/撤回/验证只能由人」的不变量未被放松，只是"人侧"的定义从「人敲终端」变成「人在 UI 里发起」。
   vendor 先例：`ui-permission-presets` 用同一条路驱动 `/permission`。
2. **客户端隐藏按钮只是 UX，真闸在 host**：面板按 viewer 角色分箱（收件箱本就按目标角色过滤），跨角色记录不给把手；
   直发命令仍被 host 拒（判据 ④ 验证）。
3. **失败必须可读**（本卡的 UX 第一号风险）：按钮/表单把 host 的**原话**（成功回执与错误文案）显示在行内，
   而不是让人回会话里翻。这是选 `remote.commands.execute`（而不是只回 `matched` 的 `Session.command()`）的原因。
4. **撤回是唯一破坏性动作**：点击后先讲后果（删方法 + 该记录不能再被采纳 + 运行中会话不受影响）再要求确认。
5. **文案集中一处**：`cultivation-actions.ts` 的 `CULTIVATION_COPY` 是面板动作/表单/校验/降级文案的唯一家——
   迭代里改得最多的就是文案，它必须与逻辑分离。

## 交付（S1–S6）

| 片 | 落点 |
|---|---|
| S1 动作面纯模块 | `packages/company-pack/src/client/cultivation-actions.ts`（六条命令线构造 + host 结果折算 + 文案表 + 通道封装，缺席即降级） |
| S2 治理动作 | `CultivationBoard.tsx`（采纳 / 拒绝含内联理由 / 这条有用·没起作用 / 撤回…含后果说明与两段确认；飞行中禁用；成功后刷新；失败出 host 原话；未注入即只读降级）、`cultivation-data.ts`（`refresh()`）、`CultivationTab.tsx` / `CompanyView.tsx` / `index.ts` / `company-tab-registration.ts`（注入 `remote.commands` 与动作面工厂）、`styles.ts` |
| S3 无困惑重排 | 同上（待办置顶；journal 改「素材（不用你操作）」；「我提交的」加「等对方处理；你无需操作」；「怎么养」改写为"点哪里"，命令语法收进折叠的「熟手命令行」） |
| S4 判断材料 | `src/lib/cultivation.ts`（`CultivationRecord.body` 进客户端读模型——修订原先"正文不暴露给客户端"的注记，理由 = 人不下无证据的判断）+ 面板就地展开 |
| S5 创作面 | `CultivationCompose.tsx`（顶部两个入口 + 期望单行 / 正文多行 / 建议选角色 + 校验：非空、期望句不得含 `::`）+ 提交后刷新并高亮新行 |
| S6 真机验收 | `probes/browser-visual/cultivation-gui-probe.mjs` + 视觉夹具 `snapshots/visual/cultivation-gui/panel.png` |

## 实跑证据（红 → 绿）

| 检查 | 结果 |
|---|---|
| **S1 红**：`pnpm exec vitest run tests/client/cultivation-actions.spec.ts` | `Cannot find module '../../packages/company-pack/src/client/cultivation-actions.ts'`（模块不存在，判据先行） |
| S1 绿：同上 | 11/11 PASS（线构造边界：期望句含 `::` 必拒、正文多行与 `::` 保真、理由压平；结果折算：host 原话上行 / 未匹配 / 远程错误 / 抛错 / 动作面缺席） |
| **S2–S5 红**：`pnpm exec vitest run tests/client/cultivation-board-actions.spec.ts` | 11 failed / 3 passed（无按钮、无动作面 prop、无创作入口、无折叠命令行、正文不可见） |
| S2–S5 绿：同上（happy-dom + createRoot 真派发事件） | 14/14 PASS：点采纳发出的线、拒绝理由两步、撤回两步与后果文案、失败原话行内可见、角色不符不出按钮、未注入即只读降级、创作表单校验与提交线、正文可见、素材块「不用你操作」、命令行折叠 |
| 静态渲染档未回归：`cultivation-board.spec.ts` | 7/7 PASS |
| 读模型（S4）：`pnpm exec vitest run tests/company/cultivation.spec.ts` | 25/25 PASS（新增「正文进客户端读模型：多行原样带出」） |
| 全量 keyless：`pnpm test` | **64 files / 616 tests PASS** |
| 真挂载：`source run/env.sh && node checks/smoke/client-load-smoke.mjs` | ALL PASS（真浏览器零挂载失败；新注入面 `remote.commands` 不炸） |
| 真行为：`source run/env.sh && node probes/browser-visual/cultivation-gui-probe.mjs [--fixture]` | **ALL PASS**：① 面板走人在界面上的真路径打开、把手只给本角色；② 点「采纳」→ 公司盘记录翻 `adopted` + `methodSlug` + 方法 `SKILL.md` 落 `<profile>/company-cultivation/<role>/`；③ 该会话日志 `command/run` 与 `command/done` **按 commandId 配对**、`source.kind=user`、args 含本次采纳线；④ 跨角色采纳被 host 拒（文案含「仅建议权」）；⑤ 创作表单提交 → 公司盘新增 `status: open` 记录（`proposerKind: human`）；⑥ 零挂载失败；⑦ 出视觉夹具 |
| 结构：`pnpm verify` | ALL PASS |

夹具（`snapshots/visual/cultivation-gui/panel.png`，1440×1000）当场抓到一个真实 UX 缺陷并已修：培养行沿用窄列布局，
把「我的纠正」挤成一字一行 ⇒ 培养列表改堆叠块（照 `.wk-ledger-list` 手法），夹具重出后行内层次可读。

## 探针带出的两处环境发现（未修，记录在案）

1. **侧栏工作区 `rehearsal-workspace` 指着旧路径** `dev/rehearsal-workspace`（`runtime/harness-home/storages/workspace.json` 实测），
   而仓库的排练盘在 `runtime/rehearsal-workspace` ⇒ 面板在那条工作区里读不到记录。探针因此改在**公司盘**作业
   （会在公司盘短暂写 `guiprobe-*` 记录与 `method-guiprobe-*` 方法，跑完自删；动真实记录一个不碰）。
2. **客户端的 preset 选择器只改客户端投影，不改 host 会话 preset**（host 的 preset 是建会话时定的）⇒
   人若先切 preset 再点「采纳」，会被 host 角色闸拒（文案「请在 X 的会话里采纳」）。探针为此自带"对齐"步骤
   （先问出 host 角色再对齐投影）。**这是真实的 UX 隐患，值得下一轮处理**：要么客户端投影跟随 host，
   要么切 preset 时把会话一并重建。

## 未验残留（显式）

- **体验协议 T1–T6 未执行**（找人跑六个人物任务）——判据与任务清单在推敲卡「体验协议」节；
  本轮只做到「UX 完成定义七条 + 任务清单」与人机共评的准备。
- 视觉夹具只出一档视口（1440×1000）：窄窗、浮窗形态未量；面板在窄栏里的行宽未验证。
- journal 素材的「轮末收敛」仍无入口（本轮只做了"不用你操作"的标注）。
- 范围外（需动 host 语义）：记录「出处」字段、拒绝理由可空、「记下来并采纳」、「撤回我提的建议」、批量采纳、
  裸 `/cultivation` 弹窗装饰（`commandUi.decorate`）。

## 指针

- 推敲卡（含输入清单把手审计 / 时刻地图 / 迭代框架与单向门 / 体验协议 / 第 2 轮预案）=
  [_backlog/_archive/settled_issues/2026-10-17-cultivation-gui-actions.md](../../_backlog/_archive/settled_issues/2026-10-17-cultivation-gui-actions.md)
- 前决定：[agent-cultivation-loop](./2026-10-13-agent-cultivation-loop.md)（其「输掉的方案」里"UI 按钮采纳"一条的**前提**被本 Note 证伪）；
  合同面：[presets.md 角色方法层行](../../docs/presets.md)
