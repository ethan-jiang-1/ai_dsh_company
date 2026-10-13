---
status: 已结
opened: 2026-10-13
---

# 推敲：公司页改为培养，每个人培养自己的角色分身

> 立卡：2026-10-13 ｜ 状态：已结 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：是
> 2026-10-13 拍板（用户三项全选建议项，本卡 🔒 项全部落定）：① 对象粒度 = **公司盘×角色**（不先造个人实例）；② 第一版生效路径 = **C：工作台＋部署本地角色方法层**（本人采纳后跨会话生效，B 的工作台是 C 的 UI 半边）；③ CEO 跨角色 = **仅建议权，目标角色本人采纳**。
> 授权链：2026-10-13 用户令「按 _backlog/methods/ 流程处理后想办法落地，setup goal」——goal-372de4e9 已立；实施授权来自该会话指令，非本卡状态。
> 结论与去向：**做并已落地**（2026-10-13 拍板→实施→验收同日完成，S0–S5 全走）——C 路径首版全量：公司页第四子页＝培养（不依赖 team）、培养记录闭环（提案/采纳/拒绝/验证/撤回＋回执）、角色方法层跨会话生效（新会话实测加载）。实施与验证收据 = [implemented/2026-10-13-agent-cultivation-loop](../../../notes/implemented/2026-10-13-agent-cultivation-loop.md)（台账 D43；[twin-cultivation](../../../notes/implemented/2026-09-24-twin-cultivation.md) D25 部分取代）。研究材料随卡迁研究归档；按钮式采纳与多人回路见回执「未验残留」。

**问题与期望结果：** 用户看到公司页“用量”子页后，提出把该位置改为“培养”：CEO 培养自己的 CEO 分身，也能给非 CEO 提意见，每个人培养自己。本轮先研究透彻，利用 backlog 推敲，之后再形成可执行 issue。本卡是本地推敲 owner，不是 GitHub 发布或实施授权。
**当前情况：** 公司主面仍为用量第四页；已有培养侧栏仅列 journal 待审与本会话赞/踩。现行培养由人提炼 journal、维护者改 pack skill；分身不能运行时自改正式技能。消息赞/踩不进入模型历史。[现状与方案](../research/agent-cultivation/2026-10-13-cultivation-design.md) 已整理。
**未决问题：** 三项产品拍板已于 2026-10-13 落定（状态行）。仍开放的**机制**问题（S0 探针实证后写回本卡）：① 方法层锚点与作用域——候选 = preset 第二 `customSkillDirs` 锚 `baseUrl`（loader 树根；pack 升级不擦、在分身 workspace 沙箱之外）；② 分身对方法层路径的写拒绝实测；③ watcher/冷启动对方法目录的刷新时点与缺目录容忍；④ 人侧动作通道已核对为 `ctx.commands.register`（钉版唯一开放的人专用直控面：不产生模型消息、run 记会话日志——vendor `packages/interaction/commands` README）。
**下一步：** 已全部完成（S0–S5 见下方实施回执）；本卡按关闭条件结档，后续问题新开卡引用本卡。

## 范围与排除项

- 本轮：仓内现状、钉版插件机制、外部一手实践、培养关系和用户路径、候选分阶段结果与可验收条件。
- 拟议产品：公司页用量换培养；每角色自己的目标/纠正/建议/方法/验证；CEO 提跨角色意见；同一培养视图用于主面、侧栏和浮窗。
- 排除：本轮改 UI/preset/profile、改 vendor、给别人发消息或发布 GitHub issue、训练模型权重、造账号/调度器/向量记忆/通用考试平台、自动修改正式 skill 与权限。
- 是否保留用量侧栏不由本轮删除；换入口与删除统计能力是不同结果，用户只点名公司页位置。

## 已知与未决

| 项 | 已知 | 仍需确定 |
|---|---|---|
| 培养对象 | 已有五角色 preset；独立根会话与 CEO child 的组合不同 | 首版建议公司盘×角色，一角色多私人分身不预设 |
| 归属 | owners 配置记录人侧归属；同 token 无物理人认证 | “本人”先作为可信协作规则，不宣称安全隔离；多实例需求待定 |
| CEO 建议 | 用户明确允许给非 CEO 提意见；现有域内专业判断由域 owner 负责 | 建议由目标本人采纳；跨人持续送达与处理回执不能只靠 team 消息推断 |
| 教学输入 | journal/会话/产物可回查；赞/踩是 durable log-only | 模型通过哪个有日志的途径实际读取；不得假称点踩即学习 |
| 生效 | pack skill 正文后续加载读新文；组合存活 Agent 不自动更新 | 本地个性化是否引入、绑定哪个角色/cwd、撤回和旧会话边界 |
| 能力 | 现有培养首例验证挂载/角色探针，外部强调独立任务与回归 | 本人的实际目标、验证用例、允许成本与重复次数 |

## 研究依据

1. [产品研究稿](../research/agent-cultivation/2026-10-13-cultivation-design.md)：对象、归属、内容分类、具体用户闭环、页面结构、A/B/C/D 候选和判断依赖。
2. [DSH 源码证据](../research/agent-cultivation/2026-10-13-dsh-capabilities.md)：pin skill scope/provider、反馈不进入模型、组合生效、建议通道与待探针边界。
3. [外部一手证据](../research/agent-cultivation/2026-10-13-external-patterns.md)：12 组官方文档/作者论文，每组原句、版本、借鉴和反证。搜索服务失败，直接读取一手 URL；未完成全网检索或复现实验。
4. 仍有效的培养否决：[twin-cultivation](../../../notes/implemented/2026-09-24-twin-cultivation.md)；当前语义：[preset 合同](../../../docs/presets.md)、[多人合同](../../../docs/multi-human.md)。本研究未改写这些决定。

## 方案与取舍（研究建议，未拍板）

建议把培养做成“本人用工作证据管理分身方法”的工作台：默认自己的角色，查看纠正与别人建议，选择目标，采纳具体候选，再验证和记录实际生效范围。Agent 能提案、解释、练习，不能代人批准或仅靠自评显示升级。CEO 的跨角色意见作为建议，专业域与制度变更仍沿原 owner。

| 候选 | 得到什么 | 缺口/判断 |
|---|---|---|
| A：现有侧栏移进公司页 | 快速替换导航，来源可复用 | 不足以兑现人人培养；仅是导航前置 |
| B：教学/建议/目标工作台＋维护交接 | 延续已有权限，先形成具体可审变更 | 持久变化依赖维护链，不承诺点击即会 |
| C：B＋部署本地角色方法层 | 更贴近本人持续培养，可保留个性化 | 触碰当前载体/隔离决定；root/scope/沙箱/生效和恢复要实证 |
| D：分身直接改 pack 或自动自评升级 | 表面自动化多 | 与已否决机制、归属和真实验证冲突，本轮不建议 |

产品方向倾向 C，让本人采纳的方法持续影响自己的角色分身；先用 B 定教学/建议路径，同时查证 C 的作用域与生效。B 只是过渡；如果第一版必须实现跨会话教会，C 的机制验证是首版前提，B 不能独立宣称完成培养。候选阶段及各自前提/验收在研究稿 §10，当前不批量拆子卡，不生成 RFC。

**2026-10-13 定稿（拍板后）**：第一版 = C 全量——B 的工作台是 C 的 UI 半边（同一交付，不是独立过渡）；跨会话生效是首版验收的一部分。机制栈（各件以 S0 探针实证为准，证伪即回翻）：

1. **培养记录** = 公司盘 `cultivation/` 目录 markdown（来源坐标/期望行为/状态/回执/验证引用）；UI 经 `workspaceFiles` 读、分身经 fs 读（都有日志），不是第二份 KB。
2. **分身提案** = host 注册 `cultivation_propose` 工具（署 preset/会话，只开提案不开采纳——同 `request_signoff` 注册手法）。
3. **人侧采纳/拒绝/撤回** = `ctx.commands.register` 的 `/cultivation` 命令族；采纳 = 命令处理器写方法文件进方法层 + 更新记录 + 回执。人专用：命令是人敲的，模型无此工具。
4. **方法层** = 每角色 preset 增设第二 `customSkillDirs` 锚 `baseUrl`（`company-cultivation/<role>/`）：loader 树根下（实测 = `<DSH_HOME>/profiles/<name>/`）、pack 升级不擦、会话 workspace 之外。**写隔离实测（2026-10-13 探针 --full）**：workspace-write 模式下分身 fs 写方法层被沙箱拒（`file access denied`，活体留证）；⚠ 本机 dev 因 Seatbelt 禁用跑 danger-full-access（env.sh 机器条件处方），该模式下无围栏——诚实口径 = 「在 workspace-write 部署下分身不可写」，不宣称绝对隔离。新根会话进 catalog（watcher 连运行中会话的 catalog 都会刷新——实测比合同更强）；CEO 委派 child 继承 ceo 组合 ⇒ 只见 ceo 方法层，不误挂职能角色方法。
5. **入口** = 公司页第四子页 用量→培养，与侧栏/浮窗共享领域视图；用量保留在平台页签 `company-budget`，统计能力不删。

**如实标注的边界**：方法层按 profile×角色隔离（同 profile 多公司盘共享角色方法层——v1 单公司现实，不宣称按公司隔离）；单操作者/可信协作口径（owners 是政策不是身份凭证），不宣称认证隔离；「已采纳」显示以记录+方法层文件为准，真实加载证据 = 会话日志/探针，不让 UI 自报当生效证明。

## 验收标准（第一版，2026-10-13 定稿——拍板后按 validation-design 收敛；描述下游做成什么算合格）

| # | 行为（可观察） | 类别 | 通过/失败信号 | 反例/恢复路径 | 证据 owner |
|---|---|---|---|---|---|
| V1 | 公司主面第四子页 = 培养；不依赖 team 加载成功（独立角色根会话可看）；用量保留在平台页签 | 编排 | 面板在 team 数据失败时仍渲染培养内容；`company-budget` 页签仍在 | team 断流时培养面板显示明确不可达，**不显示 0 或空列表** | `tests/client` spec（视图模型）+ `client-load-smoke`（真挂载）+ 视觉夹具 |
| V2 | 读模型数据诚实：journal/记录目录缺失或读取失败 ≠ 0 | 确定性逻辑 | 缺失清单 → 「不可达」态；空清单 → 「无待审」态（两态分开） | 现状把缺失折为 0 的路径作为红证起点 | `tests/company` spec（红→绿：先立断言现状红） |
| V3 | 分身提案：`cultivation_propose` 工具提交纠正/建议（来源坐标+期望行为+目标角色），落公司盘记录、UI 收件可见 | 编排+模型行为 | 工具挂载零失败；记录落盘且读模型折进行；提案署 preset/会话 | 坏输入被拒（参数校验）；工具面**无采纳动作**（模型不能自采纳） | preset-smoke（挂载）+ `tests/company`（记录读写模型）+ 机制探针（真模型调一次） |
| V4 | 人侧采纳：`/cultivation adopt` 写方法文件进该角色方法层 + 记录状态翻转 + 回执；run 进会话日志 | 确定性逻辑+编排 | 方法文件在方法层出现（路径=该角色第二 customSkillDir 下）；记录带采纳回执 | `reject`/`revoke` 保留理由与历史；撤回后方法文件删除 | `tests/company`（状态机纯逻辑）+ 机制探针（真实命令 run 落盘核验） |
| V5 | **跨会话生效（C 核心）**：采纳后该角色**新根会话** catalog 含该方法且正文可加载；其他角色不误载；CEO 委派 child 只见 ceo 组合 | 编排 | 新会话 `request/header.tools`+技能目录含方法 skill；对照角色/child 不含 | 误加载任一即红；方法目录缺失时 preset 挂载不炸 | 机制探针（真会话 catalog RPC，免模型）+ 一次真模型 skill 加载（认证档）+ delegation-smoke（child 组合） |
| V6 | 写隔离（D25 维持）：**workspace-write 部署下**分身会话 fs 写方法层路径被沙箱拒 | 确定性逻辑 | 角色会话写 `<方法层>/…` → `[sandbox: file access denied under workspace-write mode]` | 2026-10-13 首跑证伪一版假设：本机 Seatbelt 禁用 ⇒ env.sh 导出 danger-full-access ⇒ 围栏缺席（机器条件，非机制缺陷）；钉 workspace-write 重跑即拒 | 机制探针 `--full` 档（真模型一轮；判 ⑦ 前先钉 `DSH_PERMISSION_MODE=workspace-write`） |
| V7 | CEO 建议（仅建议权）：CEO 提的建议记录归 CFO 收件；CFO 侧采纳/拒绝；CEO 可查回执 | 确定性逻辑 | 读模型按目标角色过滤收件；回执字段双向可见 | 采纳按钮/命令不因提出者是 CEO 而越权（无直接改他角方法的通道） | `tests/company` spec（归属过滤+回执投影） |
| V8 | 能力而非记账：已采纳方法带验证字段（新同类任务引用/结果/旧行为检查）；无验证显示「未验证」 | 确定性逻辑+人判断 | UI/记录区分「已采纳·未验证 / 已验证」；验证内容由人判定（机械面只显状态） | 空验证 ≠ 已掌握 | `tests/company` spec + UI 文案 |
| V9 | 诚实边界：CEO child 显示「继承 ceo 组合，职能角色方法不进 child」；方法层 profile×角色 边界在 UI/合同如实标注 | 确定性逻辑（文案） | 面板/合同出现该标注 | — | `tests/client` spec（文案断言） |
| V10 | 产品操作不暴露开发命令：培养面板「怎么养」不出现 repo 门禁编号/内部术语；下一步指引给人话 | 确定性逻辑（文案） | 面板文案无 `pnpm`/`D25`/spec 名 | — | `tests/client` spec |

**人的判断残留**：验证记录的内容与「是否算掌握」（V8 验证字段由人填/判）；方法文本质量（采纳前人审）。其余全部机械可判。

**同 diff 义务**（测试宪法 §2）：preset config 改动（第二 customSkillDirs）→ `tests/presets` + preset-smoke + delegation-smoke；host/client 新模块 → `tests/harness`（pack-exports）+ `tests/company`/`tests/client`；探针资产进 `probes/session-context/`（新机制域归属：技能目录/作用域）。

## 关闭条件

三项拍板已落定（状态行）；机制缺口由 S0 探针查证或显式保留；方案、排除项、验收已定稿。剩：S0–S5 实施与验收记录回写本卡、申请去向记录在案后可结卡（不等未来扩展，但本轮实施未完不结）。

## 本轮研究回执

本轮只新增本卡与三份研究材料、更新两份索引。资料覆盖现状、机制与外部参考；没有部署、真实训练、角色行为/收益验证或新的已落地决定，因此不写 implemented Note。研究建议与当前合同分开；下一步需收敛第一版用户闭环。

- 实跑：`set -o pipefail && pnpm verify && pnpm test`，verify ALL PASS，53 个 spec/524 项测试通过（exit 0）；后续纯文稿与索引措辞收口再跑 `pnpm verify` 与 `git diff --check`，均 exit 0。检查只证明结构和现有回归，不证明培养有效。
- 语义审：对照用户原话、现行 preset/多人合同、证据选层与 Note 适用范围，重读当前变更；独立审阅 blocker 0、建议 2，已修“包升级保留个性化”为待验证目标、分开 Teachability 所证能力与本项目撤销要求。自查修正 provider/feedback 已知事实与 user-question 的 parent 边界。候选不当定案，无实施越权。
- 收割：外部搜索连接失败、global Inspect 无公司 occupant 已记证据限制；没做角色活体运行，未产生新增场景/夹具/门禁/行为语料；没有被证伪的已落地切片，无需 revert。原有 SSR useLayoutEffect 警告在现有测试输出中出现，未改相关渲染实现。
- 四链：挂载、培养行为与安装均未执行；已授权且交付的是本轮研究材料，实施尚未批准。vendor 门禁保持零改动。

## 本轮实施回执（2026-10-13 拍板后同日，S0–S5）

- **交付**：公司页第四子页＝培养（`COMPANY_PANELS`；面板不依赖 team 数据——独立角色根会话可看，用量保留平台页签）；培养领域视图三壳共享（`CultivationBoard`：我的分身/需要我处理/我提交的·我已处理/已采纳的方法/journal 待审/赞踩/怎么养）；记录读模型（`recordText`/`parseRecord`/`recordInbox`；不可达≠0、未验证≠已掌握）；host 面 = `cultivation_propose` 工具（分身只开提案）+ `/cultivation` 命令族（correct/suggest/adopt/reject/verify/revoke；采纳角色闸 = 会话 preset === 目标角色）；方法层 = 五 preset 第二 `customSkillDirs` 锚 `baseUrl` + `cordis.patch.yml` `cultivationRoot`（构造对齐，实测 `<profile>/company-cultivation/<role>/`）。
- **实跑**：新 spec 先立后实现（实现前红 8 断言 → 绿）；`pnpm test` 538/538（54 文件）；`pnpm verify` ALL PASS；preset-smoke 5/5；delegation-smoke ALL PASS；client-load-smoke ALL PASS；probe-smoke 快速档 5/5；机制探针 12 判据 ALL PASS；`--full` ⑦ 写隔离 PASS（先钉 `DSH_PERMISSION_MODE=workspace-write`）。
- **证伪与修正**：⑦ 首跑在本机默认（danger-full-access）红——「无条件沙箱拒」被证伪，根因 = 本机 Seatbelt 禁用的 env.sh 机器条件处方；钉 workspace-write 重跑绿。V6 行与定稿第 4 条、`docs/presets.md` 均改**模式依赖**口径（workspace-write 部署下分身不可写；不宣称绝对隔离）。另实测 watcher 强于合同：运行中会话的 catalog 也刷新。
- **测试资产收割**：`tests/company/cultivation.spec`（记录读写往返/坏形状/归属分箱/不可达）；`tests/client/cultivation-board.spec`（V1/V2/V7/V8/V9/V10 静态渲染）；`tests/presets` 方法层根断言；`probes/session-context/cultivation-method-layer-probe.mjs`（常驻；头注写明复跑条件与模式依赖）；pack-exports/signoff-tool spec 同步 inject/commands 面。
- **语义审**：对照拍板三项与验收标准逐行重读全部变更——blocker 0；两处自查修正（spec 黑名单误把产品命令 verify 当开发命令；夹具期望值漏列已采纳自纠记录）。
- **未验残留（显式）**：`probe-smoke --full` 内容档（本轮仅组合改动未动 persona 文案）；培养面板的浏览器视觉走查/视觉夹具（keyless 静态渲染 + client-load-smoke 真挂载已过，视觉档留给下次观察窗走查）；按钮式采纳（钉版无 pack 自有 UI→host 动作通道，另立卡引用本卡）；多人真实使用回路（单操作者现实）。
