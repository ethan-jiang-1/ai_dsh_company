# 2026-09-24 · N1 文档命名：编号双体系收敛（方案 A 已执行）

状态：implemented（2026-09-24 晚执行——人裁 A；全去编号落地）

## 问题

docs/ 内两套命名并存：advisory 层带编号（design/10-40、guides/50-60——一条跨目录连续阅读序），
顶层合同不带编号。双体系是 R0 时代遗留；阅读序已被文档地图接管，编号成了第二套排序载体；vendor
docs/ 全部主题名无编号，本仓纪律表承诺继承 vendor 惯例。

## 决定（人裁 A · 全去编号）

七个文件改名（原提案估 8 个，实存 7 个）：`index.md`（原 00-index）、
`design/{architecture,roles-isolation,ui-demo,role-content-plan}.md`、
`guides/{budget-and-ops,dev-loop}.md`；H1 标题去编号前缀；排序唯一权威 = index.md 文档地图。
落选方案（B 全编号 / C 现状+显式规则）的理由见 git 历史（本文件 proposed 版，commit 前 04e4127）。

## 执行实况

- `git mv` ×7 + 全仓引用两遍替换（文件名/路径形态 → `docs/NN` 前缀 → 裸编号节引用形态，共 85 文件）；
  verify md-links ×321 全绿、`pnpm test` 157/157、AGENTS.md / ROADMAP / notes / scripts / tests
  活引用改净（门禁保证）。
- **顺手修探针既有缺陷（发现留痕）**：entry-probe 两轮 0/8——非改名所致（13:44 旧 run 同样 0/8 且
  结果未被记录）；病根 = prompt 未教模型转义内嵌双引号（引用 AGENTS.md `"Status rots"` 即产出非法
  JSON），判卷器按设计拒绝兜底。修 prompt 一行（教转义或改「」）。
- **探针修复后立功**：8/8 通过，且报出两个真矛盾——①「四角色」残影两处（dev-loop §7 与
  preset-smoke 注释，R6 修漏的）→ 已改「五角色」；②改名已在盘上而队列/RFC 未销账（执行中的预期
  中间态）→ 本 Note 与 ROADMAP 销账后消解。

## 验证

- `pnpm verify`（md-utf8 ×436 / md-links ×321 / doc-budget index 138/145、dev-loop 418/440）+
  `pnpm test` 17 文件 157 项全绿；`node --check`（两处脚本改动）。
- entry-probe 认证档（真模型）：prompt 修复后 8/8（C1/C2 处置见执行实况）。

## 后果

新文档一律主题名引用（architecture §N / dev-loop §N 形态，vendor 同构）；N1 自队列销账；探针从
"立了没真跑过的门禁"变为"真跑过且抓到真缺陷的门禁"。
