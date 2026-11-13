# 2026-11-13 · 测试资产围栏 P0：两条红资产 + 快档 lane

状态：implemented（2026-11-13 落地；验证见下）

上游 = 用户 2026-11-13「弄个 issue 出来吧，然后我们推动落地」；问题卡 = [test-asset-fence-p0](../../_backlog/_archive/settled_issues/2026-11-13-test-asset-fence-p0.md)；研究 = [test-asset-fence](../../_backlog/research/test-asset-fence/README.md)（第二遍复核见材料二 §8）。

## 决定

1. **负例 mutation 必须证明改了字节**：新增 `checks/smoke/lib/mutation.mjs` 的 `mutateFile`；`two-axis-gates-smoke` 的品类表 / meta 两处 mutation 改为现行 canonical 文本（`Hardware-software product` 行、`deliveryMode:` 字段），替换不命中直接报「mutation 没命中」；`gates-negative-smoke` 的三处文本 mutation 同用。根因是 2026-11-12 canonical 英文化后旧字符串不再命中，smoke 把「夹具过期」误报成「gate 没红」。
2. **replay 用 `--refresh` 复绿，不重录**：`node checks/smoke/replay-smoke.mjs --refresh`（headless authored、无 key；workspace oracle 失败会拒绝）刷新会话/sidecar；`snapshot.yml` 的资格理由日期更新为 2026-11-13。`raw/lead.jsonl` 与 `replay/session.v3.jsonl` 随刷新更新。
3. **`candidate-scan-eval` 标已耗**：语料已移出本仓，脚本 exit 2；头注状态从「常驻」改「已耗（2026-11-13 语料已移出本仓；恢复语料时重跑）」，`tests/README.md` / `docs/testing.md` 同步。
4. **`smoke:fast` 6 条进 pre-push**：新增 `checks/smoke/fast.mjs` + `package.json` 的 `smoke:fast`，串行跑 workflow-contract / present-catalog / company-root-process / gates-negative / snapshot-motion / two-axis；`replay`（3.9s、易漂）先留在自己的触发线上。`.githooks/pre-push` 在 `test` 前加 `pnpm -s smoke:fast || exit 1`。
5. **预算注释实测化**：`.githooks/pre-push` 与 `.github/workflows/ci.yml` 的旧读数（test 1.3s / verify 2s）改成 2026-11-13 实测（冷分项和 ~44s；热缓存 hook 29–35s（两次实测））；`tests/README.md` 的命令预算表补 `smoke:fast`。

## 输掉的方案

- **把慢资产拉回 `pnpm test`**：违反 layering 围栏（tests 禁子进程/浏览器/网络），会把 26s 的快层拖成分钟级。
- **把 `replay` 放进每 push 的 lane**：3.9s 且技能目录一改就漂，先独立；若稳定一周再议。
- **用 `--record` 重录 replay**：真模型认证档，成本高；`--refresh` 是 headless authored 的内置无 key 路径。
- **现在抽 `export-dist` plan / 扩 gate 负例**：发布工具低频，核心 swap 已有快 spec；负例扩面按风险另卡（研究 A2/A4）。
- **给 32 个 smoke 都手写「最后实跑」**：lane 自动覆盖 6 条；只对手动/发布/认证档按需记日期，避免新簿记。

## 状态事实与载体

- 事实：测试资产的**新鲜度回路**——mutation 必须真改字节、replay fixture 有刷新/归档路径、惰性资产有状态、便宜资产有 lane。
- 唯一入口：`checks/smoke/fast.mjs`（lane 清单）+ `checks/smoke/lib/mutation.mjs`（mutation 守卫）+ 问题卡。
- 读载体 / 写载体：`checks/smoke/*`、`checks/smoke/lib/`、`snapshots/replay/`、`checks/audit/`、`package.json`、`.githooks/pre-push`、`tests/README.md`、`checks/README.md`。
- 一致性判据：lane 清单与 pre-push 命令同源（都走 `pnpm smoke:fast`）；两个负例 smoke 共用 `mutateFile`；`snapshot.yml` 的资格日期 = 最近一次实跑刷新日。
- 环境坏法：内容（canonical/i18n 改名让 mutation 空转）、生命周期（fixture 资格过期）、来源（CI 干净环境不构建 vendor，cheap smoke 跑不动 → lane 留 pre-push）。

## 未覆盖轴

- **A2**（`export-dist` 抽 plan）未做：发布工具低频，核心 `swapDirWithBackup` 已有快 spec；仅复发时再做。
- **A3**（headless replay 静态新鲜度）未做：`--refresh` 先复绿；同一处再漂再扩 `replay-fixture-freshness`。
- **A4**（门禁负例扩面）未做：`company-root-carriers` 等高风险 gate 仍只有一次性红证；另卡按风险排序。
- **A5**（69 个 probe 消费者图）未做：probe 仍是调试面，无退役审计。
- **replay 的易变面**：技能目录再改仍可能漂；本轮只接受当前漂移并留日期，未冻结/归一化。
- **`pnpm test ≤ 30s` 是建议线，不是门禁**：当前 26s；`company-client-composition` 8.4s 是首要 outlier。
- **重资产/真模型未复跑**：本轮只动 keyless 便宜资产与文档；安装/发布/认证档的既有证据不变。

## 验证

| 面 | 实跑命令 | 结果 |
|---|---|---|
| mutation 负例 | `node checks/smoke/two-axis-gates-smoke.mjs` | **ALL PASS**（2 真副本 + 3 负例；case 4 现报 `缺「deliveryMode:」字段`） |
| gate 负例 | `node checks/smoke/gates-negative-smoke.mjs` | **ALL PASS**（5/5；三处文本 mutation 走 `mutateFile`） |
| 快档 lane | `pnpm smoke:fast` | **ALL PASS**（6 条，单跑 1.92s / pre-push 2.2–2.8s） |
| replay | `node checks/smoke/replay-smoke.mjs --refresh` → 复跑 | refresh exit 0；复跑 **ALL PASS**（2s） |
| 结构门禁 | `pnpm verify` | **ALL PASS**；2 门无对象 |
| pre-push 全链 | `sh .githooks/pre-push </dev/null` | **exit 0**；verify ALL PASS、smoke:fast 2.2–2.8s、test 242/1997、全链 29–35s（两次） |
| 回归 | `pnpm test`（由 hook 跑） | **242 files / 1997 tests passed** |

**修前红证**（研究/卡记录）：`two-axis-gates-smoke` 2/5 失败（品类表/meta mutation no-op）；`replay-smoke` 1 项失败（技能目录漂移）；`candidate-scan-eval` exit 2。修后如上表。
