# 工作区文本读取收成一个闭包 + 一台加载机

状态：implemented（2026-10-23；架构评审候选 5；用户令「P1→P9 全做」）

## 决定

1. **读取闭包唯一**：`makeWorkspaceTextReader(remote, leadOf)` 住
   [cultivation-data.ts](../../packages/company-pack/src/client/cultivation-data.ts)，形状 =
   `(path, limit) => (sessionId, signal) => Promise<string | null>`；失败（不可读/异常）一律 null。
   此前同一段 try/ok/catch 在三处各写一遍（cultivation readText、index 的 readLedger / readCatalog）。
2. **数据面只暴露一个入口**：[company-data-plane.ts](../../packages/company-pack/src/client/company-data-plane.ts)
   加 `readWorkspaceText`；两个静态页签的路径收进 `WORKSPACE_TEXT_PATHS` 常量表（台账 / 成品索引），
   index.ts 不再自己写路径。
3. **加载机唯一**：[workspace-text.ts](../../packages/company-pack/src/client/workspace-text.ts) 的
   `useWorkspaceText(load, sessionId, { refreshMs? })` → `{ state, reload }`；状态三态
   （loading / unreadable / ready）。LedgerTab 与 DeliverablesTab 删掉各自的 AbortController、
   null 文案、catch 文案、轮询/手动 tick 状态机。
4. **契约测试改接口断言**：client-face.spec 不再对 index.ts 跑正则，改为直接调用读取闭包，
   断言面板真正请求的两条路径与 limit。

## 输掉的方案

- **工厂住 company-data-plane**：cultivation-data 也要用同一闭包，放那边会形成 data-plane ↔ cultivation 的环；
  放 cultivation-data（本来就是「工作区文件」模块）零环。
- **hook 只返回 `{text,error}`**：两个页签需要区分「读取中」（首帧）与「读不到」（错误文案），
  两态合一会让首帧闪错误。
- **把错误文案收进 hook**：文案是呈现层的（台账/成品各一套），hook 只给状态，文案留在页签。
- **顺手把「成品解析失败」也收进 hook**：解析属于该页签的业务形状，不是通用读取状态。

## 后果

- 三份闭包 → 一份；两台手写加载机 → 一台。页签只剩「把状态渲染成自己的文案」。
- 行为微变（已登记）：DeliverablesTab 读取抛异常时，文案从原始异常消息变成「不可读」提示——
  读取闭包本来就把异常折成 null，原始消息此前只在不常见的异常路径出现。

## 验证（真跑）

```text
npx vitest run tests/client        # 179 passed（含新的接口断言）
pnpm test                          # 752 passed
pnpm verify                        # ALL PASS
```

## 未验

- hook 的定时/abort 行为没有单测（仓里没有 react test renderer；静态渲染不跑 effect）。
  真浏览器行为下次开观察窗时复跑 `cdp-probe` / 两个页签探针。
- `pnpm build` / typecheck 不在 keyless 层，未跑。
