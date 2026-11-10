---
topic: 两产品结构审计
intent: 固定这轮研究的实验目录与判据；每跑完一组把结果写进证据账本，不攒到最后。
---

# 实验计划（E0–E15）

## 目标

把“产品类型切换是否真的贯穿声明、默认、播种、能力、方法”拆成可复跑的实验；证实 → 候选缺陷 → BUG 卡，证伪 → 负知识，设计选择 → 单列待拍板。

## 实验目录

| ID | 假设 | 方法 | 判据 |
|---|---|---|---|
| E0 | 仓库当前是绿的 | `pnpm verify` + 定向 `vitest` | 绿 = 问题是语义问题，不是测试已红 |
| E1 | 产品类型允许值不一致 | 扫 content、skill 表、CMO 章程、模板、CEO skill、docs 指南 | 哪些源点名 `project-services`，哪些没有 |
| E2 | `project-services` 不可执行 | 真实 `registerReqCommand` + 临时 workspace，只换 meta 类型 | 是否报“未知产品类型” |
| E3 | 默认类型与业务叙事相反 | 抽 `company.md` 默认、`org.md` 三类业务、CMO 章程“新机会” | 三处是否互相矛盾 |
| E4 | 新装 business-software 播的是硬软合同 | `bootstrapCompanyWorkspace` 到临时 workspace，读 `kb/process-docs.md` | business 与 hardware 的播种字节是否相同 |
| E5 | 硬软 playbook 的能力没有席位 | BOM/供应链/认证/EVT/DVT/PVT/DFM/OTA/FAT/SAT/MTBF/现场售后 × org/charter/skill | playbook 有、org 无的缺口清单 |
| E6 | 财务/运营方法不跟产品类型 | 搜 CFO/COO/VP-Sales skills 的 SaaS/私有化/永久授权/订阅/ARR/churn/BOM/质保/认证 | 是否只有项目制方法 |
| E7 | 流程引用了不存在的事实 | 搜 org/charter 的“费率/成本基准/人名”；跑 CFO/COO skill 的引用句 | 费率表、人名册是否存在 |
| E8 | 死指针没被门禁抓住 | 扫 `content/state/process-docs.md` 引用 + `test -e` + `pnpm verify` | 引用数、文件是否存在、verify 是否绿 |
| E9 | 门禁漏掉“部署个案”语言 | 临时 root 复制 content，跑 `base-clean`；副本里加个案句 | 门禁绿/红；正则覆盖 |
| E10 | 门禁漏掉 tier/政策线 | 真 root 跑 `content-manifest`/`content-single-home`；对照 T1 头、manifest t2、10% 上限 | 门禁绿但内容不一致 |
| E11 | `maxDepth` 文案自相矛盾 | 读 vendor `resolveChildDepth`，生成 parent depth × maxDepth 真值表 | delegation.md 的例子是否可成立 |
| E12 | 角色工具面与文案不一致 | 解析 11 个 preset 的 tool 行，生成能力矩阵 | 文案承诺 vs 实际能力 |
| E13 | 质量环“独立”被说过头 | 读 verifier preset + skill + review-protocol；搜“独立复核/异人/双人” | 是否有 bash/write；裁决谁落盘 |
| E14 | 四个动议走不通 | 硬软新品、SaaS、ERP 集成、现有客户增购各走一遍 | 卡在哪一步、错误类型 |
| E15 | 审查是不是确认偏误 | 故意证伪 3 条：org 总数 ≠ 50、worker 有 team 工具、verifier 能写 | 证伪成功/失败 |

## 执行顺序

1. **第 0–1 波**：E0–E4（最快、最能定性）；跑完先报“证实/证伪/待定”。
2. **第 2 波**：E5–E10（能力矩阵 + 单家 + 门禁临时 root）；可用 workflow 并行取证，分支只回证据。
3. **第 3 波**：E11–E14（委派语义、工具面、质量环、四个动议）。
4. **第 4 波**：E15 反证；防止只挑支持自己的证据。
5. **收口**：候选列表 + 根因分组 + 严重级；再写 BUG 卡。

## 证据纪律

- 每条结论必须有：假设、命令、原始输出（`experiments/raw/`）、观察、结论、反例场景。
- 静态扫描只能证“文本/结构”；机器行为要用真实 handler/fixture 跑；不把“读代码觉得会错”写成 bug。
- 区分“机器行为错”和“文案承诺错”：前者用 fixture，后者用 file:line。
- 临时 fixture 放 `runtime/tmp/` 或 `os.tmpdir()`；不改产品代码、不碰 `vendor/`。
- 至少保留一条“证伪成功”的记录（E15）。

## 产出

- 证据账本：`2026-11-11-evidence-ledger.md`
- 候选 → BUG：先 `C-01…`，证据齐后分配 `BUG-061+`
- 设计选择（如硬件席位、产品线 owner、组合层）单列“待拍板”，不混进 bug
