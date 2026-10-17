---
status: 推敲中
opened: 2026-10-17
---

# 推敲：培养面板的 GUI 行动面（采纳 / 拒绝 / 验证 / 撤回）

> 立卡：2026-10-17 ｜ 状态：推敲中 ｜ 类型：Feature ｜ 毕业：未定 ｜ 可关闭：否

**问题与期望结果：** 用户 2026-10-17 读「怎么养」后提两问——①「命令行没挂上」②「可以支持 GUI 培养体验吗」，
并当场要求「先计划、推敲，不用落地」。期望结果 = ① 查清「没挂上」的真实原因（是实例没装包，还是命令面坏了）；
② 给出可实施、可验收的 GUI 培养方案（按钮式采纳 / 拒绝 / 验证 / 撤回），并讲清它是否改变「采纳只能由人」的口径。

**当前情况：** 两问都已用现场证据查实（见下两节）；2026-10-13 把「UI 按钮采纳」判死的那条前提
（钉版 DSH 无 UI→host 动作通道）已被证伪，但按钮仍未实施。方案、推敲、验收齐备，等用户裁定四个待裁点。

**未决问题：** 待裁点 1–4（动作集 / 通道 / 形态 / 撤回确认）见文末。

**下一步：** 用户逐条裁定后，按 [notes/proposed 合同](../../notes/proposed/README.md) 立 RFC 或直接进实施（授权逐条给）。

## 现场事实（两问的答案）

### ①「命令没挂上」= 那个实例没装包，不是命令坏了

[实测 2026-10-17] 我所在的 GUI 就是用户提问的那个：`http://127.0.0.1:3080`，`DSH_HOME=/Users/bowhead/.dsh`、
`DSH_PROFILE=web`。三条独立证据：`~/.dsh/profiles/web/package.json` 的 `dsh.profile.bundles` 里**没有** `dsh-company-pack`；
我这个会话的工具面里**没有**本包工具（`cultivation_propose` / `request_signoff` 双双缺席，而它们由本包 host 面无条件注册）；
`lsof` 实测全机两个 HTTP 实例 = 3080（日用）与 3083（`/Users/bowhead/ai_dsh_deep_research` 的 research profile，cwd 实证），
**本仓没有 dev web 在跑**。⇒ 在那儿敲 `/cultivation …` 只是一行普通文本，不解析；不是命令面坏了。

这条事实的既有唯一家 = [demo.md §前置 1](../../docs/demo.md)（原话：日用 `~/.dsh` 里也有个同名 `web` profile，
装的是日用插件集、没有公司五角色）；自检一行 = `source run/env.sh && pnpm dsh --profile web --dump-config | grep -c company-pack` ≥ 1。

dev 组合里命令面确实是挂着的：培养机制探针判据④（`commands/list` 含 `cultivation`，且 `correct` 真落记录到公司盘）
在 2026-10-13/15 实跑 ALL PASS——收据 = [agent-cultivation-loop](../../notes/implemented/2026-10-13-agent-cultivation-loop.md) ⑤，
探针 = [cultivation-method-layer-probe.mjs](../../probes/session-context/cultivation-method-layer-probe.mjs)。

### ② 面板里的命令是**纯文本**，板没有动作面

三壳（公司页第四子页 / 侧栏页签 / 浮窗）共用 [CultivationBoard.tsx](../../packages/company-pack/src/client/CultivationBoard.tsx)，
其头注自称「纯展示」板；待处理行只渲染 `采纳：/cultivation adopt <id>　拒绝：/cultivation reject <id> :: 理由` 这类文案
（:83），既无按钮也无回调面。所以「点不动」是当前事实、不是缺陷。

2026-10-13 立卡时把「UI 按钮采纳（浏览器→host 业务 Remote）」列进**输掉的方案**，原话是「钉版 DSH 无 pack 自有
UI→host 动作通道（remotes 选择面由 vendor 组装、dynamic cordis = session-scoped 且 trust 等同 bash）⇒ v1 用命令族 =
平台原生『人侧直控面』；按钮留待上游开放通道后另立卡引用本 Note」。**本卡就是那张另立的卡**（2026-10-17 补立）。

## 机制核证（原否决的前提被证伪）

[读码，钉版 vendor] 平台**有**原生的人侧动作通道，而且 vendor 自己就在用：

- 会话面：`SessionFace.command(line)`（`vendor/dsh/packages/api/session-controller/src/client/contract/session.ts:147`）——
  注释写明「Execute one slash-command line against this session's agent… outcomes render as flow nodes, never as a
  response echo」，实现 = `remote.commands.execute(sessionId, line, [])`，只回 `{ matched }`。
- 同款先例：`vendor/dsh/packages/client/ui-permission-presets/src/client/index.ts:126` 的 `submit()` 用
  `sessions.binding(sessionId)?.session.command('/permission <preset>')` 驱动一条真命令。
- host 端每条命令都记 `command/run` + `command/done`，且**来源一律 `source: { kind: 'user' }`**
  （`vendor/dsh/packages/interaction/commands/src/index.ts` 的 `execute`）——与人敲命令同一事件、同一份留痕。
- 远程面由 vendor 装配（`vendor/dsh/packages/api/remotes/src/client/index.ts:8` 引 `commandsRemote`）
  ⇒ **不需要 pack 自有 remote**。原否决里真正成立的那半句（pack 无法自造 business Remote）不变，
  但它不构成按钮的障碍：按钮用的是平台通用命令执行面，不是自造通道。

槽位归属也已核：`sidebar.right.pane.tab` = keyed + `scope: 'session'`
（`vendor/dsh/packages/client/ui-sidebar-right/src/client/index.ts:217`）⇒ 页签体天然带自己会话的 `sessionId`，
按钮作用对象明确（浮窗同源，实施时按 `props.sessionId` 每帧取）。

客户端测试基座（决定验收怎么写）：本仓 `tests/client/` 全是 `renderToStaticMarkup` 静态渲染，**没有 jsdom/交互层**
（全树无 jsdom 命中）⇒ keyless 只能证「按钮在场 / 只读降级 / 线构造」，「点了真落盘」必须真浏览器
（`client-load-smoke` 只证挂载、不点按）。

## 方案与取舍（推荐稿）

1. **通道（推荐 A：对象层会话面）**：按钮 → `sessions.binding(props.sessionId)?.session.command('/cultivation adopt <id>')`。
   走对象层会话面、不新增注入、与 vendor 先例同款。代价 = 只回 `matched`，**拿不到回执/错误文本**——按 vendor 设计这是
   有意的（结果落 flow node，面板不回声）。⇒ **必做补偿**：动作后立即重读记录；若目标记录状态没动，行内如实提示
   「命令已发出但记录未变——看该会话的 command/done 回执」。缺这一条，本设计最容易落成「点了没反应」。
2. **形态**：只在培养面板加动作——待处理行 =「采纳」「拒绝（内联理由输入）」；已采纳行 =「验证通过」「验证不通过」「撤回」。
   动作面缺席（未注入）= 现状命令文本（只读降级）⇒ 老 spec 与无命令面的组合都优雅退化。
3. **角色闸**：客户端只在 `viewerRole === record.targetRole` 的行出按钮（收件箱本就按此过滤）；host 的角色闸照旧兜底。
   客户端隐藏只是 UX，**不宣称授权**。
4. **确认**：撤回 = 破坏性（删方法目录、影响未来会话）⇒ 两段式确认（按钮变「确认撤回 / 取消」）；采纳可逆（revoke）⇒ 不确认；
   拒绝单向（`status` 回不到 `open`）⇒ 用理由输入当摩擦。
5. **刷新与生效边界**：`useCultivationPanelData` 暴露 `refresh()`，动作后立即重读（不等 30s 轮询）；文案必须仍写清
   **新开的该角色会话**才加载方法（[presets.md 生效边界表](../../docs/presets.md)），不得暗示本会话立即生效。
6. **影响面**：client 面为主——`CultivationBoard.tsx`（按钮/降级）、`cultivation-data.ts`（refresh + 动作面进注入闭包）、
   `CultivationTab.tsx` 与 `CompanyView.tsx`（传参）、`index.ts` + `company-tab-registration.ts`（造闭包）、`styles.ts`（按钮样式）、
   新 `cultivation-actions.ts`（纯逻辑：线构造 + 结果折算）；host 面**零改动**（命令族语义与角色闸不动）。

## 推敲（红队：漏洞、反例、边界）

1. **权限口径变了半句，机制没变**：host 不区分命令来源（远程 `execute` 一律 `source: user`）⇒「人侧」的定义从
   「人敲终端」变成「人在 UI 里发起」。守卫仍是「模型没有这个工具」，**不是**「模型不能触发 UI」。反例：本包的 peer 里就有
   `dsh-browser-use`（playwright MCP）⇒ 理论上一只带浏览器工具的分身可以驱浏览器点按钮。但这条道在按钮之前就存在
   （一样是在 composer 里打字），**本轮不引入新面**；结论 = 不能再拿「命令是人敲的」当绝对句，
   研究稿那句「不把前端隐藏按钮当安全保障」继续成立。
2. **静默失败**（本设计第一号风险）：`command()` 只回 `matched`；跨角色、记录不存在、方法重名等 host 错误都在 `result.text` 里，
   客户端看不到。补偿见方案 1；另一选项是越层用 `remote.commands.execute` 拿回执——列为待裁点 2。
3. **会话身份**：`scope: session` 已核；但「浮窗是否仍是同一 session scope」与「面板开着时切换会话」两点实施时必须实测。
   错误会话上执行会被 host 角色闸拒（安全），但用户看不到原因 ⇒ 回到第 2 条。
4. **并发/重复点击**：host 侧 `installMethod` 独占建文件（返回 false 即不覆盖）+ 记录 `open` 态守卫 ⇒ 第二击不会损坏数据；
   客户端仍要飞行中禁用 + 完成后重读。
5. **误触面变大**：多人合同早写了「同一台机器上谁都能按那个按钮」（[multi-human.md](../../docs/multi-human.md)「多人合同」节）；
   按钮把「一键采纳」摆进待办列表，误触代价 = 真部署一条方法。缓解 = 按钮带对象（`采纳 <id>`）、成功后行内回执、撤回可逆。
6. **两个互动面**：面板按钮与 `/cultivation` 的 `commandUi.decorate` 弹窗（打 `/cultivation` 回车即出待办选择器，onSelect 提交完整命令）
   都是平台原生做法；同时做 = 一个事实两个入口。建议 v1 只做面板按钮（待办在面板），弹窗装饰留作候选/替代
   （它更贴合「命令行没挂上」的原始问法，见待裁点 3）。
7. **文案纪律**：本包 client 面历来硬编码中文（vendor 的 locale 字典规则是 vendor 包纪律）——本卡既不追齐也不扩大该偏离。
8. **生效边界**：见方案 5。撤回后**新**会话不再加载；运行中会话是否刷新不是合同主张（探针实测 watcher 会刷新，
   但按钮文案不得承诺「立刻全局生效」）。

## 输掉的方案

- **pack 自有 business Remote**（面板 → 自定义 host RPC）：仍然做不到（remote 选择面由 vendor 装配）——但本卡不需要它。
- **只做「复制命令到剪贴板」**：零权限争议，但用户问的是"能不能点"，且复制后仍要切输入框粘贴回车；性价比低。
- **把命令插进 composer 让人按回车**：需要未经核证的输入面 API（`slash/input-insert-text` waterfall），体验介于两者之间；留作候选。
- **越层用 `remote.commands.execute` 拿回执文本**：能修静默失败，但绕开对象层会话面；列为待裁点而非默认
  （若采纳需同 diff 说明为什么值得破这一层分层）。

## 范围与排除项

- **做**（若批准）：决策四动作的 GUI 面 + 只读降级 + 动作后刷新 + keyless 判据 + 真浏览器验收 + Note/合同痕迹。
- **不做**：「提交纠正 / 建议」的自由文本表单（仍需命令行）；host 命令族语义与权限改动；多人身份/认证隔离；
  把 pack 装进日用 `~/.dsh`（那是 release 安装路径的另一件事，见 [安装手册](../../_dist/安装手册.md)）。

## 验收标准

> 判据分层唯一家 = [testing.md](../../docs/testing.md)；本节只定「怎么测」。实施按 [proposed 合同](../../notes/proposed/README.md)
> 的红绿环走：**先红后绿**，判据先行。

1. **机制/keyless（先红）**：`pnpm test tests/client`
   - `cultivation-board.spec.ts` 增：有待处理记录 + 注入动作面 ⇒ 出「采纳」按钮（不再只有命令文本）；
     不注入 ⇒ 现状文本（只读降级）；`viewerRole` 与目标角色不符 ⇒ 不出按钮。
   - 新增 `cultivation-actions.spec.ts`：线构造正确（adopt / reject 带理由 / verify pass|fail / revoke slug、
     记录 id 与理由的边界输入）；`{ matched: false }` ⇒ 命令面不可用文案；抛错 ⇒ 错误文案；成功 ⇒ 触发 refresh。
   - 红证：这些断言在实现前必须实跑见红（当前无按钮、无 actions 模块）。
2. **装配（不许破）**：`tests/client/company-client-composition.spec.ts` 仍绿（新 prop/闭包不得改槽注册面）。
3. **真挂载**：`source run/env.sh && node checks/smoke/client-load-smoke.mjs` 零挂载失败。
4. **真行为（本卡的「行为对」层）**：新增一条 browser-visual 面的真页面探针（拟名 `cultivation-gui-probe`，
   落位与命名随实施定）——起真 web → 种一条 open 记录到排练盘 → 进培养面板 → 点「采纳」→ 断言：① 记录翻 `adopted`
   且带 `methodSlug`；② 方法 `SKILL.md` 落到 `<dev home>/profiles/web/company-cultivation/<role>/method-<id>/`；
   ③ 该会话日志出现 `command/run` + `command/done`（name = cultivation、source = user）；④ 零挂载失败；
   ⑤ 截图入 snapshots/visual 下的新目录（拟名 cultivation-gui）。判据与现有探针⑤同源，但走真按钮。
   - **已知风险**：面板导航选择器脆（公司页第四子页需两步点击，或改走侧栏培养页签）。实施时先跑一条最小导航腿确认可点，
     再落断言；点不动就**如实降级**为「页签腿 + 缺口记录」，不硬造绿。
5. **结构**：`pnpm verify` 全绿。

## 待裁点（请用户逐条裁定）

1. **动作集**：决策四动作（推荐）｜ 连「提交纠正 / 建议」表单一起做。
2. **通道**：`session.command()`（推荐；分层干净、无新注入；代价 = 无回执文本 + 方案 1 的补偿）｜
   `remote.commands.execute`（有回执文本，破一层分层）。
3. **形态**：面板按钮（推荐 v1）｜ `/cultivation` 弹窗装饰（`commandUi.decorate`）｜ 两者都做。
4. **撤回确认**：两段式确认（推荐）｜ 直接执行（靠可逆/可重采纳兜底）。

## 关闭条件

- 用户裁定四条待裁点并批准 ⇒ `毕业：做`，按合同进 RFC / 实施；实施完成后本卡按 [_backlog 章程](../README.md) 归档，
  去向写进毕业 Note。
- 用户判定不做 ⇒ `毕业：不做`，同次归档并写明理由。
- 被别的卡或合同吸收 ⇒ `毕业：消化`，注明承接方。
