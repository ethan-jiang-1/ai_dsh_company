---
topic: company-specificity-externalization
intent: 二轮覆盖审计——确认 content/presets 是否逐文件覆盖、补上一轮漏项，并明确辅助面（client/tools/checks/tests/docs）的覆盖边界与新增设计输入
---

# 二轮覆盖审计：content 25 / presets 30 / 辅助面

> 二轮不是重做分类，而是回答"一轮漏了什么"。证据边界：content 25 份一轮全读、二轮重点复核；presets 30 份
> 二轮 **30/30 逐行**；辅助面 client 42 份 grep 全覆盖 + 重点文件通读，tools/checks/tests/docs 只到
> grep 命中行（清单在 §6）。真实会话 token 与真模型行为仍未测。

## 1. 覆盖矩阵

### 1.1 content（25 份，一轮全读，二轮复核）

| 文件 | 行 | 二轮再做 | 主判定 |
|---|---|---|---|
| AGENTS.md | 162 | 全文（一轮已读） | 通用 + 公司 + 领域混装 |
| README.md | 14 | 全文 | 机制说明（含一处夸大，已由 d 改准） |
| contracts/workflow.md | 36 | 全文 | **机制/引擎事实（随 DSH pin）** |
| charters/ceo.md | 19 | 全文（ceo/cfo/coo） | 角色边界 + 公司政策 + 领域流程 + 经验 |
| charters/cfo.md | 26 | 全文 | 同上；30%/9折/$500/3-4-3 |
| charters/coo.md | 24 | 全文 | 同上；SOW/UAT/18 人/8 个并行 |
| charters/cmo.md | 22 | 一轮全读（二轮仅复核） | 领域（产品战略）+ 公司（客户画像） |
| charters/vp-eng.md | 18 | 一轮全读 | 公司（16 人）+ 通用（三问） |
| charters/vp-sales.md | 22 | 一轮全读 | 公司（客户/定价/9 折） |
| state/company.md | 9 | 全文 | 公司身份（部署配置） |
| state/org.md | 77 | 全文 | 公司编制 + 政策 + 业务构成 |
| state/owners.md | 26 | 一轮全读 | 公司（人侧归属） |
| state/motion-ledger.md | 10 | 一轮全读 | 通用（台账纪律） |
| state/process-docs.md | 92 | 全文（一轮） | 领域（五层链 + 编号合同） |
| templates/irs.md | 33 | 全文 | 领域（接口 + firmware/electronics） |
| templates/syrs.md | 31 | 全文 | 领域（shall/检验/第三方实验室） |
| templates/allocation.md | 18 | 全文 | 领域（子系统/采购件） |
| templates/mrd.md | 73 | 头 + 一轮全读 | 半通用（机会账本）+ 领域（productType） |
| templates/prd.md | 96 | 一轮全读（二轮仅抽样） | 半通用 + 领域（REQ/AC/slice） |
| templates/strs.md | 30 | 一轮全读 | 半通用 + 领域（REQ 追溯） |
| templates/meta.md | 28 | 全文 | 公司流程 + 领域（编号体系标记） |
| templates/decision-memo.md | 37 | 全文 | 通用结构 + 公司流程（AI 声明/具名复核） |
| templates/review-note.md | 34 | 全文 | 同上 + 领域（SOW/UAT） |
| templates/ops-review-note.md | 52 | 全文 | 同上 + 公司（预算基准） |
| templates/weekly-report.md | 41 | 全文 | 通用 + 公司（重复劳动口径） |

### 1.2 presets（30 份，二轮 30/30 逐行）

| 文件 | 行 | persona 规模 | 公司名 | 内联的特殊内容 | 部署事实 |
|---|---|---|---|---|---|
| ceo/agent.cordis.yml | 239 | 13 行 / 1,848 字 | name 带 | 五汇报线、产物 owner 名单、通道、present 格式 | Asia/Shanghai；maxDepth 1 |
| cfo/agent.cordis.yml | 210 | 8 / 832 | name 带 | veto 与"毛利底线"（数值在 skill） | Asia/Shanghai；maxDepth 2 |
| cmo/agent.cordis.yml | 214 | 8 / 1,021 | name 带 | MRD+StRS 路径、事实/假设标注 | Asia/Shanghai；maxDepth 2 |
| coo/agent.cordis.yml | 211 | 9 / 871 | name 带 | SOW/UAT/RACI、"事实问答不起团队" | Asia/Shanghai；maxDepth 2 |
| vp-eng/agent.cordis.yml | 243 | 8 / 1,448 | name 带 | MRD→StRS→PRD 链、五档通道（两处） | Asia/Shanghai；maxDepth 3；workflow |
| vp-sales/agent.cordis.yml | 214 | 8 / 817 | name 带 | MEDDIC + 客户/竞品引用 | Asia/Shanghai；maxDepth 2 |
| worker/agent.cordis.yml | 67 | 4 / 196 | name 带 | 无（明说不是公司角色、不读手册） | 无 time-context/schedule；5 工具 |
| worker-researcher/agent.cordis.yml | 55 | 7 / 375 | name 带 | 无；只给 company.md 指针 | 无 bash；只读工具面 |
| worker-orchestrator/agent.cordis.yml | 68 | 6 / 225 | name 带 | 无（不是公司角色） | 无 time-context |

19 个 SKILL + 2 个 references：一轮已逐文件读；二轮复核结论——
- `delegation-policy` 仍是唯一零公司事实的对照组；
- `product-definition` 只有 `project-services` 与 `hardware-software` 两个 playbook，无 b2b-saas/2C/游戏/工具；
- `prd-playbook:14` 的"品类二选一"把产品类型封闭成两种；
- `chairing-staff-meeting` 的派活行/对账回合与手册重复（两处维护）。

### 1.3 辅助面

| 面 | 覆盖 | 结论 |
|---|---|---|
| `src/client/**`（42 份） | grep 全覆盖 + 7 个重点文件通读 | 公司/领域文案 15 类；显示名三份事实；「五角色」既存漂移 |
| `locale/{zh,en}.json` | 逐行 | 只有 meta.title/description；UI 文案不进 locale（两套字符串面） |
| `package.json` / `README.md` / `cordis.patch.yml` | 逐行 | 九条 preset 三处枚举；`maxMembers: 8` 是政策数字 |
| `tools/**` | 仅 `company-roles.mjs` 及其消费者 | 六 id 独立名册，漏改不红但错判 |
| `checks/**`、`tests/**` | 仅 grep 命中行 | 8+ 条断言把公司事实当不变量（清单见一案 §7.4） |
| `docs/**` | 仅命中段 | 11 处三层改造后会过期（清单见 §5） |

## 2. 上轮漏项（本轮新增，均有一手行号）

1. **`content/contracts/workflow.md` 整份漏扫**：它是 workflow 引擎事实，随 DSH pin 更新，由
   `src/host/prompt/contracts.ts` 按**能力探测**（agent 是否真有 workflow 工具）注入——不是按 preset 白名单。
   这是 T0"按需注入"的现成范式：需要的能力才进上下文。
2. **`org.md:73` 引用具体部署的交付物**（`.dsh-company/deliverables/agent-workflow/final.md`）——pack 内容带
   部署指针，换一家公司即死链。
3. **`org.md` 自称"唯一事实家、禁止另写总数"，但 4 份 charter 各写条线人数**：ceo:5（50 人）、cfo:5（4 人）、
   coo:5（18 人）、vp-eng:5（16 人）——自家规则自破。
4. **"AI 使用声明 + 复核独立性层级 + 缺声明不得进 SOW/UAT"在 4 个模板里逐字复制**（decision-memo、review-note、
   ops-review-note、weekly-report，各约 500B）：一份公司流程四个副本。
5. **模板混层**：通用结构 + 公司流程（具名复核、AI 声明、重复劳动口径）+ 领域假设（SOW/UAT/RACI、采购件、
   firmware/electronics、第三方实验室/客户现场）。一轮只把模板当"领域示例"，低估了公司流程占比。
6. **persona 是第二混合载体**：公司角色 0.8–1.9KB/人（vp-eng 1,448 字），内联 MRD/StRS/PRD/REQ/AC/slice
   与通道五档；persona 自称"本 preset 不复述公司事实"，却复述流程。
7. **注入基线（实测字节）**：ceo ≈23.8KB、vp-eng ≈24.9KB、cfo ≈21.4KB、cmo ≈21.7KB、coo ≈21.5KB、
   vp-sales ≈21.3KB；worker 0.5–1.0KB（不注入手册）。T0+T1 目标 ≤10KB 是 2.4× 的削减，不是微调。
8. **client 文案 15 类**（页签 tooltip、空态、错误、培养面板、delegation 卡、成员标签…），其中
   `CultivationBoard.tsx:90`「五角色」在六角色后仍是用户可见文案；`RoleBadge` 的 `ROLE_SHORT`/`ROLE_MARK`
   是显示名的第 2、3 份事实；「成员 X（CEO 团队）」在 `cultivation-actions.ts:100` 与
   `cultivation-context-data.ts:285` 各写一遍。
9. **tools 侧独立名册**：`tools/lib/company-roles.mjs:10`（另 `:18`） 与 pack 的 `PRESET_KEYS` 是两份；漏改**不红但错判**
   （署名/journal/参与统计静默归零），比红更危险。
10. **既有漂移**（不是改造才产生）：`CultivationBoard.tsx:90` 与 `cordis.patch.yml:40` 仍写"五角色"；
    `rehearsal.mjs:10`、`company-skeleton.mjs:13` 的清单仍无 cmo。
11. **测试把公司事实当不变量**：`presets.spec.ts:180`（前缀必须"梦之队 "）、`:81`（禁止出现公司名——换公司名后
    该断言永远绿=漏检）、`:77`（只抓旧样本事实）、`brand.spec.ts:13`、`signoff.spec.ts:15` 等 8+ 处。
12. **九条 preset 三处枚举**：`package.json:143-156`、`README.md:27`、`tools/lib/company-roles.mjs:10`（另 `:18`）。
13. **`cordis.patch.yml:77` 的 `maxMembers: 8`** 是编制政策数字，与 `org.md` 的"并行 8 个"语义不同但同值，
    改编制时容易只改一处。

## 3. 分类修正：三层之外加一条"版本轴"

二轮确认还差一类：**机制/引擎事实**——随 DSH pin 变，不随公司/产品类型变。

| 类 | 例子 | 寿命 |
|---|---|---|
| 机制/引擎 | 写盘守卫、`request_signoff` 语义、workflow 引擎合同、`web_fetch` DNS 拦截 | 随 DSH pin |
| 通用方法 | 职位骨架、协作纪律、写作/评审方法 | 随产品版本 |
| 产品类型 | 五层链、SOW/UAT、术语、模板字段 | 随 `productType` |
| 公司 | 名字、编制、部门数、政策线、人、时区 | 随部署 |
| 经验 | charter 实例、journal、台账、客户数据 | 随会话累积 |

对目录的直接影响：`content/contracts/` 保留为**独立版本层**（已按能力注入），不进 generic；它的门禁是
"随 pin 复核"，不是"零公司词"。

## 4. 仍未覆盖（明确边界）

- `checks/smoke/**`、`checks/gates/**`、`checks/audit/**` 的逐条断言（现只有 grep 命中行）；重点待读：
  `preset-smoke.mjs`、`release-smoke.mjs`、`presets.mjs`、`dev-product-parity.mjs`。
- `tools/lib/**` 除 `company-roles.mjs` 外的全部；`tests/**` 通读；`docs/**` 全量。
- 真实会话 token 开销与"摘要 + 指针"的对比（只有字节数）。
- 真模型行为：换 `productType` 后 agent 是否真按新链走（keyless 只能证结构）。
- vendor 语义细节：多段 `systemPrompt.section` 的排序/互相覆盖规则、`skills.registerProvider` 的生命周期
  （已核签名，未做运行时实验）。

## 5. 辅助面改造后的文档过期面（11 处，同 diff 要改）

`docs/presets.md` 的六角色身份表/会话形态表/工具行归属/方法层路径/显示名契约（:6,17-23,31-38,122-127,152）；
`docs/design/architecture.md` 的 presets 目录枚举/内容分层/工具行清单（:17,79,95,240）；
`docs/design/role-content-plan.md` 的角色内容落点（:5,24-25）；`docs/design/roles-isolation.md` 的六根会话与
委派钉值（:64,111）；`docs/design/ui-demo.md:80` 的 bundle patch 枚举。
