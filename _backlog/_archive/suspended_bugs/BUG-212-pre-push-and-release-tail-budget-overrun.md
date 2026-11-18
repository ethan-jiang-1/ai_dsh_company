---
status: 待修
severity: P2
opened: 2026-11-17
---

# BUG-212：收尾验证链偏长——pre-push 暖树 ~46s；docs-only 后 release --check 还要全量 --verify

> 严重级别：P2（次要；但每次 push 都走）｜发现：2026-11-17｜状态：待修（挂起）｜docs-only 快速路径已修；pre-push 46s 预算成本-only，触发器见卡尾｜审查：—
>
> **关联**：用户本轮收尾指令（「尾巴上验证的 CI/过程是不是比较长……毕竟经常用」）。
> **留痕**：[release docs-only Note](../../../notes/implemented/2026-11-18-release-docs-only-and-pre-push-budget.md)。

## 症状

### 1. pre-push 暖树全链约 46s，超过 hook 自述预算

`.githooks/pre-push` 头注写「热缓存全链 29–35s」，2026-11-17 在本机暖树逐段实测：

| 步骤 | 命令 | 实测 |
|---|---|---|
| 结构门禁 | `node checks/run-gates.mjs` | **11.10s** |
| 类型面（4 个 tsc） | `pnpm -s typecheck` | **4.51s** |
| fast lane | `pnpm -s smoke:fast` | **2.21s** |
| 门禁自测 | `pnpm -s test:checks` | **5.17s** |
| lint + dup | `pnpm -s lint && pnpm -s dup` | **0.64s** |
| 全量覆盖率棘轮（跑全部 261 spec） | `pnpm coverage:ratchet` | **21.82s** |
| 合计 | — | **≈45.5s** |

`coverage:ratchet` 一段占 ~48%；`run-gates` 占 ~24%。新加的 `retired-path` git 自动面单独实测只有
**0.57s**（`retired-path ×260 文件 + 562 脚本注释面`），不是主因——问题是**整条链的预算已经漂了**，
而每次 push 都要付。

### 2. docs-only 收尾：release manifest 打红，修法要么分钟级全量验证要么手改记录

`_dist` 做过一次 `release --prepare` 后，再提交 docs/receipt：

```text
pnpm release --check
release: manifest gitSha 不是当前 HEAD（发布后被改过？只提交 docs/receipt 时用 --stamp；重建产物才用 --prepare/--verify）
```

照提示跑：

```text
pnpm release --stamp
release: manifest 还没有全项 pass；先 --verify
```

`release --verify` 会跑 verify / test / release-smoke / company-entry / client-load / preset /
present-catalog，分钟级。也就是说：**只改文档的收尾提交**要么付分钟级重验，要么手改 manifest（不允许）。
2026-11-17 本轮收口就卡在这里，最后以「记录已知限制」离场。

## 复现

```sh
/usr/bin/time -p node checks/run-gates.mjs
/usr/bin/time -p pnpm -s typecheck
/usr/bin/time -p pnpm -s smoke:fast
/usr/bin/time -p pnpm -s test:checks
/usr/bin/time -p sh -c 'pnpm -s lint && pnpm -s dup'
/usr/bin/time -p pnpm coverage:ratchet
pnpm release --check
pnpm release --stamp
```

前六条相加即 pre-push 的六段；后两条在「`--prepare` 之后又提交了 docs-only commit」的树上必红/拒。

## 根因与证据

- **根因（1）**：pre-push 的「快慢」只有头注里的一句人读预算，没有机械判据。`coverage:ratchet` 的全量
  覆盖率是最大单段，却对「只改文档」的 push 与「改代码」的 push 一视同仁；`run-gates` 的 75 道门禁
  也不区分变更面。2026-11-13 记录的 29–35s 是当时的树，之后门禁/自测/覆盖率面增长，预算没跟着改。
- **根因（2）**：`release --stamp` 把「manifest gitSha 过期」与「manifest checks 未全 pass」绑在一起；
  docs-only 提交不会让 checks 失效，却让 gitSha 失效，于是只能走全量 `--verify`。
- **证据**：上表逐段实跑；hook 头注原文；`release.mjs` 的 `--stamp` 拒绝分支。`retired-path` 单点
  0.57s 证明本轮新增判据不是主因，避免把这条成本记到 C12 批次头上。
- **影响**：开发者/agent 每次 push 等 ~46s；收尾 docs-only 提交额外分钟级；高频使用下会诱发
  `--no-verify` 逃生或手改 manifest 这类坏习惯。

## 失败类与同类排查

**失败类 = 性能 / 开发者环**（不是产品运行时）。同类：

- `docs/guides/budget-and-ops.md` 的预算节与 hook 头注是同一份预算的人读描述，两处都需随实测更新。
- `coverage:ratchet` 的成本此前被接受为「替代 `pnpm test` 的同量级」（Note 2026-11-13），但现在它叠加在
  verify/typecheck/test:checks 之上，不再同量级。
- 与 [BUG-200](../fixed_bugs/BUG-200-coveredby-coverage-ratchet-not-executable.md) 不同：那条是标签不可执行，
  这条是**可执行但太贵**。

## 已修判定

修成什么算修好（建议，供修复者采用）：

1. pre-push 暖树全链有**机械可复跑的实测**，且 ≤ 头注预算；预算随实测同 diff 更新，不再人读漂移。
2. 最大单段（`coverage:ratchet`，当前 ~22s）至少有一条降本路径：按 HEAD/源码指纹复用上一次覆盖率；
   或 docs-only 变更跳过全量覆盖率并有周 CI 兜底（须先写决定，不能静默跳）。
3. docs-only 收尾的 `release --check` 能通过一个显式、秒级的路径（例如 `--stamp` 在 checks 仍有效时
   允许 gitSha 前移，或 `--stamp --docs-only`），不再要求分钟级 `--verify`。
4. 最小负例：同一组 `/usr/bin/time -p` 命令复跑两次，数字稳定；跳过任一步必须有可见理由，不许静默。

## 修复方向（不授权，仅记录）

- **覆盖率缓存**：`coverage-ratchet` 以「HEAD + 源码指纹」为键缓存上次 `coverage-summary.json`；
  源码未变直接复用（秒级），变了才跑。pre-push 通常一个 commit 只跑一次，收益主要在重跑/多 worktree。
- **按面分流 pre-push**：docs-only 变更只跑 verify/typecheck/lint/dup/smoke/test:checks，覆盖率交给
  每周 CI；代码变更维持全量。须先写决定，并把「跳过的证据」打印出来。
- **run-gates 分层**：75 道门禁里把「必须每次」与「变更面相关」分开；后者由 `SURFACE_RULES` 已有
  `coveredBy` 机制承载。风险是漏门，需负例。
- **release stamp**：`--stamp` 增加「checks 全部 pass 且 changed files ⊆ docs/notes/_backlog」的
  秒级前移路径；或 release 收尾流程明确「docs-only 提交后不需要 --check」并写进 runbook。

## 2026-11-18 C14 相邻改动实测（只记录，不修本卡）

C14 的源码侧 shipped-shape 检查一度想新增第 76 道门，被 policy §P2 的 75 道封顶挡住；最终**并入既有
`shipped-links` gate**，没有新增 pre-push 阶段。实测：

- `node checks/run-gates.mjs` ≈ **11.48s**（本卡基线 11.10s；+0.38s，在噪声内）。
- `coverage:ratchet` 本轮 ≈ **20.3s**（本卡基线 21.82s；没有变慢；C14 的 spec 增量被测试并行/波动盖住）。
- 未改 `.githooks/pre-push`、`release.mjs`、`release --check`/`--stamp`、pre-push 六段。
- 本卡两个症状（整链预算、docs-only 收尾的 release 验证摩擦）仍在；状态保持 `调查中`。

C14 的 `release:shape` 新鲜度检查（BUG-227）只看 `sourceFingerprint`，不替代 `release --check`/`--stamp`。

## 处置（2026-11-18）

- **docs-only 收尾已修**：`release --check/--stamp` 新增 docs-only 快速路径（source/pipeline/artifact 未变 + checks 已 pass 时只更新 gitSha，不重跑全量 verify）。prepare-only（checks=not-run）仍必须 verify，这是安全边界。
- **pre-push 46s 预算挂起**：成本-only，不是正确性缺口；并行化收益不确定且会改变失败归因。触发器 = 连续两次 push >60s，或出现真实 push 阻塞投诉。
- 本卡迁 [suspended_bugs](BUG-212-pre-push-and-release-tail-budget-overrun.md)；不是已修。
