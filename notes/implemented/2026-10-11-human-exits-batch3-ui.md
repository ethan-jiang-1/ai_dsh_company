# Human Exits 批 3：LedgerTab 与现场入口

状态：已交付（2026-10-11；LedgerTab、compact 显示模式与 open-in-app 现场验收齐；复核轮修正行高设计）
来源：[Human Exits RFC](2026-10-11-human-exits.md)；[批 3 表达 issue](../../_backlog/_archive/settled_issues/2026-10-11-human-exits-expression.md)；[批 2 Note](2026-10-11-human-exits-batch2-contract.md)

## 决定

- 长台账摘要不再只依赖 `title` hover：摘要本体不挂 `title`，全文由显式控件给。
- **所有**摘要行都吃两行边界（行高稳定）；**是否给「全文/收起」入口按布局量出的溢出决定**，字符数只用于首屏就亮出入口。按钮带 `aria-expanded`，展开后在面板内显示完整文本。
- 短摘要不预置多余入口；窄栏里被折行的短摘要由量出的溢出补入口。
- 量溢出跑在**绘制前**（`useLayoutEffect`）：否则窄栏里 60–120 字的行会闪出一帧「有裁切、没入口」。
- 入口的可访问名包含可见标签（`全文（查看完整结论）`／`收起（收起完整结论）`），满足 WCAG 2.5.3。
- Settings 的「工作步骤展示」选择 `compact` 只收窄工具调用细节；`/compact` 是另一条历史压缩命令，不把两者混为一谈。
- open-in-app 的现场链路是先「在侧边栏打开」进入文档预览，再由预览控件把**目标文件绝对路径**交给本机应用；源码或 endpoint 存在不替代现场验收。

## 输掉的方案

- 继续只用 `title`：否决。触屏没有 hover，键盘也没有稳定的完整文本入口。
- 固定字符截断摘要：否决。批 1 已确定不以 UI 截断代替内容治理。
- **只按字符阈值决定裁不裁**：否决——它是「会溢出」的劣质代理。2026-10-11 真浏览器实测：按字符阈值放行的短摘要行在 1440px 高到 102px（≈6 行）、390px 高到 155px（≈9 行），29 行里 22 行如此；是否真被裁只有布局知道。
- **短行开免裁口子**（`overflow: visible`）：否决，同上——行高在 6–9 行间跳正是它造成的。
- 新建 Chat renderer 或摘要 widget：否决。当前需求属于既有 LedgerTab 的局部显示，不需要新插件。
- 用源码或 `/open-in-app/apps` HTTP 响应代替现场预览：否决。RFC 明确要求真实观察窗确认文档在侧栏出现。

## 实现

- `packages/company-pack/src/client/LedgerTab.tsx`：`LedgerSummary` 量 `scrollHeight > clientHeight`（`ResizeObserver` 跟随栏宽/浮出）决定入口，`hinted || clipped || expanded` 三者取或。
- `packages/company-pack/src/client/styles.ts`：台账行独立单列 grid（元数据与摘要分行）；`.wk-row-task` 一律两行 `-webkit-line-clamp`，只有展开态解除。
- `tests/client/client-face.spec.ts`：UI 合同（aria、可聚焦控件、真展开态、两行边界、**不许有免裁口子**、按溢出量、栏宽重测）。
- `tests/client/ledger-summary.spec.ts`：长短 fixture 静态渲染（长文首帧带入入口、短摘要不预置、120/121 首屏提示边界、摘要本体不挂 title）。
- `tests/company/ledger.spec.ts`：V4 结论除逐字同源外，另钉三项事实在场、长度不退回长句、机制名不入结论主体。
- `docs/demo.md`：compact 语义（简洁/标准/详细都折叠、只有完全展开逐条展开）与 open-in-app 现场步骤。

## 验证

### 红

- `pnpm exec vitest run tests/client/client-face.spec.ts -t 'LedgerTab 长摘要'` 在实现前失败：源码只有 `title={row.summary}`，没有全文 aria 入口。⚠ 复核轮发现当时 4 条断言里 2 条恒绿（`/summary/` 命中 `row.summary`、`/height:/` 命中 `line-height:`），已改写成 7 条**逐条在 6094d67 基线上都红**的断言（脚本核对：基线红 7/7）。
- 行高红：`node probes/browser-visual/ledger-summary-probe.mjs '<token-url>' '研究AI改造公司方案V4'` 在旧实现上报 `行高超两行的摘要：[{"length":103,"lines":3},…{"length":109,"lines":4}]`（1440px 即 9 行超界）。
- V4 结论红配方：把 meta 结论换成 835 字长句 ⇒ `tests/company/ledger.spec.ts` `1 failed`（已还原，6 passed）。

### 绿与回归

- `pnpm test tests/client`：`13` 个文件、`74 passed`。
- 行高绿：同一探针 `{"width":1440,"rows":29,"maxLines":2,"buttons":7,"clipped":7,…}`、`{"width":390,…,"maxLines":2,"buttons":16,"clipped":16,…}`，键盘/鼠标/触屏三路展开全文一致；**buttons == clipped** ⇒ 被裁必有入口。
- `source run/env.sh && node checks/smoke/client-load-smoke.mjs`：`ALL PASS`（重打包后复跑）。
- `pnpm verify`、`git diff --check`：通过。

### 现场（真浏览器/真模型，均不进 `pnpm test`）

- compact：`compact-view-probe` 同一会话内简洁/标准/详细 2471 字符、198 条过程行折叠 0 可见，完全展开 19874 字符、35 条可见；答案节点（`data-turn-process-answer`）在切回简洁后**逐字一致**（1257 字）⇒ 折叠过程行但不折叠助手最终长文。判定落 `runtime/human-exits-evidence/compact-view-verdict.json`。
- open-in-app：`open-in-app-probe` 让交付物进侧栏预览后，点 `sidebar.right.tab.document.actions` 槽的控件发出 `POST /api/session/openWorkspacePath` `200`，**请求体里的绝对路径** = `.../deliverables/2026-10-10-ai-transformation-2026-v4/final.md`，无 alert。会话头部「Open in Finder」另走 `POST /open-in-app/open`（200，工作区根），交付物卡上的控件走 `POST /api/present.open`（204）。
- 三条浏览器探针**判定**都落 `runtime/human-exits-evidence/`（gitignored）；**截图只有台账探针**拍（两档视口），其余两条只写 JSON。`/compact` 历史压缩命令收尾仍有 `session/writer-held` 观察项，与本 RFC 的显示模式判据无关。
- 提交的视觉夹具 = `snapshots/visual/ledger-summary/`（两档视口截图 + computed.json，`ledger-summary-probe --fixture` 写入）：390px 截图里能直接看到两行边界、**省略号**与「全文」入口同框，短行无入口；computed.json 记 `maxLines:2`、`buttons == clipped`（7/7、16/16）与键盘/鼠标/触屏三路取全文。
- 现场曾挂载旧 bundle（无入口），故此前 smoke 不能证明新源码行为；每次改 client 源码后按 `tsc -b` + 包内 `tsdown` 重打包再验。

## 已知边界

- 真被本机应用打开（Finder/Sublime 里看到文件）只能由人确认；机器侧只验到成功请求与目标绝对路径。
- 简单二选/窄屏列表场景未单独做真实模型探针（规则文本已覆盖）。
