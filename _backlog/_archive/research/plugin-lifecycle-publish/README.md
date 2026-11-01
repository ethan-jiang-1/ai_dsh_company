# 插件生命周期与发布：把 `_dist` 从仓库内 tarball 变成能经 DSH 社区市场交付的插件

> 问题：0.6.0 的 bundle 形状已经对了，为什么 `_dist` 仍不像一个能发布、能装、能升、能卸的产品？FAQ 50 的十段生命周期里，哪些是 DSH 的硬门禁、哪些只是质量线，我们分别差在哪、怎么补？
> 消费者：[生命周期与发布卡](../../settled_issues/2026-11-01-plugin-lifecycle-publish.md)（本轮的方案、取舍与验收都在那张卡里）。
> 产出的卡：[生命周期与发布卡](../../settled_issues/2026-11-01-plugin-lifecycle-publish.md)。
> 归档：2026-11-02

## 这轮研究回答什么

用户 2026-11-01 看完 `_dist` 后的判断是「还是有不少距离」；并要求不要轻而易举定调，先读透
`_faq_on_digested/26_plugin-as-product/50-lifecycle/`、做实验、把研究放 `_backlog/research/`、
方案放 `_backlog/issues/`。

本研究的结论只回答三件事：

1. **哪些是硬事实**：在真实运行时（vendor 钉住的 `0.2.1-rc.2` 与日用全局 `0.2.1-rc.5`）上，
   安装、in-app 安装、升级、卸载、版本门、显示元数据、市场索引分别实际发生了什么。
2. **距离在哪**：按 FAQ 50 的阶段表与 FAQ 24 的发布六项检查，逐项对照本仓现状，区分
   「会拒绝/会坏」「只降级」「质量线」。
3. **哪些是人的选择**：包名/许可/发布渠道/会话检索修法/更新叙事——这些不靠实验决定，必须留给人拍板。

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-01-install-apply-and-data.md](2026-11-01-install-apply-and-data.md) | 真运行时上的装/起/升/卸实验：CLI 与 in-app 两条安装路径、引擎门回滚、升级身份、卸载残留、首启幂等；含 in-app 安装失败的分层 bisect 与官方隔离组对照 | 2026-11-01 |
| [2026-11-01-publish-surface.md](2026-11-01-publish-surface.md) | 发布面事实：npm 的 private/license/author/homepage/keywords、市场 index format 1 真校验、官方目录准入、Discover 开关、外部插件无 Update、`_dist` provenance、README/手册与 FAQ 骨架的差 | 2026-11-01 |

## 证据口径

- **T**：本轮在隔离 `DSH_HOME`（repo 内 `runtime/` 下的实验区，gitignored）真跑过的命令与输出；
  运行时 = vendor built CLI `0.2.1-rc.2` 与全局 `dsh 0.2.1-rc.5`。实验只碰 repo 内路径。
- **C**：vendor 源码/README、FAQ 文本、本仓文档与脚本的静态事实。
- **R**：外部样本（FAQ 26/24 引用的社区插件）只作参照，本轮没有安装它们。
- 未做：Windows/Linux、官方 Desktop 真机、npm 真发布、市场 index 真托管、真模型会话。

## 与 v3 研究题的关系

[v3 研究题](../plugin-as-product-v3/README.md)回答的是「产品单位是什么、入口在哪、内容与 run bundle
怎么分家」；本轮不重开那些结论，只接着问「这个 bundle 怎么被交付、装上、升级、卸载，以及怎么
出现在 DSH 的市场里」。0.6.0 的 bundle 形状是本轮的前提，不是本轮要重新论证的对象。
