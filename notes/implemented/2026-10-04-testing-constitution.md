# 2026-10-04 · 测试宪法落地：docs/testing.md + pack 导出形态守卫（_digested/test-strategy 消化采纳轮）

状态：已交付（2026-10-04，同日毕业）。批准 = 用户计划六问逐项确认（endgame=先自用打磨条件成熟再对外；主战场=角色内容与协作质量 + 指认「多用户并发交互 UX 零测试资产」；快照判据=行为判据面强制纯措辞不强制；自测轮=agent 阶段收口提案用户批后跑；宪法家=独立 docs/testing.md；实施=RFC 落盘后一次连做）。

## 背景与方法

用户令：消化外部研究材料 `_digested/test-strategy`（11 篇，基线 dsh-v0.2.0-rc.2，登记见
docs/index.md §外部研究材料登记），按本仓特点评估采纳面——「当前能够补足，将来能够指导」。
消化对账结论：DSH 按「证据形态 × 入口真实性」分层（不按单元/集成/端到端），九条教义 + 插件
证据阶梯 + 防假绿五机制 + 可靠性归因纪律。本仓自 R1 起实际已采纳约六成（D15 完成定义、§9.1
分层与预算、layering 机械门禁、replay lane、workspace-oracle、preset/release-smoke、
script-triggers 自述、pipefail 防假绿）。真实缺口三类：**政策无唯一家**（散在 §9.1/AGENTS/
D15/门禁注释，新会话沿纪律表落点进 vendor 语境错配的 testing.md）、**两个便宜守卫缺失**
（导出形态守卫、快照强制判据不精确）、**升级路径无成文触发条件**（长大后再借什么、何时借）。

## 决定

1. **立 `docs/testing.md`（合同层，测试政策唯一家，~65 行）**：分层与证明边界、改动面→最小
   证据映射、mock 白名单、单向归因、掩盖黑名单、防假绿、prove-it-red、资产三分法（树规则
   指针 = snapshots/README.md）、自测轮授权（agent 提案用户批）、**已知未覆盖面明说**（多人
   并发交互/竞争 UX——机制面有 E1/E2 实测与 `fs-guard-probe`，交互/协作 UX 零测试资产）、
   升级地图六项带触发。dev-loop §9.1 保留命令与预算（证明边界段迁入宪法留指针）；AGENTS
   纪律表「测试分层」行落点改指宪法。
2. **导出形态守卫 `tests/pack-exports.spec.ts`**：pack 两个入口（host 半 `inject: ['tools','approval']`
   + client 半 `inject: ['slots','remote','sessions']`）经真 Loader `unwrapExports` round-trip——
   无 default export、inject/apply 穿过 unwrap 仍在。postmortem 0001 级暴露面的最便宜拦截；
   模板 = vendor `tool-lsp/tests/load-path.spec.ts`。带反证（塞 default → 红 → 还原 → 绿）。
3. **快照强制判据（用户拍板）**：persona/skill 文案的**行为判据面**改动（改变"模型被要求做
   什么/判据怎么落"）→ 同 diff 必带回放场景；纯措辞润色 → 连通档 + 内容档兜。对应 DSH 原文
   "non-trivial" 限定。
4. **升 pin 程序加「语料回放全绿」**：release.md 人审两项扩三项 + dev-loop §5 序列插步——
   replay 语料定位 = 升 pin 回归网第一道（vendor 换 tag 后先回放再谈语义结论）。
5. **行预算**：verify `DOC_LINE_BUDGETS` 注册 `docs/testing.md`；docs/index.md 146→147（文档
   地图加宪法行）。

## 输掉的方案（不采纳与缓采）

- **宪法并进 dev-loop §9.1**：不加文件，但 dev-loop 已 388 行且政策与操作混层；宪法按 D10 是
  合同层（"什么算证据"= 现在时语义）。用户确认独立成家。
- **规模错配不采纳（digest 充当升级地图）**：per-file 100% coverage 门 / bench 预算门 / 平台
  矩阵（Wine、多 Node、runner 池）/ Python 双 SDK 投影 / 18 聚合门禁图注册表 / test-support
  七件套式基建组 / fail-fast 杀进程树——本仓体量未到，每条由宪法 §升级地图的触发条件把门。
- **缓采带触发（宪法 §升级地图）**：脚本化模型 adapter 进程内 harness（回放覆盖不到的会话级
  行为才建；vendor `core/agent-loop/tests/mock-adapter.ts` 源码平面可复用，不自造）/ Config
  两脸断言（首个带 Config 的 host 插件）/ 自跳过计数守卫（出现 skipIf）/ coverage 死代码扫描
  （lib 判据逻辑可疑）/ 交互性能预算常数化（性能回归指控）/ 快照世代模型（vendor 会话格式
  再 bump 且存有跨格式场景）。
- **多用户并发 UX 立项**：用户指认的缺口只登记为「已知未覆盖面 + 升级触发」，不在测试轮越权
  立项——是否建、怎么建是产品决策，另走 RFC。

## 验证（实际跑过的）

- `pnpm test`：**29 文件 279 用例全绿，1.86s**（新守卫 2 用例在内；预算 <5s 达标）。
- `pnpm verify`：**ALL PASS**（doc-budget 两处调整生效：index 146→147、testing.md 注册 60）。
- **守卫反证三步**：host 入口临时加 `export default apply` → 新守卫 host 用例红（client 半不受影响，符合预期）→ 还原 → 绿。
- **首跑修正（实证留档）**：`@deepseek-ai/cordis-plugin-loader` 包名在本仓 vitest **不解析**（Cannot find package——本仓 vitest 的 paths 没接住 vendor base 的 extends 链映射），守卫改走既有先例 = 相对路径直引 vendor loader src（`tests/style-lifecycle.spec.ts` 引 cordis src 同法）。头注已记此坑。
- pre-push hook：push 时自动跑 verify + test（本 Note 同 diff 提交）。
