# 2026-09-24 · N1 文档命名：编号双体系收敛（提案，人裁后执行）

状态：proposed（人裁 **方案 A** 2026-09-24 晚；待执行，队列首条——先于基座轮，避免新 RFC 引用旧路径双改；执行与验收见 §方案 A / §验收）

## 问题

docs/ 内两套命名并存：**advisory 层带编号**（design/10-40、guides/50-60——且 10–60 是跨目录的
一条连续阅读序），**顶层合同不带编号**（profile / delegation / presets / demo / release）。
00-index 自身编号（"00"）。双体系是 R0 时代遗留（当时编号承载阅读序），R6 卫生合同落地时
未处置（N1 登记）。

编号的真实代价：① 插入文档要么重号要么用 35/45 这类奇数；② 阅读序已被 00-index 文档地图
接管（一处事实一个家）——编号成了**第二套排序载体**；③ vendor `docs/` 全部主题名无编号
（architecture.md / testing.md / cordis-primer.md…），本仓纪律表承诺继承 vendor docs 惯例。

## 方案（推荐 A）

- **A（推荐）· 全去编号**：`design/10-architecture.md` → `design/architecture.md`（20/30/40、
  50/60 同理）；`00-index.md` → `index.md`（"先读我"由 AGENTS.md 入口链承担，vendor 同构）。
  排序唯一权威 = 00→index 的文档地图（按层分组的表格顺序）。执行 = 一次机械 commit：
  8 个 `git mv` + 全仓引用 sed + `pnpm verify`（md-links ×83 / notes-links ×101 全量红→绿即改净）。
  风险低：纯改名，门禁全覆盖。
- **B · 全编号**（顶层合同也编 70/80/90）：否决——合同层是**按主题引用的家**，不按序读；
  编号会编码一个不存在的阅读序，且号随出生序腐烂（demo 晚于 presets 出生）。
- **C · 现状 + 显式规则**（编号 = advisory 层阅读序、合同层主题名，写进 00-index 组织原则）：
  保留双体系但声明语义。否决理由：仍是两套规则要记，且编号的第二排序载体问题不解决。

## 输掉的的方案

见 B / C；另否决"只去 design/ 编号、guides 保留"——10–60 本是一条序，拆开更乱。

## 验收（执行时）

改名后 `pnpm verify` + `pnpm test` 全绿（两道链接门禁全量核对）+ 入口链探针（认证档）
`Q3/Q7` 路由断言仍绿（涉及 `60-dev-loop` 字样的期望需同步改为新名）；AGENTS.md / ROADMAP /
notes/ 全部活引用改净（门禁保证）。
