# Human Exits 批 3：LedgerTab 与现场入口

状态：已交付（2026-10-11；LedgerTab UI 切片已绿，open-in-app 现场验收阻断）
来源：[Human Exits RFC](../proposed/2026-10-11-human-exits.md)；[批 3 表达 issue](../../_backlog/issues/2026-10-11-human-exits-expression.md)；[批 2 Note](2026-10-11-human-exits-batch2-contract.md)

## 决定

- 长台账摘要不再只依赖 `title` hover。
- 摘要默认两行稳定显示；超过阈值时出现可键盘/触屏操作的“全文/收起”按钮，按钮带 `aria-expanded`，展开后在面板内显示完整文本。
- 短摘要直接可读，不额外增加入口。
- compact 操作维护在 `docs/demo.md` 前置：只说明过程行折叠，不声称 compact 折叠助手最终长文。
- open-in-app 只接受真实观察窗中的文件预览证据，源码或 HTTP endpoint 存在不替代现场验收。

## 输掉的方案

- 继续只用 `title`：否决。触屏没有 hover，键盘也没有稳定的完整文本入口。
- 固定字符截断摘要：否决。批 1 已确定不以 UI 截断代替内容治理。
- 新建 Chat renderer 或摘要 widget：否决。当前需求属于既有 LedgerTab 的局部显示，不需要新插件。
- 用源码或 `/open-in-app/apps` HTTP 响应代替现场预览：否决。RFC 明确要求真实观察窗确认文档在侧栏出现。

## 实现

- `packages/company-pack/src/client/LedgerTab.tsx`：新增 `LedgerSummary`，长摘要全文切换和 `aria-expanded`。
- `packages/company-pack/src/client/styles.ts`：摘要默认两行 line clamp，展开态恢复完整内容，并保留稳定 flex 布局。
- `tests/client/client-face.spec.ts`：增加 UI 合同红/绿测试。
- `docs/demo.md`：补充 `/compact` 操作边界与 open-in-app 现场验收步骤。

## 验证

### 红

`pnpm exec vitest run tests/client/client-face.spec.ts -t 'LedgerTab 长摘要'` 在实现前失败：源码只有 `title={row.summary}`，没有全文 aria 入口；证明旧实现依赖 hover 且无展开状态。

### 绿与回归

- 同一测试在实现后通过：`1 passed`。
- `pnpm test tests/client`：`12` 个文件、`71 passed`。
- `source run/env.sh && node checks/smoke/client-load-smoke.mjs`：`client-load-smoke: ALL PASS`。
- 标准观察窗 `node probes/browser-visual/cdp-probe.mjs '<带 token URL>'`：品牌、8 个公司页签全部打开，`consoleProblems=[]`、`exceptions=[]`、无 tab failure。
- `git diff --check`：通过。
- `pnpm verify`：当前批次结构门禁通过。
- 已认证 HTTP endpoint：`/open-in-app/apps` 在 token 换 cookie 后返回 `200` 和应用目录；这只证明 Host 路由可达，不算 open-in-app 现场验收。

## 现场阻断与未验

- 尝试在真实观察窗中打开台账并寻找文档入口时，页面实际处于 `Choose workspace` 空态；没有有效会话/文件预览上下文，无法点击文件链接并确认目标文档进入右栏预览。
- 因此 `open-in-app` 现场验收未通过也未判失败，状态是**环境阻断**；不能把源码存在、slot 注册或 HTTP endpoint 当作通过。
- compact 步骤已写入 runbook，但尚未在一个有目标会话的现场窗口完成可视验证。
- 批 3 尚未整体完成；RFC 和两张 issue 不得归档。下一步需在观察窗连接 `company-workspace` 并打开含目标文件的会话，再完成 compact 与 open-in-app 现场证据。
