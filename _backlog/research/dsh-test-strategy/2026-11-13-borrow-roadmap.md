---
topic: 借鉴方案：把 DSH 测试策略的可迁移部分落到本仓（P0/P1/P2、验收标准与不借清单）
intent: 回答「怎么借鉴、先做什么、怎么算做到」——每项给载体、形态、验收标准、成本与风险；本轮是研究，不是落地。
---

# 落地方案：借环路，不借资产

> 前置：[digest](2026-11-13-dsh-strategy-digest.md)（DSH 怎么做）、[对账](2026-11-13-gap-audit.md)（我们差在哪）。
> 本文是**立项材料**：每项都写明载体文件与验收判据，但没有一项已经落地（改动需用户点名或已批 RFC，见 `docs/policy.md`）。

## 1. 六条取舍原则

1. **借环路，不借规模。** DSH 的价值不在 2.7 万条用例，而在"什么变更配什么证据 / 漏怎么变可见 / 证据怎么防自欺"这三件机制。
2. **机械优先于散文。** 一条规则若只写在 `docs/`，在 agent 仓里等于没有（本仓已有实证：§3.7 prove-it-red 写了半年，
   直到 `guard-red-record` 才真的挡住弱化守卫）。**能进 gate 的规则优先做成 gate；进不了 gate 的，进 skill 的完成判据。**
3. **棘轮，不跃进。** 覆盖率、lane 覆盖、失败类覆盖都从"今天的实测值"起步，只许变好；不设一步到位的数字目标。
4. **一处事实一个家（沿用本仓 D28）。** 新表不许做第二份清单：失败类表放 `tests/README.md`，资产盘子由 census **生成**，
   lane 成员从真实 runner 列表**读取**——任何"手抄一份"的设计直接否掉。
5. **每条新规则必须回答"它挡住哪一次具体的漏"。** 答不出的不进宪法；答得出的，负例留证写在规则旁边。
6. **出生即定载体（本轮最重要的元规则）。** 上一轮吸收（2026-10-04）把规则写进了散文，机器没建——见对账 §2.5。
   所以每条规则落地时必须四选一：**gate**（可机械判）/ **skill 完成判据**（语义、每次执行）/ **Note**（决定与理由）/
   **显式作废**；并在一篇 Note 里写清"**故意不做什么、什么条件下再做**"——不写这一行，五周后会被重新讨论一遍。
   注意：`notes/archived/2026-10-05-rfc-tdd-loop.md` 已否决"检查 Note 里有没有某节"的重门禁（空节即过），
   本方案不再提任何此类 gate。

## 2. 方案总览：三根支柱 + 两个支撑

| 支柱 | 治哪个缺口 | 机制一句话 |
|---|---|---|
| **P-选中**：失败类 → 层 → 证据 | D2 / D4 | 变更先归失败类，再选最低能看见它的层；缺口写进「显式未覆盖」 |
| **P-下限**：执行下限棘轮 | D3 | 每个被插桩文件有 baseline，只升不降；新文件 0% 直接红 |
| **P-必跑**：真入口证据进 required lane | D1 / D5 | 按面触发 pre-push + 每周全量 keyless；没跑过的资产最多陈旧 7 天 |
| 支撑 1：**资产出生登记与盘子** | D1 | 新资产出生时必须声明 lane 与失败类；盘子由 census 生成 |
| 支撑 2：**可靠性词表与性能显式未覆盖** | D7 | flake 有八类词表与复现阶梯；性能写明"没层"并给触发条件 |

## 3. 逐项设计

### B0 资产 census（生成物，不手写）

- **借自**：DSH 03 的"数量与复测命令只有一个家"；本仓 `checks/INDEX.generated.md` 的既有形状。
- **载体**：tools/test-census.mjs（计划） → 生成 tests/CENSUS.generated.md（计划）；`script-index` 同款门禁校验生成物与盘上一致。
- **内容**：每行 = 资产路径 / 后缀 / lane / 失败类 / 状态 / 最后修改日；尾部汇总（spec 数、用例数、冒烟数、探针数、门禁数、按 lane 分布）。
- **验收**：① 新增任一 `.mjs` 资产不重生成 → `pnpm verify` 红；② 生成物与盘上不一致 → 红；③ 读数与 `pnpm test` 的 Tests 行对得上。
- **成本**：半天；零运行时成本。
- **风险**：census 变成第二份事实源 → 它必须是**生成物**，禁止手改；数读不出来时打印"未知"而不是猜。

### B1 失败类 → 层决策表

- **借自**：DSH 05 的 12 类变更表 + 7 问；不照抄"7 问"，压成 5 问（见 B2）。
- **载体**：`tests/README.md` 新增「失败类 → 最低层 → 本仓载体」表（**与现有"改动面 → 最窄检查"并存**：路径表答"改这里跑什么"，
  失败类表答"这类失败哪层才看得见"）；`.agents/skills/close-out-definition/SKILL.md` 步骤 2 前加一步"归失败类"。
- **形态**：12 行，每行必须点名一个**本仓真实资产**（文件名），写不出来的行标"本仓无载体"——那就是缺口。
- **验收**：① 12 行每行有本仓载体或显式"无"；② 回测最近 3 个真实 commit（`a3efa236` / `9f74ce71` / `ea21dee7`），每个都能落到 1–2 行；
  ③ skill 完成判据加一条"失败类与对应层证据已点名"。
- **成本**：半天；每个变更多 1 分钟。
- **风险**：表变教条 → 明文写"同一变更常跨多行；找不到行 = 立卡改表，不许硬套"。

### B2 证据账本与「显式未覆盖」

- **借自**：DSH 05 的 PR 账本五列 + "显式未覆盖是账本里最重要的一行"。
- **载体**：本仓没有 PR，最近的等价物是 **Note 的验证表 + 六行回执**。所以账本落两处：
  `close-out-definition` 步骤 2（四链证据）要求每条证据带「层 / 失败类 / 负控」三列；
  `agent-note-definition` 的验证表用同一三列 + 一节 `## 未覆盖`（哪一类、为什么现在不做、什么条件下补）。
- **验收**：拿一个已完成的变更回填，五问能全答（会红吗 / 真入口吗 / 验世界吗 / 在最低层吗 / 未覆盖写了吗）；
  答不出的允许写"未覆盖"，不允许留空。
- **成本**：每变更 +2 分钟。
- **风险**：变仪式 → 出口是"写未覆盖"，不是"编一条证据"。

### B3 执行下限棘轮（coverage baseline）

- **借自**：DSH 的 per-file 门槛（借**机制**：未覆盖行 = 待处理项；不借数字 100%）。
- **载体**：tools/lib/coverage-baseline.mjs（计划）（纯逻辑）+ checks/audit/coverage-ratchet.mjs（计划）（跑 coverage、比 baseline、`--update` 只在变好时写）；
  baseline 住 tests/support/coverage-baseline.json（计划）（committed，生成物）。
- **形态**：规则三条——① 任一文件不得低于 baseline；② 新出现的插桩文件 ≥80% statements / 70% branches，否则显式豁免
  （豁免项写 `owner` + `移除条件`，与 DSH "无移除条件的豁免 = 隐性空洞"对齐）；③ baseline 只升不降。
- **强制点（实测后修正）**：`pnpm test:coverage` 实测 **24s**、`pnpm test` 29s（同一暖工作树，插桩几乎不额外花钱）。
  所以 **pre-push 把 `pnpm test` 换成 `pnpm test:coverage`**（后者包含前者），棘轮门在 pre-push 里跑：
  "新文件 0%"当场红，不必等一周。另在 `release --verify` 与 `fresh-clone.yml` 的 macOS job 各跑一次作为双保险。
- **验收（负例三条）**：① 把某文件改到低于 baseline → 红；恢复 → 绿；② 新加一个 0% 的 `src` 文件 → 红；
  ③ baseline 手改低 → 红（只升不降）。
- **成本**：一个门 + 一次 baseline 生成；pre-push 不增加命令（`test` 换成 `test:coverage`），每周 CI 与发布 `--verify` 是双保险。
- **风险**：baseline 把坏值冻结 → 配"只升不降"+ 每季度用 census 复核 top-10 低覆盖文件；
  当前 3 个 0% 的 `tools/lib` 文件（`carrier-registry` / `diagnosis` / `probe-window`）必须先处置：补测、删、或带移除条件豁免。

### B4 按面触发的 pre-push（surface-gated lane）

- **借自**：DSH "match evidence to the surface" + **`scripts/change-scope.ts`**（versioned JSON 报 committed/staged/unstaged/untracked 四组路径；绝不猜 base、绝不 fetch、base 合并后重跑重判）+
  "没有普适本地基线"的反面——**我们 CI 只有结构门，所以 pre-push 必须更厚**。
- **载体**：checks/pre-push-surfaces.mjs（计划） + 规则表（与 `tests/README.md` 的路径表同一个家，不另抄）；`.githooks/pre-push` 调用它。
- **形态**：先落一份**变更范围报告**（照 `change-scope` 的合同：显式 base、四组路径、merge base 可复现），再匹配规则 → 跑对应 smoke；
  没匹配到任何规则 → 打印一行"本次未触发面级检查（规则表见 tests/README）"，不静默。
- **首批规则**：`src/client/**` → `client-load-smoke`（~25s）；`presets/**` → `preset-smoke`（~30s）；
  `content/**` → `replay-smoke`（~2s）；`src/host/run-bundle/**` → `company-root-process-smoke`（已在 fast）；`tools/release*` → `release --check`（秒级）。
- **验收**：① 改一个 client 文件直接 push → hook 拒绝并打印"因为改了 X，要求跑 Y"；② 只改文档 → 不触发且打印"未触发"；
  ③ `--no-verify` 仍可用，但收尾 Note 必须写原因（沿用现有逃生门规矩）。
- **成本**：只在对应面变化时 +2~30s；规则表维护成本一次性。
- **风险**：规则漏面 → 每次新增目录时由 `layout-block`/census 提醒补规则；每季度用 census 复核"哪些资产从未被任何 lane 触发"。

### B5 每周全量 keyless lane（环外资产的新鲜度回路）

- **借自**：DSH 的"必需 job 之外的东西也要可见"；本仓围栏研究已经指出真正的洞是"环外没有新鲜度回路"。
- **载体**：checks/smoke/all-keyless.mjs（计划）（读 manifest）+ `fresh-clone.yml` 新 job（每周）。
- **形态**：manifest 列全部 33 个冒烟并标 `keyless|with-key`；job 只跑 keyless，跑完打印 `PASS n / FAIL n / SKIP n`；
  69 个探针不进本 lane（多为真模型/浏览器，成本高），但必须出现在 census 里，由它报"多久没跑过"。
  **skip 数与 manifest 不符 = 红**（防止某条被静默移出）；with-key 的不进 job，但必须在 manifest 里（不许消失）。
- **验收**：① 故意让一条 keyless smoke 失败 → 周 job 红；② 新增一条 smoke 不登记 manifest → `verify` 红（与 B0/B8 联动）；
  ③ 跑一次记下"最长的失败潜伏时间"作为基线。
- **成本**：每周一次 CI，估 5–10 分钟。
- **风险**：真模型 smoke 被误放进 keyless → manifest 分类是硬字段，跑之前先校验。

### B6 把「组装转录」与「角色质量」拆成两个命题

- **借自**：DSH 的快照层定义（组装转录是唯一证据形态）+ 它对边界的诚实声明（"快照不向模型发请求 → 不证明模型遵守 persona"）。
- **诊断**：本仓现在把两者混在 `product-team-e2e-smoke` 一类真模型冒烟里——贵、不可回放、不可 CI，于是"行为判据面"实际是空的。
- **建议形态**：① **组装正确性**（keyless、可回放、可进 required lane）：用 DSH 的回放插件（vendor 的 `llm-replay`）+ 合成 workspace 跑公司 pack，
  断言模型可见工具清单、手册注入面、catalog/账本写入、UI 金样——**只断言形状与存在，不断言文案**；
  请求面用 DSH 的 **RecordingAdapter** 手法（子类化真 adapter、记录 `GenerateOptions` 再按脚本吐 chunk），
  这样"模型请求长什么样"本身就是离线证据，不必等真模型；
  ② **角色质量**（with-key、抽样、归档）：保留现有真模型冒烟 + `entry-probe` 式的答卷归档，按阶段跑，不进 required。
- **验收**：① 一个 `replay` 场景能在 CI 里跑并且断言到"工具清单 + 注入面 + 账本"三件事；② `docs/testing.md §1` 的"组装转录"行不再混写"角色质量"。
- **成本**：一个场景 + 一条 lane；建议先立 RFC（涉及合同 §2 的"场景同 diff 必带"条款改口径）。
- **风险**：场景维护成本 → 用"形状断言"压低；世界树用独立 authored fixture，不拿录制当期望。

### B7 可靠性词表与性能显式未覆盖

- **借自**：DSH 08 的八类 flake 词表 + 五级复现阶梯；不借它的自托管 runner 编排。
- **载体**：`docs/testing.md §3.4` 扩三行（八类词表压缩 + 五级阶梯的一句话 + "一次绿的重跑不证明是基础设施问题"）；
  §5「已知未覆盖面」加一行性能：**本仓无性能层**，触发条件 = "出现用户可感的慢 / 升 pin 改渲染路径"。
- **验收**：真实 flake 出现时能归到一类；没有 flake 时表格存在即可。负例不做（没有可造的真实 flake）。
- **成本**：半小时。
- **风险**：`docs/testing.md` 现 **70/75** 行（doc-budget 顶格附近），只够 5 行；超出先把内容迁去 `tests/README.md`（该文件不在行预算内），不许先提额。

### B8 资产出生登记（lane + 失败类进头注）

- **借自**：DSH 的 M1 "空间完备"——新造后缀必须同时改配置，否则不会被任何 lane 选中。
- **载体**：扩展 `script-triggers` 门禁（现只查"何时跑"在场）+ 头注模板。
- **形态**：每个 `.mjs` 资产头注新增两行：`// 失败类：<封闭集之一>`、`// lane：fast|surface|weekly|manual`。
  门禁校验：封闭集合法；`lane: fast` 必须在 `fast.mjs` 的 CASES 里；`surface` 必须在 B4 规则表里；
  `weekly` 必须在 B5 manifest 里；`manual` 必须同时有 `何时跑` 与 `owner`。
- **验收（负例三条）**：① 新资产不写 lane → 红；② 写 `lane: fast` 但不在 `fast.mjs` → 红；③ `lane: manual` 无 owner → 红。
- **成本**：门禁半天 + **一次性回填 102 个资产**（脚本补 lane，人工补失败类）。
- **风险**：回填是大扫除，容易做成"填了就行" → 失败类只许从封闭集选；选不出的先记 `未分类`，由 B0 census 报数，
  每轮减少。**建议先立规则、只对新生效**（`生效日 ≥` 本政策落地日），存量按 census 报数逐轮收敛。

## 4. 顺序、依赖与成本

| 序 | 项 | 依赖 | 成本 | 治的缺口 |
|---|---|---|---|---|
| P0-1 | **B0 census** | 无 | 半天 | D1 可见性；成为其余项的度量底座 |
| P0-2 | **B5 每周 keyless lane** | B0 的清单 | 1 天 + 周 CI | D1（"从不跑"→"最多旧 7 天"） |
| P0-3 | **B4 按面 pre-push** | 现有路径表 | 1 天 | D5（真入口证据进 required lane） |
| P0-4 | **B1 + B2 决策表与账本** | 无（文档/skill） | 1 天 | D2 / D4 |
| P0-5 | **B3 覆盖率棘轮** | B0（插桩文件清单） | 1.5 天（含 3 个 0% 文件处置） | D3 |
| P1-1 | **B8 出生登记**（仅新生效） | B0/B4/B5 的 lane 清单 | 1 天 | D1（防新债） |
| P1-2 | **B6 组装/质量拆分**（先 RFC） | B4/B5 有 lane 可挂 | RFC + 2–3 天 | D6 |
| P1-3 | **B7 词表 + perf 未覆盖** | 无 | 半小时 | D7 |
| P2-1 | B8 存量回填（102 资产） | B8 | 1–2 天（分批） | D1 存量 |
| P2-2 | 资产淘汰程序（久未跑/重复 → 删） | B0 + B5 的数据 | 半天 | 资产只增不减的病 |
| P2-3 | 平台/Node 矩阵扩面 | fresh-clone 稳定 | 待评估 | 平台差异 |

**P0 合计 ≈ 5 个工作日**，且**全部可逆**（都是新增门/文档，不动产品行为）。
如果只做一件：做 **P0-2**（每周 keyless lane）——它立刻把"资产存在但从不跑"这一类变成可见。

## 5. 成本实测（决定"放哪层"）

| 命令 | 实测 | 结论 |
|---|---|---|
| `pnpm test` | 242 文件 / 1997 用例 / 29.01s（wall 30.75s） | pre-push 可承受 |
| `pnpm verify` | 8.3s（pre-push 头注记的冷分项） | 结构门可承受 |
| pre-push 全链（冷） | ~44s | 再加 25–30s 的面级 smoke ≈ 74s，仍在 1.5 分钟内 |
| `pnpm test:coverage` | **24s**（与 `pnpm test` 同量级，插桩几乎不额外花钱） | **可替换 pre-push 的 `pnpm test`**；回归门与执行下限合成一条命令 |
| `client-load-smoke` | ~25s | 只在 `src/client/**` 变化时跑 |
| `preset-smoke` | ~30s | 只在 `presets/**` 变化时跑 |
| `replay-smoke` | ~2s | 可进 fast（现在没进，因为技能目录漂移的 flake；先修 flake 再进） |

## 6. 立案建议（三张 P0 卡）

| 建议卡 | 覆盖 | 验收落点 |
|---|---|---|
| **资产出生登记与盘子**（B0 + B8 新生效） | 让"新增一条资产"必须选 lane 与失败类；盘子由生成物提供 | tests/CENSUS.generated.md（计划） 生成 + `script-triggers` 扩展的负例三条 |
| **环外资产的必跑回路**（B4 + B5） | 面级 pre-push + 每周全量 keyless；skip 数对不上 = 红 | 两条负例：改 client 不跑 smoke 被拒；一条 smoke 失败周 job 红 |
| **执行下限与决策账本**（B3 + B1 + B2） | baseline 只升不降；失败类表；账本三列 + 显式未覆盖 | 覆盖率三条负例 + 三个历史 commit 回测能落行 |

**不建议现在立的**：B6（先写 RFC，动的是 `docs/testing.md §2` 的口径）；P2 的淘汰程序（没有 B0/B5 的数据前立卡只会空转）。

## 7. 度量：怎么知道在变好（而不是在变忙）

| 指标 | 今天 | 目标 | 数据来源 |
|---|---|---|---|
| 环外资产最长陈旧天数 | **未知**（没有任何记录） | ≤ 7 | B5 的每周运行记录 |
| 有执行下限的插桩文件 | 10 / 188（5.3%） | 100%（含显式豁免） | B3 baseline |
| 被 required lane 覆盖的失败类 | **未按失败类记账**（路径表覆盖了若干类，但没有 12 类映射） | 12 / 12（分批） | B4 规则表 + B1 表 |
| 测试类 commit 里「机制型」占比 | 最近 6 个测试类 commit：**3 个带机制**（`smoke:fast` lane / 边界矩阵 + 载体门），3 个是症状修复（发布验收、腐化指针、单 bug） | 症状修复占比持续下降 | git log 人工分类，每季度一次 |
| 同类缺陷二次出现 | 未统计 | 0（复发即新卡引用旧卡） | `_backlog/_archive/fixed_bugs` |

**判据不是"测试变多"**：如果一年后用例数翻倍但上表五项没动，说明我们又白忙了一轮。

## 8. 借鉴时最容易抄坏的四处（反模式）

1. **把 per-file 100% 当 KPI** → 逼出"为覆盖率写测试"，正是 DSH 警告的反面（它要的是删死代码）。本仓只借棘轮与"新文件不许 0%"。
2. **把账本做成表格仪式** → 每条变更都填五行，但没有人读。账本的出口必须是"显式未覆盖"，否则它会退化成免责声明。
3. **把 lane 抄成静态清单** → 手抄一份"哪些 smoke 属于哪条 lane"，第二周就漂。lane 必须从真实 runner 列表读，census 只是视图。
4. **把回放当角色质量证据** → 回放证明"组装没变"，不证明"模型照做了"。两个命题必须两个资产，混在一起会得到"看起来测了"的空证据。

## 9. 本轮是什么、不是什么

- **是**：一份研究结论 + 一份可开卡的落地方案（含验收标准、成本、顺序、不借清单）。
- **不是**：落地。本文件没有改动任何产品行为、门禁或合同；P0 任一项开工都需要用户点名或已批 RFC。

## 10. 附录：本仓 12 类失败映射草案（B1 的第一步）

失败类取自 DSH 05 的 12 行分类；「最低能看见的层」与「本仓载体」按现有资产填；
「最近事故」列只作抽样参照（`_backlog/_archive/fixed_bugs` 150 张卡，**不是全量编码审计**）。

| # | 失败类 | 最低能看见的层 | 本仓载体 | 最近事故（抽样） | 判定 |
|---|---|---|---|---|---|
| 1 | 纯逻辑 / 编解码 / 数据变换 | unit | `tests/lib`、`tests/harness/tools` | workflow schema enum / 结果截断丢数据 | 有 |
| 2 | 服务 / 注册表 / 贡献生命周期 | unit + dispose | `tests/host`、`tests/client`（部分 dispose） | cultivation 行失败后丢动作 | 部分（host 侧 registry dispose 未点名） |
| 3 | 导出形态 / 包入口 | 静态门 + 导出守卫 | [pack-exports](../../../tests/harness/repo/pack-exports.spec.ts) + pack-shape | — | 有 |
| 4 | 工具定义（schema / args / result） | unit（真 `tools.execute`）+ 组装 | `signoff-tool` 等行为 spec | ask-user 无脚本化应答路径 | 部分（无录制钉 schema） |
| 5 | 模型可见文本（prompt / 描述 / 诊断） | **组装转录** | 只有真模型冒烟（抽样） | CEO 词汇漂移 / 未验证猜测入指令 | **缺**（D6） |
| 6 | 会话 / 持久化 / 迁移 | unit + 世界断言 | ledger / presented / run-bundle specs | converge 崩溃留 journal / 重录不可回放 | 有 |
| 7 | provider / adapter / 模型路由 | unit + with-key e2e | **本仓无 provider 插件** | — | 不适用 |
| 8 | 子进程 / 沙箱 / 并发写 | 真进程 + 独立 home | `company-root-process-smoke` / two-homes / cross-process 探针 | 状态根 / 写 gate 批次 | 有资产，**不在 required lane** |
| 9 | client UI / 浏览器 / 布局 | 组件 spec + 真页面 | `tests/client` 62 + `ui-scene-smoke` | 浮动操作死链 / 假依赖徽标 | 有资产，真交互**不在 required lane** |
| 10 | 配置 / profile / 组合 | 静态门 + 真挂载 | `preset-smoke` / `client-load-smoke` + manifest specs | charter 回填假跳过 | 有资产，真挂载**不在 required lane** |
| 11 | 性能敏感路径 | benchmark | **无** | — | **缺**（D7） |
| 12 | 文档 / 生成物 / 指针 | 静态门 | md-links / bare-path / doc-budget / dist-freshness | 三处腐化指针 / 已提交 web token | 有（本仓最强的一类） |

**读法**：12 类里 6 类有载体（1/3/6/12 完整，2/4 部分），3 类"有资产但不在 required lane"（8/9/10），
2 类缺（5/11），1 类不适用（7）。**缺口最集中的不是"没有资产"，而是"资产没有位置"**——
这与 D5 的结论一致，也是 P0 先做 B4/B5 而不是先补测试的理由。
