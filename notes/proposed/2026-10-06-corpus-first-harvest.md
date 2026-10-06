# 2026-10-06 · 语料首收：r6-baseline 真实产物喂 candidate-scan 语料通道

状态：proposed（批准：2026-10-06 用户点头「corpora 通道现在就做」——r6 材料已付费，飞轮首次自动转动；单条目轻包）

## 问题

语料通道是收割框架判定的薄通道之一（corpora 仅 1 个场景：candidate-scan-corpus）。语料的天然来源 = 真实运行的产物，而 r6-baseline（2026-10-06 真模型 60 分钟五角色动议）刚产出 `workspace.expected/`——当前组合、当前手册、当前格式下的真实角色产物（meta.md + 7 drafts + 4 journal），采集成本已随录制支付。不喂进语料通道 = 白白流掉。

## 方案（单条目）

- **侦察**：corpus 条目形状与标注格式（`snapshots/corpora/candidate-scan-corpus/`）、扫描器（`scripts/lib/candidate-scan.mjs`）、消费面（`tests/company/candidate-scan-labels.spec.ts`）。
- **喂料**：r6 `workspace.expected` 全部 md 产物过扫描器，逐件核对扫描结果与人工判读。
- **收割（二选一，都算涨）**：全认对 → r6 代表性条目入 corpus（当前格式覆盖确认）；认错/歧义 → 歧义样例 + 独立标注入 corpus，扫描器错则红绿修，判据没错则钉住歧义。
- **范围钉死**：只做 corpora、只用 r6 材料、不碰 visual、不动扫描器语义（除非红绿证明它错）。

## 非目标

- 不扩展 corpus 到其他扫描器/其他面；不录新场景；不做外置冷存（预算余量 13M）；不动 evidence 政策。

## 输掉的方案（留尸）

- **visual 通道先行**——要活会话或 replay-UI，成本高且承重面弱于审计正确性。
- **等真实 demo 再收语料**——r6 材料已在手上，等待是不必要延迟。
- **全量把 r6 每个文件入 corpus**——语料收歧义与代表性，不收「已覆盖形状」的重复行；全量入 = 语料库变文件镜像。

## 验收（先行点名怎么测）

- ①侦察产物：corpus 条目格式与消费 spec 断言形状记录进毕业 Note（实施者不看对话可复现）。
- ②喂料收据：r6 产物逐件扫描结果表（文件 → 扫描输出 vs 人工判读 → 认对/歧义）记毕业 Note。
- ③红绿：corpus 新条目带独立标注进消费 spec——标注与扫描不符即红（反证 = 故意放一条错标注见红）；若触发扫描器修复，修复走判据先行红绿。
- ④收口：verify ALL PASS + vitest 全绿 + 一个 commit + 简报（资产增量行：corpora +N 条）。
