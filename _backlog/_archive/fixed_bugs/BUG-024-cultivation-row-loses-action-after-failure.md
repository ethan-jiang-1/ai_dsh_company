---
status: 已修
severity: P2
opened: 2026-10-18
---

# BUG-024：命令面失败后，那一行的「采纳」按钮消失（疑似 pending 卡死或行降级）

> 立卡：2026-10-18 ｜ 状态：已修（2026-10-19 毕业：产品修法经诊断实证 + **S12 连跑两轮硬判全绿**）｜ 发现：探索轴②（`probes/browser-visual/cultivation-ux-scenarios.mjs` S12 故障注入）
> 严重级别：P2（不损坏数据；但"失败之后连重试的入口都没了"= 人只能刷新页面，且看不出为什么）

## 症状

真浏览器，注入把 `commands/execute` 全部 abort（等价命令面断）：

1. 点「采纳」→ 行内**确实出现**「命令面不可达…」（这一半是对的，S12 首次跑 PASS 过）；
2. 但随后断言"行仍可操作"时，该行里**找不到「采纳」按钮了**（`count() === 0`）。
   **间歇性**（这是本卡最要紧的特征）：同日连跑三轮——PASS / FAIL / PASS；失败那轮在此点整条 S12 断掉，
   下一轮同样输入又全绿 ⇒ 不是"稳定坏"，更像**时序竞态**（失败后紧接一次重渲染/刷新，把按钮换成了别的态）。
   探针现已改成"遇到就记现场不判红"（见 S12 的 notes），所以它不再把这条间歇红冒充成常态。

## 两个待证假设（别当结论）

- **H1 pending 卡死**：`CultivationBoard.run()` 里 `setPendingId(key)` 之后若 `actions.run` **抛出**（而非按契约返回
  `{ok:false}`），后续 `setPendingId(null)` 不执行 ⇒ 按钮永久停在 disabled 的「处理中…」——按名字找「采纳」自然为 0。
  契约上 `makeCultivationActions.run` **永不抛**（内部 catch 全包），但"路由 abort"这条路径是否绕过了那层 catch 未证。
- **H2 行/面板降级**：失败后列表重渲染把该行挪走或整块降级（`records` 变 null ⇒ 行消失）。

## 复现

```sh
source run/env.sh && node probes/browser-visual/cultivation-ux-scenarios.mjs --shots
# S12；截图 runtime/human-exits-evidence/ux-scenarios/S12-command-face-down.png
```

## 结论（2026-10-18 当日修）：**H1 成立**——`run()` 的 pending 清理不在 `finally`

读码坐实（`CultivationBoard.tsx` 的 `run()` 原文）：

```ts
setPendingId(key)
const result = await actions.run(line)   // ← 这里抛错的话…
setPendingId(null)                       // ← …这行永远不执行 ⇒ 按钮永久 disabled + 文案「处理中…」
```

`makeCultivationActions.run` 契约上"永不抛"，但**连接层在断连/竞态下确实可能让 await 抛**（S12 的路由 abort 复现）
⇒ 按钮永久停在「处理中…」：**人连重试入口都没有**。间歇性也解释得通：只有走到抛错那条路径才复现。

**修**：`run()` 改成 `try { … } catch { 折成"面板内部出错…可重试"这一条显式结果 } finally { setPendingId(null) }`；
新增文案 `CULTIVATION_COPY.unexpected(reason)`（单一事实）+ 复用 `renderThrown`。

## 回翻（2026-10-19）：`finally` + 超时都没治住——`处理中…` 超过 35s 仍在

同日第二轮修法（`run()` 加 `try/catch/finally`；动作面加 `Promise.race` 20s 截止边）**未通过它自己的验收**：
把探针的等待窗口拉到 **35s**（> 产品 20s 超时）后，S12 连续三次仍是
`… | 处理中… | 拒绝`——**按钮没有回到可用，超时文案也没出现**。两条待证分支：

- **H4 超时没跑到**：那条 abort 路径可能**没走到** `makeCultivationActions.run` 的超时边（例如页面里跑的不是我以为的那份 bundle，
  或点击根本没触发 `run()`——但文案区此前出过「不可达」，说明至少有一次触发了）。
- **H5 路由没真拦住**：`page.route('**/api/commands/execute', …)` 的 URL 形状若与实际 RPC 不符，则**点击本该成功**——
  而它既没落盘又没回执，说明"没拦住"与"没触发"两者都需排除。

**下一轮先做定位（不许再猜）**：在浏览器里打点 `run()` 的进入/返回 + 打点 `fetch`/RPC 的真实 URL；用 `page.on('request')` 抓一次真实端点，
再决定是修探针（H5）还是修产品（H4）。**在定位清楚之前，本卡保持 `调查中`，不再宣称已修。**

## 定位（2026-10-19）：H4、H5 双双被否 —— 产品行为实测**正确**

一次真浏览器诊断（`page.on('request')` + 页面内包 `fetch` + 打点行文本）拿到：

- **真端点 = `POST /api/commands/execute`**，`page.route('**/api/commands/execute')` **命中并 abort**（打印"路由命中"）⇒ **H5 否**；
- abort 之后行文本在 t≈3/10/22/35 秒**都**是：`… | 采纳 | 拒绝 | 命令面报错（gateway/internal）：client api: commands/execute…`
  ⇒ 错误**行内可见**、**按钮回到「采纳」**（不是「处理中…」）⇒ **H4 否，且产品侧修法（`try/catch/finally` + 20s race 截止边）成立**。

⇒ 本卡的**产品缺陷已修**；`S12` 仍红属**探针侧残留**（同一路径在探针里表现为「处理中…」，与上述实测不符——下一轮在场景档里 dump S12 的点击次数与行文本，按"探针失败路径必须带现场"的既有纪律处置）。

## 验收仪器定位与修复（2026-10-19，卡毕业的最后一块）

带打点复现（点击计数 + 行文本每 5s 采样 + 网络层请求 + 路由命中）拿到**过渡态曲线**：

```
t=0s   处理中…(disabled) / 拒绝(disabled)    ← 面板进入 pending
t=5s   采纳 / 拒绝 + 命令面报错（gateway/internal）：… Failed to fetch   ← 已收口
t=10/15/20/25/30s  同上（稳定）
路由命中 1 次 ｜ 真实点击 1 次
```

⇒ 产品没问题；**S12 此前是仪器竞态**：点击后**立刻**断言，抓到的正是 t≈0 那个"合法过渡态"。
**修法（探针侧）**：断言的判据从"文本出现"升级为"**文本出现 ∧ 按钮回到可用**，两者都成立才停等（上限 35s）"，
失败信息里同时带行内原话。修完 **S12 硬判连跑两轮全绿**。

**写进纪律**（探针失败路径必须带现场的第二条）：**对"有过渡态"的面，断言必须等到收口**，
不许在 t≈0 抓快照——否则正常的 pending 会被误判成"按钮没回来"。

## 已修判定（旧版，未达成）

- [x] S12 恢复硬判（去掉"已知缺陷档"）：**两轮连跑均 PASS**（第一轮硬判前先跑过一次绿、硬判后复跑绿），不再复现"按钮消失"。
- [x] 失败路径明确：抛错折成「面板内部出错（已收回按钮，可重试）：boom」，行内可见、按钮回到可用。
- [x] `finally` 收 pending + 交互档断言：「抛错 ⇒ pending 收回、按钮可再点、行内说清原因」（点第二次必须真的再发一次命令）。
