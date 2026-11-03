# research/ · 归档研究题（冻结证据）

从活跃区迁入的题目录：slug 与题名页原样保留；触发条件与模型见[活跃页](../../research/README.md)。
本页是**题名索引**：一题一行；材料明细、消费者与产出的卡住在各题的题名页（`<slug>/README.md`）。

归档是冻结证据，**不是实施授权**；引用归档材料不使研究「复活」。

## 怎么读

1. 先看题名行，找到与当前卡相关的研究题；
2. 打开题名页，读「问题 / 消费者 / 产出的卡 / 材料」；
3. 再按材料表进入具体正文。

跨卡、长期仍需使用的现行参考不住这里——那类资料登记在 [`docs/index.md`](../../../docs/index.md)
与其实际 owner。

## 题名索引

| 名头 | 材料 | 历史消费者 | 产出的卡 | 归档 |
|---|---|---|---|---|
| [plugin-lifecycle-publish/](plugin-lifecycle-publish/README.md) · 插件生命周期与发布：装/起/升/卸证据与 npm/市场发布面 | 3 份 | [生命周期与发布卡](../settled_issues/2026-11-01-plugin-lifecycle-publish.md) | 同卡 | 2026-11-02 |
| [plugin-as-product-v3/](plugin-as-product-v3/README.md) · 插件即产品 v3：入口、workspace 与 run bundle 再划线 | 3 份 | [插件即产品 v3 卡](../settled_issues/2026-11-01-plugin-as-product-v3.md) | 同卡（0.6.0 落地，0.7.0 复核） | 2026-11-02 |
| [plugin-as-product/](plugin-as-product/README.md) · 插件即产品：独立 company profile / workspace run bundle / 生命周期 / 信任 / 发布 | 4 份 | [插件即产品](../settled_issues/2026-11-01-plugin-as-product.md) 等 5 张 | 产品化四卡 + 发布/文档卡 | 2026-11-01 |
| [multi-user-ux/](multi-user-ux/README.md) · 多用户全交互走查与并发能力盘点 | 1 份 | [多用户 BDD](../settled_issues/2026-10-04-multi-user-concurrency-bdd.md)、[人机合一 BDD](../settled_issues/2026-10-04-human-agent-unity-ux-bdd.md) | — | 2026-10-09 |
| [collaboration/](collaboration/README.md) · 多人协作的锁、读屏障与认领让位 | 6 份 | [协作安全验收](../settled_issues/2026-10-09-collaboration-safety-acceptance.md)、[BUG-007](../fixed_bugs/BUG-007-collaboration-probe-false-positives.md) | — | 2026-10-10 |
| [ceo-minimal-assembly/](ceo-minimal-assembly/README.md) · 组队健壮性三层防御的证据基线 | 1 份 | [组队健壮性卡](../settled_issues/2026-10-12-ceo-minimal-assembly.md) | — | 2026-10-12 |
| [agent-cultivation/](agent-cultivation/README.md) · 角色培养的对象、机制与外部实践 | 3 份 | [培养卡](../settled_issues/2026-10-13-agent-cultivation.md) | — | 2026-10-13 |
| [backlog-ux/](backlog-ux/README.md) · issue 卡质量与 DSH-native 收口 | 1 份 | [卡质量卡](../settled_issues/2026-10-19-issue-card-quality.md) 等 5 张 | — | 2026-10-21 |
| [company-panels-ux/](company-panels-ux/README.md) · 公司面面板数据量与真实数据面复核 | 2 份 | [优先级卡](../settled_issues/2026-10-19-company-panels-ux-priority.md) 等 4 张 | [BUG-025](../fixed_bugs/BUG-025-ledger-reads-wrong-data-face.md) 等 3 个 | 2026-10-21 |
| [repo-hygiene-round6/](repo-hygiene-round6/README.md) · 第六轮七维打扫：fresh agent 复评 + 层次化 + 腐化通道机械面 | 3 份 | [第六轮打扫卡](../settled_issues/2026-11-03-repo-hygiene-round6.md) | 同卡 | 2026-11-03 |
| [repo-hygiene-round5/](repo-hygiene-round5/README.md) · 第五轮七维打扫（v3 迁移与发行版收口之后） | 5 份 | [第五轮打扫卡](../settled_issues/2026-11-03-repo-hygiene-round5.md) | 同卡 | 2026-11-03 |
| [repo-hygiene/](repo-hygiene/README.md) · fresh-agent 六维打扫（四轮） | 4 份 | [卫生审计卡](../settled_issues/2026-10-20-fresh-agent-repo-hygiene.md)、[第三轮](../settled_issues/2026-10-27-repo-hygiene-round3.md)、[第四轮](../settled_issues/2026-10-28-repo-hygiene-round4.md) | — | 2026-10-21 |
| [run-bundle/](run-bundle/README.md) · run bundle 的现状、边界与迁移面 | 1 份 | [干净底座卡](../settled_issues/2026-10-24-run-bundle-clean-base.md) | — | 2026-10-24 |
| [notes-consistency/](notes-consistency/README.md) · notes/ 全树分诊与收据治理 | 3 份 | —（无卡；治理轮直接记录） | — | 2026-10-30 |

## 归档规则

- 迁入 = `git mv _backlog/research/<slug> _backlog/_archive/research/<slug>`；slug 不变，正文不重写，
  只修必要的相对链接；题名页补 `> 归档：YYYY-MM-DD`。
- 本页一题一行：名头（链题名页）｜材料｜历史消费者｜产出的卡｜归档日。逐文件清单不铺在这里。
- 材料必须住在题名目录内；题名页必须逐份点名 `.md` 材料。结构由 `pnpm verify` 的
  `backlog-liveness` 对账；它只证形状，不证证据质量。
- 历史消费者 = 委托 / 使用过这轮研究的卡、BUG 或已授权工作；产出的卡 = 研究结束后由它新立的卡。
