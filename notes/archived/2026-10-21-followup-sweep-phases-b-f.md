# 第二轮打扫卫生 Phase B5–F 落实：结构收拢尾件、测试资产、常驻层、手册重构与收口

状态：implemented（2026-10-21；用户令「预算加倍、静默自主完成所有任务、无论如何遵循流程」——P1–P4 全批授权；
前半〔P0+归档〕= [followup-sweep-p0-implementation](./2026-10-21-followup-sweep-p0-implementation.md)；
审计证据 = [followup research note](../../_backlog/_archive/research/repo-hygiene/2026-10-20-followup-six-dimension-audit.md)）

## 决定

1. **B5 结构尾件**：lib/cultivation.ts 五合一拆三聚焦模块（inbox/feedback/record）+ facade 再导出（presence.ts facade 先例），
   消费面零扰动；src/lib/deliverables-catalog.ts 改名 **deliverables-address.ts**（它只做地址构造，与 tools 侧生成器
   同名异职的 grep 噪声消除）。
2. **C 测试资产**（六项）：C1 composition「5.9s=36%」**实测证伪**（热跑 tests 1.64s、全套墙钟 9.11s、并行摊销不在
   关键路径——拆分会双 boot，判定不改）；C2 act() ×12 告警清零（连点/Escape/Enter 包 act，同一 tick 语义用同步
   act 块保持）；C3 use-company-data 生命周期 spec（6 判据：订阅开关/历史播种/50 封顶/中止/fail-loud/名册补名）；
   C4 attention/presence/budget 三面板专探针（真 web ALL PASS + tracked 夹具 + 双索引，九页签专探针全覆盖达成）；
   C5 coverage 非门禁观察档（@vitest/coverage-v8@4.1.11 配套版；include 收窄自写树；基线：src/lib 98.8%、
   tools/lib 95.4%、host 84.4%、client 68.4%〔浏览器面归探针〕）；C6 ledger-summary 探针 runtime 判据加
   metricsMs（tracked 夹具剥掉——墙钟进夹具=永久假 diff）。
3. **D 常驻层与检索**（六项）：terminology 补三行（观察窗三别名/R3 三义——R3′ 首次有词表家/成品并入交付物行，
   19→21 行）；web-rpc **47→26 行**（三命令+四规则全保，头寸 21 行）；demo/multi-human/presets 立冻结预算（现值+5%，
   无预算合同从 11 份降到 8 份）；notes/README 写**检索配方**（决策级 D 号路由 + 机制级 rg 全文 + 换词重试）；滞留
   研究稿随卡归档（company-panels-ux ×2 + backlog-ux ×1，章程义务补执行）；presets 工具表**去历史化**（harvest
   批次/日期叙述清出，表 7→5 行现在时，VP 行列实际工具）。
4. **E 手册内容重构**（此前两轮明示推迟的最重件）：**切分原则 = 成员面临的规则留在注入面，CEO 编排细则迁 CEO
   skill**——teammate 不加载 CEO skill，占位/让位首行、打回三件套、待补料纪律等跨角色规矩留在手册；
   任务板落法、派活行格式（写侧唯一家）、对账回合程序、事实收口+复算锚、补料卡、HITL 前排空迁
   chairing-staff-meeting（主持动议时加载，persona 已有加载指令）；present 顺序去重（skill 原有复制删除）；
   手册 **187→154 行、26.2KB→17.9KB**（注入面头寸 5KB→14KB——全仓最饱和的单一表面解除）。
5. **F 收口**：母卡毕业 + 研究材料随卡归档 + 本 Note。

## 输掉的方案

- **手册细则迁 CHARTER**：成员规矩若散进五份 CHARTER 会 ×5 复述且新公司骨架不带——注入面单一家的理由压过
  「更薄手册」；采「CEO 编排进 skill」路线（skill 随 pack 分发、动议时必加载）。
- **client/ 28 文件按 panels/tabs/data 分组 + CultivationBoard 拆子组件**（D2 的「可选不急」项）：import 搬迁
  大 churn、收益主要是可读性（D2 原判「收益不如缝重复大」）——**评估后缓办**，等下一次 client 大改随行；
  refactor-drift-oracle 常驻在册，届时零漂移可证。
- **composition 拆分**：实测不在关键路径（见 C1），拆=双 boot 纯亏。
- **性能回归门禁预建**：升级地图明写「触发条件即准入门」——无真实性能事故不设门；C6 的观察档 + C5 覆盖率
  已把「无法度量」补掉，门禁等触发。
- **coverage 设阈值进门禁**：先观察（升级地图同款纪律）；基线数字进本 Note 备查。
- **专用性能 lane**：同上，不预建。

## 后果

- 测试资产：78 spec / 727 tests（+12 用例）；九个公司页签**全部**有专探针或视觉夹具；coverage 与时序观察档可用。
- 常驻层：受预算文档 19 份全部有棘轮（4 份 ≥95% → 仅剩 dev-loop 95.4%/roles-isolation 95.2%，web-rpc/手册解除
  顶格）；术语三义有了词表家；notes 检索有配方。
- 手册注入面减 32%，头寸 14KB——后续规矩回流有余量。
- replay-fixture-freshness 门禁在 Phase E 提交前**第二次真实拦截**（手册变更被拦下后才重录）——注入面闭环生效。

## 已接受取舍登记（审计发现中「不修且有意」的，防重复开讼）

- **host 入口 `export *`**：package private + replay 读 built index 的既有 seam；第二个消费者出现再开 test-only
  子路径（2026-10-20 已录）。
- **archived/baseline 快照场景不修成 runnable**：历史证据是它们的用途；修/归档决策由各场景 replayEligible
  带日期理由承载（snapshots/README 政策）。
- **dev-loop §2 的 3.5–3.9 小数节号**：重编号会断大量入站 §引用锚——保留为追加式生长痕迹，等 dev-loop 下一次
  大瘦身（350/367 仍 95%）一并处理。
- **client/ 平铺与 CultivationBoard 大件**：D2 评估为低 ROI 高 churn，缓办（见输掉的方案）。

## 验证（全部实跑）

```text
# 每 Phase 独立 commit + verify/test 全绿（见 git log：bdc6d26 / 1e24026 / 575fa68 / 9e2d45e）
pnpm verify                                       # 39 门 ALL PASS（含 freshness/gate-wiring/纯文本档）
pnpm test                                         # 78 spec / 727 tests 全绿
pnpm test:coverage                                # 观察档基线（tools/lib 95.4% lines）
npx vitest run tests/client/company-data-lifecycle.spec.ts   # 6/6（C3 新增）
node probes/browser-visual/{presence,budget,attention}-panel-probe.mjs --fixture  # 三探针 ALL PASS
# Phase E 全电池：
node checks/smoke/preset-smoke.mjs                # ALL PASS 6 preset
node checks/smoke/handbook-smoke.mjs              # ALL PASS（注入与隔离根）
node checks/smoke/probe-smoke.mjs                 # ALL PASS 5/5 连通档
node checks/smoke/replay-smoke.mjs --scenario r3-delegation --record  # 第六次重录
node checks/smoke/replay-smoke.mjs --scenario r3-delegation            # ALL PASS 归一化零 diff 10s
# B5 零漂移证明：
node checks/smoke/refactor-drift-oracle.mjs --compare …               # 721=721 含测试体指纹
```

未验项：真模型内容档（probe --full）与真动议行为观察（手册重构对角色行为的影响面——下两场真实动议值得盯
占位/让位与打回三件套的执行率）；`--ui` 档重录后未复跑（金样可能陈旧，红则 `--refresh-ui`）。
