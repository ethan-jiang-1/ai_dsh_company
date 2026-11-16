# 2026-11-16 · 维护面根目录三仓统一：从可选远期升为承诺方向

状态：implemented（2026-11-16 方向承诺交付；任务源 = 用户本会话点名「三仓根目录最好一致」并选「先记方向」；**物理迁移未实施**，见未覆盖轴）

> 上游 = 用户 2026-11-16 原话：「最好是调整的一致……不一致的话，人的理解很有可能会有差异……驱动上就可能会出问题」「至少根目录底下的目录是一致的，里头灵活性容许给不同项目」「现在 AI 这边驾驭的还是人……先满足人，同时极度的满足 fresh agent，可以同时存在」「记着我们要调整的时候，每个目录底下定位一定要说清楚，免得含含糊糊的。我们在这儿达成了共识，跑到不同的项目里头，这共识就不见了」。
> 部分取代 [maintenance-surface-declaration-and-migration](./2026-11-16-maintenance-surface-declaration-and-migration.md) 的**改名处置**（「三仓统一改名」由输掉的方案/可选远期 → 承诺方向）；其核心分类法（两层×三面×两轴）与 company P0+P1 落地仍现行。
> 决策台账 = [D64](../../docs/reference/decisions.md#d64)；分类法 = [D63](../../docs/reference/decisions.md#d63)。

## 决定

1. **三仓根目录统一为 checks/probes/tools 是承诺方向**，不再是「可选的远期方向」。根下三面目录同名；**内部子组各仓自由**（根一致、内部灵活）。
2. **补回研究低估的价值轴线**：人仍驾驭 AI，根名不一致 → 人跨仓指挥时心智模型漂移 → 驱动出错。统一根名 = 跨仓共享词汇，**人与跨仓 fresh agent 都省**；面声明 + 例外表 + README 首行 = 每仓局部真相，极度满足 fresh agent。两层叠加，不是「人 vs agent」取舍。
3. **硬顺序：先纯化后统一**（每个目录只装一个动词后再改名，或一个迁移项目里同批）。先改名后拆组 → 统一后的 mixed 目录给人「一致」的**假保证**，比诚实写 mixed 的声明更危险。
4. **仍是独立迁移项目**，需各仓自己的授权；P0/P1 范围不变。成本事实（gate 输入硬编码、`core.hooksPath` 相对路径 → 老 clone 静默丢 hooks、数千处引用、冻结归档靠 redirect ledger）从此是**施工清单**，不是否决票。
5. **各仓起点**：company 已达标（零成本）；bsimulation 的 operate 家 dev/ 最终迁 tools/；deep_research 的 scripts/ → checks/、dev/ → tools/。各按自己那份 reorg handoff 先做 P1 纯化，再统一。
6. **本次落点（立项/交接，不是落地）**：三份 reorg handoff 的「目标名」措辞改为承诺方向 + 顶部方向 banner；研究题名页结论同步；台账加 D64；旧 Note 文首加回链。**不动任何代码、不改任何 exit code、不搬任何文件。**
7. **共识便携 + 每目录定位写清（用户追加）**：共识不能只活在本会话/宿主仓——它随**自包含 handoff** 带进每个仓。每仓落地时，每个根目录的定位（面 = judge/show/operate + 装什么/不装什么 + 例外）必须写进**该仓自己的** surface-contract 与 README 首屏，一眼可判、不含糊。handoff 顶部 banner 携带本义务；实施 agent 只读 handoff 就拿到完整共识，不靠回看本对话。**含糊定位 = 共识跨仓蒸发。**

## 目标根布局（推荐终态）

三仓同一 skeleton（**只统一维护面**）：

```text
<repo 根>/
  checks/   judge    裁决：会红，有人（hook/CI/验收）据此放行/退回
  probes/   show     证据：红了只给人看，不阻塞（analyze/ 收只读分析器）
  tools/    operate  持久状态：run（起/复用进程）/ act（持久改动，需 converge/repair）
  tests/    oracle   非面：pnpm test runner 跑，服务三面，不是第四面
  启动配置   非面     env.sh / overlay 等 sourced 环境，不是入口
```

- **统一范围** = 维护面三目录（`checks/` `probes/` `tools/`）+ `tests/` oracle + 配置非面；产品/源码/文档/记忆等其余根目录各仓自有，**不在统一范围**（别把整个根改成一样）。
- 根名三仓固定；每面目录只装一个动词；**内部子组各仓自由**；例外进该仓例外登记一次（company = [surface-exceptions](../../docs/reference/surface-exceptions.md)）。
- 这是 **P1 纯化 + 改名迁移后的终态**，P0 不改名（决定 3：先纯化后统一）。各仓「现状→目标」映射与待裁选项显式写在三份 handoff 的「目标根布局」节（[company](../../_backlog/research/maintenance-surface-taxonomy/2026-11-16-reorg-company.md) / [bsimulation](../../_backlog/research/maintenance-surface-taxonomy/2026-11-16-reorg-bsimulation.md) / [deep-research](../../_backlog/research/maintenance-surface-taxonomy/2026-11-16-reorg-deep-research.md)）——实施对照用，不许乱发挥。

## 输掉的方案

- **保持三仓根名永久各异**（原 handoff「名字本地化不影响判定」的隐含终点）。否决：fresh agent 读面声明可不糊涂，但人跨仓指挥需要稳定词汇；研究只优化了「fresh agent + 迁移成本」，漏了「人驾驭的一致性」，用户补回。
- **在 P0 里廉价改名求清晰**（盲审撤回的原方案）。仍否决：gate 输入 / hooksPath / 数千引用会静默打断；统一必须走独立迁移项目，不是 P0 顺手。
- **先改名后拆组**。否决：mixed 目录顶统一名 = 假保证（决定 3）。
- **给三面开子目录（checks/judge/ 等）**。仍否决：面是顶层目录，不是目录里的目录（D63 handoff §6）；与根名统一无关。
- **共识只留在对话/宿主仓，handoff 不带每目录定位**。否决：实施 agent 在另两仓只读自包含 handoff、不回看本对话；定位含糊或缺失 → 各仓按目录名猜 → 共识跨仓蒸发（用户点名的风险）。

## 状态事实与载体

- **事实**：维护面分类法 = 两层×三面×两轴（D63 现行）；根目录目标名 checks/probes/tools 三仓统一 = 承诺方向（D64）；company 已达标，另两仓待迁移。
- **唯一入口**：规则 = [surface-contract](../../docs/surface-contract.md)；方向 = 本 Note + D64；施工 = 三份 reorg handoff（[company](../../_backlog/research/maintenance-surface-taxonomy/2026-11-16-reorg-company.md) / [bsimulation](../../_backlog/research/maintenance-surface-taxonomy/2026-11-16-reorg-bsimulation.md) / [deep-research](../../_backlog/research/maintenance-surface-taxonomy/2026-11-16-reorg-deep-research.md)）。
- **读载体 / 写载体**：读 = 人跨仓指挥 + 跨仓 fresh agent（根名）、每仓 fresh agent（面声明 + 例外表）；写 = 另两仓迁移项目同 diff 改 gate 输入 / hooksPath / 引用 / redirect ledger + 重生成库存。
- **环境坏法**：来源 = 先改名后拆组（假保证）；生命周期 = 老 clone hooksPath 静默丢 hooks（迁移须带重装步骤）；内容 = 冻结归档被 sed 改写（须走 redirect ledger）；扫描面 = gate 硬编码路径漏改（红→绿兜底）；便携 = 共识蒸发（handoff 未携带每目录定位 → 各仓含糊落地；banner + 该仓 surface-contract/README 首屏写清挡）。

## 未覆盖轴

- [covered] 结构 / 文档指针门禁：`pnpm verify` 全绿（notes-liveness / notes-tree / notes-supersession / notes-axes / bare-path / md-links / ledger-routing） → `checks/run-gates.mjs`
- [covered] 取代回链：旧 Note 文首出现本 Note 文件名（notes-supersession 红→绿见验证） → `checks/gates/notes-supersession.mjs`
- [policy] **方向承诺已交付，物理迁移未实施**：本 Note 的验收 = 方向记录一致 + 门禁绿，**不是迁移完成**；bsimulation / deep-research 的拆组 + 改名是下游独立项目，需各仓授权 → `_backlog/research/maintenance-surface-taxonomy/2026-11-16-reorg-bsimulation.md`
- [environment-gap] 另两仓的实际盘面与迁移本仓观测不到（跨仓）；company 仓只能改 hosting 在此的 handoff 与决策记忆 → `docs/reference/external-research.md`
- [unprovable] 「统一根名后人跨仓指挥不再漂移」无机械 oracle；这是价值判断，靠迁移后实际驾驭反馈验证 → `_backlog/research/maintenance-surface-taxonomy/README.md`

## 验证

| 判据 | 命令 | 层 / 失败类 / 负控（见过红） | 原话 |
|---|---|---|---|
| 取代缺回链 | `node checks/run-gates.mjs` | 结构 / 文档指针 / 红 | 临时删旧 Note 文首回链行 → `FAIL notes-supersession: notes/implemented/2026-11-16-surface-root-unification-direction.md:6 → notes/implemented/2026-11-16-maintenance-surface-declaration-and-migration.md 缺 \`2026-11-16-surface-root-unification-direction\` 指针`；还原 → 绿 |
| 未覆盖轴前缀 / 锚点 | `node checks/run-gates.mjs` | 结构 / 文档指针 / 红 | 临时把一条前缀改成 `[todo]` → `FAIL notes-axes: notes/implemented/2026-11-16-surface-root-unification-direction.md:34 「未覆盖轴」条目必须带四分类前缀 [covered\|policy\|environment-gap\|unprovable]：- [todo] 结构 / 文档指针门禁…`；还原 → 绿 |
| 结构门禁 | `pnpm verify` | 结构 / 文档指针 / 红已见 | `verify: ALL PASS；2 门无对象（replay-fixture-freshness / replay-ui-freshness）` |

> 失败类 = #12 文档 / 生成物 / 指针（静态门）；本轮零行为变更，不触 preset / host / client 面，故未跑真模型 / 浏览器 / 回归（与 D63 Note 同口径）。
