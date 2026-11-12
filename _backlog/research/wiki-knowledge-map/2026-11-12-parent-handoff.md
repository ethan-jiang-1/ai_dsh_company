---
topic: wiki-knowledge-map
intent: 父会话一手锚点、合同层事实与跨题交接，供深度研究 agent 续作；不替代主材料
---

# 父会话交接：wiki 知识地图

> 主材料 = [2026-11-12-wiki-knowledge-map.md](2026-11-12-wiki-knowledge-map.md)（AK 一手考证 + 生态 + 接入形状）。本件只补父会话亲自核实、且主材料未收或需强调的事实。深度研究由专职 agent 继续，父会话到此停手。

## 一手核实（父会话实读/实跑）

- vendor pin = `b830ec950faba0a46dda564be3e2d854afed94f1`（tag dsh-v0.2.1-rc.5），工作树零改动；**无 wiki 组件**（packages/apps/lib 全扫，仅 wikipedia 图标 glyph）——用户「估计 DSH 有 wiki 组件」证伪。
- 注入先例：`packages/company-pack/src/host/prompt/handbook.ts` 全文实读——`agent/created` 时注册 agent 作用域 `systemPrompt.section`（order 500），跳过 `NON_ROLE_PRESETS`（worker family/质量环不注入手册）。**wiki 指针段若注入，须同款跳过非角色 preset**。
- override 两档：手册 override 是文件系统级选源（readHandbook 换文件）；模板/章程 override 是提示级（前言声明）。wiki 落位可参照前者或后者，需定性时选。
- 配置先例：`src/host/run-bundle/config.ts` 实读——HostConfigLike 仅 `cultivationRoot`/`handbookSkipPresets` 两键，未知键 fail-loud；加 wiki 配置键 = 同款扩一字段。
- 公司自持 home 级 settings 先例：`<DSH_HOME>/company/settings.json`（workspace 最近选择），见 [profile 合同](../../../docs/contracts/profile.md) 与 [workspace-choice Note](../../../notes/archived/2026-11-03-workspace-choice-and-lease-order.md)。
- host 读 DSH settings 先例：[bilingual RFC](../../../notes/proposed/2026-11-12-bilingual-company.md) 用 `settings.describe()` 读 `locale.preference`（proposed，未落地）——若 wiki 选择要走 DSH settings 读侧，这是先例；但主存储推荐 workspace 级（姊妹题结论）。

## 合同层约束（续作必读）

- [content-charter](../../../docs/content-charter.md)：四槽三层、方法不进 persona（L43）；wiki = 外部可替换知识输入，不进 persona；改宪章 = 卡 + 语义审。
- [presets 合同](../../../docs/contracts/presets.md)：四形态矩阵——teammate 继承 Lead 组合、命名 child 按工具行钉 preset；wiki 可见性设计要按形态区分，别按角色名推断。
- 两轴现状：product-types 2 包；delivery-modes 2 目录 + productized 隐式默认（姊妹材料 §5.3 纠正过「三目录」误锚）。

## 跨题交接

- settings 入口/持久化/启动注入 = [startup-settings 主材料](../../_archive/research/startup-settings/2026-11-12-startup-settings.md) §5/§6：推荐 `.dsh-company/settings.json` + 公司自持 modal + 新 prompt section thunk 活读；`settings.wiki` = string 指针，与本题形状 A（根路径 + index 先行）合流。
- 开放问题清单 = 主材料 §7（写权限落位 a1/a2、kb 边界、多角色可见性、index 预算、外部源策略、增长节奏）+「预言语言」确指待用户确认。

## 状态

- 父会话已跑 `pnpm verify` ALL PASS、`pnpm test` 207 文件/1630 用例全绿（形状与 keyless 面；不证研究结论）。
- 题名页保持 `调研中`；定性/实施授权待用户，父会话不越权。
