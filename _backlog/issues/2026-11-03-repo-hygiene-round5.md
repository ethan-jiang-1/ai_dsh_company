---
status: 推敲中
opened: 2026-11-03
---

# 推敲：第五轮七维打扫（v3 迁移与发行版收口之后）

> 立卡：2026-11-03 ｜ 状态：推敲中 ｜ 类型：未定 ｜ 毕业：未定 ｜ 可关闭：否
>
> **结论/去向**：（关闭时写：结论 + `去向` 封闭值 — 落点；状态行只做镜像）

**问题与期望结果：** 用户要求以 fresh agent 视角重评七个维度（文档/代码渐进披露、代码与测试层次、文档—执行—验收结构、上下文腐化、测试资产、反馈通路、DSH 插件约定），并先评估、REVIEW 后再持续改善。期望结果 = 一份带 file:line 与实跑读数的分级发现 + 一个经用户选批的改善序列。

**当前情况：** 第五轮审计已完成，报告 = [七维审计](../research/repo-hygiene-round5/2026-11-03-seven-dimension-audit.md)。**批次 A + E 部分 + B（授权门牌）+ C（0.7.2 重打）已落地**（R5-01/02/08/10/11/21/22/30/31/33，R5-06 培养壳；Note 见「已落地」节）。当前读数：`pnpm verify` 53 门 ALL PASS + 2 SKIP；`pnpm test` **134 spec / 1073 例（0 skipped on dev home）**；`pnpm typecheck` exit 0；`release-smoke` **44 PASS**（含卸载/重装）；`release --check` **READY 0.7.2 @ 419839e**；`client-load-smoke` ALL PASS；`ui-scene-smoke`（dev + isolated golden）9/9 页签 ALL PASS。审计基线（before）见报告。七维评分：D1 B / D2 B / D3 B- / D4 C+ / D5 B / D6 C / D7 B-。

**未决问题：** ① D1/D2/D5/D7 到 A- 的剩余 GAP（新 goal 跟踪）；② D7 的 web-only `inject`、`$DSH_HOME/company/` 自造树、品牌槽半边按「文档化偏离」保留还是改成 DSH 原生载体；③ 真模型/Desktop/npm publish 的验收授权。B/C 已落地。

**下一步：** 按新 goal 把 D1/D2/D5/D7 从 B+ 打磨到 A-（D3/D4/D6 维持 A-），每批复评；细节见报告 §5/§8。

## 已落地（批次 A，2026-11-03）

- isolated 金样档改产品同形预置（官方模板 profile + pack link + `--profile company` boot），连续两次金样一致。
- `shipped-links` / `nav-count-claims` 根迁到 `content/`，根缺失报错不真空 PASS。
- `diagnose` 非零退出匹配全文 + >400 字符守卫；`md-utf8` 跳过 gitignored 运行态。
- `workspace→content` 残留、layering 假声明、决策台账 D50/D51、deliverables-catalog Note 路径同步修正。
- cultivation-gui 探针标「已耗」并移出复跑清单（v3 后未迁移；培养点击交互由 `ui-scene-smoke --steps` 顶班）。
- `release-smoke` 补第 ⑦ 步：`plugin remove` → bundles 摘净 / 安装副本移除 / 公司状态字节不变 → 重装恢复。Note = [release-uninstall-smoke](../../notes/implemented/2026-11-03-release-uninstall-smoke.md)。
- 培养页签壳补 keyless 渲染判据（0% → 93.75% stmt）；Note = [cultivation-tab-render-spec](../../notes/implemented/2026-11-03-cultivation-tab-render-spec.md)。
- 客户端错误留痕：`/company-diagnostics` 去掉 `dataBlocked` 门；错误环镜像 `sessionStorage` 刷新可恢复；落盘失败喊一次。Note = [client-error-durability](../../notes/implemented/2026-11-03-client-error-durability.md)。
- `pnpm company` 启动输出自动 tee 到 `runtime/web-logs/company-<ts>.log`（token 脱敏）；Note = [launcher-startup-log](../../notes/implemented/2026-11-03-launcher-startup-log.md)。
- `runtime-guard` 写盘决策四种状态补直接判据（干净/坏 manifest/lease 冲突/落点不存在）；Note = [runtime-guard-spec](../../notes/implemented/2026-11-03-runtime-guard-spec.md)。
- `PanelFrame` 浮出/收回/几何存档补 happy-dom 接线判据（company-tabs 24.1% → 53.7%）；Note = [panel-frame-float-spec](../../notes/implemented/2026-11-03-panel-frame-float-spec.md)。
- 语义审活引用从 dev-loop §13 改指 `policy.md §P5`；preset 完成定义收成 skill 单一门槛（`probe --full` 降为内容质量档）。
- 背景选择面板补 keyless 判据（三组候选/搜索/点选/Escape；69.35% stmt / 61.22% branch）；Note = [context-picker-spec](../../notes/implemented/2026-11-03-context-picker-spec.md)。
- 行预算补 `README`、`_backlog/README.md`、`notes/README.md`、pack README、`publish-handoff` 五份（+5–7%）；Note = [doc-budget-owner-docs](../../notes/implemented/2026-11-03-doc-budget-owner-docs.md)。
- 929 行培养 spec 首刀：纯 lib 21 例移到 `cultivation-lib.spec.ts`，host 23 例留下；Note = [cultivation-spec-split](../../notes/implemented/2026-11-03-cultivation-spec-split.md)。
- `retired-path` 补 v3 两类退役（workspace/、独立启动器）+ 三处旧引用改指；Note = [retired-path-v3](../../notes/implemented/2026-11-03-retired-path-v3.md)。
- `panel-freshness` 的 freshness 源码断言改为真实渲染断言（AttentionTab/CompanyView/LedgerTab 各自渲染面已覆盖）。
- 台账长摘要的 7 条源码断言改为 `LedgerSummary` 真点按钮（全文/收起/aria/class；新增 `ledger-summary-interaction.spec.ts`，保留原 5 例静态渲染）
- `Brand.tsx` 补静态渲染（侧栏词标，首屏第一笔）；`debugging.md`/`dev-loop.md` 的两处空壳节引用改指 bootstrap/policy 现行家。
- 发布 readiness 指路：`AGENTS.md` 命令表加 `pnpm release --check`；`docs/release.md` 发布前清单补它；两个 readiness PASS 行划界。Note = [release-readiness-pointer](../../notes/implemented/2026-11-03-release-readiness-pointer.md)。
- B 授权单一真相源：`_backlog/AGENTS.md` 与 `_backlog/README.md` 摘要改为纯指针，不再复述/截断排除项。Note = [backlog-auth-single-source](../../notes/implemented/2026-11-03-backlog-auth-single-source.md)。
- C 发布 0.7.2：bump + `_dist` 重打 + `release --verify` 全绿（含卸载/重装）；market index/staged 同步 0.7.2；rc.5 兼容表述降为“生命周期 host 面”。Note = [release-0.7.2](../../notes/implemented/2026-11-03-release-0.7.2.md)。
- D1 第一批：checks 库存生成化（`INDEX.generated.md` + `script-index` 新鲜度门禁）；README 80→56；32/32 文档 when-to-read。Note = [d1-generated-inventory](../../notes/implemented/2026-11-03-d1-generated-inventory.md)。
- D2 批次：640 行 host spec 拆三族；根导出收窄为 apply/inject；`isRecord` 收家。Note = [d2-spec-split-exports](../../notes/implemented/2026-11-03-d2-spec-split-exports.md)。
- D5 批次：五页签体补静态渲染（company-tabs 53.7→75.92%）；台账 live 路径修正，3 例永久 skip 归零。Note = [d5-tabs-ledger-skip](../../notes/implemented/2026-11-03-d5-tabs-ledger-skip.md)。
- 台账页签 ready 路径补渲染（统计/行/成品/不可读）；删 `parseMotionLedger`/`parseCatalog` 两条源码断言。Note = [ledger-tab-ready](../../notes/implemented/2026-11-03-ledger-tab-ready.md)。；Note = [ledger-summary-behavior](../../notes/implemented/2026-11-03-ledger-summary-behavior.md)。
- `docs/index.md` 去掉「决策台账（已迁）」「外部研究材料登记（已迁）」两个墓碑节；`docs/testing.md` 直接链 `external-research.md`；`AGENTS.md` 的 §11/§13 旧节引用改指 `policy §P4/§P5`。

## 范围与排除项

- 范围：`docs/`、`checks/`、`tests/`、`probes/`、`tools/`、`packages/company-pack/{src,content,README}`、`_backlog/`、`notes/` 的卫生面；允许按批改文档/测试/门禁/反馈脚本。
- 排除：真模型认证档与 `npm publish`（成本/人工 handoff）；公司业务产物与 persona 文案质量；vendor/dsh 内部改动；重组 `tests/*`/`checks/gates`/`tools/lib`/`probes/*` 的平铺目录（D2 反证）。

## 已知与未决

- 已修：R5-01/02/03/04/05/06/07/08/09(重点)/10/11/12/17/23(首刀)/27/30/31/33；剩余 GAP 见报告 §5/§8 与新 goal。
- 已守住（不重做）：Plan Mode 首屏、台账路由、证据先行、close-out 单家、AttentionTab/守卫/host-composition 补测、真页面 9/9 与错误环捕获。
- 未验证：真模型档、Desktop 壳、`notes/` 全量两两比对、待审批/child/team failed 的 diagnose 归因。

## 方案与取舍

- **A 真实性止血**（keyless，半天）：修 isolated 档、两门禁根、分层假声明、`workspace→content` 残留、小漂移。
- **B 授权与收尾单家**（半天，需用户点头）：门牌/摘要改纯指针；§13 引用改指 `policy.md#p5`；preset 完成定义三份收成 skill 一份。
- **C 发布单一 readiness**（半天）：`verify` 发布面与 `release --check` 同判据；`release-smoke` 加 remove；compat 台账与市场索引收口。
- **D 测试层次**（2–3 天）：培养壳/`runtime-guard` 补测；929 行 spec 拆族；文本断言改行为；preset schema；skip 守卫。
- **E 反馈闭环**（1–2 天）：diagnose 未截断匹配；客户端错误落盘去门；错误环刷新留存；启动 tee；证据保留说明。
- **F 渐进披露与库存**（1–2 天）：补预算；`checks/README.md` 库存生成化；dev-loop 空壳节改重定向表；归档链接门禁扩面。

## 关闭条件

用户选定并授权批次、各批按自身验收落地（同 diff 证据 + `pnpm verify`/`pnpm test`/适用冒烟），卡顶写 `结论/去向` 与 `审查：`，再归档。仅评估完成不构成关闭——改善未落地前本卡保持活跃。
