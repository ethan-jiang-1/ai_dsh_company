# .dsh-company/kb · 公司事实目录

> 这个目录属于当前部署，不属于插件。首启从 pack 的 `kb-setup/seed.json` 复制；之后由人和角色维护。
> 升级只补缺，不覆盖你改过的内容。缺件时按「缺件纪律」办——**不要猜**。

## 一眼看懂

| 文件 | 是什么 | 谁维护 | 缺了怎么办 |
|---|---|---|---|
| `company.md` | 公司身份 + `productType` + 时区 | 人 | 报缺；可从 seed 重建（样例标记仍在） |
| `org.md` | 编制 / 部门 / 人数 | 人 | 报缺；重建后按你的公司改 |
| `policy-lines.md` | 签字线 / 预算线 / 并行上限 | 人 | 报缺；**没有它不许报价** |
| `owners.md` | 谁对应哪个角色、能答什么 | 人 | 报缺；按角色问人 |
| `review-protocol.md` | 复核声明 / 对外件闸门 | 人 | 报缺；对外件 fail-closed |
| `roster.md` | 席位名册（席位 → 谁 / 投入 / 可承接） | 人 | 报缺；`<待填>` = 配置缺口，不判“没人” |
| `rates.md` | 人力费率卡（人·周成本） | 人 | 报缺；`<待填>` = 配置缺口，不编费率 |
| `motion-ledger.md` | 动议台账 | CEO / 操作员 | 空可继续，台账从 0 起 |
| `process-docs.md` | 编号合同的播种副本（权威在 pack 的类型包） | 人 | 报缺；以 pack 版为准 |
| `<role>/CHARTER.md` | 角色长期摘要 | 人（收敛时） | 报缺；从默认章程重建 |
| `<role>/journal/` | 当轮纪要 | 角色自己 | 空目录正常 |

## 读的顺序（角色会话）

1. `company.md` —— 我是谁、哪个 `productType`
2. `policy-lines.md` —— 钱与线（报价 / 折扣 / 预算前必读）
3. 按需：`org.md`（编制）、`roster.md`（席位）、`rates.md`（费率）、`owners.md`（人）、`review-protocol.md`（对外件）
4. 自己的 `CHARTER.md` + 最近 3 篇 `journal/`

## 缺件纪律（fail-loud）

- 缺件先报告**缺哪个 + 影响什么**；不得用包内样例冒充部署事实，不得猜数字。
- 只有标「样例」的种子可当占位；用户改过的文件永不覆盖。

## 这个目录怎么来的

`kb-setup/seed.json` 是唯一映射（source → target，只补缺）；本文件由 `kb-setup/guide.md` 复制。
装配件目录 `content/kb-setup/` 只放装配件，公司事实仍在 `company/`、`state/`、`product-types/`。
