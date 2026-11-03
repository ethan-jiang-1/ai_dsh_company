# 客户端错误上报：无会话排队、会话出现后补送

状态：implemented（2026-11-03 第六轮 D6 批）
上游 = [第六轮七维打扫卡](../../_backlog/_archive/settled_issues/2026-11-03-repo-hygiene-round6.md) ·
材料 = [第七维审计](../../_backlog/_archive/research/repo-hygiene-round6/2026-11-03-seven-dimension-audit-round6.md)

## 决定

`client/index.ts` 的错误上报从**丢弃式闭包**改成有界队列中继（`createErrorRelay`，住
`client/wiring/error-ring.ts`）：

- 没有「被主视图保留的会话」时，条目**留在队列**（上限 50，与错误环同限）；会话出现/切换时
  `sessions.list.subscribe` 触发 flush，按 1s 节流逐条补送。
- 节流窗口内到达的条目**排队**，不再被 `return` 丢掉；队列满时丢最旧。
- 发送失败只喊一次（`console.warn`，不进错误环避免自激），队列继续。
- `dispose` 取消订阅与定时器（fiber 卸载不留泄漏）。

## 输掉的方案

- **保持「无会话 / 节流窗口内直接丢」**：这正是症状没有盘上证据的主因——首屏（还没开任何会话）
  报的错永远进不了 `company-client-errors.log`，agent 只能看到「日志不存在」。
- **只写 sessionStorage**：刷新后页面里能看到，但 agent 的反馈通路是读 host 日志，不是读浏览器存储。
- **不节流、每条都发**：错误风暴会把远端命令刷爆（一次错误可能连锁 console.error），旧实现加节流
  是对的，问题只在「丢」而不是「限速」。
- **用 setInterval 轮询会话**：白跑定时器，还要猜周期；`sessions.list.subscribe` 是现成的失效通知。
- **在 reporter 里同步重试**：会把错误捕获路径变成错误源；交给队列与定时器。

## 后果

- 首屏错误的证据链：页面报错 → 环（sessionStorage + `__DSH_COMPANY_ERRORS__`）→ 队列 → 用户开会话 →
  host 日志。缺的最后一跳补上了。
- 队列有界，最坏情况丢最旧（与错误环同策略），不会把内存撑爆。
- `client/index.ts` 的 reporter 注入点不变；`company-client-composition` 的卸载/重载语义不变。

## 验证

```text
npx vitest run tests/client/wiring/error-relay.spec.ts   # 5 passed
# 造红：把 flush 的无会话分支改成 `queue.length = 0; return`（旧行为）→
#   × 无会话时排队、不丢；会话出现后按序补送，节流后送完
#   × 队列有界：超出上限丢最旧，不无限涨
#   还原 → 5 passed

# 真页面（改了用户可见面 + 错误通路，必须两条都跑）
node checks/smoke/ui-scene-smoke.mjs --isolated --golden
#   金样一致（9 个页签）/ ALL PASS（错误环零命中）
node checks/smoke/client-error-chain-smoke.mjs
#   PASS 会话打开（单 writer）/ PASS 错误环捕获 / PASS host 日志落盘 → ALL PASS

# 全链
pnpm typecheck   # exit 0
pnpm test        # 139 files / 1121 tests
pnpm verify      # ALL PASS（56 门 + 2 无对象）
tsdown build     # client 354.02 kB（+1.8 kB：中继逻辑）
```

补记（同轮）：`client-error-chain-smoke` 现在跑两段——「页面加载即报错」与「会话内报错」都到盘。
⚠ 观察边界：DSH Web 加载时会保留一个草稿会话，真页面里拿不到「retainedBy.mainView = 0」的窗口，
所以「无会话先排队、会话出现再补送」的语义由 `tests/client/wiring/error-relay.spec.ts` 的注入时钟
判据证明；端到端只证两段都到盘。
