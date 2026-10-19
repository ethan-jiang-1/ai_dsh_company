---
status: 等人拍板
opened: 2026-10-19
---

# 推敲：看板 + 依赖图的 UX 深挖（呈现层 + 可读性，按 wire 真值）

> 立卡：2026-10-19 ｜ 状态：等人拍板 🔒 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：否

## 当前结论（只写 now）

本轮已实施并验证：

1. **新鲜度文案说真话**：`PanelFrame` 默认改为「投影更新」；看板/依赖图/在场/用量/任务板走投影推送；台账显式 30s、待办显式 2s、培养保持 30s。
2. **DAG 的 in_progress 徽章有独立样式**：`wk-dag-progress`（business 主色），不再与 pending 的「可开工」共用 `wk-dag-ready` 绿色。
3. **窄栏/长链有实测**：21 节点合成样本高 **2366px**，390×520 pane 的 `scrollHeight=2366`、`overflowY=true`；真 7 节点样本（`session-41515cf5…`）在 390px 下 `scrollWidth=468 / clientWidth=365`、`overflowX=true`。见 [narrow-21.png](../../snapshots/visual/dag-visual/narrow-21.png) 与 [narrow.png](../../snapshots/visual/dag-midflight/narrow.png)。
4. **drift 真图复验通过**：`board-drift-probe` ALL PASS，图落 `snapshots/visual/board-drift/board.png`。
5. **golden 不新建**：用 `tests/company/board.spec.ts` 的真 wire 夹具（`TeamTaskView` 形状），不把 `record.rows.agentTeam.val`（state）当 golden。

**剩一个判断（需要你拍）**：窄栏下 pane **自带纵向滚动**（2366px 的 21 节点链 vs 520px 视口）是否接受？
- 建议接受：长链本来就超出单屏；改布局/压缩会动 DAG 的缩放与阅读语义，属另一张卡。
- **未执行**：真 21 节点会话 `session-133c5cde…` 的标题在浏览器搜索里找不到（probe 超时），「整页滚动 + pane 滚动」的双滚动未在同一真样本上测得；合成 21 节点 + 真 7 节点已分别覆盖纵向/横向。此项如实标「未执行」，不冒充绿。

**下一步：** 你判窄栏；接受则本卡收口，不接受则另开「DAG 长链布局」卡（本轮不动布局）。

## 本轮实施（2026-10-19）

- **新鲜度**：`company-tabs.tsx` 默认 `投影更新`；`CompanyView.tsx` 非培养子页 `投影更新`；`LedgerTab.tsx` 传 30s；`AttentionTab.tsx` 传 2s；`CultivationTab.tsx` 已有 30s。同 diff 修 `docs/design/ui-demo.md` 的「挂载即拉 + 5s 轮询」与 `docs/index.md` D22 的旧说法。
- **DAG 徽章**：`company-panels.tsx` 的 `statusBadge` 对 in_progress 返回 `wk-dag-progress`；`styles.ts` 用 `--dsw-alias-state-business-primary`。
- **测试**：新增 `tests/client/panel-freshness.spec.ts`；更新 `tests/client/dag-panel.spec.ts`（默认文案 + 徽章独立类）；`tests/company/dag.spec.ts` 加 21 节点链高 > 视口；`tests/client/dag-visual-fixture.spec.ts` 发 21 节点 chain SVG。
- **探针**：`dag-visual-probe` 加「进行中徽章 ≠ 可开工」与 21 节点窄栏度量；`dag-midflight-probe` 加 `--narrow`（真 app 390×900，落 `narrow-metrics.json` + 截图）；`board-drift-probe` 复跑。

## 事实与证据（本轮实跑）

| 项 | 结果 | 命令/产物 |
|---|---|---|
| keyless：新鲜度 + 徽章 + 长链 | 674 tests / 68 files 全绿 | `pnpm test` |
| 结构门禁 | ALL PASS | `pnpm verify` |
| 真挂载 | 零挂载失败 + 品牌在场 | `client-load-smoke` |
| DAG 视觉 | 浅/深两主题：进行中徽章 `wk-dag-progress` fill `rgb(65,118,230)`，可开工 `wk-dag-ready` fill `rgb(34,197,94)`；21 节点窄栏 `overflowY=true` | `dag-visual-probe`（ALL PASS） |
| 真 app 窄栏（7 节点） | `scrollWidth=468 / clientWidth=365`、`overflowX=true`、`overflowY=false` | `dag-midflight-probe --session session-41515cf5… --narrow` |
| 真 21 节点会话 | **未执行**：`session-133c5cde…` 标题搜索超时，未打开 | 同上，如实标未执行 |
| drift | ALL PASS；图落 `snapshots/visual/board-drift/board.png` | `board-drift-probe` |
| golden | 真 wire 夹具在 `tests/company/board.spec.ts`；未新建 state 快照 | `pnpm test tests/company/board.spec.ts` |
| 84 板/379 任务、max 21、非空中位 4 | projcache **state** 全量（1738 会话），非 wire | [真相复核 §三](../research/company-panels-ux/2026-10-19-panel-truth-audit.md) |

## 范围与排除项

- **范围内**：新鲜度文案（共享事实唯一 owner）；DAG 徽章样式；窄栏/长链实测；drift 复验；wire golden/夹具。
- **范围外**：DAG 长链布局/压缩（待你判后另卡）；正确性缺陷修复（已做完）；不改任务投影（vendor）；不做任务编辑；不碰任务板表格（另卡）；不做成品台账（[新卡](2026-10-19-deliverables-ledger.md)）。

## 验收标准（本轮已执行；窄栏一项待判）

- [x] **DAG 徽章**：in_progress 用 `wk-dag-progress`，与 pending 的 `wk-dag-ready` 不同；keyless + 视觉探针双证。
- [x] **新鲜度**：`PanelFrame`/`CompanyView` + 7 个调用方全部说真话（推送=投影更新；台账 30s；待办 2s）；keyless 断言。
- [x] **golden 层**：用 wire（`TeamTaskView`）或现有 `board.spec.ts` 真 wire 夹具；不用 state；owner 映射与「真无 owner = 未分配」有断言。
- [x] **drift**：`board-drift-probe` 通过；图落 `snapshots/visual/board-drift`。
- [x] 门禁 + `pnpm test` + `client-load-smoke` 绿；记录/索引同步。
- [ ] **窄栏接受度**：pane 自带纵向滚动已实测（合成 21 节点 + 真 7 节点横向）；整页双滚动未在同一真 21 节点样本上测。**待你判：接受 / 另开布局卡**。

## 修订史（只追加）

- rev 1 2026-10-19：立卡；核心假设 =「板面必须等于投影真值」，并据此要求先修数据 BUG-026/027。
- rev 2 2026-10-19 晚：该前提被证伪——BUG-026 是误报（wire ownerName 齐全），BUG-027 根因不成立、真缺陷是徽章门槛（已修）。「两个致命结论」撤回；核心转为呈现层。
- rev 3 2026-10-19 A 收口：当前路径重写为 now；验收标草案；golden 改 wire；验证计划改现有探针；刷新文案归本卡唯一 owner。
- rev 4 2026-10-19：实施 3 个切片（新鲜度 / 徽章 / 窄栏证据）；674 tests + verify + client-load + 三个探针；剩窄栏接受度待用户判。

## Review 指南（给 review 的人/Agent）

- **要证伪的假设**：①「新鲜度只是改三处文案」——默认值影响 7 个调用方，必须改默认 + 轮询面板显式传；②「in_progress 文案对了就够了」——同色仍是两个意思，必须独立 class/fill；③「21 节点窄栏已全测」——真 21 节点会话搜索失败，整页双滚动未测，别把合成样本当全绿。
- **口径**：wire + 现有探针；截图只做视觉判断，审美争议不算缺陷。
- **别再证**：owner 全缺、ready 放宽、两视图一致性——前两条已证伪/已修，第三条同一函数恒真。
