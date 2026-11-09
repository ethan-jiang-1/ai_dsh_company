# 2026-11-09 · 通用/产品类型/公司三层分离：内容外置、加载分层与测试参数化

状态：implemented（2026-11-09；卡已归档；真模型 preset smoke 未跑，边界见「未验」）
上游 = [问题卡](../../_backlog/_archive/settled_issues/2026-11-09-company-specificity-externalization.md)
（研究题 = [company-specificity-externalization](../../_backlog/_archive/research/company-specificity-externalization/README.md)）

## 决定

把"这家公司是什么"从产品内容里剥出去，按**寿命**分三层 + 一条版本轴：

| 层 | 住哪 | 换什么时改 | 加载 |
|---|---|---|---|
| 机制/引擎 | `content/contracts/` | 随 DSH pin | 按能力注入 |
| 通用 | `content/generic/` + `content/AGENTS.md` | 跟产品版本 | T0 常驻 / T2 按需 |
| 产品类型 | `content/product-types/<id>/` | 换行业/产品类型 | T1 摘要 / T2 按需 / T3 技能 |
| 公司 | `content/company/` + `content/state/` | 换公司 | T0/T1/T2 |

**1. 产品类型的单位是 `productType`，不是行业。** 2B 项目制、2B SaaS、2C、游戏、工具、服务各一份
自包含包（先不做继承/组合）；`identity.md` frontmatter 的 `productType` 决定加载哪一份。
两套包已落地：`hardware-software`（五层需求链 + 领域模板）与 `b2b-saas`（路线图 → User Story → 发布）。

**2. 加载分层是硬约束，不是口号。** `content/manifest.json` 声明 T0（常驻 ≤6KB）/ T1（摘要 ≤4KB）/
T2（按需，单文件 ≤6KB）/ legacy；T0 手册从 19.6KB 降到 2.9KB，细则拆到 `generic/*.md` 按需读。

**3. 一处事实一个家。** 政策数字只在 `company/policy-lines.md`；复核声明只在 `company/review-protocol.md`
（4 份模板改为引用）；编号合同在 `product-types/hardware-software/requirements-model.md`；品牌读
`company.md` frontmatter（读不到回退出厂词标）。显示名收窄为角色名（**收窄 D14**，旧决定原文保留在
[wochen-naming](../archived/2026-09-22-wochen-naming.md)，本 Note 单侧承载指针）。

**4. 测试也是内容，按公司性质参数化。** `tests/fixtures/companies/{acme-hardware-software,beta-b2b-saas}`
两套合成公司；`loadCompanyFixture` 生成期望值；同一套 spec 换 fixture 跑。`presets.spec` 改为读
"手册面 = T0 + generic/"；`release-smoke` 改为按 manifest 校验安装副本；`templates.spec` 从"每份模板自带声明"
换向为"模板引用协议 ∧ 协议含两栏 ∧ 正文只出现一次"。

**5. 名册用一致性门防漂移。** 8 份角色清单（pack 两侧 + tools + 门禁 + smoke + client 委派键）由
`roster-consistency` 比对；`vp_cmo → cmo` 键归一。修复了两份陈旧五角色清单。

## 输掉的方案

- **A 最小去重**：只搬政策数字/编制，不动 persona 与产品链。作为第一步做了，但单独不够——领域锁死仍在。
- **C 生成器**（一份 company.yml 生成 handbook/persona/state）：引入新机制与生成物漂移面，生成器本身会成
  第三个事实源；拒绝，B 稳定后再评估。
- **单文件 roster（JSON 单一源）**：需要改 `resolveJsonModule`/构建链，风险大于收益；改为一致性门（本 Note
  的偏离项）。
- **persona 内保留需求链**：与"persona 管是谁、skills 管怎么做"冲突；改为 persona 指到 `document-map`。

## 验证（真跑的）

- `pnpm verify` → **ALL PASS**（含新增 `content-single-home` / `generic-clean` / `content-manifest` /
  `roster-consistency` / `tests-literals`，以及扩展后的 `base-clean`、`handbook-budget` T0 判据）。
- `pnpm test` → **166 files / 1319 tests passed**。
- `pnpm typecheck` → exit 0。
- `pnpm release --prepare --force` → export-dist ALL PASS；`release-smoke`（干净 profile 真安装）→
  **ALL PASS**（tarball sha256 `eaf7dade…`）。
- 门禁红→绿各一条（全部实跑，原文在卡与研究材料）：
  - `content-single-home`：把「毛利 < 30%」写回章程或代码注释 → 红；还原 → 绿（扫描面 = content + src + presets）。
  - `generic-clean`：把「梦之队」/「SyRS」写回 generic → 红；还原 → 绿。
  - `handbook-budget`：T0 面加到 13.7KB → 红；还原 2.9KB → 绿。
  - `content-manifest`：加未登记文件 / 把 6KB 文件塞进 T1 → 红；还原 → 绿。
  - `base-clean`：写回具体 `deliverables/<slug>/` 路径 → 红；还原 → 绿。
  - `templates.spec`：把声明正文复制回模板 → 红；还原 → 绿。
  - `roster-consistency`：从 company-skeleton 删 cmo → 红；还原 → 8 份一致。
  - `tests-literals`：往非 allowlist spec 写「梦之队」→ 红；还原 → 绿。
  - `presets.spec`：显示名写回公司前缀 → 红；persona 写回产品链 → 红。

## 未验 / 边界

- **真模型 preset smoke 未跑**：agent 是否真的按 T0 指针去读 T2 细则、报价前是否读 `policy-lines`，
  属模型行为，keyless 不能证。
- **时区仍写死 `Asia/Shanghai`**（9 个角色 preset 的 `time-context`）；不在本卡验收面，列为后续。
- **工作区 seed 文件名未改**（`kb/company.md` / `org.md` / `owners.md` / `process-docs.md`）：兼容既有盘，
  `company/identity.md` 等目标名尚未落地。
- **roster 不是单文件**：靠一致性门防漂移；单源存储待构建链评估。
- **client 仍有通用词**（"公司视图/公司盘"等 15 类）——不是公司名，换公司不需改；若换产品概念词需另做。

## 后果

- 换公司：只改 `company.md`（identity/productType）与 `policy-lines.md`；品牌/显示名跟随。
- 换产品类型：换 `product-types/<id>/` 包 + `check-rules.json`；`/req check` 按类型规则判定
  （b2b-saas 返回"不走五层编号体系"）。
- 新增/改名内容文件：必须同改 `content/manifest.json`，否则 `content-manifest` 红。
- 新增公司：加一套 `tests/fixtures/companies/<id>/`，同一套 spec 跑第二遍。
