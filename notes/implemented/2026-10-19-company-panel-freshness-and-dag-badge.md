# 公司面新鲜度文案与 DAG 徽章：按数据源说真话（2026-10-19）

状态：implemented（2026-10-19；看板卡 3 切片；窄栏接受度 = 用户接受 pane 自身纵向滚动）

## 决定

看板卡（[卡](../../_backlog/_archive/settled_issues/2026-10-19-board-dag-ux-deep-dive.md)）把三件共享事实收成一个 owner：

1. **新鲜度文案 = 数据源的事实**。`PanelFrame` 默认从「每 5 秒自动刷新」改成「投影更新」；看板/依赖图/在场/用量/任务板吃默认（投影推送），台账显式 `每 30 秒自动刷新`，待办显式 `每 2 秒自动刷新`，培养保持 30s。`CompanyView` 顶部非培养子页同步「投影更新」；`docs/design/ui-demo.md` 的「挂载即拉 + 5s 轮询」与 `docs/index.md` D22 的旧说法同 diff 订正。
2. **DAG 的 in_progress 徽章用独立样式**。`statusBadge` 对进行中返回 `wk-dag-progress`，颜色用 `--dsw-alias-state-business-primary`；pending 的「可开工」继续 `wk-dag-ready`（success）。文案不变，变的只是同一文案不再穿两种意思的绿色。
3. **窄栏/长链只做度量，不改布局**。合成 21 节点串行链：布局高 2366px；390×520 的 `.wk-pane-body` 里 `scrollHeight=2366`、`overflowY=true`。真 7 节点样本（`session-41515cf5…`）在 390px 下 `scrollWidth=468 / clientWidth=365`、`overflowX=true`；真 21 节点样本（`session-133c5cde…`，宽图 1716×321）在 390px 下 `scrollWidth=1716 / clientWidth=365`、`overflowX=true`、`overflowY=false`，整页无纵向双滚动。用户已判：接受串行链 pane 自身纵向滚动；不改 DAG 布局。

## 输掉的方案

- **保留默认 5 秒，逐面板打补丁**：默认值仍对 7 个调用方说谎，下一处漏改就复发；2026-10-18 已抓到培养页签这个单点，证明「逐个改」不收敛。
- **让 in_progress 继续用 `wk-dag-ready`，只改文案**：文案早已是「进行中」，问题在颜色；同色 = 同一枚徽章两个意思。
- **为新鲜度另开一张 Wave 1 小卡**：一事实多 owner 会再造第二张卡；看板卡本来就是共享事实 owner（2026-10-19 父卡收口时确认）。
- **本轮顺手压缩 DAG 长链布局**：会动缩放/阅读语义与视觉夹具，超出「呈现层小修」；用户判不接受时另开卡。
- **为 golden 新建 state 快照**：生产读 wire；`tests/company/board.spec.ts` 已有真 wire 夹具，再存 state 会重犯 BUG-026 的假绿。

## 后果

- 7 个 `PanelFrame` 调用方的显示文案现在与数据源一致；`tests/client/panel-freshness.spec.ts` 钉默认值与轮询面板的显式间隔，`tests/client/dag-panel.spec.ts` 钉徽章独立类与默认文案。
- `dag-visual-probe` 新增「进行中徽章 ≠ 可开工」判据与 21 节点窄栏度量；`dag-midflight-probe` 新增 `--narrow`（真 app 390×900，落 `narrow-metrics.json` + 截图）；资产在 [dag-visual/narrow-21.png](../../snapshots/visual/dag-visual/narrow-21.png) 与 [dag-midflight/narrow.png](../../snapshots/visual/dag-midflight/narrow.png)。
- **真 21 节点已执行（2026-10-20）**：`dag-midflight-probe` 原取第一条 `session/title`，UI 用最后一条；改为取最后一条后按标题打开成功。实测宽图 1716×321，390 窄栏 `overflowX=true / overflowY=false`，整页 `scrollHeight=900` ⇒ 真实 21 节点样本只横向滚动；纵向 2366px 只在合成 21 串行链成立。
- 本轮不动 DAG 布局、不动任务板表格、不做成品台账；窄栏接受度由看板卡上的 🔒 问题承载。

## 验证

真跑过的命令与红/绿形态：

- **徽章红**：把 `company-panels.tsx` 的 in_progress 类改回 `wk-dag-ready` ⇒ `npx vitest run tests/client/dag-panel.spec.ts` **1 failed / 12 passed**；还原 ⇒ **13 passed**。
- **新鲜度红**：把 `company-tabs.tsx` 的默认值改回 `每 5 秒自动刷新` ⇒ `npx vitest run tests/client/panel-freshness.spec.ts tests/client/dag-panel.spec.ts` **3 failed / 13 passed**；还原 ⇒ **16 passed**。
- `pnpm test` ⇒ **68 files / 674 tests passed**。
- `pnpm verify` ⇒ **ALL PASS**。
- pack 双面构建：`node ./node_modules/typescript/bin/tsc -b packages/company-pack && (cd packages/company-pack && ../../node_modules/.bin/tsdown)` ⇒ 成功；之后复跑 `client-load-smoke` **ALL PASS**（不重建 = web 读旧 `lib/`，label/徽章改动不生效）。
- `source run/env.sh && node checks/smoke/client-load-smoke.mjs` ⇒ **ALL PASS**（零挂载失败 + 品牌在场）。
- `source run/env.sh && node probes/browser-visual/dag-visual-probe.mjs` ⇒ **ALL PASS**；浅/深主题徽章类与 fill 不同；21 节点窄栏 `{"chainHeight":2366,"pane":{"clientWidth":390,"scrollWidth":390,"clientHeight":520,"scrollHeight":2366,"overflowX":false,"overflowY":true},"image":{"width":208,"height":2366}}`。
- `source run/env.sh && node probes/browser-visual/dag-midflight-probe.mjs --session session-41515cf5-c4c3-4aa2-8814-b85d80560d1c --narrow` ⇒ 真 7 节点：页签头读到「投影更新」（构建产物，不是 SSR）；`{"image":{"width":468,"height":236},"pane":{"clientWidth":365,"scrollWidth":468,"clientHeight":236,"scrollHeight":236,"overflowX":true,"overflowY":false}}`。
- `source run/env.sh && node probes/browser-visual/dag-midflight-probe.mjs --session session-133c5cde-c411-442b-99e4-fb17029e259b --narrow` ⇒ 真 21 节点（宽图）：`{"image":{"width":1716,"height":321},"pane":{"clientWidth":365,"scrollWidth":1716,"clientHeight":321,"scrollHeight":321,"overflowX":true,"overflowY":false}}`，`document.scrollHeight=900`；run.json 记录该会话。
- `source run/env.sh && node probes/browser-visual/board-drift-probe.mjs` ⇒ **ALL PASS**，图落 `snapshots/visual/board-drift/board.png`。

## 边界

- 只证明：新鲜度默认值与轮询面板显式间隔、DAG 徽章独立 class/fill、21 节点布局高度与 pane 纵向溢出、真 7 节点横向溢出、drift 图。
- 不证明：用户对窄栏的接受度（已由用户判，非机器判）、DAG 布局是否该压缩、任务板/台账的 UX。真 21 节点样本已证明只横向滚动。
