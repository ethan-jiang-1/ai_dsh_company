---
status: 调查中
severity: P2
opened: 2026-11-20
---

# BUG-290：空白页里敲 `/req check …` 没有任何反馈——不报错、不建会话、不显示结果

> 严重级别：P2（次要偏重：核心操作员命令在首屏静默失效，用户会以为「按了没反应」）｜发现：2026-11-20（端到端验收第二轮）｜状态：调查中
>
> **留痕**：端到端验收轮（2026-11-20）。

## 症状

新开观察窗（无会话）后，在输入框键入 `/req check no-such-dir` 并回车：

- 输入框被清空；
- 页面上**没有任何**新增文本（无错误提示、无「用法」、无结果、也没有新建会话）；
- `document.body.innerText` 仍是 726 字节的空壳（只有侧栏 + 指南条 + 输入框）。

同一次会话里，`/company-settings` 回车后**能**打开右侧「策略」面板并渲染内容——所以回车提交本身是通的。

## 复现

```sh
source run/env.sh
node tools/dev/company.mjs --home runtime/e2e-home4 --workspace runtime/e2e-ws4 --no-open   # 取横幅 URL
cat > /tmp/steps.json <<'JSON'
[{"typeText":["[data-composer-input='true']","/req check no-such-dir"]},{"pressKey":"Enter"}]
JSON
node probes/browser-visual/cdp-probe.mjs '<横幅URL>' --steps /tmp/steps.json --body-out /tmp/body.txt
```
`/tmp/body.txt` 只有空壳；把命令换成 `/company-settings`，同一路径能开出策略面板。

## 已排除

- **回车不生效**：同一实例 `/company-settings` 回车 → 策略面板出现（本轮实测，`pressKey` 走 CDP `Input.dispatchKeyEvent`，是真键盘事件）。
- **命令不存在**：`packages/company-pack/src/host/commands/req-command.ts:197` 注册了 `req`，`input.hint = 'check <deliverables 目录名>'`；`delivery-command.ts:84` 同族。
- **空 workspace 就直接报错**：handler 的 `parsed.ok === false` 分支会返回 `{ kind: 'error', text }`（req-command.ts:214 附近），文案本该可见。

## 待查（根因假设，未证）

1. **客户端丢弃无会话时的命令结果**：文本型命令要落进 transcript，若当前没有 session，client 可能直接忽略返回值（而 `/company-settings` 因为是 UI 动作所以生效）；
2. **host 侧 admission 未把命令挂到会话**：没有 session 就没有 `command/run` 事件可依附；
3. **命令结果渲染成瞬时提示**，在探针截取 body 前已消失（需看 DOM/控制台验证，而不是只看 innerText）。

判据：在空白页发命令后抓 `/json` 网络请求与 console，确认 handler 是否被调用、返回什么、client 如何处理。

## 失败类与同类排查

**失败类 = 静默失败（无反馈）——「点了没反应」类。** 同类：`/delivery check`、以及其他文本型命令在无会话首屏大概率同病；`/company-settings` 这类有 UI 副作用的命令不受影响。修法方向 = 要么在无会话时给出统一「先建会话」提示，要么由 client 自动建会话承载命令结果——二选一，不要靠用户猜。

## 2026-11-21 对照实验（第一批实跑）

同一台机、隔离 home（`runtime/e2e-fix-home`，零会话）起实例，CDP 真键盘：

| 输入 | 结果 |
|---|---|
| `/req check no-such-dir` + Enter | 输入框被清空；body **746 B → 746 B 逐字节不变**；无 chip、无提示、无 transcript、`consoleProblems`/`exceptions`/`clientErrors` 全空 |
| `你好，做个连通性检查` + Enter | **成功**：1281 B，消息出现在 transcript（自动建会话） |
| `/company-settings`（在有会话的页面上）+ Enter | 出现 `/company-settings` 命令 chip（说明 chip 会出现在 `innerText` 里） |

⇒ **不是「回车不生效」，也不是「会话不存在」**：纯文本能发、能建会话；被吞的只有斜杠命令。
⇒ **host 的错误文案从未出现**：handler 本该返回「未指定 workspace；先选 workspace 再校验。」，但 3 秒轮询
（`waitText 未指定`）没等到——所以「handler 被调用、结果渲染成瞬时提示」这一支不成立。

**被证伪的假设（留在卡上）**：① 回车不生效（纯文本可发）；② 结果只是瞬间提示（3 s 轮询未捕获）；
③ 「没有会话」（landing 有 `data-conversation-session="session-…"`，纯文本提交还能把它变成真会话）。

**仍成立的两支（未分）**：
- **A 命令行目录需要 retained session**：`vendor/dsh/packages/client/ui-commands/src/client/service.ts`
  的 catalog 在 `sessions.binding(sessionId) === undefined` 时抛
  `command catalog requires a retained session`；landing 的会话尚未 retained ⇒ claim 路径拿不到
  descriptor，异常在提交机里被吞（该文件注释称会「surface one composer notice」，实测没有）。
- **B 结果落在 transcript**：命令结果只能进会话 transcript，landing 还没有 transcript 可落。

**决定性下一步（写进下一轮，不再靠猜）**：在 host 的 `/req` handler 里加一行临时 instrumentation
（或抓 `command/executed` 事件），看 host 到底有没有被调用——若**没被调用** ⇒ 纯 client 面、落在 vendor
composer（按纪律 = 上游提案 + 本地缓解 + trigger，不改 vendor）；若**被调用了** ⇒ 结果去向在我们这面
（可修，例如让 handler 在无会话时改走一个可见的 UI 回执）。

## 修法方向（政策 B，用户 2026-11-21 已定）

无会话时必须有**可见且可操作**的提示（「命令需要先开始一个会话」+ 新建/开始入口），而不是把草稿悄悄吃掉。
我方载体：pack 已在用的 `conversation.input.left` 槽（`packages/company-pack/src/client/index.ts` 注册处），
它是 composer 旁边的自有面，可承载提示与按钮；不新造通道、不碰 vendor。

## 决定性证据（2026-11-21，host 临时 instrumentation）

在 `/req` handler 首行加一行临时 `console.error`（已撤），`--rebuild` 起隔离实例后实跑：

| 观测 | 结果 |
|---|---|
| 落地页敲 `/req check no-such-dir` + Enter | **host 被调用**：`[instrument-BUG-290] /req handler entered {"rawInput":" check no-such-dir","hasAgent":true}` |
| 同一次提交的页面 | body 无任何新文本（错误结果没渲染） |
| 打开已开始的会话后再发同一条命令 | **正常渲染**：`缺需求文档：<repo>/company-workspace/.dsh-company/deliverables/no-such-dir/drafts（至少要有 mrd.md / strs.md / prd.md）` |

⇒ 两支假设的裁决：**不是**「host 未挂会话」（`hasAgent: true`，命令真跑了），**是**「结果只落进已打开的会话
transcript；落地页没有 transcript ⇒ client 把结果丢了、草稿却已被消费」。丢的位置在 vendor 的
composer/transcript 面（`vendor/dsh/packages/client/ui-conversation` + `ui-commands`），我方 handler 无错。

**这是什么类的问题**：`command/executed` 结果没有「无 transcript 时」的兜底面。按纪律（vendor 边界）：
**不在 vendor 里改**；写上游提案 + 我方做提示型缓解 + 挂 trigger。

## 上游提案（待提，草稿）

- 现象最小复现：真实例 → 不打开任何会话 → 输入 `/req check x` 回车 → 无任何反馈；同命令在已打开的会话里正常回显。
- 期望：`command/executed` 在无 transcript 可落时，至少给一条 composer notice（或自动把落地会话变成真会话再落）。
- 现实现线索：`ui-commands` 的 enter 决策表注释声称「异常会 surface one composer notice」，实测未出现；
  `directory.ensureReady` 在无 retained session 时抛错（`service.ts:100`），而本次 `hasAgent: true` 说明
  会话是 retained 的——因此缺口更可能在「结果 → transcript」这一段。

## 缓解方案（政策 B；用户 2026-11-21 已定）

在 composer 侧（我方 `conversation.input.left` 槽，已在用）给一条**可见提示**：会话还没开始时，
「斜杠命令要等会话开始后才回话」+ 指到眼前的「开始」按钮。判据 = 组件 spec（blank ⇒ 有提示 / 非 blank ⇒ 无）
+ 真页面复核；**必须在确认 `blank` 在落地页可靠为 true 之后才落**——否则提示不出现，等于又造一个「看起来做了」。

**未做的原因（诚实记）**：`blank` 在落地页是否可读尚未取证；先提上游提案，缓解待下一轮带着 instrument 验证后再落。
