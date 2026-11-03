---
topic: 仓库卫生
intent: "2026-11-03 Phase 0–4 后的七维复评：当前分、主要证据、剩余边界；服务 round5 卡与用户验收。"
---

# 七维复评（2026-11-03，Phase 0–4 后）

> 基线 = 同日 fresh 复评（D1 B+ / D2 B+ / D3 B+ / D4 B- / D5 B+ / D6 A- / D7 B）。
> 本轮范围 = 发布真伪、语义腐化、CompanyView/entry 层次、D6 全链、typecheck/覆盖率、notes 分诊。
> 读者：round5 卡 / 用户验收。不是新 Note，不改合同。

## 当前分

| 维 | 现在 | 较基线 | 判据（证据） |
|---|---|---|---|
| D1 文档/渐进披露 | **A-** | ↑ | dev-loop 空壳节删 9 个（157→113，预算 165→120）；preset 验证表单家；index 加 when 指针；安装手册包内内容纠正。残余：70 篇零入链、index 无逐行 when。 |
| D2 代码/测试层次 | **A-** | ↑ | CompanyView 死代码删；context-wiring/member-navigation/title-state 抽出；catalog 三分（104/57/335）；0 环；client 导出集合钉死。残余：styles 788 / cultivation 710 不拆（内聚）、150 个零引用导出、client 目录平铺。 |
| D3 文档—执行—验收 | **B+** | → | 发布点态语义进 release.md；pre-push + typecheck；notes noDecision/dead 0；收尾 skill/五道门不变。残余：tests 未进 tsc、Note 的“跑过什么”仍靠人贴、70 篇未全量分诊。 |
| D4 上下文腐化 | **B+** | ↑ | workflow 幽灵能力/符号链接/CompanyView 旧叙述已改；A- 收口加推翻 banner；旧路径/台账序号修；notes:audit 硬项 0。残余：70 篇零入链的语义分诊、npm/market 未发布、release check 在非发布 HEAD 红（点态）。 |
| D5 测试资产 | **A-** | ↑ | 138 文件 / 1102 例；workspace-resolution 12 例、context-wiring 8、member/title 9；6 个高风险模块覆盖阈值（红证）；skip 预期 N 守卫。残余：tests 类型面、presets 真挂载仍在认证档、client/index branch 16.66。 |
| D6 反馈通路 | **A-** | → | isolated 真页面全链 smoke（错误环→reporter→host 日志）ALL PASS；`--steps`/截图/诊断/tee 已有；证据 7 天保留已写 runbook。残余：dev 多 writer 的 `session/writer-held` 现场、plain `dsh` 仅文档化 tee。 |
| D7 DSH 插件约定 | **B+** | ↑ | bundle/patch/preset/client/安装/初始化/卸载仍是原生；master 快进去 private、0.8.2–0.8.6 tag；0.8.6 READY @3d69649。残余：npm publish 无认证、market index staged。 |

## 结论

- **结构/证据面已从“B 档 + 假绿”走到“A-/B+ 且假绿有门”**；最大的剩余不是结构，而是**未发布/未类型检查**两个外部或独立轮项。
- 仍不能称 A：D3/D7 的“发布字节真出去”和 tests 类型面没有闭合；D4 的 70 篇 Note 语义分诊只做了高腐化面。
- 下一轮优先级：tests 两面 test project（先修新测试松类型 + `@types/react-dom`）→ 70 篇 Note 全量分诊；发布已到 0.8.6。

## 机械读数

```text
pnpm verify        ALL PASS（53 门 + 2 无对象）
pnpm test          138 files / 1102 tests
pnpm typecheck     exit 0
pnpm test:coverage exit 0（6 个关键模块阈值）
release --check    非发布 HEAD 红（gitSha/sourceFingerprint），0.8.6 READY @3d69649
notes:audit        noDecision 0 / deadPaths 0 / missingBacklinks 0 / orphans 70
```
