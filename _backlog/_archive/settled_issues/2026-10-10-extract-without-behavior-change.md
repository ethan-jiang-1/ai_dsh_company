---
status: 已结
opened: 2026-10-10
---

# 推敲：两处重复收成模块，调用方观察到的行为不变

> 立卡：2026-10-10 ｜ 状态：已结 ｜ 类型：Task ｜ 可关闭：是
> **结论与去向（2026-10-10 实施完毕）**：两处都收成——`tools/lib/probe-web.mjs`
> （startWeb/companyCookie/companyRpc，spawn/fetch 注入；25 个探针全部迁入，前缀/错误回退/共享
> counter/读屏障 --patch/30s signal 全当参数保留）与 `tools/lib/backlog-liveness.mjs`
> （函数体逐字节原样搬家，spec 改直接 import，期望字符串零改动）。机制交付 = commit 0a7977f；
> 判据与红绿证据 = [2026-10-10-probe-web-and-backlog-liveness-extraction](../../../notes/implemented/2026-10-10-probe-web-and-backlog-liveness-extraction.md)。
> 卡内「已知」列之外的三个新参数（patch / errorFallback / counter）是迁移中实测发现的既有差异，
> 全部当参数收下而非统一。下游申请（checks/smoke 启动块同款收成）另立卡，不在本轮。

**问题与期望结果：** 探针各自抄了一份 web 启动，`backlogLivenessProblems` 写在门禁文件里、测试靠切源码调用。期望把这两处收成可调用模块。判断完成的标准是：现有调用方的通过/失败信号与请求形状保持原样，期望字符串不被改写来凑绿。

**当前情况：** 见下方「已知」。结论是做这两处；按文件数把大门禁、回放冒烟、页签注册拆开不在本卡。

**未决问题：** 无产品选择待定。缺的是实施授权——本卡不授予。

**下一步：** 等用户点名实施。点名之前不改 `checks/run-gates.mjs` 与 `probes/`。

## 范围与排除项

做两件事，结果是同一个：调用方观察到的行为不变。

1. 启动 `vendor/dsh/apps/cli/src/bin.ts web` 的探针，共用「等 banner」；发 `client-request` 的再共用发请求。`probes/browser-visual/dag-visual-probe.mjs` 只等 banner、不取 cookie，只走前一半。`probes/team/team-recovery-probe.mjs` 起两次 web，函数各调一次，不做进程级单例。
2. `backlogLivenessProblems` 原样挪到 `tools/lib/` 的一个新模块。门禁文件留下调用和「为什么」注释。`tests/harness/backlog-liveness.spec.ts` 改为 import。期望字符串一字不改。

不做：

- 把 `checks/run-gates.mjs` 拆成一门禁一文件。分区注释已经是目录；拆开要多一个上下文对象，单道门禁仍然很薄。`replay-scene-liveness` 与 `guard-red-record` 各只有门禁一个调用方，留在原文件。
- 把 `checks/smoke/replay-smoke.mjs` 按六个模式拆脚本。`normalizeAria` 也留着，除非另有卡要给它写不启动浏览器的断言。
- 按页签拆 `packages/company-pack/src/client/index.ts`，或动 `presence.ts`、`deliverables.mjs`、`styles.ts`。
- 顺手改 `checks/smoke/probe-smoke.mjs` 的启动，或改 `probes/fs-taskboard/cross-process-fs-probe.mjs`（worker eval）、`probes/browser-visual/browser-behavior-probe.mjs`（起的是 chromium）。
- 重跑全部真模型探针来证明这次搬家。模型输出不是启动代码的稳定判据，也覆盖不了这次要守的请求形状。

## 已知与未决

启动块里已经存在、必须当参数留下的差异：

- `rpcId` 前缀由调用方传入。`mip-` 同时用于 `probes/team/member-inquiry-probe.mjs` 与 `probes/team/member-interrupt-probe.mjs`；`tcp-` 同时用于 `probes/session-context/time-context-probe.mjs` 与 `probes/team/team-concurrency-probe.mjs`。按文件名推导前缀会改掉现有 id。
- 取 cookie 的 `fetch` 超时是 15 秒。`probes/team/member-stale-write-probe.mjs` 的后续 RPC 另有 30 秒 `AbortSignal`，其他 RPC 没有。默认不加这道信号。
- 成功路径上谁打印 `web up` 谁不打印，保持调用方自己的 `console.log`。帮助函数不新增输出。
- 进程参数保持现状：`process.execPath`、`--import`、`tsx/esm`、`vendor/dsh/apps/cli/src/bin.ts`、`web`、`--`、`--port`、`0`、`--no-open`；`cwd` 为仓库根；环境在现有环境上只加 `DSH_HOME`。banner 正则保持 `http://127.0.0.1:<port>/?token=<token>`。cookie 仍是 `getSetCookie` 取分号前一段再拼接。请求体仍是 `type: client-request`、`method`、`payload.args`。home 失败与 boot 失败仍是退出码 2。

活状态检查已有第二个调用方。spec 用字符串切出 `function backlogLivenessProblems` 到注释 `Runner stays in the owning gate`，放进 `vm` 跑。闭包依赖是 `loadYaml`（CORE_SCHEMA）、`markdownLinkTargets`、以及 fs/path 那一组。生效日 `2026-10-09`、池目录、状态词表、问题句都是判据正文，不是可顺手改的措辞。门禁成功行是 `backlog-liveness（制度目录/README、卡头、关闭判断、method 形状、递归索引）`。

## 方案与取舍

倒着定流程：先写下现在观察得到的信号，再搬家，最后用同一批信号复验。断言或探针提示词要改才能绿，就视为行为变了，退回逻辑而不是改判据。

帮助函数按现有分叉切开，避免让某个调用方多走一步：

- `startWeb` 只负责起进程并解析 banner，返回 port、token、base、child。`dag-visual` 到此为止，不发取 cookie 的请求。
- `companyCookie` 做 15 秒的 token 交换。
- `companyRpc` 接收调用方传入的前缀；单次请求的 `signal` 可选。

活状态函数原样移动。spec 只改加载方式（切源码改为 import）。门禁仍只负责把返回的问题数组报成 PASS/FAIL。

比较过、不采用的做法：

- **一门禁或一探针再拆一个文件。** 行数下降，调用方要学的接口变多，判据仍散着。
- **统一 rpc 前缀、统一日志、给所有 RPC 加超时。** 这些是现有差异，收成默认值就会改请求 id 或输出。
- **用 24 次真模型探针当回归。** 贵，而且绿了也说明不了请求体没变。
- **先改 spec 的期望字符串再搬家。** 那是把判据改成新实现，失去「没副作用」的对照。

## 验收标准

证据政策见 [测试宪法](../../../docs/testing.md)；这条改动面的最窄检查见 [tests/README](../../../tests/README.md) 表内「检查与工具入口」行。人的判断：无。实施授权是开工条件，不是验收口味。

| 行为 | 类 | 输入/状态 | 通过/失败 | 反例 | 证据 |
|---|---|---|---|---|---|
| 活状态问题句不变 | 确定性逻辑 | spec 现有夹具目录，含缺字段、缺索引、缺 frontmatter | `tests/harness/backlog-liveness.spec.ts` 全绿，且 diff 不改任何期望字符串 | 挪函数时改一句问题文本 → spec 红；修法是改回文本，不是改期望 | 该 spec。它证明问题数组。它不证明门禁进程的打印格式 |
| 门禁成功行不变 | 编排 | 当前仓库 `_backlog/` | `node checks/run-gates.mjs` 里 backlog-liveness 那一行文字与上表引用的现句一致，退出码 0 | 调用处改写 PASS 文案或换一套问题拼接 → 该行不一致 | `checks/run-gates.mjs` 的这一行。它不证明其他门禁的语义 |
| web 启动参数与请求体不变 | 确定性逻辑 | 假的 spawn/fetch，喂一条现有 banner | 新 spec 断言 argv、环境、banner 解析、cookie 拼接、请求 JSON 与本卡「已知」列出的字面量一致；不传 signal 的 RPC 请求不带 signal；不调用 cookie 交换就不会发那次 fetch | 帮助函数自行推导 `rpcId` 前缀，或默认给 RPC 加 30 秒 signal → spec 红 | 新的 keyless spec（`tests/harness/`）。它证明帮助函数的形状。它不证明真 web 进程仍打印这条 banner |
| 探针业务块不动 | 编排 | 迁调用方之后的 `git diff` | 每个迁过的探针，diff 只出现启动块删除和帮助函数调用；提示词、证据函数、退出码、前缀字面量不在 diff 里 | 搬家时顺手改一条排练指令或证据调用 → 该 diff 不合格，退回该 hunk | diff 本身。它不证明探针在真模型下仍然判对 |
| 真 banner 仍能被解析 | 编排 | 一次真实 `web --port 0`，拿到 banner 后立刻停掉，不发 prompt | 帮助函数返回的 port/token 能对上进程输出里的那条 URL | banner 正则与真输出差一个字符 → 解析失败，退出码 2 | 这一次启动。它不代替上面的请求体断言，也不授权把 24 个探针各跑一遍 |

实施顺序也是验收的一部分：先写启动 spec（红，因为模块还不存在），再让帮助函数转绿，然后逐个换调用方；活状态函数先绿着现有 spec，再原样移动，移动后同一 spec 仍绿。

## 关闭条件

本卡在实施授权下达并按上一节交付之前保持打开。交付后的下游申请另记日期和去向；申请本身不在本轮提交。
