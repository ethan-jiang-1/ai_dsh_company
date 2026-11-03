# 2026-11-03 · A- 收口：七维全部达到 A-（0.8.2）

状态：implemented（2026-11-03；A- goal 收口）

> 上游 = [第五轮七维打扫卡](../../_backlog/issues/2026-11-03-repo-hygiene-round5.md)
> 尺子：A- = **主反馈路径无已知假绿、每维有可复跑判据、残余只余文档化边界**；A = 无残余。

## 复评（当前树，0.8.2；review 后内部维护）

| 维 | 分 | 判据 |
|---|---|---|
| D1 文档/渐进披露 | **A-** | 入口链 83 行；`checks/README.md` 56 行 + `INDEX.generated.md` 生成物（107 入口/53 门，`script-index` 新鲜度门禁）；32/32 文档有“什么时候读”；live docs 0 断链。残余：dev-loop 旧锚点重定向节、5 份预算零头寸（棘轮信号，非腐化） |
| D2 代码/测试层次 | **A-** | 源码 0 环/0 反向边；两条独立守卫；host spec 640→266/198/133 三份；测试文件最大 266 行；公开面 = apply/inject；`isRecord` 收家。残余：6 个源码断言 spec（CSS/装配/parser 面，各自有理由）、15 个 >100 行函数（P3） |
| D3 文档—执行—验收 | **A-** | 授权门牌/摘要纯指针；语义审 owner policy P5；preset 完成定义 skill 单家；close-out 单家；Plan Mode/五道门 |
| D4 上下文腐化 | **A-** | content 门禁、退役路径 4 前缀、index 墓碑清除、0.8.2 READY、compat 表述对齐。残余：31 条冻结归档断链（只查 `.md` 目标的门禁边界）、decisions 零头寸 |
| D5 测试资产 | **A-** | 全量覆盖 **86.72 stmt / 78.65 branch**；CultivationTab 93.75、company-tabs 75.92、catalog 76.29、LedgerTab 97.43、Brand 100、Picker 72.58；dev home **0 skip**；preset 有 keyless YAML schema；mock 白名单与“参数注入假件”表述对齐。残余：presets 真挂载仍在 `preset-smoke`（设计分层）；catalog 未覆盖分支（76.29 是主+审计路径） |
| D6 反馈通路 | **A-** | isolated golden 两次绿；dev 9/9；diagnose 真会话 `nonzero=2`；客户端错误落盘/刷新留存；启动 tee；`--steps` 点击复现。残余：页面→host log 全链路未用真会话端到端、`pnpm dsh web` 不 tee、证据 7 天保留 |
| D7 DSH 插件约定 | **A-** | 0.8.2 发布字节 READY（未 npm publish）：bundle/patch/preset/client 原生；安装/初始化/卸载/发布真实冒烟；公开面 apply/inject；peers 47；web-only/品牌/`dsh.client.inject` 偏离已写进 README。残余：`workspaceRegistry` 硬 inject（产品面 = web）、品牌只占 name 槽（与官方 brand 共存的最小侵入）、`$DSH_HOME/company/` 自造树（D25/M2 合同） |

## 本轮 A- 批次证据

- D1：`tools/checks-index.mjs`/`tools/lib/checks-index.mjs`；`script-index` 红→绿（临时探针 108→107）；README 80→56；9 份 when-to-read。
- D2：`cultivation-command/context/maintenance.spec.ts`（23 例不变）；`pack-exports` 钉 `['apply','inject']`；`tool-card` 用 `guards.isRecord`。
- D5：`company-tabs-body.spec.ts`（五页签 53.7→75.92）；`ledger.spec` 路径修正（skip 0）；catalog 审计路径 5 分支（55.8→76.29）**抓到并修复 v3 slug bug**；Picker problem 态；mock 白名单措辞。
- D7：0.8.0 breaking 公开面收窄；peers 50→47；0.8.1 slug 修复；0.8.2 review 维护；README web-only/品牌偏离。

## 发布与验证

```text
pnpm verify     # ALL PASS（53 门 + 2 无对象）
pnpm test       # 135 files / 1077 tests（0 skipped）
pnpm typecheck  # exit 0
release --verify# 全绿（release-smoke 含卸载/重装；0.8.2）
release --check # READY 0.8.2（tgz 127 entries）
```

## 仍未做（不阻塞 A-，需外部决策）

- npm publish / HTTPS market 托管（人工 handoff；`market-index.staged.json` 标记 0.8.2 未发布）。
- Desktop 壳/卸载、真模型认证档、页面→host log 全链路端到端。
- D5 的 presets 真挂载仍由 `preset-smoke`（认证档）承担；不在 `pnpm test`，这是分层不是缺口。
