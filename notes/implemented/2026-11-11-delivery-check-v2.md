# 2026-11-11 · 交付检查 v2：`/delivery check` + 硬软能力前置

状态：implemented（2026-11-11 落地；验证见下）

上游 = [两轴交付模式 v2 卡](../../_backlog/_archive/settled_issues/2026-11-11-delivery-mode-v2.md)（已结，去向 = 本 Note）；
前置 = [交付模式轴 v1](2026-11-11-delivery-mode-axis.md)。

## 问题

v1 把 `project-services` / `managed-service` 做成 content 一等能力，但只做到：
- `/req check` 对缺 SOW/UAT/SLA/Runbook 给 warning；
- `delivery-rules.json` 是模板清单，没有逐动议检查；
- 硬软一体的能力前置（D-01）只有研究结论，没有可执行的核对表；
- `productized` 的产品经济/定价方法仍缺，默认交付模式是否该改也未定。

## 决定

1. **新增 `/delivery check <slug>`（独立命令）**：
   - 读 `meta.md` 的 `交付模式`；`productized` 无交付文档要求；
   - `project-services` / `managed-service` 按 `delivery-rules.json` 检查 `documents.file` 与
     `requiredSections`；缺文档/缺 section = error；
   - 未知模式 = error；`productized` 出现 SOW/SLA = 提醒确认模式（不判红）；
   - 不扩 `/req check`：编号检查与交付检查边界分开，回执各自清楚。
2. **D-01 能力前置做成 content 核对表**：`hardware-software/capabilities.md` 列硬件/固件/电气/机械/
   认证/供应链/试产/现场八类能力，规则 = 缺席位报缺、不进入报价/承诺；VP-Eng + COO 核对，CFO 看成本，
   CEO 决定补人/外包/缩范围。**不做机械闸门**（org 是部署事实，不能靠 pack 硬判）。
3. **productized 方法：以后做**。触发 = 真实 productized 报价/定价动议；届时按方法契约给
   CFO/COO/VP-Sales 各加产品方法，不拿项目制/SLA 方法硬套。当前 fail-closed 是正确行为。
4. **默认交付模式：保留 `productized`，不静默改默认**。`/req check` 回执点名“未声明 = 默认”；
   真实动议多了再校准默认（或要求 meta 必填）。这是产品决策，不由测试替选。
5. **术语与双身份收口**：`project-services` 只做交付模式（不是未来产品类型）；
   SaaS / 私有化 / 永久授权归“部署/商业形态”，不塞进 delivery-modes；方法适用性看交付模式，不看产品类型。

## 输掉的方案

- **扩 `/req check` 做交付检查**：编号/追溯与交付文档耦合，红/黄线难分；独立命令更清楚。
- **D-01 做机械闸门**：org/roster 是部署事实，pack 无法知道“这家公司有没有硬件工程师”；硬判会误伤。
- **现在就写 productized 全套方法**：没有真实动议，订阅/ARR/CAC/churn/SLO 判据只能编。
- **默认改成 project-services**：会把旧动议/产品售卖静默改标签；默认是公司身份，不是测试断言。

## 后果

- 新命令：`packages/company-pack/src/host/commands/delivery-command.ts`，注册在 host；
  `tests/host/commands/delivery-command.spec.ts` 9 例。
- 新内容：`content/product-types/hardware-software/capabilities.md`；manifest T2 登记；
  hardware overview / product-definition 指向；`tests/content/hardware-capabilities.spec.ts`。
- 文档：delivery-mode document-map 改“v2 有 `/delivery check`”；AGENTS / product-definition / pack README 同步。
- 旧 Note：v1 的“不做 /delivery check”被本 Note 取代，已加回链。
- 未做：逐 section 的字段语义校验（requiredFields 仍是内容合同）、真模型行为验证、productized 方法。

## 验证

- `pnpm verify` **ALL PASS**
- `pnpm test` **185 files / 1537 tests**（delivery-command 9 例 + hardware-capabilities 2 例在内）
- `pnpm typecheck` 0
- `preset-smoke` **ALL PASS**
- `gates-negative-smoke` / `two-axis-gates-smoke` **ALL PASS**

## 未决 / 边界

- `/delivery check` 只查文档与 section，不判断 section 内容质量；字段语义（requiredFields）仍由角色/COO 判断。
- productized 方法未做；默认交付模式仍是 `productized`。两条都在 v2 卡关闭时明确为“以后做/保留”。
- 行为层未验：`preset-smoke` 只证挂载；真模型是否按契约 fail-closed 未跑（需 key）。
