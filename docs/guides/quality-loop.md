# 质量环：装方法包、发工、落盘、审计

> 什么时候读：要给一个复杂产出配"一个做、一个验"，或审计一次已经跑过的质量环时。
> 流程的**唯一家** = pack skill `quality-loop`（`packages/company-pack/presets/_shared/skills/quality-loop/SKILL.md`，
> 运行时由角色加载）；本页只写**维护者与 VP-Eng 的操作**：方法包装哪儿、发工怎么发、红怎么读。
> 理由与备选 = [质量环 Note](../../notes/implemented/2026-11-10-producer-verifier-quality-loop.md)；
> 合同（preset 名册 / 委派行）= [presets.md](../contracts/presets.md) / [delegation.md §1](../contracts/delegation.md#1-命名委托工具通道-a)。

## 0. 一句话（次序是硬的）

**先生产、再验证**：`quality_loop_produce` 落盘并收工之后，才发 `quality_loop_verify`。两个一起发出去没有意义
（验证者拿到的是半成品，那是打断，不是复核）；审计会核验证者会话是否在产出者首轮收工之后才创建。

VP-Eng 有两条命名行：`quality_loop_produce`（`quality-loop-producer`，能读能写能跑）与
`quality_loop_verify`（`quality-loop-verifier`，**只读**）——共用 `quality-loop-` 前缀。
它们不带方法——方法由任务书点名 `<pack>@<version>`，两侧各一份同 id 同版本，装在人手里（方法层）。

## 1. 装方法包（starter 或人做）

pack 自带 starter `system-architecture@1.0.0` / `vv-plan@1.0.0`：`pnpm methods:init` 复制到方法层（已存在跳过、不覆盖人的版本；先 `source run/env.sh` 给 `DSH_HOME`）。

自定义包：两侧各一份 `SKILL.md`（同 `method`/`version`，`side` 不同；正文有 check-id 表）：

```sh
mkdir -p "$DSH_HOME/company/methods/quality-loop-producer/<pack>" "$DSH_HOME/company/methods/quality-loop-verifier/<pack>" && cp <pack>/producer/SKILL.md "$DSH_HOME/company/methods/quality-loop-producer/<pack>/SKILL.md" && cp <pack>/verifier/SKILL.md "$DSH_HOME/company/methods/quality-loop-verifier/<pack>/SKILL.md"
```

- 生效：新会话；正文改动同会话下一轮可见；没进 `/cultivation` 名册。starter 不自动生效：不跑 `methods:init` 或任务书不点名 = fail-closed；别把方法写进 preset；参考形状 = `tests/fixtures/methods/dsh-home/company/methods/`。

## 2. 发工（VP-Eng 会话里）

1. 加载 `quality-loop`（它有任务书字段与交接包规则）。
2. 写 `brief.md`（目标/约束/基线/产物路径/方法/轮次上限/验收口径）→ `quality_loop_produce`，**等它这一轮收工**。
3. 产出到了再发 `quality_loop_verify`：**交接包只给**基线 + 产物路径 + 约束 + 方法——不放产出者的推理与自评。
4. 拿回裁决 → **原样**写进 `verdict-r<N>.md` 并带头；写 `dispositions-r<N>.md` 逐条处置。

落盘目录（相对交付目录）：

```
quality-loop/{brief.md, handoff-r<N>.md, verdict-r<N>.md, dispositions-r<N>.md}
```

算/回填头里的哈希（正文口径 = 去掉结尾空白）**只走工具，不手算**：
```sh
node <company-content>/../presets/_shared/skills/quality-loop/scripts/verdict-hash.mjs --fix quality-loop/verdict-r1.md
```
`--body <正文文件>` 只取哈希、`--check <verdict文件>` 核对；脚本随 pack 分发（维护者在仓库内用
`packages/company-pack/presets/_shared/skills/quality-loop/scripts/verdict-hash.mjs`）。**不要用 `tail -n +2 | shasum`**——尾随换行会进哈希，audit 判 `body-modified`（BUG-056 真实事故）。

## 3. 审计（开发侧，keyless）

```sh
source run/env.sh
node probes/team/quality-loop-audit.mjs --self-test                      # 判据自证：红→还原→绿
node probes/team/quality-loop-audit.mjs --workspace company-workspace    # 扫全部交付目录
node probes/team/quality-loop-audit.mjs --deliverable <交付目录>          # 点名一份
```

它核七件事（实现 = `tools/lib/quality-loop.mjs`）：两个独立 activation（session/preset/depth）、
裁决原文（文件 == 头 == child 最终消息）、未被改、处置覆盖、方法配对、check-id 全覆盖、验证者没调 `write`/`edit`/`bash`。

## 4. 红怎么读（常见 code）

| code | 含义 / 处置 |
|---|---|
| `body-modified` | 正文与头里的 `body-sha256` 不符 → 裁决被改过（或头算错）。**append-only**：别修旧的，重开一轮；只是头算错（如 `tail \| shasum` 含尾随换行）用 `verdict-hash.mjs --fix` 重算 |
| `not-verbatim` | 文件正文 ≠ 验证者最终消息 → 不是原文。重贴 |
| `disposition-missing` / `no-dispositions` | 有发现没处置。三选一补齐（已修 / 反驳 / 接受+接受人） |
| `version-mismatch` / `header-method` | 两侧方法不同版本，或头写的方法与方法层实际不符 |
| `checklist-gap` | 方法检查表里有 id 没出结论（缺行 = 不通过） |
| `verifier-wrote` | 验证者会话调了写/跑工具 → preset 能力面被改坏了 |
| `order-violation` | 验证者在产出者收工前就开跑（两条手同时发）→ 重来：先让它收工 |
| `producer-missing` | 裁决头没写 `producer=<产出者 sessionId>` → 补上，否则先产后验无从核对 |
| `session-log-missing`（warning） | 日志已轮转：只核到文件自洽，原文一致性未核。不是通过，也不是红 |
| `carried-forward`（warning） | 复验轮重列了上一轮已处置的发现——闭环陈述，处置仍归上一轮 |
| `post-verdict-unverified`（warning） | 最后一轮处置表标了「未复验」，但裁决后改过产物/稿 → 开 R2，或由授权人接受残留 |

**轮次语义**：处置归**首次提出该发现的那一轮**；`verdict-r2.md` 只补检查表与新发现。裁决原文按轮次**单调向后**对账
（同一 child 续跑时，R1 对应它较早那条正文、R2 对应较晚那条；拿早期草稿冒充后一轮会红）。

## 5. 边界

- **不是运行时 veto**：验证者写不了盘是能力面（缺 `write`/`edit`/`bash`），审计是**事后检测**——父代理理论上仍能改盘，改了就红。
- **不解决同源盲区**：独立性层级 = 上下文独立复核（同模异上下文），对外签字仍归人（`review-protocol.md`）。
- **动态证据靠产出者跑**：验证者没有 bash，跑不了测试；原始输出由 `quality_loop_produce` 交、`quality_loop_verify` 评，拿不到就标"未验证"。
