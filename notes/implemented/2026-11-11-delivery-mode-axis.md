# 2026-11-11 · 交付模式轴：project-services + managed-service（两轴 v1）

状态：implemented（2026-11-11 落地；验证见下）

> **后续（2026-11-11 v2）**：新增 `/delivery check` 与硬件能力前置；本 Note 的“v1 不做 /delivery check”
> 已被 [delivery-check-v2 Note](2026-11-11-delivery-check-v2.md) 取代。

上游 = 用户 2026-11-11 指令（project-services 很常见，应做成 content 一等能力；managed-service 补第二个模式，
用测试资产约束；不要把公司能力硬编码进 preset）。
上游卡 = [两轴交付模式](../../_backlog/_archive/settled_issues/2026-11-11-delivery-mode-axis.md)（已结，去向 = 本 Note）。
相关 = [两产品结构审计](../../_backlog/_archive/research/two-product-structure-audit/README.md)（D-02 / E14）。

## 问题

- `project-services` 原来只是 `product-definition` skill 的一个 reference，不是 content 包；
  `business-software + project-services` 的组合无法在 meta/checker/方法里表达。
- 产品类型只驱动需求链；CFO/COO/VP-Sales 的方法在“项目制 / 产品制 / 持续服务”之间没有第二轴，
  只能把项目制方法临时挂在 hardware-software 上（D-02 的债）。
- 测试资产偏向 delivery-mode（coverage/scenario），product-type 没有对称的 coverage/scenario，
  “既然有这个，那肯定也有另一个”的直觉没有落到检查里。

## 决定

1. **两轴**：`产品类型`（造什么：hardware-software / business-software）× `交付模式`
   （怎么交付：productized / project-services / managed-service）。两轴正交，一个动议一个交付模式。
2. **content 下的交付模式包**：`content/delivery-modes/<id>/`（overview / document-map /
   delivery-rules.json / templates / glossary）。交付模式不是 `product-types` 的第三类；
   `productized` 是默认，不建包。第一个包 = `project-services`，第二个 = `managed-service`
   （持续 SLA / 值班 / 月报 / 续费）。
3. **meta 字段**：`meta.md` 增 `交付模式:`；不写 = `productized`；占位符按缺省处理；
   未知模式由 `/req check` 报错并列可用模式。
4. **方法按交付模式适用**：CFO/COO/VP-Sales 的方法契约用 `适用交付模式 = project-services|managed-service`；
   `productized` 缺产品方法时 fail-closed，不套 3-4-3 / SOW / SLA。
  - `project-economics` / `ops-feasibility` / `pricing` → project-services；
  - `managed-service-economics` / `managed-service-ops` / `managed-service-pricing` → managed-service。
5. **workflow 分派**：cfo/ops/sales 三个 workflow 都读 meta 的 `产品类型 + 交付模式`，按模式加载方法，
   缺方法 fail-closed。
6. **awareness 七触点**：content/AGENTS.md（T0）、meta 模板、CEO 组队 step 6、product-definition 两轴表、
   经营角色 persona + method contract、/req check 回执（含缺文档提醒）、交付模式包 overview。
7. **门禁与测试资产**：
   - 门禁：`delivery-mode-sources`（包形状 / meta 字段 / 手册指针），`method-contract` 扩到交付模式；
   - 测试：`delivery-modes.spec`（包形状 + requiredSections）、`delivery-mode-coverage.spec`
     （每模式三角色方法 + workflow + persona/awareness）、`delivery-mode-scenarios.spec`
     （business/hardware × 四模式 + 缺省/占位/引号/注释/未知/误写 + 文档提醒）；
   - 对称：`product-type-coverage.spec`（五件齐 + playbook + fixture + awareness）、
     `product-type-scenarios.spec`（默认链 / SyRS 可选 / 类型不支持层 / 缺层）、
     `tests/checks/two-axis-gates.test.mjs`（两个 sources 门禁的真副本 + 负例）。
8. **交付模式不进 preset 细节**：SOW/UAT/SLA 模板住 content；preset 只留“读 meta → 加载哪个方法”的指针。

## 输掉的方案

- **把 project-services 塞进 `product-types`**：会重演“企业软件项目选 business-software 还是
  project-services”的二选一，组合仍表达不了；两轴才是正交的。
- **把 managed-service 做成产品类型**：持续 SLA 是交付方式，不是工程学科；会让 hardware/business
  两个类型都要复制一份服务模板。
- **把 SaaS / 私有化 / 永久授权塞进 delivery-modes**：它们是部署/商业形态；塞进来会让 delivery-modes
  变成杂物抽屉。需要时另加 `部署形态` 轴。
- **在 preset 里硬编码 SOW/UAT/SLA 细节**：违反“能力住 content、preset 只留角色壳”的分层；换公司/换模板要改 preset。
- **v1 就做 `/delivery check`**：没有真实动议前，先做模板 + 回执提醒 + 测试；机器校验留 v2。

## 后果

- 新内容：`content/delivery-modes/{project-services,managed-service}/`；manifest T2 登记；`delivery-mode-sources` 门禁。
- 新方法：CFO/COO/VP-Sales 各一个 managed-service 方法；project 方法改成 `适用交付模式 = project-services`。
- meta / AGENTS / product-definition / CEO / 三个经营 persona / docs 指南同步两轴。
- `/req check` 回执点名交付模式；缺 SOW/UAT/SLA/Runbook 时给 `交付提醒`（warning，不判红）；
  `productized` 出现 SOW/SLA 时提醒确认模式。
- 测试资产：两轴各自的包形状 / coverage / scenario / awareness；两个 sources 门禁的负例 smoke。
- 产品类型层没有回归：E1/E2/E4 复跑仍绿；product-type 现有行为不变。

## 验证

实测 2026-11-11：

- `pnpm verify`：**ALL PASS**（含 `delivery-mode-sources`、`method-contract`、`content-manifest`、
  `doc-budget`、`generic-clean`、`content-single-home`）。
- `pnpm test`：**180 files / 1514 tests passed**。
- `pnpm typecheck`：退出 0。
- `preset-smoke`：**ALL PASS（6 角色 + 5 非角色）**，含新 `managed-service-*` skills。
- `node tests/checks/two-axis-gates.test.mjs`：**ALL PASS**（真副本 + 品类表多行 / 删 SLA 模板 / 删 meta 字段三类负例）。
- 场景矩阵：`product-type-scenarios` 7、`delivery-mode-scenarios` 15、coverage 8+8、package 7 全绿。

## 未决 / 边界

- **D-01 / D-02** 仍是设计决策：硬软能力前置检查；project-services 作为“第三类产品”已明确不做，
  它现在是交付模式；真正的产品类型扩展按 `content/product-types/` 走。
- v1 不做 `/delivery check`；`/req check` 只给 warning，不替 COO/CFO 判“缺文档即不通过”。
- **行为层未验**：`preset-smoke` 只证挂载与 skill 隔离，不证模型会按契约 fail-closed；
  真模型动线（productized 缺方法 / project-services 加载方法）未跑（需 key）。本 Note 只声称内容合同与 keyless 行为已证。
- `productized` 没有包；这是默认态，不是遗漏。若未来要产品经济/定价方法，另开方法，不要塞进 delivery-modes。
- 新加交付模式的“加法” = 包 + meta/awareness + 三角色方法 + workflow 分派 + 回执提醒 + 四个测试 + sources 门禁；
  少一件，coverage/scenario 会红。
