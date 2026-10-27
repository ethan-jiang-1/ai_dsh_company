---
状态：implemented（2026-10-27，R3 批次 C 后半 + A2：真页面车道、错误环与无对象门禁）
---

# R3-C 后半：一条命令看真页面、浏览器错误进证据、门禁不再把「没有对象」当通过

> 上游 = [第三轮六维度打扫卡](../../_backlog/_archive/settled_issues/2026-10-27-repo-hygiene-round3.md)（R3-03/04/06/24）。

## 决定

1. **真页面车道 = 自起实例 + 复用 cdp-probe**：新增 `checks/smoke/ui-scene-smoke.mjs`——`startWeb` 起观察窗 →
   子进程跑 `cdp-probe --evidence`（页签清单仍从注册源解析）→ 汇总 verdict 与证据目录 → 关实例。
   一条命令覆盖「起服务 / 读 token / 拼 URL / 全页签断言 / 截图」；`--keep` 留实例给人接着看。
   退出码分层：0 绿、1 真断言失败、2 环境未就绪（未登录/构建缺失）——不再让 agent 把环境问题诊断成渲染问题。
2. **浏览器错误环**：`client/error-ring.ts` 在页面内捕获 `error` / `unhandledrejection` / `console.error`
   （有界 50 条、相邻去重、卸载还原 console），挂 `window.__DSH_COMPANY_ERRORS__`；cdp-probe 读它进
   verdict `clientErrors` 与证据目录，并断言**环已安装**（旧 bundle/未重构建 = 红，防「探针读不到=没有问题」）。
   **边界（明说不做）**：它不写会话日志——client 没有往 session 追加事件的合法通道，自造 vendor 机制违反 D13；
   所以它是「用户/agent 通过真页面车道可见」，不是「模型下一轮上下文可见」。这条边界写进模块头注与 CDP 指南。
3. **`replay-smoke --ui` 显式停用**：本仓没有声明 uiEvidence 的场景/金样；`--ui`/`--refresh-ui` 直接 exit 2
   并指向 `ui-scene-smoke`；`checks/smoke/lib/replay-ui.mjs` 标「已耗（2026-10-27）」，等功能场景回归时复用。
4. **门禁的「无对象」独立成 SKIP**：`run-gates` 新增 `skip(name, reason)` 与 `EXPECTED_SKIPS` 白名单；
   `replay-fixture-freshness`（0 个需查注入面的 runnable 场景）与 `replay-ui-freshness`（0 份金样）
   从 `PASS ×0` 改为 `SKIP`，最终摘要写明「N 门无对象」。新增跳过必须显式登记，否则红（防静默全跳）。
5. **runbook 补 UI 行**：`budget-and-ops §3` 增加「面板空白/页签点不开」「用户报刚才报错了」两行，
   指向 `ui-scene-smoke` / `cdp-probe --evidence` 的 `clientErrors`。

## 输掉的方案

- **把客户端错误写进会话日志**：需要 vendor `SessionEventMap` 新事件 + host 侧 RPC/typert 通道，
  属于自造机制（D13 明令优先现成载体）；且会让模型上下文被浏览器噪声污染。选「页面内环 + 探针读取」。
- **保留 `replay --ui` 让它在运行时才报错**：四份文档曾推荐它，运行时裸栈说明不了「该用哪条路」；
  改成启动即 exit 2 + 明确指向。
- **让 `skip` 也输出 PASS（带备注）**：那正是 R3-06 要治的病；选独立 SKIP 行 + 白名单 + 汇总句。
- **给每个面板写一条自起实例探针**：会造第二套页签逻辑；选复用 cdp-probe（断言只存在一份）。
- **error ring 存在性不做断言**：不带它时旧 bundle 也「零 clientErrors」——假绿。

## 后果

- `verify` 输出变为 `ALL PASS；2 门无对象（replay-fixture-freshness / replay-ui-freshness）`——读者能一眼区分。
- `client/index.ts` apply 多一个 effect（卸载还原）；cdp-probe 在**旧 bundle** 上会红（错误环缺失），
  这恰好也是「改了 src 没重建」的运行时信号。
- `pnpm test` 947（+3 error-ring）；`ui-scene-smoke` 真跑 9/9 页签、`errorRingInstalled: true`、`clientErrors: []`。

## 验证（真跑）

```text
# 真页面自起实例（rebuild 后）
node checks/smoke/ui-scene-smoke.mjs
  → 9/9 页签、errorRingInstalled=true、clientErrors=[]、consoleProblems=[]
  → ALL PASS（自起实例 + 全部公司页签 + 浏览器错误环零命中）；场景回执落 diagnosis/

# 无对象不再冒充通过（改造前后对照）
改造前：PASS replay-fixture-freshness ×0 场景 0 处注入面与现行手册一致
改造后：SKIP replay-fixture-freshness: 盘上没有需查注入面的 runnable 场景（headless 跳过 1）——公司行为回放已移私有仓
        SKIP replay-ui-freshness: 盘上没有任何 ui.expected.md 金样（公司 UI 场景 = ui-scene-smoke 自起实例车道）
        verify: ALL PASS；2 门无对象

# 回归
npx vitest run                         → 103 files / 947 tests passed
node checks/run-gates.mjs              → ALL PASS + 2 SKIP（EXPECTED_SKIPS 内）
pnpm typecheck                         → exit 0
```

未验：错误环的「旧 bundle 必红」是机制性判据，未构造红（重建前后的 bundle 只保留后者）；真模型 `--ask` 未跑。
