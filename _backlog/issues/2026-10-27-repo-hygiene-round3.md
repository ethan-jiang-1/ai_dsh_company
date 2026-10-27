---
status: 推敲中
opened: 2026-10-27
---

# 推敲：第三轮 fresh-agent 六维度打扫——真空绿、反馈断点与流程双权威

> 立卡：2026-10-27 ｜ 状态：推敲中 ｜ 类型：任务 ｜ 毕业：做 ｜ 可关闭：否

**问题与期望结果：** 距上轮打扫（2026-10-20/21，两轮六维度 + P0–P4 全批）已七天，期间落了数据模型（0.3.12–0.3.14）、发布/安装链、独立启动与多 profile 等一批新面。用户要求以 fresh agent 视角复评六维度并持续改善。期望结果 = 带一手证据的分级发现、六维判定与可分批实施的改善清单；本轮推敲完成 = 用户 REVIEW 选批并把批次写进本卡。

**当前情况：** 审计报告 = [research/repo-hygiene/2026-10-27-six-dimension-audit-round3.md](../research/repo-hygiene/2026-10-27-six-dimension-audit-round3.md)（主 agent 亲跑全部 keyless 车道 + 四个独立子代理深挖）。**基线全绿且上轮修复守住**：`pnpm verify` 47 门 ALL PASS、`pnpm test` 97 spec / 907 用例、`client-load-smoke` ALL PASS、活体 `cdp-probe` 9/9 页签零 console 问题、`replay-smoke` 默认场景 ALL PASS、`orient`/`diagnose` 可跑；角色名册单一化、`gate-wiring` 零孤儿、`act()` 清零、composition 提速均复核成立。**新问题集中在三处**：① 声明与资产脱钩——回放场景舰队、UI 金样、判据语料都已不在盘上，而 10+ 处活跃文档/头注仍当现行，门禁在"零对象"上照样 PASS；② 反馈通路缺口——客户端错误不进模型可见记录，唯一能断言页面内容的 `--ui` lane 不可达，`diagnose` 对中断 turn 报 `FAILURES none` 且恒 exit 0；③ 流程双权威——收尾两份清单顺序相反且互指 owner，缺陷卡自授权边界在指南里被复写成"限 P1/P2"、丢掉排除项（照做可自授权改 docs 合同）。结构面（D1/D2/D3）不是平铺病：代码分层真实、0 跨层反向边、0 无测试模块；病在入口链物理形状（351 行政策大全在第二跳）与层表缺"政策"档。

**未决问题：** 四个建议批次的取舍（A 真实性止血 / B 语义边界 / C 回归网补强 / D 渐进披露与结构收拢）——尤其：`replay --ui` 是"补一个合成 web 场景"还是"彻底撤掉并从文档删除"；dev-loop 是否拆出政策层（会动 4–6 份文档的编号与链接）；客户端错误通道要不要做（要碰 client 面与 host 事件面，是本轮唯一"新机制"）。

**进展（2026-10-27 夜）：** 用户批全批 + 补 web 场景 + 客户端错误通道。已落三批（每批一 commit + Note）：
批次 A 真实性止血（[Note](../../notes/implemented/2026-10-27-r3-batch-a-truth.md)）→ C5 分层门禁 + typecheck
（[Note](../../notes/implemented/2026-10-27-r3-c5-layer-guard.md)）→ 批次 B 授权/收尾单一家
（[Note](../../notes/implemented/2026-10-27-r3-b-authority-and-closeout.md)）→ C 前半回归网与日志真值
（[Note](../../notes/implemented/2026-10-27-r3-c-first-half-regression.md)；test 910→944，verify 全绿）。
**进展（2026-10-27 深夜）：** C 后半 + A2 已落——[真页面车道/错误环/SKIP 语义](../../notes/implemented/2026-10-27-r3-c-second-half-ui-lane.md)
（`ui-scene-smoke` 一条命令自起实例看真页面；浏览器错误环进 verdict；两个 freshness 门禁 0 对象时输出 SKIP）；
D 前半已落——[索引瘦身/预算双向/lib 修环/探针标题](../../notes/implemented/2026-10-27-r3-d-first-half-disclosure.md)。
**剩余：** D1 政策层 + dev-loop 拆分（目标 ≤150 行）· D4 三个巨型函数按现成缝拆（482/425/340 行）。

**下一步：** 按剩余四项继续；每项一 commit + Note + 对应真检查，全部落完再收口本卡并写去向。

## 范围与排除项

- 范围：`docs/`、根入口与 `_backlog` 制度面、`packages/company-pack/{src,workspace,README}`、`tests/`、`checks/`、`probes/`、`tools/`、`snapshots/README.md`、`.agents/skills/`。
- 排除：`vendor/dsh/`（只读）；真模型认证档（成本授权）；公司业务产物内容与 persona 文案质量；`snapshots/` 的历史 payload（只读）。

## 已知与未决

已知（证据逐条在报告 §3）：

- P0 四件：分层无默认守卫（无 typecheck/build 脚本、verify 不含 tsc）｜`diagnose` 中断 turn 假绿且恒 exit 0｜客户端错误不进模型可见记录｜UI 症状不可复现（`--ui` 白名单指向已不存在的场景）。
- P1 六件：声明资产缺失（判据语料 ENOENT）｜升 pin 回归网名存实亡（release.md 仍以已撤的 r2/r3 作“第一道”，dev-loop/testing 同指）｜语义真空绿（两个门禁 ×0 对象仍 PASS）｜授权边界复述截断｜收尾双清单顺序相反｜r2/r3 指令性残留 10+ 处（含 ui-demo 同表自相矛盾）。
- P1 测试面三件：客户端连接层最薄（分支 10.5%、两面板零渲染测试）｜host 无真组合测试（函数覆盖 37.5%）｜propose 五条治理守卫零用例。
- 结构性项（可后置）：三个巨型函数 482/425/340 行｜lib 三元环｜重复小工具 4/3/2/3 份｜入口链 836 行/21k tokens 与 10/20 文档预算头寸 <5%｜`checks/README.md` 193 行三合一。

未决：见上"未决问题"三条。

## 方案与取舍

- **方案 A（只修真实性与文档面，1 天）**：清掉不存在的声明与指令性残留、修计数与版本腐化、让"零对象"门禁可辨识、`diagnose` 中断检测。成本最低；不补回归网，UI 症状仍不可复现。
- **方案 B（A + 语义边界与收尾单一化，再半天）**：授权规则一处家、收尾一份有序清单。消除"照文档做会做错"的唯一一项。
- **方案 C（B + 回归网补强，2–3 天，推荐）**：加 `src-layering` 门禁与 `pnpm typecheck`；客户端页签/待办渲染 spec；host 真组合 spec；propose 守卫 spec；`--ui` 二选一落地。让"绿"重新有意义，尤其是用户实际接触的 client 层。
- **方案 D（C + 渐进披露与结构收拢，再 2 天）**：立政策层并把 dev-loop 降到 ≤150 行、预算双向棘轮 + 链上补预算、`checks/README.md` 压到 ≤100 行、三个巨型函数按现成缝拆、lib 环与重复工具收家。收益最大，改动面也最大（会动 4–6 份文档与多处链接）。

取舍：A/B 是止血；C 是"让回归网覆盖用户看得见的东西"（本轮最高价值）；D 是常驻上下文回到可读，但必须与 A–C 分开做，避免"结构搬家"掩盖"行为变化"。不建议只做 A。

## 关闭条件

- 审计报告被用户接受，或指出要补的维度/证据；
- 用户选定批次（A/B/C/D）与 `--ui` 的具体取舍，写进本卡；
- 后续实施授权已记录（批次可拆多张实施卡或直接进 RFC/Note）。
