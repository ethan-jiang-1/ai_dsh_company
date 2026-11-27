---
status: 已修
severity: P1
opened: 2026-11-27
---

# BUG-407：`pre-push` 多面提交仍耗时 3m21s：`vitest related` 与 `targeted` 双次冷启重复跑、`client-load`/`preset` 双次冷启 Web、11 步全串行

> 严重级别：P1（研发效能缺陷：[BUG-406](./BUG-406-regression-coverage-prepush-cpu-saturation-and-timeouts.md) 解决了 CPU 过载与超时假红，但 2026-11-27 真实 `git push origin master` 实测仍耗时 **3m21s（201.2s）**，10 核机器平均利用率仅 ~1.2 核；核心瓶颈从「高并发打满超时」转变为「重复冷启 + 同一批测试跑两到三遍 + 全流程单路串行」）｜发现：2026-11-27｜状态：已修（`a01238c1`）｜审查：agent（3 轮独立只读盲审，末轮 BLOCKER: 0）；去向 = [Note](../../../notes/implemented/2026-11-27-prepush-decouple-live-lanes-and-single-vitest.md)

## 症状

2026-11-27 修复 BUG-406 后首次真实 `git push origin master`（推送 `e662457e..36ee0ef2`，共 23 个提交，命中全部按面步骤 + 3 条 surface lane），实测耗时 **`real 3m21.184s`（`user 3m29.855s`, `sys 0m33.405s`）**，逐段明细如下：

| 阶段 | 实测耗时 | 问题现象 |
|---|---:|---|
| 1. `run-gates`（75 门） | ~10.5s | 串行挡在所有步骤最前 |
| 2. `typecheck` / `lint` / `dup` / `smoke:fast` / `test:checks` | 3.00s + 3.54s + 0.44s + 2.23s + 7.12s = **16.33s** | 5 个互不依赖的只读检查严格逐一串行 |
| 3. `vitest related (52 files)` | **43.27s**（158 份 spec） | 单次冷启展开 158 份 spec（含 `company-static-audit.spec.ts` 10.63s） |
| 4. `vitest targeted (43 targets)` | **41.48s**（86 份 spec） | **二次冷启重跑大量重叠 spec**（同一份 `company-static-audit.spec.ts` 再跑 19.92s、`cultivation-data.spec.ts` 等重复跑）；两轮 Vitest 合计 **84.75s（244 次 spec 执行）**，比单次全量 `pnpm test`（305 份 spec，29.56s）还慢 **2.87 倍** |
| 5. `client-load.entry.mjs` | **22.33s** | 冷启第 1 套完整 `dsh` Web 实例 + Chromium |
| 6. `replay.e2e.mjs` | **10.86s** | 串行排在 `client-load` 之后、`preset` 之前 |
| 7. `preset.entry.mjs` | **47.63s** | **冷启第 2 套完全相同的 `dsh` Web 实例**，再串行跑 11 次 `session/create` + 6 次 `skills/list` |
| 8. Git 网络传输 | ~8.7s | 正常上传 289 objects |

合计 `pre-push surfaces` 自身耗时 **181.91s**，加上前导 `run-gates` ~10.5s 与网络 ~8.7s，一次 push 仍等待超过 3 分钟，明显偏慢。

## 运行面

- **面 = infra / checks / lanes**：
  - [checks/pre-push-surfaces.mjs](../../../checks/pre-push-surfaces.mjs#L214-L269)（`runStep` 全程 `spawnSync` 串行；`L238-L243` 分两次调用 `vitest related` 与 `vitest run`）；
  - [.githooks/pre-push](../../../.githooks/pre-push)（先串行跑完 `run-gates` 再进 `pre-push-surfaces`）；
  - [checks/lanes/preset.entry.mjs](../../../checks/lanes/preset.entry.mjs#L147-L231)（独立 `startWeb` + 串行 `for ... await` 11× `session/create` + 串行 `skills/list`）；
  - [checks/lanes/client-load.entry.mjs](../../../checks/lanes/client-load.entry.mjs#L62-L107)（独立 `startWeb`，与 `preset.entry.mjs` 启动完全相同的 `profile=company` Web 实例）；
  - [tests/tools/company-static-audit.spec.ts](../../../tests/tools/company-static-audit.spec.ts)（同一次 push 中 `lint` 刚跑过 `company-static-audit.mjs --strict`，`vitest related` 与 `vitest targeted` 又各重跑一遍全仓双面扫描）。

## 复现

```sh
# 模拟同时触及 src/client、src/index.ts、src/lib、checks、tools、tests 的 push 范围
source run/env.sh && printf "refs/heads/master %s refs/heads/master %s\n" \
  "$(git rev-parse 36ee0ef2)" "$(git rev-parse e662457e)" \
  | node checks/pre-push-surfaces.mjs --stdin /dev/stdin --exec-plan
```

- 观察输出日志：`vitest related`（43.27s，158 files）与 `vitest targeted`（41.48s，86 files）分两轮执行且重叠文件重复跑；随后 `client-load`（22.33s）→ `replay`（10.86s）→ `preset`（47.63s）依次串行，总耗时 **181.91s**。

## 根因与证据

1. **`vitest related` 与 `vitest targeted` 分两次独立冷启且无去重 / 无全量回退阈值**（占 **84.75s / 42%**）：
   - [pre-push-surfaces.mjs](../../../checks/pre-push-surfaces.mjs#L238-L243) 先 `spawnSync('pnpm', ['exec', 'vitest', 'related', ...])`，成功后再 `spawnSync('pnpm', ['exec', 'vitest', 'run', ...])`；
   - 既不把两次的 spec 集合合并去重到单次 Vitest 进程，也没有在改动文件数/命中 spec 数过高时直接回退为**单次 `vitest run`**（单次全量 305 份 spec 仅需 ~29.5s，远快于双轮冷启 84.75s）；
   - 叠加 `lint` 里的 `company-static-audit.mjs --strict`，同一轮 push 竟然把全仓 TS 静态审计跑了 **3 遍**（3.5s + 10.6s + 19.9s = 34s）。
2. **`preset.entry.mjs` 自身过慢（47.63s）且与 `client-load.entry.mjs`（22.33s）重复冷启两套相同的 `dsh` Web 服务器**（占 **69.96s / 35%**）：
   - 两条 surface lane 都调用 `startWeb({ root, home, port: 0, profile: 'company' })` 各自拉起一遍完整的 `dsh` server；
   - `preset.entry.mjs` 在 [L168-L176](../../../checks/lanes/preset.entry.mjs#L168-L176) 对 11 个 preset 串行 `for ... await` 执行 `session/create`，随后在 [L218-L230](../../../checks/lanes/preset.entry.mjs#L218-L230) 再串行 `for ... await` 执行 `skills/list`（且之前未做逐段打点，尚未量化 `startWeb` vs 11× `session/create` vs `skills/list` 各自占比）。
3. **整条 `pre-push` 链路 100% 串行，10 核机器利用率仅 ~12%**：
   - `verify`（10.5s）、`typecheck`（3.0s）、`lint`（3.5s）、`dup`（0.4s）、`smoke:fast`（2.2s）、`test:checks`（7.1s）、`vitest`、`client-load`、`replay`、`preset` 全用 `spawnSync` 串联，无有界阶段并行调度（例如：前置只读快门禁并行、独立 surface lane 编排或共享 Web 实例）。

## 优化方向（待深研拆解后定案，先立案不越界）

1. **消灭 Vitest 双次冷启与重复执行（立竿见影省 ~50–60s）**：
   - 调研用 Vitest `list` / 单进程合并 `related + targeted` 去重执行，或在 `existingRelated.length + existingTargeted.length` 超过阈值时直接回退单次 `vitest run`（≤30s 封顶，永不再出现“窄测 85s 比全测 30s 还慢”的倒挂）；
   - 审视 `company-static-audit.spec.ts` 与 `lint` 中 `company-static-audit.mjs --strict` 的重复全仓扫描，避免同一轮 push 扫三遍。
2. **深剖并提速 `preset.entry.mjs`（47.63s）与 `client-load.entry.mjs`（22.33s）（目标合计 ≤20–25s）**：
   - 给 `preset.entry.mjs` 与 `client-load.entry.mjs` 补齐阶段打点，定位 `startWeb` 冷启、11 次串行 `session/create`、`skills/list` 各自真实耗时；
   - 将 `preset.entry.mjs` 独立会话创建/查询改为有界并发（保留「并发两会话不串」专测语义）；
   - 当 `pre-push` 同时命中 `client-load` 与 `preset` 时，支持复用同一个已启动的 `dsh` Web 实例（通过 `--base` / `--token` 或共享托管进程），避免双次冷启。
3. **为 `pre-push` 编排有界并行阶段（不踩 BUG-406 CPU 过载红线）**：
   - 在严格总 worker / 进程预算约束下，将互不冲突的轻量检查并行（如 `verify` / `typecheck` / `lint` / `dup` / `smoke:fast` / `test:checks`），让单面改动 push 稳在 **15–25s**、全命中多面大 push 压到 **≤45–60s**。

## 失败类与同类排查

- **失败类**：性能（串行流水线 + 双次 Vitest 冷启重叠 + 双次 Web 服务器冷启，导致多面 `git push` 仍达 3m21s）。
- **与 BUG-406 边界**：BUG-406 解决了「无并发上限打满 CPU 致 30s/90s 超时假红」与基础单测/门禁慢项；本卡聚焦「职责归位（真浏览器/真服务器车道解耦至 `smoke:surface` 与 `release:verify`，每周 CI 另覆盖 `replay` 与 `coverage:ratchet`）+ 单次去重 Vitest + `security-scan`/`preset` 提速」，把多面 push 端到端耗时压入分钟内、日常单模块 push 压至 ~15s。

## 已修判定

- 23 提交全命中大推 `checks/pre-push-surfaces.mjs --exec-plan` 从 181.91s 降至 **53.52s**（零双轮 Vitest、零真浏览器/DSH 服务器阻塞）；
- 单模块代码 push 实测 **14.17s**（免 `DSH_HOME`、免 Chromium）；
- `checks/lanes/preset.entry.mjs` 并发建会话实测 **5.45s**（原 10.80s / push 下 47.63s）；
- `pnpm smoke:surface --dry-run --all` 精准列出 `client-load`/`preset`/`replay`，且 `tools/release/release.mjs --verify` 覆盖全部 3 条 surface lane；
- 全套 `verify` / `typecheck` / `lint` / `dup` / `test:checks` / `notes:audit` / `coverage:ratchet --force` 全绿。

## 修复证据

- 改动面：`checks/pre-push-surfaces.mjs`、`tools/lib/core/asset-lanes.mjs`、`.githooks/pre-push`、`package.json`、`tools/release/release.mjs`、`checks/gates/security-scan.mjs`、`checks/gates/link-debt.mjs`、`checks/run-gates.mjs`、`tools/lib/core/markdown-links.mjs`、`checks/lanes/preset.entry.mjs`。
- 红：`node checks/pre-push-surfaces.mjs --stdin /dev/stdin --exec-plan`（范围 `e662457e..36ee0ef2`，23 提交）耗时 181.91s（`vitest related` 43.27s + `vitest targeted` 41.48s 双轮冷启倒挂全测，且阻塞 `client-load` 22.33s + `replay` 10.86s + `preset` 47.63s）；`node checks/lanes/preset.entry.mjs` 独立耗时 10.80s（push 下 47.63s）。
- 绿：`node checks/pre-push-surfaces.mjs --stdin /dev/stdin --exec-plan`（同范围 `e662457e..36ee0ef2`）降至 **53.52s**（Wave 1 五项 14.67s + 单次 `vitest full` 38.84s，真入口面仅非阻塞提醒）；单模块 `src/client` push 仅 **14.17s**；`node checks/lanes/preset.entry.mjs` 降至 **5.45s**（ALL PASS）；`pnpm verify`（75/75 含 `security-scan` 原生 SHA-1 漂移负控红→绿）、`pnpm test:checks`（11/11）、`pnpm coverage:ratchet --force`（305/305 文件 2910/2910 用例 0 退步）全绿。
- 提交：commit a01238c1
