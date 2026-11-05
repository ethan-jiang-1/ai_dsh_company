# CMO + VP-Eng PRD：产品定义能力、需求账本与第六角色

状态：已交付（2026-11-05；pack 0.9.0）

## 决定

1. **CMO = 第六个公司角色**（`cmo`，order 6，追加在名册末尾）：市场机会 / 产品定义 / MRD；
   与 VP-Sales 的分工 = 新市场与新产品归 CMO，现有客户 / 销售 / 定价归 VP-Sales。
2. **VP-Eng = PRD 主笔**：接 CMO 的 MRD；MRD/PRD 落同一 slug 的 `drafts/mrd.md` + `drafts/prd.md`；
   `final.md` 仍只由 CEO `present`。
3. **共享能力** = `presets/_shared/skills/product-definition/`（CMO + VP-Eng 显式挂载）：
   产品定义脊柱 + 品类 playbook（**项目制/系统集成**、**硬软一体**）；新品类加 reference，不改公共字段。
4. **PRD = 需求账本**（不是文章）：JSON 头（`prd.slices[]` / `prd.requirements[]`）+ 正文；
   编号 `REQ-###` / `AC-###-#`，状态机 `draft → ready → in-dev → accepted`，DoR/DoD，
   **一 REQ 一任务**；机械校验 = `/prd check <deliverables 目录名>`。
5. **CEO 组队**：`assembling-the-team` 增产品定义动议的选人表——默认 **CMO + VP-Eng**（取证才加
   researcher），不默认叫全员；VP-Sales / COO / CFO 只在动议明确问到时进屋。
6. **编制**（保持 50 人）：CMO 线 3 人（原「市场」1 人升 CMO + 产品 2 人从 VP-Eng 移），
   VP-Sales 7→6，VP-Eng 18→16。

## 输掉的方案

- **CMO 作 VP-Sales 的扩展**：市场机会与现有客户销售的边界会混，且名册/在场板/培养面没有位置。
- **PRD 纯 Markdown 散文**：研发无法分批吃，无法一 REQ 一任务，无稳定编号可追溯。
- **PRD + 独立 `prd.requirements.yaml`**：两文件同步必漂；单文件 JSON 头 + 正文同版本。
- **YAML 头**：pack 不能加运行时依赖（`release-smoke` 硬判 `dependencies === undefined`），
  改用 **JSON 头（YAML 子集）**；模板与 `/prd check` 同源，语义不变。
- **共享 skill 放 `content/` 或每角色复制**：前者混淆手册面，后者是第二份事实；放 `presets/_shared/`，
  两个 preset 显式挂载（`_shared` 无 `agent.cordis.yml`，不是 preset）。
- **`/prd check` 只做 skill 清单 / 只做仓内 check**：前者是 guidance 不可强制，后者用户部署里没有；
  做成 host 命令，随 pack 发布。

## 后果 / 边界

- 角色接线面：`tools/lib/company-roles.mjs`、`converge-rules`、`authorship`、`deliverables`、
  `candidate-scan`、`recovery-scope`、`presence-status`、`RoleBadge` / `styles`、presets 门禁、
  测试与文档。
- `handbook-budget` 门禁改为**按声明文件枚举 preset**（`presets/_shared` 不是 preset，缺声明不崩）。
- `preset-smoke` 的 skill 隔离预期集加入**角色自己声明的共享 skill**（否则共享能力被误判泄漏）。
- 版本 **0.9.0**（新角色/能力，minor）；`market-index.staged.json` 同步；**未发布**。
- 启动次序不受影响：CMO 不改变 boot 链；构建缓存边界不变（缓存只在安装前）。

## 验证（实跑，2026-11-05）

- `pnpm verify` ALL PASS；`pnpm test` **145 files / 1140 tests**；`pnpm typecheck` 通过。
- `preset-smoke`：**6 个角色 + researcher 全部可挂载**（共享 skill 预期集按声明目录修正后）。
- 0.9.0 dev 窗口（`--rebuild` 安装 0.9.0）boot **16.9s**（含重建 + 安装）；`cdp-probe` 9 页签、
  tabFailures 0、console/exceptions 零。
- `/prd check`：单测覆盖合法一对、REQ 重号、来源不存在、AC 缺 then、状态无 changeLog、依赖环、
  slice 断链、dataBlocked、缺文件、成功回执。
- `pnpm release --verify` **全绿**（verify / test / release-smoke 0.9.0 / company-entry / client-load /
  preset-smoke / present-catalog）；`release --stamp/--check` → **READY 0.9.0**（点态；gitSha 见 `_dist/release-manifest.json`）。
- **真实产品动议实跑**（2026-11-05 20:23–20:45，约 22 分钟，真模型）：CEO 只叫 **CMO + VP-Eng**
  （VP-Sales / COO / CFO 不在屋）→ CMO 出 MRD（4 机会：go 1 / defer 1 / no-go 2）→ VP-Eng 出 PRD
  （4 slice / **13 REQ / 37 AC**）→ CMO 互审**打回 2 条** → VP-Eng 升 v2 复核通过 → `/prd check` 绿
  （4/13/37/0 错）→ CEO `present` final + mrd + prd。产物在
  `company-workspace/.dsh-company/deliverables/2026-11-05-reconciliation-product/`（workspace 数据，不进 git）。

## 2026-11-05 审查修复（系统性缺口）

对最后一次功能提交做整体审查，发现并修：

1. **`bootstrap.COMPANY_ROLES` 仍是五角色**（功能 bug）：新装/已有盘都不会种 `kb/cmo/CHARTER.md`。
   已加 cmo；release-smoke 干净资料首启件数 **36→39**（多 `kb/cmo/`、`journal/`、`CHARTER.md`）且 PASS。
2. **编制残留**：`content/charters/vp-eng.md` 与 `docs/presets.md` 仍写研发 18 人 / 含产品 2 →
   改 **16 人**（产品 2 已归 CMO 线）。
3. **用户可见面**：安装手册模板（`tools/lib/install-manual.mjs`）五角色→六角色（含排障表）。
4. **active 面五角色残留**：presets / ledger-participation 注释、channel-matrix-smoke ROLES、
   preset / replay smoke 注释、sidebar-role-mark-probe G6（含 cmo/M/六底色）、
   cultivation-method-layer probe ROLES、role-mark-fixture；converge-rules 新增
   「全员六人 / CMO 末位」用例。
5. **dev 公司盘**：`kb/org.md` 是旧形状断链（live run 的 CMO 已标【事实·未复核】）→ 替换为当前
   六条线默认；补 `kb/cmo/CHARTER.md`；`kb/vp-eng/CHARTER.md` 18→16；owners 加 CMO 行。
6. 0.9.0 重打（同版本未发布）：prepare + verify + release-smoke 全绿；实跑产物仍 13 REQ / 37 AC 且
   `/prd check` 绿（live 的 final.md 是记录，不回写）。

## 2026-11-05 第二遍审查（测试资产与漏网）

第二遍按"测试资产有没有钉住新角色/共享能力"扫（用户点名），发现并修：

1. **`tools/bundle-init.mjs` ROLES 仍是五角色**（dev 初始化不建 `kb/cmo/` 与章程）→ 加 cmo；
   新增测试断言 bundle-init 覆盖 `COMPANY_ROLE_IDS`。
2. **`tools/lib/authorship.mjs` 的 `SIG`/`RECLAIM` 正则仍五角色**（CMO 的 `出稿：cmo` 不被识别）→
   加 CMO/cmo；authorship 测试新增 cmo 署名用例。
3. **`tools/lib/candidate-scan.mjs` 的 `ASSIGN_LINE`/`MENTION`/`ENTRY_HEAD` 仍五角色**（CMO 派活/点名
   扫不到）→ 加 cmo；candidate-scan 测试新增 cmo 派活行/点名用例。
4. **测试资产缺口**：bootstrap 无 cmo 章程断言（正是第一遍功能 bug 的漏网口）、共享 skill 挂载/引用无测试、
   模板与 `/prd check` 同源无测试、CMO 显示名/徽标无测试、presets 的时钟/手册角色循环仍五角色、
   foundation-safety 的 it.each 五角色 → 全部补齐。
5. **文档残留**：README / architecture / roles-isolation / ui-demo / multi-human / cdp-probe / presets 的
   "五角色 / 五色 / C·F·O·E·S" → 六角色（设计层只改现在时陈述；R2 历史场景不改）。

验证：`pnpm test` **145 files / 1150 tests**、`pnpm typecheck`、`pnpm verify` ALL PASS；
`release --prepare/--verify` 见发布记录（0.9.0 同版本未发布重打）。

## 2026-11-05 第三遍审查（用户可见面 / 工作流 / 边界）

- **pack README 的角色清单仍是五角色**（随包用户可见）→ 六角色（CEO / VP-Eng / VP-Sales / COO / CFO / CMO）。
- **默认 CEO 章程仍写"五条线"** → 六条线（pack 默认 + dev 盘）。
- **VP-Sales 章程仍把"市场"整包揽**（与 CMO 重叠）→ 现有客户 / 销售 / 定价，新市场与新产品机会归 CMO
  （pack 默认 + dev 盘；手册与 presets 合同同 diff）。
- **VP-Eng 的 1 号工作流 `eng-workflow` 只写评审/评估、没提 PRD** → 加 PRD 分支：读 MRD → `prd-playbook`
  + 共享 `product-definition` → `drafts/prd.md` → `/prd check`；评审稿仍走 review-note。
- 测试资产：presets 新增「pack README 含 CMO + VP-Sales/CMO 章程互相指认边界」；CMO 委派工具面核实
  （tool-subagent / fork / control 都在，persona 的 subagent 声明不虚）。
- 未改：历史 notes / CHANGELOG / R2 场景的"五角色"是当时记录；dev 盘历史 journal 的五角色条目不回写。

验证：`pnpm test` **145 files / 1150 tests**、`pnpm typecheck`、`pnpm verify` ALL PASS；
`release --prepare/--verify` 全绿。

## 2026-11-05 矩阵扫描 第 1 轮（goal）

- **package.json description 与 README frontmatter 仍是 `Five-role …`**（npm 元数据 / 市场索引来源）
  → 六角色 + CMO（MRD/PRD product definition）。
- **pack README「六条 preset 行（ceo / … / researcher）」漏 cmo** → **七条**（六角色 + researcher）。
- **根 README 角色列表仍是五个**（正文已写六角色但清单漏 CMO）→ 补 CMO。
- pack README「What it contributes」缺产品定义能力 → 加 CMO MRD / VP-Eng PRD / 共享 product-definition / /prd check 一条。
- **`tools/converge.mjs` 的 ROLE_KEY 与 `--charter-backfill` 参与正则仍五角色**（CMO 的宪章补登会漏）
  → 加 CMO；新增 source-shape 测试。
- **两个 cultivation UX 探针的角色短标签映射仍五角色** → 加 CMO。
- 测试资产：package description / README 清单不再出现 Five-role 且含 CMO；converge 映射含 CMO。
- live 台账「参与列口径」扩到六角色（历史行保留 全员五人）。

验证：`pnpm test` **145 files / 1152 tests**、`pnpm typecheck`、`pnpm verify` ALL PASS；
`release --prepare/--verify` 全绿（0.9.0 同版本未发布重打）。

## 2026-11-05 矩阵扫描 第 2 轮（goal）

- **市场索引的源头 `locale/en.json` / `zh.json` 描述仍是 Five role / 五个角色**（root market-index 与
  `_dist/market` 都由它生成）→ 六角色 + CMO（含 MRD/PRD）；重生成两处索引。
- `ledger-participation` 门禁注释的「角色固定序」仍写降序且缺 CMO → 固定序补到 CMO。
- dev 盘 `kb/cmo/CHARTER.md` 是 pack 更新前的旧副本（缺模板指引/完整路径）→ 与 pack 默认同步。
- **仓库入口 `AGENTS.md` 仍写「五个角色 preset / 五个梦之队角色 / 五角色」** → 六角色。
- 测试资产：market-index 新增「locale 与 tracked index 描述不含 Five/五个角色、含 CMO、同源」；
  bootstrap 新增「既有盘缺新角色章程时补种」断言（升级形状，不只是干净首启）。

验证：`pnpm test` **145 files / 1153 tests**、`pnpm typecheck`、`pnpm verify` ALL PASS；
`release --prepare/--verify` 全绿（0.9.0 同版本未发布重打）。

## 2026-11-05 矩阵扫描 第 3 轮（goal）

- **`/prd check` 没守住 MRD→PRD 的判词边界**：来源 MR 只查「存在」，`no-go` 仍能进 PRD、`defer` 仍能进 P0
  而不红。已加机械规则（no-go 不得进 PRD；defer 不得进 P0），guide / handbook / presets 合同同步；
  新增红证（删规则 → 测试红 → 还原绿）。
- **测试反证（本轮实跑）**：bootstrap 去掉 cmo → 3 红；CMO 去共享挂载 → 1 红；locale 改回五角色 → 1 红；
  ROLE_MARK 去 cmo → 1 红；no-go 规则删 → 1 红；全部还原后绿。
- 残余扫描仅命中历史/legacy（converge-rules 的「五角色全集」历史用例、R2 场景、COO 18 人、注释）。
- live PRD 13 REQ 只接 MR-001（go）+ MR-002（defer，P2/deferred），补规则后仍绿。

验证：`pnpm test` **145 files / 1154 tests**、`pnpm typecheck`、`pnpm verify` ALL PASS；
`release --prepare/--verify` 全绿（0.9.0 同版本未发布重打）。

## 2026-11-05 矩阵扫描 第 4 轮（goal）

- **`base-clean` 门禁只扫五份章程**（CMO 章程不在检查面）且 **`templates/mrd.md` 不在 TEXT_FILES** →
  改用 `COMPANY_ROLE_IDS`（×6）+ 补 `mrd.md`；消息插值修正。反证：给 cmo 章程加历史行、给 mrd 模板加部署日期
  → **2 处红**；还原 → 绿。
- **`probe-smoke` 的 ROLES 已六角色，但 PROBES / PERSONA_MARKERS 仍五角色**（全量档跑到 cmo 会崩），
  且 VP-Eng 知识题仍期望 **18 人**、VP-Sales 身份题仍把"市场"算作其 veto → 补 cmo 的 marker/probes、
  VP-Eng 改 16、VP-Sales 边界改客户/定价；`node --check` 通过。

验证：`pnpm test` **145 files / 1154 tests**、`pnpm typecheck`、`pnpm verify` ALL PASS（base-clean ×6）。

## 2026-11-05 矩阵扫描 第 5 轮（goal）

- 发布字节逐项核对（tarball 内 package/locale/README/CMO preset/CMO 章程/mrd 模板）：全部六角色 + 共享挂载 + 模板。
- **`release-smoke` 首启必需清单漏 `kb/cmo/CHARTER.md`**，且只测干净首启/幂等二启、没测升级形状 →
  补首启清单；新增真实升级 boot：把既有盘的 `kb/cmo/CHARTER.md` 删掉 → 下次启动补种（PASS）。
- 反证/实证：release-smoke 单跑（含新升级步）**ALL PASS**；首启 39 件、roster 含 cmo。

验证：`pnpm test` 145/1154、`pnpm typecheck`、`pnpm verify` ALL PASS。

## 2026-11-05 矩阵扫描 第 6 轮（goal 收口）

- 历史边界：CHANGELOG 只在 0.9.0 feature commit 加条目；notes/archived、_backlog/_archive、R2 场景未回写。
- live 盘：org 六条线/50、CMO 章程、owners、台账口径、各角色章程一致；无断链。
- now-tense 扫描：活跃面零五角色/18 人残留（只剩历史用例与注释）。
- 反证：package description 改回 Five-role → 1 红；converge 去 CMO → 1 红；还原绿。
- 第 6 轮矩阵**零新发现** ⇒ 按 goal 判据收口；发布 READY 见 manifest 点态。

## 事实落点

`presets/cmo/`、`presets/_shared/skills/product-definition/`、`presets/vp-eng/skills/prd-playbook/`、
`presets/ceo/skills/assembling-the-team/`、`content/templates/{mrd,prd}.md`、
`src/host/prd-command.ts`、`src/lib/prd-check.ts`、`docs/guides/product-definition.md`。
