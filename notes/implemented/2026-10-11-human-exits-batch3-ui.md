# Human Exits 批 3：LedgerTab 与现场入口

状态：已交付（2026-10-11；LedgerTab、compact 显示模式与 open-in-app 现场验收齐）
来源：[Human Exits RFC](2026-10-11-human-exits.md)；[批 3 表达 issue](../../_backlog/_archive/settled_issues/2026-10-11-human-exits-expression.md)；[批 2 Note](2026-10-11-human-exits-batch2-contract.md)

## 决定

- 长台账摘要不再只依赖 `title` hover。
- 摘要默认两行稳定显示；超过阈值时出现可键盘/触屏操作的“全文/收起”按钮，按钮带 `aria-expanded`，展开后在面板内显示完整文本。
- 短摘要直接可读，不额外增加入口。
- Settings 的「工作步骤展示」选择 `compact` 只收窄工具调用细节；`/compact` 是另一条历史压缩命令，不把两者混为一谈。
- open-in-app 的现场链路是先「在侧边栏打开」进入文档预览，再由预览头部「Open in app / 在应用中打开」调用本机应用；源码或 HTTP endpoint 存在不替代现场验收。

## 输掉的方案

- 继续只用 `title`：否决。触屏没有 hover，键盘也没有稳定的完整文本入口。
- 固定字符截断摘要：否决。批 1 已确定不以 UI 截断代替内容治理。
- 新建 Chat renderer 或摘要 widget：否决。当前需求属于既有 LedgerTab 的局部显示，不需要新插件。
- 用源码或 `/open-in-app/apps` HTTP 响应代替现场预览：否决。RFC 明确要求真实观察窗确认文档在侧栏出现。

## 实现

- `packages/company-pack/src/client/LedgerTab.tsx`：新增 `LedgerSummary`，长摘要全文切换和 `aria-expanded`。
- `packages/company-pack/src/client/styles.ts`：台账行独立使用单列 grid，让元数据与摘要分行；短摘要不 clamp，长摘要默认两行、展开后恢复全文，不改其他面板的通用 flex 行。
- `tests/client/client-face.spec.ts`：增加 UI 合同红/绿测试。
- `tests/client/ledger-summary.spec.ts`：长短 fixture 的 keyless 静态渲染断言（超长必带全文入口、短摘要不带入口且保留 title、120/121 阈值边界）；红配方实测过——把全文入口条件改假后该 spec `2 failed`，还原后绿。
- `docs/demo.md`：补充 `/compact` 操作边界与 open-in-app 现场验收步骤。

## 验证

### 红

`pnpm exec vitest run tests/client/client-face.spec.ts -t 'LedgerTab 长摘要'` 在实现前失败：源码只有 `title={row.summary}`，没有全文 aria 入口；证明旧实现依赖 hover 且无展开状态。

### 绿与回归

- 同一测试在实现后通过：`1 passed`。
- `pnpm test tests/client`：`13` 个文件、`74 passed`（含新的长短 fixture spec）。
- `source run/env.sh && node checks/smoke/client-load-smoke.mjs`：`client-load-smoke: ALL PASS`。
- 标准观察窗 `node probes/browser-visual/cdp-probe.mjs '<带 token URL>'`：品牌、8 个公司页签全部打开，`consoleProblems=[]`、`exceptions=[]`、无 tab failure。
- `git diff --check`：通过。
- `pnpm verify`：当前批次结构门禁通过。
- 已认证 HTTP endpoint：`/open-in-app/apps` 在 token 换 cookie 后返回 `200` 和应用目录；这只证明 Host 路由可达，不单独算现场验收。
- 真实观察窗中打开已有 `company-workspace` 会话，点击 `Preview deliverables/.../final.md in sidebar` 后，预览头部出现 `Open in Finder`、`Open in Sublime Text.app` 和 `Open with`；点击默认 `Open in Sublime Text.app` 后文档预览仍在，`role=alert` 数量为 0。open-in-app 现场链路通过。

## compact 现场证据与剩余项

- `node probes/browser-visual/compact-view-probe.mjs '<token-url>' '研究AI改造公司方案V4'`：同一会话内简洁/标准/详细都是 2472 字符、198 条过程行折叠且 0 条可见；切到完全展开为 19875 字符、35 条过程行可见；切回简洁后助手最终回复（939 字）逐字仍在。⇒ 过程行折叠成立，compact 不折叠助手最终长文。
- 空新会话执行 `/compact` 如实显示 `No compactable history yet`，不是有效验收上下文。
- 在已有公司历史会话中执行 `/compact` 后，最终回复仍完整可见，随后出现 `/compact` 过程项；收尾输出出现 `command.list ... session/writer-held`，因此历史压缩命令保留为运行态观察，不作为本 RFC 的显示模式判据。
- 真实观察窗打开 Settings → Work details，打开下拉后看到 `Compact / Standard / Detailed / Verbose`，选择 `Compact` 后按钮显示 `Compact`。
- 设置行与 runbook 已按实测改准（简洁/标准/详细都折叠过程行，只有完全展开逐条展开）。
- `node probes/browser-visual/ledger-summary-probe.mjs '<token-url>' '研究AI改造公司方案V4'`：真实红为摘要宽度不足（多行宽度为 0），且短摘要存在 scrollHeight > clientHeight、没有全文按钮。最小修复台账专属布局和短摘要 clamp 后，同一探针在 1440/390px 均输出 29 行、keyboard/touch/shortReadable PASS。窄屏先选择会话再 resize，避免折叠导航造成选择超时。
- 现场曾挂载旧 bundle（没有全文按钮），因此此前 smoke 不能证明新源码的行为。已执行 `pnpm exec tsc -b packages/company-pack`，并在包目录执行 `pnpm exec tsdown --config tsdown.config.ts` 后刷新同一观察窗，确认 7 个全文按钮及上述行为证据。
- open-in-app 现场：`node probes/browser-visual/open-in-app-probe.mjs '<token-url>' '研究AI改造公司方案V4' 'final.md'` 让交付物进侧栏预览后，点侧栏文档预览自己的控件（`sidebar.right.tab.document.actions` 槽）发出 `POST /api/session/openWorkspacePath` 且 `200`，请求体携带目标绝对路径 `.../deliverables/2026-10-10-ai-transformation-2026-v4/final.md`，预览保留、`role=alert` 为 0。会话头部「Open in Finder」另走 `POST /open-in-app/open`（200，路径 = 工作区根），交付物卡上的打开控件走 `POST /api/present.open`（204）——三条路都是实跑请求，不是源码或 endpoint 推断。
- 批 3 全部验收项已取得现场证据；RFC 与两张 issue 是否离场仍按 notes/README 的生命周期与用户确认执行。
