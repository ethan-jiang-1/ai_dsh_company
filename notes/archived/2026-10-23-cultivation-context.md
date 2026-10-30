# 培养创作面 · 可选参考背景（v1）

状态：已交付（2026-10-23；D1=A / D2=A；`pnpm verify` ALL PASS、`pnpm test` 823 绿、真浏览器 probe ALL PASS）
批准：2026-10-23 用户（「好计划有了，你就静默自主推动，先setup goal」）

> 上游 = [推敲卡 §14](../../_backlog/_archive/settled_issues/2026-10-23-cultivation-context.md)（拍板与 UX 细节；本 Note = 现行合同与实跑证据）。
> 行为面细则（窄栏/键盘/文案 deck/异常表）仍以卡 §4 为需求源，本文只钉实现与验收的语义。

> **2026-10-30 部分取代（正文规则 + 壳体）**：`--work=` 也豁免正文——有 `work` 或背景时空正文放行，
> 两者都无仍必填；两壳现为 `CultivationTab` + `CultivationView`（`CompanyView` 未注册）。
> 本文 §决定 3 与 §交付 的“CultivationTab / CompanyView 两壳同语义”作废；背景/宿主读取/teammate 记账决定保留。
> 体裁仍为提案体（方案/实施顺序/怎么测），属 notes 分诊的 REWRITE 候选。

## 决定

1. **D1 = 命令只带引用，host 读后写自包含 `contexts`**。客户端不再把摘录/标题塞进命令；
   命令只带 `{kind, ref, turn?, parentSessionId?, mode?, label?, role?}`（`label`/`role` 仅展示提示，不是证据）。
   host 用 `sessionQuery` 读会话、用成品目录 + `final.md` 读成品，读不到就不落记录。
2. **D2 = teammate 会话只做背景源，按 Lead/CEO 身份记账**。`members[].name` 只进展示字段，不进
   `targetRole`/`proposerRole`；teammate 会话里的创作面明说“按 CEO 记账；成员继承 CEO 的方法层”；
   host 的 `sessionFaceOf`（`agentPreset`）**不改**。
3. **有背景时正文可空**；方法正文回落为期望句（`methodSkillText`）。无背景时正文仍必填。
4. **v1 源 = 本次/最近会话 + 最近成品，一段**；journal、任意文件、换轮列表、AI 起草均不在 v1。
5. **方法层不读 `contexts`**：背景只服务人与审批，不污染 SKILL.md（沿用 D17）。

## 交付（2026-10-23）

- **纯模型**：新增 `packages/company-pack/src/lib/cultivation-context.ts`（命令/记录形状、浏览器安全 base64url、校验、截取、轮次投影、地址）；`lib/cultivation-record.ts` 加 `contexts`/`contextProblem`、空正文回落。
- **host**：`host/cultivation.ts` 解析 `--context=`、`sessionQuery.observeSession` 读会话、成品目录读成品、写 `contexts`、空正文放行；读取失败不落记录。
- **客户端**：新增 `client/cultivation-context-data.ts`（会话/成品候选、标签、预览读）、`client/CultivationContextPicker.tsx`（内联选择面板）；`CultivationCompose` 背景区/默认当前轮/移除/更换/超时；`CultivationBoard` 背景卡、空正文提示、“我提交的”摘要、打开原文回调。
- **注入**：`client/index.ts` 两个注入块共用 `makeContextWiring`（会话查 list/subagentAddress、文件先 stat）；`CultivationTab` / `CompanyView` 两壳同语义。
- **文档**：`docs/presets.md` 培养合同加可选背景段；`checks/README.md` 加背景探针索引。
- **探针**：新增 `probes/session-context/cultivation-context-probe.mjs`；扩 `probes/browser-visual/cultivation-gui-probe.mjs` ⑤b（成品背景 + 空正文 + 记录 contexts）。

## 输掉的方案（真实考虑过）

| 方案 | 为什么没选 |
|---|---|
| B. 客户端快照随命令（原 §5.2） | 4–12KB base64 进 `command/run` 日志（正文副本）、客户端可伪造证据、每个提交都复制一次；仍需 host 校验，收益只剩“预览=记录同源”。 |
| L. 纯结构化引用 + 按需打开 | 审批人点开前没有判断材料，原文删了就无证据；与“少写、审批有材料”的目标冲突。 |
| 把 `members[].name` 写进 `targetRole`/`proposerRole` | 成员名是自由命名，不是五角色 id；方法层按 preset 装载，成员（ceo-preset）不会加载 cfo 方法层。 |
| 新造 pack 自有 Remote | `ctx.remote.$mount()` 只接受 generated Host-for-Client contribution（[gateway README](../../vendor/dsh/packages/api/gateway/README.md)），pack 没有生成链。 |
| 完整 transcript | 记录膨胀、隐私面大、方法层污染。 |
| AI 起草放 v1 | 多一次模型调用/延迟/幻觉/署名；背景字段已解决主要输入。 |
| 多段背景 v1 | 审批行与选择器复杂度翻倍；数据模型留数组，UI v1 一段。 |

## 规范

### 数据形状

客户端与 host 共用纯形状（新增 `lib/cultivation-context.ts`，位于 `packages/company-pack/src/` 下；**必须浏览器安全**，
不得引 `node:`/`Buffer`——`lib/` 会打进 `lib/client.js`，见 [tsdown.config.ts](../../packages/company-pack/tsdown.config.ts)）。

```ts
/** 命令里带的最小引用；不含任何摘录。 */
export interface CultivationContextRef {
  readonly kind: 'session' | 'deliverable'
  /** session = sessionId（child = 子会话 id）；deliverable = 工作区相对路径。 */
  readonly ref: string
  /** 会话轮次；缺省 = host 取最近一轮。 */
  readonly turn?: number
  /** 子会话的 parent（session 且 origin=subagent 时必填）。 */
  readonly parentSessionId?: string
  readonly mode?: 'one-shot' | 'continuable' | 'unknown'
  /** 展示提示（不是证据）：会话标题 / 成品 slug。 */
  readonly label?: string
  /** 展示提示（不是证据）：角色/成员名；host 只写展示字段。 */
  readonly role?: string
}

export interface CultivationContextCommand {
  readonly v: 1
  readonly mode: 'correct' | 'suggest'
  readonly targetRole?: string
  readonly items: readonly CultivationContextRef[]
}

/** 记录里的自包含背景（host 读后填）；`contexts` 字段 = {v:1, items:[…]}。 */
export interface CultivationContext {
  readonly kind: 'session' | 'deliverable'
  readonly ref: string
  readonly parentSessionId?: string
  readonly mode?: 'one-shot' | 'continuable' | 'unknown'
  /** 展示用，不是权限/归属判据。 */
  readonly role?: string
  readonly title: string
  /** 会话 = 角色/成员 + 轮次；成品 = 结果。 */
  readonly subtitle?: string
  /** 源时间（会话末条事件 / 成品 kickoff）。 */
  readonly at?: string
  readonly turn?: number
  readonly excerpt: string
  readonly truncated?: boolean
}
```

约束（host 必须校验，客户端先做一遍）：

- `v === 1`；`mode` 枚举内；`items.length === 1`（v1）。
- `kind` 枚举内；`ref` 1–512 字符、无控制字符；session ref 只认 `[A-Za-z0-9._:-]`，且必须能在
  `sessionQuery` 里读到；deliverable ref 必须是 `kb/deliverables-index.json` 里的 `path`（不做任意文件读）。
- `label` 0–200、`role` 0–40；`turn` 为非负安全整数；`mode` 与 `parentSessionId` 成对出现。
- 命令 JSON ≤ **2,000 UTF-8 字节**；base64url token ≤ **3,000 字符**；超限明确报错，不截断后继续。
- 记录 `contexts` JSON ≤ **8,000 UTF-8 字节**；`excerpt` ≤ 2,000 码点；`title` ≤ 200；`subtitle` ≤ 200。
- 客户端**不许**在命令里带 `excerpt`/`at`/`truncated`；host 遇到未知字段直接拒（防止把证据从侧门塞进来）。

### 命令

```text
/cultivation correct --context=<base64url(JSON)> <期望句> :: <正文>
/cultivation suggest <角色> --context=<base64url(JSON)> <期望句> :: <正文>
```

- 只认 **`--context=` 精确形**，位置固定：`correct` 之后、期望句之前；`suggest` 在角色之后、期望句之前。
  `--context`（无 `=`）不是 flag，按旧语法的期望句处理（`correct --context is confusing :: …` 不再有歧义）。
- 没有 flag：逐字走今天路径（`source = （会话内提交）`、正文必填、记录无 `contexts`）。
- 解析（host）：`splitBody` → `head.split(/\s+/)` → 定位 `--context=` → 取 token → 严格 base64url 解码
  （非 `[A-Za-z0-9_-]`、非法长度、`=` 填充 → 错）→ 长度检查 → `JSON.parse` → 形状校验 → `items[0]`。
- 错误文案（host 原话上行，面板不吞）：
  `背景格式坏：不是合法的 base64url。` / `背景格式坏：JSON 解析失败（<原因>）。` /
  `背景格式坏：不支持的版本 / kind / 字段。` / `背景只能带一段（v1）。` /
  `背景太大（超过 <N> 字节），请选短一点的材料。` / `这段背景读不到：<原因>。可以换一段，或不带背景提交。`
- 旧语法回归：`tests/company/cultivation.spec.ts` 现有用例全绿；新增 `--context` 无 `=` 与
  `--context=` 坏 token 两个用例。

### Host 读取（唯一证据来源）

`packages/company-pack/src/host/cultivation.ts` 的 handler 改为 **async**（先核对 `commands.register`
接受 Promise；类型在 `vendor/dsh/packages/interaction/commands/src/types.ts`）。读取逻辑：

1. **会话**：`const query = ctx.get('sessionQuery')`；缺席 → `这个界面读不了会话历史（sessionQuery 未挂）`。
   `query.observeSession(sessionId, { projectionMode: 'none', signal })`（非激活、冷会话可读；
   见 [session-query README](../../vendor/dsh/packages/session-query/session-query/README.md)）。
   - child：先校验 `observation.header.parentSession === parentSessionId` 且 `origin === 'subagent'`；
     不匹配 → 错，不落记录。
   - 轮次：按 `turn/start` 分组；只取 `user/message`（`source.kind === 'user'`）与 `assistant/message`
     的文字 block；排除 checkpoint（`compact-checkpoint`）、tool、reasoning、图片。
     选 `turn` 指定轮，缺省取最后一组有文字的轮；进行中/仅用户也允许，摘要标注。
   - 标题：`query.readTitleSnapshots([id])`（或 `label` 提示，截 200）；`at` = 该轮末条事件 ISO 时间；
     `excerpt` = user + assistant 文字 head+tail 截到 ~1,200 码点，截断置 `truncated: true`。
2. **成品**：`readFileSync(join(cwd, 'kb/deliverables-index.json'))` → parse → 按 `path === ref` 找 entry；
   找不到 → `成品目录里没有这个成品`；`title = slug`、`subtitle = result`、`at = kickoff`、
   `excerpt = summary` 截 ~600；不读任意文件。
3. `source` 写人话：`会话「<title>」` / `成品「<slug>」（<result>）`，≤200。
4. 成功：`writeRecord` 带 `contexts`；正文可为空；回执带背景标题。
5. 失败：`{ kind: 'error', text }`，**不写任何记录文件**；不 catch 后继续写半条。

客户端预览仍走客户端读（见下），但**记录以 host 读到的版本为准**；审批行/表单需有一句
“以提交时服务端读到的版本为准”。

### 记录

- `contexts` = 单行 JSON `{"v":1,"items":[…host 填的 CultivationContext…]}`，放 frontmatter **末尾**；
  `source` 仍写人话摘要。旧记录无 `contexts` → `[]`。
- `parseRecord`：坏 JSON/坏形状 → `contexts = []` + `contextProblem`，记录本身不消失，`source` 照常。
- `recordText`：`contexts` 只在非空时写；旧字段顺序不变；不批量迁移。
- `methodSkillText`：`body.trim() === ''` 时用 `expectation` 作正文（避免空技能）；有正文时仍只用正文。
- `updateRecordFile` 的 upsert 语义保留：`adopt`/`reject`/`verify` 后 `contexts` 必须还在（补三条断言）。

### 客户端

**候选与标签**

- 会话列表用客户端 `sessions.list` 快照（本地、无每键 RPC）；过滤 `blank === false`、同 cwd（`session.cwd` 或缺省视为同）。
- 角色标签：
  - 根会话：`projectionValues.agentPreset` ∈ 五角色 → 角色徽标。
  - 子会话（`origin === 'subagent'`）：用 parent 的 `projectionValues.agentTeam.members` 按 `id === sessionId`
    找 `name` → 标成 **“成员 <name>（CEO 团队）”**；找不到 → 无徽标。**不要**为读标签去 `follow(Lead)`
    （会触发 P0-2 的 promote）。
- 排序：本次会话 → 与目标角色匹配的根会话 → 最近更新；最多 8 行 + 客户端搜索。
- 本次会话固定第一行；给自己模式默认选中；给别人模式默认不选，选择器排在目标角色前面。

**预览读取**

- `remote.session.follow({ address, maxMessages: 40, turnWindow: { minMessages: 8, minTurns: 3 },
  assistantStream: false }, signal)`；只取第一个 `snapshot` 帧，`break`（触发 `return`）+ abort；
  不在后台保留流。地址：根 `{kind:'session', sessionId}`；child 用
  `sessions.subagentAddress(id)` 构造，取不到就不默认带。
- 截止 **8s**；超时/失败显示原因 +「不带背景继续」/「重试」；提交禁用不得无限期。
- 预览的轮次提取/截取与 host 共用 `lib/cultivation-context.ts` 的纯函数，保证同源规则。
- 探针通过后可用 `remote.session.projections` 的 `asOfSeq` + `remote.session.page` 做非激活一次性读；
  失败回退 follow。v1 先 follow+break。

**表单与背景卡**

- 背景区在目标角色之后、期望句之前；默认值可见、可移除，不偷偷带。
- 有背景：正文标签变「做法（可选）」，提示“背景已带上；不写也能记下，审批人会看上面的背景。”
- 无背景：正文必填，文案改成“写清做法与证据，或带一段背景。”
- `CultivationContextPicker`：内联面板（非 modal），本次/最近会话/最近成品/搜索/空态/错误态；
  键盘 ↑/↓/Enter/Escape，`aria-expanded`/`aria-controls`/`role="option"`；焦点回到触发点。
  材质优先用 `MenuSurface`（`@deepseek-ai/dsh-client-ui-primitives`，本包已依赖）；若其锚定/floating
  形态不适配内联面板，用现有 token 自绘并在代码注释说明理由。
- 成品源：复用 `readCatalog` + `parseCatalog`（[DeliverablesTab.tsx](../../packages/company-pack/src/client/DeliverablesTab.tsx)）
  与 `sessionFileAddress`（[deliverables-address.ts](../../packages/company-pack/src/lib/deliverables-address.ts)），不写第二份解析器。
- 读取文本复用 `makeWorkspaceTextReader`（[cultivation-data.ts](../../packages/company-pack/src/client/cultivation-data.ts)）。

**teammate 明说**

- `origin === 'subagent'` 的会话里，创作面顶部一条常驻说明：
  `这是 CEO 团队成员的会话：这里的纠正/建议按 CEO（Lead）身份记账；成员继承 CEO 的方法层。`
- 选择器里的成员行标“成员 <name>（CEO 团队）”，不显示成 preset 角色徽标。
- `role` 字段只进展示；`targetRole`/`proposerRole` 仍由 host 的 `sessionFaceOf`（`agentPreset`）决定。

**审批行**

- 有 `contexts`：显示背景卡（kind/角色或成员/时间/轮次/标题/摘录）；默认 2 行，展开看完整；
  正文空显示「（未写做法；依据背景）」；不再显示单独「出处：…」。
- `打开原文`：渲染前预检——会话查 `sessions.list`/`subagentAddress`，文件查 `workspaceFiles.stat`；
  不可达就不出按钮并写“原文不在了”；同步抛错可 catch；不承诺异步失败回调。
- 无 `contexts`：保持今天的 `source` 字符串行为。
- 「我提交的」：一行紧凑背景摘要；正文空时不要用 `journalTitle('')` 的「（空）」，用背景标题。
- `contexts` 坏：显示“背景无法解析”，期望/正文照常。

**文案**

新增/修改的 key 统一进 `CULTIVATION_COPY`（`cultivation-actions.ts`）；语义见卡 §4.6/§4.10
（contextLabel/contextAdd/contextHint/contextPickTitle/contextSessions/contextDeliverables/
contextLoading/contextNoText/contextReadFailed/contextTimeout/contextRemove/contextOpenSession/
contextOpenFile/bodyOptionalHint/bodyRequiredHint/contextBadPayload/contextTooLarge/teammateBanner）。

## 验收

> 2026-10-23 实现后逐条核对：A 探针、B–E keyless、F 真浏览器、G 门禁/文档均已跑；证据见「验证（实跑）」。
>
> 命令一律先 `source run/env.sh`。每条写“怎么测/断言什么/红长什么样”。未真跑过的不得写绿；
> 实施 Note 只收实跑收据。

### A. 机制探针（实施前门）

**怎么测**：

```sh
node probes/session-context/cultivation-context-probe.mjs
```

| 断言 | 红 |
|---|---|
| 冷/热会话 `follow` 首帧 + `break` 前后 `session/list` 的 `agentAvailable`/`running` 不变（不 promote） | 出现新的运行中/可用 Agent，或探针打印 promote |
| `remote.session.projections` 的 `asOfSeq` 可作 `page.throughSeq`；page 返回目标轮 | page 报 `bad-request`/`throughSeq past cursor` |
| 最大冷会话 `observeSession` 耗时 < 2s（记录实测值） | > 2s → 停，改源范围或改 B |
| ref-only 命令往返成功；`command/run.args` 不含 excerpt | 命令超限/日志出现摘录 |
| 8KB 单行 `contexts` 经 `workspaceFiles.read`（2000 行）可解析 | 截断/解析失败 |
| 冷会话 `projectionValues.agentTeam` 可解析出成员名（或明确缺失） | 抛错/把 Lead 标成成员 |

结果回填本 RFC 的“未验/风险”与本卡 §5.14。

**已跑（2026-10-23，实跑原话）：** `node probes/session-context/cultivation-context-probe.mjs` → ALL PASS：

- ① 冷会话（2,042,936B 压缩日志）一次 page 读到 251 records / 40 条文字消息，**12ms**；② page 前后 `agentAvailable/running` 均 false（不激活）；③ cursor 来源 = `projections.asOfSeq`（1899）。
- ④ 2,518 字符期望句 → `command/run.args` 2,551 字符完整（ref 级载荷传输无截断）。
- ⑤ 6,319B 单行 `contexts` 记录经 `workspaceFiles/read`（2000 行窗）完整读回、`JSON.parse` 成功。
- ⑥ 冷会话 `agentTeam.members` 含 `lead / vp-eng / vp-sales / cfo`（id + name）；⑦ 子会话 address（mode=continuable）page 读到 839 records。


### B. 纯模型（keyless）

**怎么测**：

```sh
npx vitest run tests/client/cultivation-context.spec.ts tests/client/cultivation-context-data.spec.ts tests/client/cultivation-compose-context.spec.ts
```

- `CultivationContextRef`/`CultivationContextCommand` 编码 → 解码往返；token 无 `+`/`/`/`=`。
- 坏输入：非 base64url、错版本、未知 kind、空 ref、绝对路径、`..`、超 2,000B、items 2 段、
  客户端带 `excerpt` → 明确错误，不抛未捕获异常。
- `recordText` 带 `contexts` → `parseRecord` 读回同一数组；旧记录 → `[]`；坏 JSON → `contextProblem` 且记录仍在。
- `methodSkillText` 空正文 → 期望句；有正文 → 正文。
- 旧命令构造：`correctLine`/`suggestLine` 不带 context 的输出与今天**逐字一致**；带 context 的 flag 位置正确；
  期望句以 `--context`（无 `=`）开头 → 旧路径；`--context=` 坏 token → 错。
- 浏览器安全：共享模块在 `globalThis` 无 `Buffer` 的 fake 环境里仍能往返 CJK/emoji/换行。
- **红**：模块不存在 → `Cannot find module`；实现后断言失败 → 对应 diff。

### C. Host（keyless，临时记录目录）

**怎么测**：

```sh
npx vitest run tests/company/cultivation.spec.ts
```

（扩展现有文件。）

- 无 `--context`：记录与今天逐字一致（`source = （会话内提交）`、正文必填）。
- 合法 ref：fake `sessionQuery.observeSession` 返回两轮事件 → 记录含 host 填的 `contexts`（excerpt/title/turn/at），
  `source` 是人话，正文可空，回执带标题。
- child ref：`parentSession`/`origin` 校验；不匹配 → 错且不落盘。
- 成品 ref：fake 成品目录命中 → `contexts.kind = deliverable`；不在目录 → 错且不落盘。
- 非法 token/未知字段/超限/多段 → `kind:'error'`，**零新文件**。
- 读取失败（sessionQuery 缺席/读不到）→ 错且不落盘；表单可继续无背景。
- 空正文 + 有 ref → 写成功；`adopt` 后技能正文 = 期望句，`status: adopted`。
- `contexts` 存活：adopt / reject / verify 三条后字段仍在。
- 旧命令回归全绿。
- **红**：先加期望失败的用例，跑原话；实现后复跑绿。

### D. 客户端交互（happy-dom + createRoot）

**怎么测**：

```sh
npx vitest run tests/client/cultivation-*context*.spec.ts
```

- correct 默认带「本次会话·最近一轮」；卡片显示标题/成员/轮次/摘录；提交线含 `--context=` 且**不含 excerpt**。
- suggest 默认不带；选角色后目标角色会话排前；选成品后卡片显示摘要；提交线含角色 + ref。
- 移除背景 → 空正文提交出现“正文不能为空…或带一段背景”；提交线不含 flag。
- 预览失败 → 原因 +「不带背景继续」可用；超时（fake 永不返回）→ 8s 后恢复可提交。
- teammate 会话（fake `origin: 'subagent'` + parent agentTeam）→ 显示成员标签与明说；不调用 `follow(Lead)`。
- 成品索引不可达 → 该分组错误；会话源仍可用。
- 选择器键盘/ARIA：↑/↓/Enter/Escape；Escape 不提交；焦点回触发点。
- **红**：组件不存在/断言失败的原话。

### E. 审批行

**怎么测**：

```sh
npx vitest run tests/client/cultivation-board.spec.ts
```

- 带 `contexts` 的记录显示背景卡；展开/收起；`打开会话`/`打开原文` 调回调；无回调不出按钮。
- 空正文显示「（未写做法；依据背景）」；「我提交的」不显示「（空）」。
- 坏 `contexts` → “背景无法解析”，期望/正文仍在；旧记录显示「出处：…」。
- 预检：会话不在 list、文件 stat 缺失 → 不出按钮 + “原文不在了”。

### F. 真浏览器（probe）

**怎么测**：扩 `probes/browser-visual/cultivation-gui-probe.mjs` 或新增同域 probe；
`source run/env.sh && node …`。

1. 真实会话 → correct → 默认当前会话最近一轮 → 只写期望、正文空 → 提交 →
   公司盘记录含 `contexts` + 人话 `source` → 审批行显示背景卡。
2. suggest → 选 CFO → 选一份真实成品 → 只写期望 → 提交 → `targetRole: cfo`、
   `contexts.kind = deliverable`；打开原文可用。
3. 移除背景 → 空正文被拦（原话）→ 补正文 → 提交成功（无 flag）。
4. 背景读取失败（注入不可达源）→ 可继续不带背景；无死按钮。
5. 窄栏/浮窗：面板不炸、按钮可点；出 1440×1000 + 窄栏视觉夹具。
6. 零挂载失败（`client-load-smoke`）。

失败必须带“被测面自己说的话”（行内文本/DOM 片段），不只报副作用状态。

### G. 门禁/文档/证据

- `pnpm verify` ALL PASS。
- `pnpm test` 全绿（新增 spec 计入）。
- `node checks/smoke/client-load-smoke.mjs` ALL PASS。
- `docs/presets.md` 的培养命令合同同 diff 更新：`--context=`、正文可空、`contexts` 字段。
- 实施 Note 进 `notes/implemented/`：决定、输掉的方案、红/绿命令与输出、未验残留。
- `pnpm verify` 再跑一次（Note 门禁/链接）。

## 验证（实跑，2026-10-23）

| 检查 | 命令 | 结果 |
|---|---|---|
| 结构门禁 | `pnpm verify` | ALL PASS（含 proposal/notes/md-links/bare-path） |
| keyless 全量 | `pnpm test` | 84 files / 823 tests PASS |
| 构建 | `node ./node_modules/typescript/bin/tsc -b packages/company-pack` + `(cd packages/company-pack && ../../node_modules/.bin/tsdown)` | 成功；`lib/client.js` 296KB |
| 客户端挂载 | `node checks/smoke/client-load-smoke.mjs` | ALL PASS（真浏览器，零挂载失败） |
| 机制探针 | `node probes/session-context/cultivation-context-probe.mjs` | ALL PASS：冷读 12ms / 2MB 日志、不激活、2,551 字符 args、6,319B contexts、agentTeam 成员、子会话 address |
| 真浏览器行为 | `node probes/browser-visual/cultivation-gui-probe.mjs` | ALL PASS：⑤b 成品背景 + 空正文 → `contexts` + `source: 成品「kid-ai-2026」`；**⑤c 会话背景 → `contexts.kind=session` + `source: 会话「…」`（真 host `observeSession`）**；**⑤d 审批行「打开原文」→ 右栏切到 final.md**；采纳/角色闸/日志全过 |

**红/绿收据（关键）**：

- 纯模型 spec 在模块存在前 import 即红；实现后 42/42 绿（`tests/client/cultivation-context.spec.ts`）。
- 客户端数据 7/7、创作面交互 5/5、动作面 16/16、审批行 10/10。
- 机制探针首跑 ④ 红是**探针自己的期望句长度算错**（951 字符 < 2,000 断言）；修正为 2,518 字符后绿——不是平台截断。
- 真浏览器首跑 ⑤b 红：`session/follow` 带 `assistantStream: false` 被 wire boundary 拒（schema 只认 true/缺席）；改为不传后绿。

## 残留与未验

- 换轮列表、journal/任意文件源、AI 起草 = v1.1/v2（未做）。
- 100 条 `contexts` 记录在 30s 轮询下的长期体积未压测；单条 ≤8KB 已验。
- 真浏览器视觉夹具未更新（`--fixture` 未跑）；窄栏/浮窗档未出；当前截图在 `runtime/human-exits-evidence/`。
- **预览 vs 记录不同源**：界面明说“以提交时服务端读到的版本为准”。
- **teammate**：成员继承 CEO 方法层；指向成员名的 suggest 改不到成员（已在文案/合同说明）。
- 记录是 agent 可读数据；v1 只取文字，未做不可信包装（v2 AI 起草时按 session-reference 的转义/警告）。

## 去向

- 上游卡：[§14](../../_backlog/_archive/settled_issues/2026-10-23-cultivation-context.md) 已记录拍板与 RFC 去向；卡本身的归档/索引机械改动按 [_backlog 章程](../../_backlog/README.md) 另行处理（本 Note 不宣称卡已归档）。
- 机制先例：`session-reference` 的“有界、不可信、快照不可变、原文另开”语义；v1 明确排除 checkpoint
  （与先例不同，理由 = 它只是压缩摘要，不伪装成用户原话）。
- 相关 Note：[培养 GUI 行动面](../implemented/2026-10-17-cultivation-gui-actions.md)、
  [第一人称走查](../implemented/2026-10-18-cultivation-firsttimer-audit.md)、
  [场景轮](../implemented/2026-10-18-cultivation-scenario-audit.md)。
