---
topic: 仓库卫生
intent: "2026-11-03 上下文腐化（D4）深挖：找出「当前文档/生成物与代码不一致、且没有任何门禁会红」的通道，逐条验证，给出处置与落地次序。"
---

# D4 深挖：上下文腐化的通道（2026-11-03）

> 服务：[第六轮七维打扫卡](../../issues/2026-11-03-repo-hygiene-round6.md)（D4 从 B+ 到 A- 的残余面）
> 方法：先枚举「事实住在哪、谁在守」，再对每条通道**造一次真实漂移**看门禁会不会红；红不了的就是通道。
> 已排除的假 GAP：`compat-tags.json` 不含 rc.5 是**文档明说**的（"不在兼容台账，不等于全链认证"）；
> `release --check` 在非发布 HEAD 红是点态设计。二者都不是腐化。

## 1. 通道清单（每条都实跑验证过）

| # | 通道 | 现状/实证 | 谁该守 | 结论 |
|---|---|---|---|---|
| D4-1 | **设计层的"现在时"断言** | `docs/design/architecture.md:32` 仍写「开发用 `web` profile…；`company` profile 已退役」——与 README/profile/release 的「产品入口 = `company`」相反。上一轮只修了 index/ui-demo/terminology，**漏了这份**。`bare-path` 只认「以顶层目录开头的反引号路径」，这种散文矛盾永远不会红。 | 无 | **修 + 立 `retired-claims` 门**（已知假断言的禁写表） |
| D4-2 | **文档里的命令** | 往 `docs/orient.md` 加 `pnpm nonexistent-script` → `verify` 全绿；把 `package.json` 的 `orient` 改名 → `verify` 仍全绿。命令表、指南、README 里的 `pnpm <script>` 与脚本无任何机械联系。 | 无 | **立 `command-refs` 门**（`pnpm <script>` 必须存在于 package.json；`node <path>` 必须存在） |
| D4-3 | **tracked 生成物 vs 生成器** | `_dist/安装手册.md` 是 tracked 生成物；本轮改了模板（卸载清单），`verify` 仍绿、手册仍是旧内容。`dist-manual` 只查版本/sha/关键句，不查「是否由当前模板生成」。 | `dist-manual`（缺一半） | **重生成 + 渲染比对门**（模板→字节，确定性） |
| D4-4 | **台账顺序** | `docs/decisions.md` 的 `D19+D21` 行排在 `D20` 之后；`ledger-routing` 只查三列/长度/家可解析，不查编号单调。 | `ledger-routing`（缺一条） | **修顺序 + 单调断言** |
| D4-5 | **已耗仪器留在活树** | `probes/browser-visual/` 下的 cultivation-gui 探针（710 行，自述已耗、引用已删启动器）与 `checks/smoke/` 下的 replay-ui（已耗、零 import）仍在 live 目录；`script-index` 把它们当公开入口索引。 | 人 | **已删除**（2026-11-03；证据在归档卡与 git） |
| D4-6 | **"孤立"指标只有一个口径** | `notes:audit` 只报「零 Note 入链」= **80**；同一批 Note 里「零任何当前文档入链」= **48**（2026-11-03 实测，含 docs + `_backlog` 活区）。单一数字被读成"80 篇孤立"，而分诊结论是"不批量迁"——指标与处置正交。 | `notes-audit`（口径） | **已修**：同时报两个数并写明口径 |
| D4-7 | **图片目标** | `markdownLinkTargets` 只收 link/definition，不收 image；`md-links` 的豁免区对缺失图片同样放行。当前全仓 0 个 `![]` 链接，属**潜在**通道。 | `link-debt` / `md-links` | **延后**；触发 = 出现第一条图片链接时扩面 |
| D4-8 | **设计层现状声明的一般面** | D4-1 是实例；机制上没有"设计层只放 why"的检查。可机械判的只有"已证伪的具体句子"，不能判语义。 | 无 | **接受边界**：登记为人工复核面，不造语义门禁 |

## 2. 处置与次序（并入第六轮卡）

1. **先修现行腐化**（D4-1/3/4/5）：设计层错句、重生成手册、台账顺序、删已耗仪器。每项同 diff 证据。
2. **再立机制**（D4-1/2/3/4）：`retired-claims`、`command-refs`、`dist-manual` 渲染比对、`ledger-routing` 单调；
   每门必须**造红**（对真文件制造真实漂移，不构造假输入）。
3. **口径修正**（D4-6）：`notes:audit` 输出两个数，spec 同步。
4. **明确不做**：D4-7 延后、D4-8 人工面、`npm publish`（外部）。
5. **审 + 归档**：`pnpm verify` / `pnpm test` / `pnpm typecheck` 全绿后，按五道门把 round5（消化：各批已落地或被
   round6 承接）与 round6（落地完成）写结论/去向、审查、迁 `_archive/settled_issues/`，两个研究题迁
   `_archive/research/`，四处索引同步。

## 3. 边界

- 本文只覆盖"文档/生成物与代码不一致且可机械判"的面；语义质量（措辞是否过时、设计理由是否仍成立）仍是人工复核。
- 每条机制的负例留证必须写进它自己的注释头（gate-change-definition）：见过的红才算守卫。
