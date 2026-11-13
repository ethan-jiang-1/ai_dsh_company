# 2026-11-11 · 经营侧方法契约：类型适用性 + 事实载体 + 配置缺口

状态：implemented（2026-11-11 落地；验证见下）

上游 = [BUG-064](../../_backlog/_archive/fixed_bugs/BUG-064-methods-not-product-type-aware.md) ·
[BUG-065](../../_backlog/_archive/fixed_bugs/BUG-065-cfo-rate-card-missing.md) ·
[BUG-066](../../_backlog/_archive/fixed_bugs/BUG-066-coo-person-level-staffing-without-roster.md)；
证据 = [两产品结构审计](../../_backlog/_archive/research/two-product-structure-audit/README.md) E6/E7。

## 问题

产品类型只驱动 CMO/VP-Eng 的文档链；CFO/COO/VP-Sales 的方法是产品类型无关的单一套，且这套是
项目制/SI 形状。三个症状同源：

- **064**：默认类型改成 `business-software` 后，CFO 仍按 3-4-3 + 维护年费算、COO 仍按 SOW/UAT 判、
  VP-Sales 仍按项目里程碑报价。
- **065**：方法说“编制与费率基准见 org.md / CHARTER”，但费率在 org / charter / policy-lines 都
  不存在——方法引用了没有出处的事实。
- **066**：方法要求“列到人”，但 org.md 只有岗位数、owners.md 只到角色级；名册 `<待填>` 被直接
  判成“没人”。

共性 = **方法没有声明自己适用什么类型、需要什么事实；缺了也不 fail-closed，于是默认路径静默走错。**

## 决定

1. **方法契约**：CFO/COO/VP-Sales 的每个 skill 顶部声明
   `> **方法契约**：适用产品类型 = ...；需要事实 = ...；缺 = fail-closed...`。
   类型值 = `all` 或真实类型包 id；`需要事实` = `无` 或 `kb/<file>`。
2. **类型敏感方法只做项目制/SI**：`project-economics`、`ops-feasibility`、`pricing` 声明
   `hardware-software`（project-services 是未来类型，不冒充）；`business-software` 缺方法时
   fail-closed 报缺，**不套 3-4-3 / SOW / 维护年费**。三个 workflow（cfo/ops/sales）加类型分派步骤。
3. **事实载体按粒度分开**：
   - `org.md` = 岗位数 / 编制（不变）；
   - `owners.md` = 角色 → 物理人 + 授权面（不变）；
   - 新增 `content/state/roster.md` → seed `kb/roster.md` = 席位 → 谁 / 投入 / 可承接；
   - 新增 `content/company/rates.md` → seed `kb/rates.md` = 人·周成本（币种、口径、有效期）；
   - `policy-lines.md` 仍是政策数字唯一家（10% 服务信用、维护年费等），不承担费率。
4. **配置缺口 ≠ 没人 ≠ 零**：两个新载体出厂全是 `<待填>`，明确写“`<待填>` = 配置缺口”。
   COO 三态 = 有名有分配（可承接）/ 有席位未填（配置缺口，报待补名册）/ 无席位（真没人）。
   CFO 读 `<待填>` 先要费率；拿不到只用区间/上界并标【未证明成立】，不编美元数。
5. **门禁 `method-contract`**：三个经营角色的每个 skill 必须有契约块；类型 id 解析到类型包；
   `需要事实` 的 `kb/<file>` 必须在 `seed.json` 有 target；三个 workflow 必须写类型分派 + fail-closed。
   另加 presets spec 钉文案。
6. **VP-Sales 定价独立成 `pricing` skill**：项目制/SI 的 3-4-3、维护年费、双签从 charter 的散文
   搬进方法；charter 只留指针与 fail-closed 条件。

## 输掉的方案

- **现在就写全套 business-software 方法包**：没有真实 SaaS/私有化/永久授权动议，订阅、ARR、CAC、
  留存、SLO 的判据只能编；违反内容宪章「两个消费者」，也把“没有方法”伪装成“有方法”。
- **保持方法类型无关、靠模型判断**：正是 064 的失败类——默认类型换了，方法没换，且无可见信号。
- **把费率塞进 org.md / policy-lines**：org.md 的所有权是编制，policy-lines 是政策阈值；费率是
  第三类事实，塞进去会重演“复合名词混过去”（065 的根因）。
- **给 rates.md 填一套样例费率**：样例公司已经有假编制/假客户；再编费率会让 CFO 的美元结论看起来
  可信但不能追。出厂用 `<待填>` + 格式模板，填数是部署动作。
- **把席位名册塞进 owners.md**：owners 是角色 → 物理人的授权面；席位是“哪个工程师、多少 FTE”，
  粒度不同，混在一起会让授权表变成排班表。
- **把 `ops-feasibility` 整个标成 all、只在文字里提醒**：类型不适用时仍会出 SOW 结论；契约必须可机判。

## 后果

- 新文件/种子：`content/company/rates.md`、`content/state/roster.md`；`seed.json` 增两条；
  `kb-setup/guide.md` 增两行；`content/manifest.json` 登记（rates t2 / roster legacy）。
- 新门禁 `checks/gates/method-contract.mjs`；`pnpm verify` 多一道。
- 三个经营角色的 10 个 skill 全部带契约；VP-Sales 新增 `pricing` skill（目录自动发现，无需改 yml）。
- `docs/contracts/presets.md` 补“方法契约惯例”，角色 KB 的政策数字改成指针。
- CFO/COO/VP-Sales charter 改成指针 + 类型条件；CFO 的“服务类附赠 / 服务信用”整块搬进
  `policy-lines.md`（10% 有了唯一家，同时服务 068/069）。
- 旧部署 only-fill：下一次 bootstrap 会补出 `kb/rates.md` / `kb/roster.md`（目标不存在才建）；
  已有文件不覆盖。用户填数前，CFO/COO 会看到“配置缺口”，不会编数。

## 归位

- **方法**（怎么算、怎么验收、怎么定价）住 preset skill；**类型适用性**是方法的属性，写在方法契约里，
  不另造一张中央映射表。
- **事实**（编制 / 席位 / 费率 / 政策）住公司层，按粒度分文件；方法只引用，不复述数字。
- **门禁**只做机械可判的事：类型 id 解析、事实已播种、workflow 有分派；判断留给执行者。

## 验证

实测 2026-11-11；全部在本轮工作树跑过。

- `pnpm verify`：`PASS method-contract ×10（三个经营角色；类型解析 + 事实已播种 + workflow 分派）`；
  `PASS seed-integrity（17 条 seed；...）`；`PASS content-manifest（30 份；T0 1 / T1 2 / T2 23）`；
  `verify: ALL PASS`。
- 门禁反证（改真文件 → 跑 → 还原）：删 `project-economics` 的契约块 → 红（`缺 **方法契约** 块`）；
  `适用产品类型 = nope` → 红（`没有类型包`）；`需要事实 = kb/nope.md` → 红（`不在 seed.json`）；
  删 `cfo-workflow` 的 `fail-closed` → 红（`缺 fail-closed`）；还原 → PASS。
- `pnpm test`：**174 files / 1458 tests passed**（`tests/presets` 46 项，含新契约钉；bootstrap /
  kb-seeds / product-types 全绿）。
- `pnpm typecheck`：绿。
- `source run/env.sh && node checks/lanes/preset.entry.mjs`：
  `preset-smoke: ALL PASS（6 个角色 + 5 个非角色 preset 全部可挂载）`（含新 `pricing` skill）。
- E6 复跑：`business-software` 列不再是全 0——命中都在明确“不适用 / fail-closed”的句子里
  （project-economics / ops-feasibility / pricing / sales-workflow）。
- E7 复跑：`cfo-workflow` / `project-economics` 的“费率基准见 org.md/CHARTER” claim 已消失
  （`claim: (no match)`）；`ops-feasibility` 的“写不出人名 = 没人”已删除；`owners <待填>=8` 保留为
  部署状态，但 COO 现在报“配置缺口”。
- 未执行 / 未验：真模型会话是否稳定按契约 fail-closed（需 key；本轮凭 keyless + 真挂载）；
  真实部署填好 rates/roster 后的端到端经济性测算；business-software 的完整方法包（本轮明确不做）。
