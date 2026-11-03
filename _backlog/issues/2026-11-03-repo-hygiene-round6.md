---
status: 推敲中
opened: 2026-11-03
---

# 推敲：第六轮七维打扫（fresh agent 复评与层次化）

> 立卡：2026-11-03 ｜ 状态：推敲中 ｜ 类型：未定 ｜ 毕业：未定 ｜ 可关闭：否
>
> **结论/去向**：（关闭时写：结论 + `去向` 封闭值 — 落点；状态行只做镜像）

**问题与期望结果：** 用户要求再以 fresh agent 视角评七个维度（①文档/代码结构与渐进披露、②代码与测试层次、③文档—执行—验收结构、④上下文腐化、⑤测试资产、⑥反馈通路、⑦DSH 插件约定），先给 A/B 评级，再 REVIEW 确认 GAP、拟计划并持续改善；本轮特别强调**避免平铺、要有层次地暴露**（代码与测试都算），以及清掉孤立/老旧资产、提高整仓信噪比。

**当前情况（读数 = 2026-11-03 复评，材料见 [第七维审计](../research/repo-hygiene-round6/2026-11-03-seven-dimension-audit-round6.md)）：** 结构与门禁骨架健康；但 fresh 复评抓到一个**当日引入的静默腐化**——`tests/company/dag.spec.ts` 在 `d6d1f92`（tests 进 tsc）被整体覆盖成 `cultivation-lib.spec.ts` 的字节副本，DAG 模块失去唯一单测、套件多出 21 条重复用例；同日修复并**新增重复 spec 门禁**。其余焦点：`tsconfig.test-harness` 的 51 行手工清单改成 glob（并暴露一处真 type error）、链接门禁三个豁免区藏着 41 条死链、`orient` 首屏不指向真页面/诊断入口、`orient --scenario` 对 visual 场景给出会崩的命令。

**未决问题：** 平铺目录的层次化（`src/client` 41 / `tests/client` 48 / `tools/lib` 48 / `checks/gates` 53 / `tests/harness` 53）与上轮 D2「不建议重组」的结论相反——本轮按用户明示改判；范围、分批与风险需在材料里定。npm publish 仍无认证（外部）。

**范围与排除项**

- 范围：`docs/`、`tests/`、`checks/`、`tools/`、`probes/`、`packages/company-pack/src`、`_backlog/`、`notes/` 的卫生面；允许改文档/测试/门禁/反馈脚本/源码布局。
- 排除：真模型认证档与 `npm publish`（成本/人工）；公司业务产物与 persona 文案质量；`vendor/dsh` 内部改动。

**已知与未决**

- 已落地（2026-11-03，批 A/B/G）：R6-01/02（DAG spec 恢复 + 重复 spec 门禁）、R6-03（harness tsconfig glob）、
  R6-04/05/06（`orient` 首屏与 `--scenario` 分派、`--help`/未知参数）、R6-08/09（设计层两处现状 + 过期枚举）、
  R6-13/14（安装=启动 profile、卸载残留披露）、一次性探针删除。Note =
  [round6-hygiene-batch](../../notes/implemented/2026-11-03-round6-hygiene-batch.md)。
- 待做：R6-10 层次化（D/E 批）、R6-07 豁免区死链算账（C 批）、R6-11/12 测试质量（F 批）、R6-15/16 D7 待决项。
