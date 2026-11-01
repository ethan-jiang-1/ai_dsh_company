# plugin-as-product：插件即产品的 profile、workspace、生命周期与数据归属

> 问题：本仓如何从“开发一个 DSH 插件”走成“一个可安装的产品”——独立启动的 `company` profile、启动时解析用户 workspace、插件内容留在插件内、生产状态与产物（run bundle）落在用户 workspace，并且安装/首启/升级/回滚/迁移/卸载/修复都能落地？
> 消费者：[插件即产品（伞卡）](../../settled_issues/2026-11-01-plugin-as-product.md)
> 产出的卡：[落地顺序](../../settled_issues/2026-11-01-landing-plan.md)、[产品生命周期](../../settled_issues/2026-11-01-product-lifecycle.md)、[workspace 与数据安全](../../settled_issues/2026-11-01-workspace-and-data-safety.md)、[发布与文档](../../settled_issues/2026-11-01-release-and-docs.md)
> 归档：2026-11-01

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-01-plugin-as-product.md](2026-11-01-plugin-as-product.md) | 主稿：FAQ 26 消化、DSH 机制核对、本仓现状、目标四空间、方案取舍、迁移与实现技术底稿（§10） | 2026-11-01 |
| [2026-11-01-product-lifecycle.md](2026-11-01-product-lifecycle.md) | 生命周期：安装/首启/日常/升级/降级/移动/备份/恢复/卸载/修复的状态机、失败模式与失败注入 | 2026-11-01 |
| [2026-11-01-trust-and-data.md](2026-11-01-trust-and-data.md) | 信任边界：模型可写面、方法/账本/身份保护、秘密/日志、不可信项目内容、保留与并发 | 2026-11-01 |
| [2026-11-01-release-and-verification.md](2026-11-01-release-and-verification.md) | 发布/文档/验证：分发形状、版本兼容、构建/包形状、手册/README/docs 真相、CI 与验证矩阵 | 2026-11-01 |

## 读法

1. 先读伞卡的「原始意图」「我们摸透了吗 / 准备透了吗」与 Q1–Q7。
2. 主稿 §0/§1/§5/§6 定形状；§10 是实现技术底稿（profile/登记/seed/manifest/handbook/导出/测试）。
3. 生命周期稿看“每一步怎么进、怎么退、失败长什么样”；信任稿看“什么能承诺、什么不能”；
   发布稿看“怎么发、怎么证明、文档怎么不撒谎”。
4. 拍板项住卡；材料只提供依据，不是决定。实现前先过伞卡 Q1–Q7。
