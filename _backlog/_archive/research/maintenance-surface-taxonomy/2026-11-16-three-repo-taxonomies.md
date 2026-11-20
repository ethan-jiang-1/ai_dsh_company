---
topic: maintenance-surface-taxonomy
intent: 记录三仓维护面分类法的事实、三条轴与「一目录一动词」候选，供下一轮用反例检验
---

# 三仓维护面分类法：事实、轴与候选（第一轮）

> 范围：只比**可执行入口**那一层（脚本/工具/探针/门禁）。`tests/`、`snapshots/`、`runtime/`、`packages/`、`docs/`、`_backlog/` 不参与这次比较。
> 方法：只读比对三个仓的目录、README/AGENTS 原文与生成库存；没有跑它们的运行态。跨仓路径用绝对路径，避免本仓链接门禁误判。

## 0. 先定尺子

「哪个更有道理」不能靠目录名顺眼。用四条可检验的尺子：

1. **可判定**：给一件新资产，只问一个问题就能定家，两个人同答案。
2. **稳定**：不随条目数量、文件名潮流漂移（`scripts` 这种形态词会漂）。
3. **可发现**：站在目录里就能找到规则，不必读四份 README。
4. **迁移代价**：改顶层要动多少引用（本仓 2026-10-07 顶层化动过 ~350 处活跃引用，是真成本）。

## 1. 盘面事实

| 仓 | 顶层维护面 | 每面实际装什么 | 规模 |
|---|---|---|---|
| 本仓 `ai_dsh_company` | `checks/` `probes/` `tools/`（+ `run/`） | checks = gates 75 + lanes 32 + audit 7 + lib；probes = 59 支四域；tools = dev 6 / observe 7 / repo 11 / release 3 + lib 63 / drivers 4 / archive 2；run = env.sh + overlay | 公开入口 126 |
| `ai_dsh_bsimulation` | `checks/` `probes/`（+ `dev/`） | checks = verify / gates / quality / release / audit / backlog / openspec / test / build / evidence / mutants / report（12 子目录）；probes = cdp / e2e / session；dev = env/gui/headless/vendor-build/hooks；`runs/` 是工作区 | checks ~70 件，probes 15 件 |
| `ai_dsh_deep_research` | `probes/` `scripts/` `dev/` | probes = behavior / browser / stream + 生成索引；scripts = verify / smoke / test / run-gates / run-ops / dist + lib；dev = env / boot-run / run-driver / hooks / overlay 生成器 | scripts 152 件，probes 8 件 |

**第一个修正：三仓其实都是三个可执行面**，不是 2 vs 3。`ai_dsh_bsimulation` 也有 `dev/`；差别是你数不数它。本仓没有顶层 `dev/`，因为环境面被拆成 `run/`（tracked 启动配置）+ `tools/dev/`（脚本）。所以「2 个还是 3 个」这个分歧本身就是分类法没定死的症状：**`dev/` 算不算一面，三仓没共识**。

## 2. 三种切法 = 三条轴

- **本仓：按消费者/用途切**（验证 / 调试 / 维护）。三个词都是动词，但「维护」混了看和做。
- **`bsimulation`：按谁跑切**（机器 `checks` / 人 `probes`）。运维（build/release/backlog/openspec）因为也是机器跑，被折进 `checks`。
- **`deep_research`：按工作流阶段切**（`dev` 跑起来 / `scripts` 自动化 / `probes` 观察）。顶层 `scripts` 是**形态词**，不是用途词；真正的分类在它内部 8 个职责组里。

它们不是同一个问题的三个答案。比较前要先承认：**本仓回答「这件东西为谁服务」，`bsimulation` 回答「谁按按钮」，`deep_research` 回答「它在流程哪一步」**。

## 3. 三仓共享的不变量（比差异更值钱）

1. **probes 永远是独立面**，且三仓都明说「探针不是门禁/不是评估面」：`bsimulation` 的 probes 目录 README 原话 "Probes are not gates."；`deep_research` 的 docs/evaluation.md 原话「探针（根 `probes/`）**不是第六个评估面**」；本仓 `docs/testing.md` §1.1 把它列为「手动诊断证据，不进 `test:*`」。
2. **实现层从不上顶层当门面**：本仓 `tools/lib` + `tools/drivers`；`deep_research` `scripts/lib`；`bsimulation` 的 dev/lib + 它 checks/gates 内的助手。
3. **证据层不参与这个切分**：`snapshots/`、`runtime/` 三仓都有，都不是入口面。
4. **命名契约同源**：`.spec` / `.e2e` / `.entry` 三仓一致（`bsimulation` CHARTER §11、`deep_research` `scripts/README`、本仓 testing §1.1）。本仓只是把 `checks/lanes/` 当作这个契约的目录。

→ 真正要设计的只有**入口层怎么切**。其余三层是给定的，不该拿来当"面数不同"的解释。

## 4. 把四个动词摆出来，违反一目了然

不看目录名，只看资产实际做什么，三仓都有四个动词：**run（把东西跑起来）/ assert（能红的判据）/ observe（看与取证）/ act（改世界）**。

| 动词 | 本仓 | `bsimulation` | `deep_research` |
|---|---|---|---|
| run | `run/` + `tools/dev/` | `dev/` | `dev/` |
| assert | `checks/gates` `checks/lanes` 及会 gate 的 `checks/audit` | checks/verify、checks/gates、checks/test、checks/release（判据半） | `scripts/verify` `scripts/smoke` `scripts/test` `scripts/run-gates` |
| observe | `probes/` + tools/observe/ | `probes/` | `probes/` |
| act | `tools/repo` `tools/release` | checks/build、checks/release、checks/backlog、checks/openspec、checks/evidence | `scripts/run-ops` `scripts/dist` |

按「一个顶层目录只放一个动词」检查，三个仓各有一处（或两处）不满足：

- **本仓**：`run` 被劈成 `run/` 与 `tools/dev/`；`observe` 被劈成 `probes/` 与 tools/observe/；`tools/` 自己又混了 observe 与 act。**三处**。
- **`bsimulation`**：`checks` 混了 assert 与 act（12 子目录就是后果）；run/observe 纯。**一处**。
- **`deep_research`**：`scripts` 混了 assert 与 act；run/observe 纯。**一处**。

反直觉的结论：**本仓的轴最明确（它给动词起了名），但包装最不纯（3 处混/劈）；另外两仓包装更接近一目录一动词，代价是让自动化目录吃掉 act。** 这解释了为什么本仓的边界读起来最费劲——不是名字差，是同一动词被分到两个门牌下。

## 5. 四种候选统一方案

| 方案 | 判别问题 | 优点 | 反例 / 代价 |
|---|---|---|---|
| A 消费者轴（本仓现状） | 失败时谁消费结果？ | 门牌语义强，`checks` 与 `probes` 一目了然 | "人"这一侧劈不开 `audit` 与 `observe`；`tools` 混看与做 |
| B 自动化轴（`bsimulation`） | 机器跑还是人跑？ | 两面最好记 | `build`/`release`/`backlog` 不是判据，`checks` 变杂物间；名字与内容不符 |
| C 阶段轴（`deep_research`） | 在工作流哪一步？ | 与 run 生命周期对齐 | `scripts` 是形态词；答案藏在 8 个职责组和 203 行索引里 |
| D 动词轴（候选） | ①失败意味着什么 ②谁守着它 | 一目录一动词；能一次判掉本仓所有缝（见下） | 需要"主职责"二级规则处理 act+assert 混装件（如 `sync-dsh`）；三仓都要搬文件 |

D 的判定表（建议作为下一轮的试验判据）：

| 输出 | 失败意味着 | 谁守 | 家 |
|---|---|---|---|
| 裁决（红/绿） | 有东西坏了 | hook / CI / 验收 | assert |
| 证据（截图、分布、摘要） | 说不清，不是坏 | 人按需 | observe |
| 世界变更（环境、文件、发布） | 操作没做成 | 维护者 | act |
| 起得来的实例 | 起不来 | 开发者 | run |

用 D 回判本仓的缝：`diagnose` / `orient` / `notes-audit` / `ask-latency` / `propose-sampler` = observe（`--strict` 只是可选裁决，不改变身份）；`coverage-ratchet` = assert（被 pre-push 守）；`cdp-probe` = observe（被 `ui-scene` 消费不改变它的身份）；`ui-scene` = assert；`sync-dsh` = act（改簿记）+ 可选 assert，按主职责归 act。

## 6. 如果 D 成立，三仓各付什么

- **本仓**：tools/observe 7 件 → observe 面；`checks/audit` 里不 gate 的纯报告 → observe；`tools/dev` → `run/`（或保留 `tools/` 但只放 act）。顶层仍是 3–4 个，成员变；引用面按 2026-10-07 的教训是大头。
- **`bsimulation`**：`build` / `release` / `backlog` / `openspec` 从 `checks` 提到 act 面，`checks` 回到纯 assert；2 → 3 面。
- **`deep_research`**：`scripts` 拆 assert（verify/smoke/test/run-gates）与 act（run-ops/dist）+ 共用 lib；顶层 3 → 4 面，203 行索引重写。

共同代价：三仓的生成库存、门禁路径、README 索引、命令字面量都要同 diff 改。这正是"值不值得"的核心，不是分类学洁癖。

## 7. 下一轮要打的靶子

1. **面数由规模决定还是固定？** 给一个可测的升格阈值（条目数 + 独立失败语义 + 独立消费者），否则"三面"只是审美。
2. **`probes` 还是 `observe` 更准？** "探针"暗示插入观察点，但本仓一半条目是读既有日志的离线分析器；`deep_research` 的 `stream/` 干脆是"流取证仪器，不判 PASS/FAIL"。
3. **实现层跟面走还是独立？** 本仓 `tools/lib`、`deep_research` `scripts/lib`、`bsimulation` `dev/lib`；三种答案都活着。
4. **生成库存按面还是按证据类型？** 本仓 `INDEX.generated.md` 说探针 60、`CENSUS.generated.md` 说 59，就是分类法没定死的直接后果。
5. **"面"这个词本身**：`deep_research` 的"面"= 评估等级 L0–L4，不是目录；本仓的"面"= 目录。同一个词两个所指，建议先统一术语再谈统一目录。

## 8. 本轮倾向（不是结论）

- **本仓的轴最接近正确**（按动词切，且已经给动词起了名），但 packaging 不纯：run 与 observe 各被劈成两半，`tools` 混看与做。
- **`bsimulation` 的两面是"act 还没长大"的诚实简化**，但 `checks` 用 12 个子目录证明了它不够用。
- **`deep_research` 的第二层职责分组最值得抄**（verify/smoke/test/run-ops/dist），但顶层 `scripts` 是形态词，把答案藏进了第二层。
- 候选综合：**顶层 = 动词（run / assert / observe / act），第二层 = 职责组；面数不固定，用升格阈值决定 act 要不要单列。** 这条要在下一轮用反例打（现成的反例：`sync-dsh` 的 act+assert 混装；本仓 `read-barrier` fixture 混进入口层）。

## 9. 这一轮的证据边界

- 只读了目录与文档，没有跑另外两仓的 verify/test；它们的门禁是否已经挡住我上面说的混乱，未验证。
- 三仓的"面"数量按我自己的口径数；`bsimulation` 的 `runs/`、`deep_research` 的 `research-workspace/` 是工作区不是面，未计入。
- 本仓的 126 / 59 / 60 来自 `pnpm verify` 与两份生成库存，可复跑；另两仓的规模是 `find` 计数，未过它们的门禁。
