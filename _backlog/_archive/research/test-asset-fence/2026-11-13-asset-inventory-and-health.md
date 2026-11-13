---
topic: 测试资产围栏复核
intent: 盘点 tests/smoke/gate/probe 的规模、成本与环外健康度，记录可复现的红资产证据，作为围栏修复的事实底稿
---

# 测试资产盘子与环外健康检查

> 口径：只读仓库 + 实跑命令，不改任何测试资产。快层成本 = 本机 2026-11-13 实测；慢层成本 = 脚本头注自述值，标注「未实测」。所有命令都在仓库根、工作树干净的状态下跑。

## 1. 资产盘子

| 资产 | 规模 | 入口 | 角色 |
|---|---|---|---|
| keyless spec | 242 文件 / 1997 tests / 28,005 行 | `pnpm test`（vitest） | 单元 / 组件 / 真文件集成 |
| 结构门禁 | 71 个模块（`checks/gates/*.mjs`；另有 `lib/` 共享判据） | `pnpm verify` | 结构、引用、簿记 |
| 冒烟 | 32 个 `checks/lanes/*.mjs` | 按头注触发 | 装配 / 机制 / 安装 / 浏览器 / 真模型 |
| 盘面审计 | 5 个 `checks/audit/*.mjs` | 手动 | 读真盘出报告 |
| 探针 | 69 个 `probes/**/*.mjs` | 按头注触发 | 窄机制 / 视觉 / 团队行为 |
| 重放 / 视觉夹具 | 1 个 replay 场景 + 1 份 UI 金样 | `replay-smoke` / `ui-scene-smoke --expected` | 会话级回放 / 页签文本金样 |
| 已耗仪器 | 2 个（`tools/archive/`） | 手动 | 归档 |

分区（文件数 / tests）：`harness` 73/662、`client` 62/395、`host` 58/585、`content` 22/61、`lib` 14/156、`presets` 13/138。测试行数仍大于 pack 源码（22,289 行），资产不是「少」，是「形状」。

## 2. 快环成本（实测）

| 命令 | 结果 | 墙钟 |
|---|---|---|
| `pnpm test` | 242 files / 1997 tests passed | **26.04s**（vitest 自报 23.75s） |
| `pnpm verify` | ALL PASS（71 门接线，2 门无对象） | **8.33s** |
| `pnpm typecheck` | exit 0 | **5.36s** |
| `pnpm lint` | 0 warnings | **0.96s** |
| `pnpm dup` | 0 clones | **0.41s** |

五项串行约 **41s**（分项冷测；热缓存 hook 29–35s（两次实测）），这就是当前 pre-push 的默认预算。`.githooks/pre-push` 与 `.github/workflows/ci.yml` 的头注仍写 test ~1.3s / verify ~2s——那是 2026-09-27 的旧读数，与当前实测差约 9 倍；预算叙事也需要一次实测复核。`pnpm test` 的文件跨度分布（并行，求和 > 墙钟）：

| 分区 | 文件跨度和 | tests | 备注 |
|---|---|---|---|
| client | 12.1s | 395 | 单文件 `company-client-composition.spec.ts` 占 8.37s / 3 tests |
| host | 5.8s | 585 | 最大 `catalog.spec` 0.96s |
| harness | 2.2s | 662 | 判据/仓库结构为主 |
| presets | 1.0s | 138 | — |
| lib / content | 0.2s | 217 | — |

**快层里唯一的慢点** = `tests/client/company-client-composition.spec.ts`：3 个用例 8.37s，约占 test 阶段三分之一；第二慢的 spec 只有 1.52s。它跑的是 whole-client 组合（真 `bootClient` × web profile bundle roster），属于「允许在快层、但值得盯」的集成面。

## 3. 慢层成本带（头注自述，未逐条实测）

| 带 | 代表资产 | 头注成本 |
|---|---|---|
| ≤10s keyless | `workflow-contract` / `company-root-process` / `present-catalog` / `gates-negative` / `two-axis-gates` / `snapshot-motion` / `replay` | 0.1–5s；replay 头注 ~2s，本次实测 3.9s |
| 15–40s 装配/机制 | `client-load` 25s、`preset` 30s、`ui-scene` 40s、`client-error-chain` 40s、`multi-window-banner` 30s、`delegation` ~30s | 一条真挂载/真页面/单 prompt |
| 1–2min 安装/恢复 | `company-entry` 1–2min、`concurrent-home` 1min、`external-workspace` 1min、`permissions-recovery` 1.5min、`revoke-recovery` 1min、`profile-row` 1.5min、`isolation-matrix` 1–2min、`interrupted-install` 2min、`upgrade-while-running` 2min | 真 tarball 安装 + boot / 进程 |
| 2–4min+ 发布 | `channel-matrix` 2–4min、`multi-install` 3–4min、`release` 分钟级 | 真安装形状 / 通道 |
| 认证档（真模型） | `probe-smoke`（连通 15–40s / `--full` 5–10min）、`presence-e2e` ~$1、`product-team-e2e` ~$1、`attention-e2e`、`human-loop-e2e` $1–2、`entry-probe` | 真行为，不作迭代门禁 |

形态是：**大量便宜资产 + 一小撮安装/发布重资产 + 一小撮认证资产**。重资产不是默认回归的一部分，方向正确；问题在下面。

## 4. 环外健康检查（实测）

在同一 HEAD、同一环境下抽跑 8 个「便宜且 keyless」的环外资产：

| 资产 | 跑法 | 结果 | 墙钟 |
|---|---|---|---|
| `workflow-contract-smoke` | `node --import tsx/esm …` | 7/7 PASS | 1.08s |
| `present-catalog-smoke` | `node --import tsx/esm …` | ALL PASS | 0.24s |
| `company-root-process-smoke` | `node …` | ALL PASS | 0.46s |
| `gates-negative-smoke` | `node …` | ALL PASS | 0.25s |
| `snapshot-motion-smoke` | `node …` | PASS | 0.25s |
| `two-axis-gates-smoke` | `node …` | **2 FAILURE(S)** | 0.13s |
| `replay-smoke` | `node …` | **1 FAILURE(S)** | 3.92s |
| `candidate-scan-eval` | `node …` | **exit 2**（语料不在盘上） | 0.02s |

8 个里 5 绿、2 红、1 惰性，总成本 **~6.3s**。样本 = 8/32，偏向「便宜 + keyless」，不是随机抽样；它证明这一档有腐烂，不证明 32 条的全貌。这三条都不在 `pnpm test` / `pnpm verify` / pre-push 里，也没有任何门禁检查它们是否还活着。

## 5. 两条红资产的根因

### 5.1 `two-axis-gates-smoke`：负例变异成了空操作

这个 smoke 的判据是「改坏 content/presets 的副本 → 对应 gate 必须红」。实测 5 个用例里 2 个红（2 个真副本绿 + 1 个负例绿 + 2 个负例红）：

- **品类表加无类型包的行**：smoke 往 `product-definition/SKILL.md` 插入 `references/project-services.md` 行，靠替换 `| 硬软一体产品 |` 定位。但该表已英文化，现行行是 `| Hardware-software product |`（`SKILL.md:36`）；替换不命中 → 文件没变 → gate 仍 OK → smoke 期望的「宣告了不可执行的类型」永远不出现。
- **删 meta 交付模式字段**：smoke 删 `^交付模式:.*$` 行；现行模板已 canonical 英文化为 `deliveryMode:`（`templates/meta.md:22`）；删除不命中 → gate 仍 OK。并且 smoke 期望的报错文案仍是旧的「缺「交付模式:」字段」，而 gate 现在报「缺「deliveryMode:」字段」——即使 mutation 命中，谓词也匹配不上。

结论：**不是 gate 变弱，是负例夹具停在旧语言上**。这两个 mutation 在 2026-11-12 的 canonical 英文化之后就变成了 no-op；smoke 一直「常驻」，一直红，没人看见。

### 5.2 `replay-smoke`：注入面漂移，且静态新鲜度门禁跳过 headless

`snapshots/replay/foundation-workspace/snapshot.yml` 自报 `replayEligible: runnable` + `profile: headless`，资格理由日期 `2026-10-25`。实跑 `replay-smoke` 报「归一化日志零 diff」失败，首差在 session#0 第 10 行；差异文本是技能目录内容（期望里有 `gate-change-definition`，实际是 `company-ui-change-definition` 等）。`source run/env.sh` 后复跑同样失败（3.85s），排除环境前置。

而 `checks/gates/replay-fixture-freshness.mjs` 明确跳过 headless 场景（「headless foundation 场景不注入公司手册——没有注入面可查」）。于是：

- 静态门禁认为「无对象」→ SKIP；
- 唯一会真的跑它的 `replay-smoke` 在环外、没人跑 → 红。

结论：**headless 场景的易变注入面（技能目录，user/message 注入）没有新鲜度检查**；场景的「runnable」资格停在 2026-10-25。`replay-scene-liveness` 的头注已写明它**不证明** `runnable` 真的绿——这是已知边界，不是新洞；但边界这次真的咬到了。`replay-smoke` 另有 `--refresh`（headless authored、无 key、workspace oracle 失败则拒绝）可用。

### 5.3 `candidate-scan-eval`：语料已移出，资产仍标「常驻」

脚本读 `snapshots/corpora/candidate-scan-corpus/cases`；该目录不存在，exit 2。头注自己写「本仓已无该资产，缺则 exit 2」，状态却是「常驻」；`docs/testing.md` 也已写「语料已移出本仓，缺则 exit 2」——文档知道，不一致的是脚本状态字段。这是**惰性资产**：不能跑、没退役。

## 6. 快层不是没有问题：一个值得盯的慢点

`company-client-composition.spec.ts` 8.37s / 3 tests，是唯一超过 2s 的 spec。它证明的是 whole-client 组合（真 `bootClient` × roster），属于快层允许的集成面；但若它继续长，test 阶段会被它拖到 30s+。当前不构成问题，列为观察项，不建议现在动。

## 7. 未测与边界

- 没有跑 1–4min 的安装/发布 smoke，也没有跑真模型档；它们的成本来自头注，不是本机实测。
- `probe-smoke` 裸跑 exit 2；头注前置 = `DSH_HOME` + 已装 pack + 凭据，我没按前置复跑，因此不把它算红/绿。
- 没有跑 `pnpm test:coverage`，不判断覆盖率阈值是否仍匹配。
- 没有审计 69 个 probe 的消费者/新鲜度；只抽了 8 个便宜 smoke。
- 没有验证「两条红资产在最近一次全绿时是否真的绿过」；只证明它们在当前 HEAD 红。
