---
status: 已结
opened: 2026-11-12
---

# 启动设置：composer 入口 + 右侧「项目策略」栏（项目覆盖公司默认）

> 立卡：2026-11-12 ｜ 状态：已结 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：是 ｜ 审查：agent — 验收 A1–A9 逐条有实跑证据（typecheck / 1704 tests / verify / 真页面探针 10 页签），证据见 Note「验证」节
>
> **结论/去向**：implementation — 本卡即落地载体；实现与证据 = [Note](../../../notes/implemented/2026-11-12-startup-settings.md)
> **授权**：用户 2026-11-12 点名「可以的，这样你提出 issue，我们接下来要落地这个了」

**问题与期望结果：** 现在每个新项目，模型都要问「是什么产品类型 / 怎么交付」，或者按特征猜；不同角色还可能各按各的口径跑。期望：composer 工具栏有一个入口，点开右侧滑出「项目策略」，三行（做什么 / 怎么交付 / 参考资料 wiki），每行第一项是**自动 = 不约束**，其余选项**从公司内容里动态枚举**；改完下一轮生效，随时可改、不挡对话。

**当前情况（证据）：**
- 机制已取证（[研究题](../../../_backlog/_archive/research/startup-settings/README.md)）：`conversation.input.left` 槽可注入且第三方有活先例；settings modal 无公共 opener；`workspaceFiles` 只读，client 写盘走 `remote.commands.execute`；`systemPrompt.section` 的 text 是**每次 assembly 求值**的 provider（[机制材料](../../../_backlog/_archive/research/startup-settings/2026-11-12-startup-settings.md) §1/§3/§4/§5）。
- 字段盘点已完成（[候选材料](../../../_backlog/_archive/research/startup-settings/2026-11-12-settings-candidates.md)）：58 项分 A/B/C/D；v1 只取三样，其余默认生效、不露面。
- UX 已按用户三轮反馈定型（[视觉稿](../../../_backlog/_archive/research/startup-settings/ux/2026-11-12-ux-right-sidebar.svg) / [PNG](../../../_backlog/_archive/research/startup-settings/ux/2026-11-12-ux-right-sidebar.png)）：入口是**会显示当前状态的按钮**（不是齿轮），面板是**右侧栏**（不是 modal），选项**不写死**、首项「自动」。
- 公司已有同款载体：`conversation.input.left` 等 6 处槽注册、右栏页签注册（`src/client/tabs/`）、`sidebarRight.float(tabId, rect)`、`/company-diagnostics` 的 `remote.commands.execute` 用法、`cultivation-storage.ts` 的原子写先例。
- 【约束】现行 `HostConfig` 只有 `cultivationRoot` / `handbookSkipPresets` 且未知键 fail-loud（`src/host/run-bundle/config.ts:13-15`），**没有** Config schema / volatile 字段——本卡不改这一点。

**未决问题（落地中自行定，不阻塞）：** 面板用「右栏页签」还是「右栏浮动」——只要求非 modal、可关闭、不丢设置；选项刷新时机取「每次打开面板重读内容目录」即可。

**下一步：** 按 `## 验收标准` 实现；完成后同 diff 写 Note 并归档本卡。

## 范围与排除项

**范围（v1）**
1. **入口**：`conversation.input.left` 注册一个按钮，order 排在 auto-continue 之后；文案 = 当前生效状态（`策略：自动` / `策略：业务软件 · 按项目做`），tooltip 列出生效值。
2. **面板**：右侧栏打开「项目策略」，三行下拉：做什么 / 怎么交付 / 参考资料（wiki）；第一项恒为「自动」；无「保存」按钮；含「恢复公司默认」。
3. **动态枚举**：选项来自 `<content>/product-types/` 与 `<content>/delivery-modes/` 目录 + 隐式的 `productized`；内容变了选项自动变，代码不改。
4. **持久化**：workspace 级 `<workspace>/.dsh-company/startup.json`（原子写；与 home 级 `<DSH_HOME>/company/settings.json` **不同文件、不同作用域**）。
5. **注入**：新增 `company:startup-settings` systemPrompt section（order 501，`text` thunk 活读）；只对**已设**字段下「本次已给定，不再问/猜」语义；`自动` 字段不注入约束。跳过集合与手册一致（`NON_ROLE_PRESETS`）。
6. **命令兜底**：`/company-settings`（读/写同一份文件），同时是 client → host 的写通道。
7. **文案**：全部 zh + en 进 typed company 字典，默认 zh。

**排除（本卡不做，另行开卡）**
- **硬强制**：`/req check`、`/delivery check` 解析链插 settings 层（本卡只做 prompt 软强制）。
- **公司默认的编辑界面**：v1 公司默认 = 只读来源（`.dsh-company/kb/company.md` 的 `productType`、内容包），面板只显示、不可改；接 DSH volatile 另开。
- **其余候选字段**：`method` / `collaborationMode` / `timeZone` / `qualityLoop` / `crossReview` / `defaultRequirementLayers`（研究材料 §8 列为可选/缓做）。
- **per-session 覆盖**；**无会话冷启动入口**（hero 无 list 槽，需另议）。

## 已知与未决

- 已知：`conversation.input.left` 只在有 sessionId 时渲染（`InputBar.tsx:467-469`）——无会话无入口，符合「项目跑起来才需要改」。
- 已知：`wiki` 无现成机制（vendor 0 命中），本卡只做「存指针 + 注入指引」，wiki 内容形状归姊妹题（[wiki 研究](../../../_backlog/research/wiki-knowledge-map/README.md)）。
- **已知（2026-11-12 晚间用户点名核实）：wiki 可以不在 workspace 里，且 agent 照读不误**。沙箱只限写、不限读（bwrap read-only host root + 写 workspace bind；策略文本只说 cannot modify/may modify），本机实测：读 `~/.dsh/...` 成功、`ls /Users/bowhead` 正常、写 `~/.dsh/zz-probe` → `Operation not permitted`。证据与推演 = [wiki 研究收口件 §4.1](../../../_backlog/research/wiki-knowledge-map/2026-11-12-wiki-in-dsh-possibility-space.md)。
- **已定（用户 2026-11-12 拍板）：wiki 指针 v1 只收本地目录**——值是一个目录路径，允许**绝对路径**（可在 workspace 外）；不做 http(s) URL。注入段要写明「只读外部知识、先读 `index.md` 再钻页、不要尝试写入」。
- **随之而来的验收补充（并入 A7）**：wiki 既然指向本地目录，就要做**存在性校验**——目录不存在、或存在但缺 `index.md`，面板都要标出来，不静默沿用。「wiki 是自由指针所以永不失效」的写法会漏掉路径腐化（改名/搬家/换机器）。
- 未决：面板开合是否记忆（不影响验收）；`startup.json` 是否需要 `updatedAt`（建议有，便于诊断）。

## 方案与取舍

- **入口用状态按钮，不用齿轮**：齿轮暗示「系统设置、别乱动」；状态按钮让用户随时看见「这次按什么跑」。用户明确要求入口不写死内容，所以文案从生效值渲染。
- **右栏而非 modal**：用户明确「弹出 sidebar 里面有 setting」；modal 会挡对话，且改完要关两次。
- **选项动态枚举而非写死**：换公司 / 加产品类型 / 加交付模式时界面不改；这是用户点名的核心诉求。
- **「自动」= 字段不写**：与「没约束、允许模型发挥」语义一一对应，且天然表达「继承公司默认」。
- **workspace 级存储而非 profile**：一个 home 顺序服务多个 workspace，公司级一刀切会让第二个项目继承第一个的选择；与既有 `.dsh-company/` 形状一致。
- **软强制先行**：prompt 注入零风险、一天可落；硬强制要改两个命令的解析函数与它们的 fan-out（研究材料 §5.5）。

## 关闭条件

- `## 验收标准` A1–A9 全部有实跑证据。
- 同 diff 更新合同层（新增的 `company:startup-settings` section 与 `startup.json` 形状写进 [profile 合同](../../../docs/contracts/profile.md) 或新合同页）。
- 同 diff 写 Note（含输掉的方案与红→绿证据），卡归档。

## 抽象度

- **换公司要改吗？** 不会——选项从内容目录枚举，公司名/类型名不进代码；换公司只换内容。
- **换产品类型要改吗？** 不会——新增 `content/product-types/<id>/` 即出现在下拉里。
- **换做法要改吗？** 不会——settings 只存「选哪个」，规则正文仍在内容层（宪章铁律 3）。
- **只有机制本身变才改吗？** 是。
- **第二消费者：** 现有 2 个产品类型包（business-software / hardware-software）+ 3 个交付模式（含隐式 productized）即为第二、第三消费者；枚举不写死由它们证。
- **搬家成本：** 低（字段是数据，住 workspace 盘）；不提前抽象。

## 验收标准

> 每条都要有实跑证据（命令输出 / 真页面截图 / spec 名），不接受「看起来对」。

- **A1 入口在场**：有会话时 composer 工具栏出现策略按钮，位置在 `Follow default` 右侧、模型选择左侧；无会话不渲染。
- **A2 状态即文案**：全自动时显示「策略：自动」；把「做什么」设为某类型后，重新开面板前按钮即显示该值（或「策略：已设 N 项」），tooltip 列出生效值。
- **A3 面板形态**：点按钮打开**右侧栏**（非居中 modal），对话区不被遮挡；关闭后再点能重新打开，已存值仍在。
- **A4 动态枚举**：下拉第一项恒为「自动」；其余项与 `content/product-types/`、`content/delivery-modes/` 目录一一对应；**临时新增一个类型目录后重开面板即出现**（不改代码）；目录为空时只剩「自动」。
- **A5 持久化**：改值后写 `<workspace>/.dsh-company/startup.json`（原子写、目录不存在则创建；不改写 `<DSH_HOME>/company/settings.json`）；面板无「保存」按钮；重开面板/重启 host 后值仍在；「恢复公司默认」清空对应字段。
- **A6 注入生效**：设值后下一轮 prompt 出现 `company:startup-settings` 段，含已设值与「不再问/猜」语义；全自动时段内无强制语义；worker / quality-loop 等 support preset 不注入（与手册同款跳过）。
- **A7 失效值不静默**：`startup.json` 里的值在内容包里找不到对应目录时，面板标为失效并给可用值，不静默沿用。
- **A8 双语**：所有新增用户可见文案 zh + en 均在 typed 字典内、默认 zh、无硬编码中文；真页面 zh / en 各一张截图。
- **A9 门禁**：`pnpm verify`、`pnpm typecheck`、`pnpm test` 全绿；新增 client/host spec 覆盖 A2/A4/A5/A6 的纯逻辑面。
