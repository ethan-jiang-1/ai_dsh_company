# 2026-11-03 · 客户端错误留痕：停写公司盘也写诊断、刷新后错误环仍在

状态：implemented（2026-11-03；用户授权「打扫卫生 + 持续改善」；D6 R5-31）

> **2026-11-03 补充**：本 Note 只证落点/持久化；页面→host 的 reporter 链当时因 vendor
> `parseCommand` 的 rawInput 前导空白而断过，修复见 [D6 客户端错误断链](./2026-11-03-d6-client-error-chain-fix.md)
> （isolated smoke 已绿）。

> 上游 = [第五轮七维打扫卡](../../_backlog/issues/2026-11-03-repo-hygiene-round5.md)
> 审计 = [第五轮七维审计](../../_backlog/research/repo-hygiene-round5/2026-11-03-seven-dimension-audit.md) R5-31

## 决定

1. **`/company-diagnostics` 不再受 `dataBlocked` 门。** 诊断日志住 `$DSH_HOME/logs/company-client-errors.log`
   （宿主日志，不是公司数据）；公司盘身份/落点/lease 停写时，用户那一页的错误仍必须留痕。
2. **错误环镜像到 `sessionStorage`。** 键 = `__DSH_COMPANY_ERRORS_V1__`；每次 push/clear 写入最近 50 条，
   新页面安装时恢复；恢复**不回放 reporter**（历史条目已上报过，避免重复写日志）。只留当前标签页，
   不用 localStorage（不跨标签/跨天泄漏页面路径）。
3. **落盘失败不再静默。** reporter 的 `.catch` 改为只喊一次 `console.warn`（不进错误环，避免自激）。

## 输掉的方案

- **保留 `dataBlocked` 门，只改文案。** 本轮实测：dev home 有 lease/身份问题时，用户在页面上触发的
  console/pageerror 一条都进不了盘；文案再清楚也没有证据。
- **用 localStorage 持久化错误环。** 会跨标签页、跨会话保留页面路径与错误正文；sessionStorage 的
  生命周期正好是“这一页”，刷新仍在、关标签即清。
- **恢复时也走 reporter。** 会把上一页已上报的错误在每次刷新后重写一遍日志，形成重复流水。
- **在 client 直连 host HTTP 端点。** 没有现成合法通道；现成的 `remote.commands.execute` 是
  “人可见命令”的正确载体（本包已有 `/company-diagnostics`）。

## 验证（实跑）

```text
npx vitest run tests/company/host-composition.spec.ts
# 8 passed（新增：bundle.json 损坏 → dataBlocked 时 client-error 仍写 home logs）
npx vitest run tests/client/error-ring.spec.ts
# 5 passed（新增：sessionStorage 恢复；恢复条目不回放 reporter）
node ./node_modules/typescript/bin/tsc -b packages/company-pack
# exit 0
```

红证：未单独制造；`dataBlocked` 测试在旧实现下会得到 `kind: 'error'`（“公司数据已停写”），
删除门后为 `success`；sessionStorage 测试在旧实现下恢复为空数组。两处都是行为级断言。

## 后果与边界

- host 日志仍要求**有当前会话**（reporter 经 `remote.commands.execute` 在该会话执行）；无会话时只有
  页面错误环（探针/DevTools 可读）。这是现有通道的边界，不是本轮引入。
- 错误环 50 条上限、相邻去重、token redact 不变。
- 真浏览器验证：本轮只跑 keyless；`ui-scene-smoke` 的 `clientErrors` 字段会读取错误环，下一轮可加
  一个“注入错误 → 刷新 → 仍在”的真页面步骤（需要新增 `--steps` 能力或 cdp 注入）。
