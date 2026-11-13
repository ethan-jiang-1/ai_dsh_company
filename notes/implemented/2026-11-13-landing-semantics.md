# 2026-11-13 · 落地语义修正：AGENTS.md 把“落地/走流程”说清楚

状态：implemented（2026-11-13 落地；验证见下）

上游 = 用户 2026-11-13 两次纠正：「就是走了个流程，你对系统改了啥嘛？啥都没改呀」「按照我们的流程，把这个落地吧——真正的落地，那不就是落地吗？我们流程难道把落地都会理解错吗？」；问题卡 = [落地语义](../../_backlog/_archive/settled_issues/2026-11-13-landing-semantics-agents-md.md)（已结）。

## 决定

1. **“落地”只有一个意思**：系统里出现**可验证的变更**（代码/文档/门禁/模板/技能）+ **实跑证据**。写 RFC、搬卡、归档、做计划都不算落地；只产出文档时必须明说“这是立项/交接，不是落地”。
2. **“走流程”是手段**：门禁/证据用来保证落地正确，不是用流程替代落地。`待落地` = 等授权/等实施，不是“写份 RFC 就算完”。
3. **`去向` 分流**：`rfc` 的卡在**定性出口**离场（RFC 成立），不算过“落地”门；`note` / `implementation` 才要求 `## 落地证据`（改了哪些系统面 + 实跑命令）。
4. **入口可见**：根 `AGENTS.md` 开工路径、`_backlog/AGENTS.md` 五道门、`_backlog/README.md` 落地门、`dev-loop §1` 四处同句；fresh agent 只读根也能复述。
5. **机械面**：
   - 新 RFC（文件名日期 ≥ 2026-11-14）必须有非空 `## 状态事实与载体`；`proposals` 查。
   - 新 Note（日期 ≥ 2026-11-14）必须有非空 `## 状态事实与载体`；`notes-liveness` 查。
   - 新 `待落地` + `去向=note|implementation` 卡（opened ≥ 2026-11-14）必须有非空 `## 落地证据` 且带可执行标记；`backlog-liveness` 查。
   - `## 验收标准` 新卡必须有可执行标记（`pnpm/node/git/rg/source/npx` 命令、`Given/When/Then`、`assert`）；写“测试通过”红。

## 状态事实与载体

- 事实：**“落地/走流程”的语义**（不是某个功能）。
- 唯一入口：根 `AGENTS.md` 开工路径 + `_backlog/AGENTS.md` 五道门。
- 读载体：fresh agent、卡/RFC 作者、门禁维护者。
- 写载体：`_backlog/README.md`、`docs/guides/dev-loop.md`、`_backlog/issues/README.md`、`notes/README.md`、`notes/proposed/README.md`、`notes/AGENTS.md`、`tests/AGENTS.md`。
- 一致性判据：四处入口同句；`rfc` 与 `note|implementation` 的出口物不同；门禁与模板同 diff。

## 输掉的方案

- **只改措辞、不加门禁**：下一轮仍会把“写 RFC/搬卡”当落地；必须有 `## 落地证据` + 可执行标记。
- **直接重命名 `待落地` → `待实施`**：能根治状态名歧义，但涉及 100+ 卡、门禁、模板迁移；本轮先钉定义，重命名另卡评估（`## 未覆盖轴`）。
- **检测“只改 `_backlog/`/`notes/` 的提交”**：会误伤合法的文档任务；不做事后黑名单，改为卡上 `## 落地证据` 自证。

## 验证

| 面 | 实跑证据 |
|---|---|
| 结构门禁 | `pnpm verify` **ALL PASS**（`proposal-scheduled` / `notes-liveness` / `backlog-liveness` 全 PASS） |
| 回归 | `pnpm test` **242 files / 1997 tests passed** |
| 红证 1（RFC 缺节） | `notes/proposed` 下的临时 zz RFC（2026-11-14，已删除） → `FAIL proposal-scheduled: 2026-11-14-zz-no-fact.md 缺非空「## 状态事实与载体」节`；删除 → PASS |
| 红证 2（Note 缺节） | `notes/implemented` 下的临时 zz Note（2026-11-14，已删除） → `FAIL notes-liveness: 日期 ≥ 2026-11-14 但缺非空 ## 状态事实与载体`；删除 → PASS |
| 红证 3（卡验收/落地证据） | `_backlog/issues` 下的临时 zz 卡（2026-11-14，已删除） → `FAIL backlog-liveness: … ## 验收标准 没有可执行标记（命令/脚本/Given/assert）——写「测试通过」不算；… 缺非空 ## 落地证据`；删除 → PASS |

## 未覆盖轴

- **`待落地` 状态名未改**：本轮靠定义 + 门禁消除歧义；重命名 `待落地`→`待实施` 涉及全卡迁移，另卡评估。
- **文档-only 提交无法机械判定**：合法的文档任务与“文档搬运冒充落地”在 diff 上同形；本轮靠卡上 `## 落地证据` 自证 + 人审，不做提交黑名单。
- **旧卡祖父豁免**：2026-11-14 前的卡/RFC/Note 不追查，避免存量红；新写从严。
