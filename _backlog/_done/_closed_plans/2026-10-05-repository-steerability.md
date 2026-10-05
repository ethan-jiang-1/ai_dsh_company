# 推敲：仓库可驾驭性与 Agent 可导航结构

> 状态：**已毕业（2026-10-05 用户六项拍板：①毕业拆 RFC ②按卡 7 条粒度 ③run bundle=逻辑合同 ④profiles/company 保留+标记退役 ⑤src/lib 拆分延后 ⑥entry-probe=推荐首跑非强制；毕业前事实核验全过——src README 失效指针与日志世代三处读取点确认，另新发现第四处 authorship-audit 同病）**｜毕业门判断 = 该做（四门全过：问题成立有路径证据；目标可验收；方案可实施；落地通道 = 六条 RFC 已落——test-navigation 已于同日实施迁 implemented/，余五条待用户点名）｜去向 = [入口与运行态地图](../../../notes/proposed/2026-10-05-steerability-entry-runtime-map.md) · [pack 边界](../../../notes/proposed/2026-10-05-steerability-pack-boundaries.md) · [preset/skill/child 矩阵](../../../notes/proposed/2026-10-05-steerability-preset-skill-matrix.md) · [运行态与 run bundle](../../../notes/proposed/2026-10-05-steerability-runtime-runbundle.md) · [日志世代修复](../../../notes/proposed/2026-10-05-steerability-log-generation.md) · [测试导航](../../../notes/implemented/2026-10-05-steerability-test-navigation.md)（已实施，含新 Agent 走查回流）；拆分建议第 7 条（物理目录迁移）按拍板⑤延后——触发条件住 pack 边界 RFC 重启条件节；原阶段 6 收口走查折入测试导航 RFC 验收；实施次序 = 用户逐条点名（D32）

## 背景 / 触发

用户希望同时驾驭项目和 AI Coding Agent：人能够看清运行态、测试、调试、用户交互、agent loop、skills、状态与证据的关系；新 Agent 能沿固定入口判断应该改哪里、如何运行、如何验证，而不是先做一次大范围端到端探索。

本轮只读审查确认：仓库已经有一部分真实职责分区，但“维护资产分类”与“产品运行链可理解性”尚未完全对齐。主要依据：

- 根 [AGENTS.md](../../../AGENTS.md) 与 [docs/project-map.md](../../../docs/project-map.md) 已有入口链，但首次运行仍容易把 `pnpm dsh --profile headless` 误认为完整公司运行。
- `tests/`（company/client/presets/harness）、`scripts/`（smoke/probes/audit/tools/archive）、`snapshots/`（replay/visual/probes/archive/corpora）已是物理存在的职责分区，不应为追求对称而重搬。
- `packages/company-pack/` 同时承载角色配置、host 注册、client 注册、公司读模型和生成的 `lib/`；[src/README.md](../../../packages/company-pack/src/README.md) 还含有不存在的 `routing.ts` 与实际位置错误的 `delegation-keys.ts` 指针。
- 完整 Web 链实际是：`source dev/env.sh` → `pnpm dsh web` → profile bundles/patches → `company-pack` bundle → Web client/host → 人连接 `company-workspace` → `session/create(agentPreset,cwd)` → preset/skills → agent loop → DSH session log → workspace 产物 → replay/audit/snapshot。进程 cwd 不等于会话 cwd；启动成功不等于五角色已经装配。
- 独立角色 preset 与 teammate/命名 child 不同：child 继承 Lead 的组合，角色身份和方法论还来自成员名、任务书、CHARTER/KB；不能从名册角色名推断其加载了对应 preset skills。
- 运行态至少有代码来源、`DSH_HOME`、会话 cwd、证据资产四条轴；另有排练盘、浏览器 localStorage、系统临时目录等出口。`company-workspace/deliverables-archive` 是业务产物历史，`snapshots/archive` 是证据时点副本，两者不能只靠目录名区分。
- 实际开发 home 仍有退役的 `profiles/company`，其 `file:` 复制形状和旧 Web 版本可能误导维护者；文档声称的 `patchReload` 事实与该残留 profile 不一致。
- 同一会话目录可能并存 `session.v3.jsonl.zstd` 与 `session.v4.jsonl.zstd`；`snapshot-motion.mjs`、`session-log-export.mjs`、`deliverables-check.mjs` 当前静态上取第一个匹配后缀，存在读取旧世代而遗漏新事件的风险。
- replay Web lane 的现场和失败诊断部分落在系统 `tmpdir()`/`/tmp`，不完全归入 repo 的开发 home；这必须在运行态地图中诚实呈现，而不能假设所有运行残留都在 `dev/harness-home`。

## 目标

1. 让人和 Coding Agent 共享一个首屏入口，五分钟内能定位“改哪里、怎么启动、状态在哪、用什么证据验证”。
2. 让目录表达稳定 owner：运行代码、角色配置、用户交互、测试、真实驱动、运行状态、排练输入、证据和历史分别有明确含义。
3. 把运行链和状态轴显性化：代码来源、profile/bundle、preset/skill、agent loop、会话、workspace、日志、产物、验证和 snapshot 能互相追溯。
4. 将测试资产组织为“性质 → 最窄检查 → 真实入口 → 证据”的导航，而不是把端到端作为默认唯一反馈。
5. 修复会导致 Agent 走错路或审计错事实的失效指针、过期描述、日志世代选择和退役 profile 风险。
6. 保持 DSH vendor 只读、保持现有稳定命令入口、避免新造调度器、记忆系统或第二套任务流程。

## 非目标

- 不把 `vendor/dsh/` 拆出、复制或直接修改；机制变化走 bundle patch、上游升 pin 或先证伪后自建的既有路径。
- 不因为目录层数多就重写整个包，不把 `tests`、`scripts`、`snapshots` 再按另一套维度重复切分。
- 不把公司 workspace 的业务事实复制到 `docs/`，不把 `snapshots/archive` 当作 live 业务归档。
- 不默认将所有运行状态复制进一个巨大的 `run-bundle/` 目录；先定义引用关系、权威性和生命周期，再决定是否需要物理 manifest。
- 不用 `pnpm test`、静态链接检查或 `--dump-config` 冒充真实 preset 挂载、真实 Web 渲染或会话行为证据。
- 不在本卡阶段删除旧 profile、删除历史快照或迁移既有证据；这些必须有消费面清单、回滚方案和单独授权。

## 目标心智模型

### 1. 四条主轴

| 主轴 | 权威/主要位置 | 生命周期 | 不能从这里推断什么 |
|---|---|---|---|
| 代码与构建 | `vendor/dsh/`、`packages/company-pack/src/`、`packages/company-pack/lib/` | 源码长期存在；`lib/` 为生成产物 | `lib/` 不是源码，源码变更不等于浏览器已重建 |
| DSH 运行状态 | `dev/harness-home/`（以及明确登记的第二 home） | gitignored、按 profile/session 生成 | 不等于公司业务事实，也不等于证据快照 |
| 会话事实与业务产物 | `company-workspace/`，由 session cwd 决定 | live 共享盘持续演进 | 不等于排练盘或历史证据 |
| 验证与历史证据 | `snapshots/<type>/<scene>/` | 按场景/日期冻结或追加 | 场景在 snapshots 中不等于可执行 replay，`expected` 不总是独立 oracle |

补充轴：`dev/rehearsal-workspace/` 是排练输入和排练产物；浏览器 localStorage 按 origin 保存 UI 布局；部分 Web/replay 失败诊断暂在系统临时目录。地图必须明确这些不是同一类状态。

### 2. 运行链

```text
repo package.json
  -> vendor CLI source
  -> DSH_HOME/profile
  -> bundles + profile/home/CLI patches
  -> company-pack manifest
  -> shared host rows + five preset declarations
  -> Web host/client
  -> session/create(agentPreset, cwd)
  -> preset persona/tools/skill discovery
  -> vendor agent loop
  -> session logs + derived projections
  -> company-workspace files and deliverables
  -> smoke/probe/audit/replay/snapshot evidence
```

必须并列说明：headless 通用 CLI、Web 观察窗、独立 preset 根会话、teammate、命名 child；其中“名字像 VP-Eng”不等于“加载 VP-Eng preset”。

### 3. 逻辑上的 run bundle

把 run bundle 定义为一次运行的**可追溯视图**，而不是立即新增一套运行框架。最小字段：`runId`、代码/DSH pin、profile 与 bundle、实际 preset、实际 skill/tool 证据、session ids 与日志世代、session cwd、workspace 变更、产物、验证命令、snapshot/audit 引用、临时出口与保留策略。

优先复用已有 `snapshot.yml`、session log、workspace capture 和审计输出；只有现有场景无法表达这些关联时，才在场景层增加 manifest 字段。live 运行仍以 DSH session 与 workspace 为权威，不能用 run bundle 副本取代 live 状态。

## 分阶段计划

### 阶段 0：冻结基线与事实台账

**目的**：在修改任何路径前，建立当前目录、入口、profile 和状态出口的可核对基线。

**工作项**：

- 盘点根目录和关键子树，标注 tracked、gitignored generated、gitignored runtime、vendor read-only。
- 读取并交叉核对 `AGENTS.md`、`docs/project-map.md`、`docs/profile.md`、`docs/demo.md`、`docs/guides/bootstrap.md`、`docs/testing.md`、`scripts/README.md`、`snapshots/README.md`、pack/src README。
- 显式记录当前 Web profile、退役 company profile、headless 形状、第二 home、rehearsal home、浏览器缓存和系统 tmp 出口；只读审查不得无脑 `source dev/env.sh`，需要运行时用显式子进程环境并记录副作用。
- 为每个事实标 owner、证据来源、当前状态和是否允许改写；历史描述与现在时合同分开。

**交付物**：`docs` 入口现状表、运行状态轴表、失效/漂移指针清单、目录搬迁候选清单。该阶段不移动文件。

**完成证据**：清单能从真实文件反查；所有候选变更都有 owner、消费者、回滚方式和最窄验证。

### 阶段 1：建立人和 Agent 共用的首屏入口

**目的**：新读者不必先跑 E2E 就能建立正确的项目模型。

**工作项**：

- 新增根 `README.md`：只放项目是什么、四条主轴、最小启动路径、常用局部验证和导航链接；不复制完整政策。
- 收紧根 `AGENTS.md` 的入口路由：明确“维护 repo 的 Coding Agent”与“运行在 DSH 会话中的公司角色”不是同一主体；把首次进入、运行 Web、改角色、改 host/client、选测试、查运行态分别指向唯一 owner。
- 将 `docs/project-map.md` 改成稳定地图：首屏放 happy path、headless≠公司 Web、三轴/四轴状态表；详细历史、成本和脚本头注继续下沉。
- 新增单一 owner 的运行态地图（建议新增文件 **docs/runtime-map.md**）：写清 profile、bundle、preset、session、cwd、日志、projection、workspace、snapshot、replay tmp 和 browser state 的关系。
- 增加“错误入口”提示：`pnpm dsh --profile headless` 只证明通用 CLI；当前开发 Web 入口和退役 profile 不混写。

**交付物**：根 README、运行态地图、项目地图首屏重排、入口交叉链接。

**完成证据**：一名未参与本阶段的人或新 Agent 只读这几个入口，能回答五个驾驭问题：启动、修改位置、局部验证、运行卡点、产物/证据来源。

### 阶段 2：显式化 pack、preset、skill 和 agent loop

**目的**：消除“角色名 = preset = skills = child 身份”的错误推断。

**工作项**：

- 为 `packages/company-pack/` 建立清晰的 owner 表：`presets/` 是 persona/skills 声明；`src/` 是自写实现；`lib/` 是生成发布产物；`cordis.patch.yml` 是 bundle 装配；`package.json` 是发布/注入声明。
- 修正 `packages/company-pack/src/README.md` 的失效路径和“host 空壳”描述；分别列 host 注册入口、共享 domain/read-model、client 注册入口及消费方向。
- 给 `lib/` 增加醒目 generated/read-only 说明，说明刷新顺序 `tsc -b packages/company-pack` → tsdown，以及何时必须重建 Web 产物；必要时在 generated 目录放不参与发布的 README/门禁说明。
- 建立 preset/skill/child 矩阵：独立 preset 根会话、CEO Lead、teammate、命名 child 分别说明 persona、工具、skills、cwd、CHARTER/KB、日志和问人权限来源。
- 把实际 skill 生效证据定义为 session header/tool inventory/日志中的可观察事实；`--dump-config` 只证明组合层，不证明会话实际工具/skills 全貌。
- 在 Agent loop 说明中明确：loop 属于 vendor 运行机制；本 repo 负责 preset、bundle、host/client 面和 workspace 约束，不能把公司角色手册当成 Coding Agent 指令。

**交付物**：pack owner README、preset/skill/child 矩阵、agent-loop seam 说明、generated 产物标识。

**完成证据**：新增/修改一个 persona、一个 skill、一个 host 工具和一个 client 页签时，都能给出唯一文件、构建路径和最窄验证；矩阵与实际 preset 注释一致。

### 阶段 3：整理运行态与 run bundle 关联

**目的**：让一次运行的状态和证据可追溯，同时不把 live state、派生索引和历史证据混在一起。

**工作项**：

- 为 `dev/` 增加运行态 owner 说明：当前主 home、第二 home、profiles、sessions、storages、session-search DB、startup logs、replay-runs、tmp、browser state 的权威性与生命周期。
- 明确 `DSH_HOME` 是数据层，不决定代码来源；session cwd 是业务事实层；repo cwd 不是自动公司盘；`profiles/company` 标为退役/非权威，后续决定删除、隔离或保留仅作迁移材料。
- 明确 `company-workspace/deliverables-archive` 与 `snapshots/archive` 的语义，补齐公司手册中仍指向旧 `snapshots/<scene>` 形状的导航。
- 明确排练盘不可写 live 公司盘；系统 tmp/失败诊断/浏览器 profile 的保留与清理策略，避免地图假设“所有状态都在 repo”。
- 设计 run bundle manifest 的最小字段与引用规则，优先扩展现有 `snapshot.yml`/scene README；禁止复制完整 session/workspace 造成第二权威。
- 对 session log 选择逻辑建立统一 helper/contract：同一 session 并存多世代时选择最高支持世代，并在不确定时 fail loud；补 fixture 覆盖 v3+v4 并存、缺失、坏压缩、旧格式回退策略。

**交付物**：dev/runtime README 或等价 owner 文档、run bundle 字段合同、日志世代选择模块/测试、profile 退役处理方案。

**完成证据**：日志导出、snapshot capture、deliverables audit 对同一 fixture 读取同一权威世代；run bundle 能从场景反查 session/workspace/验证；系统 tmp 出口被明确记录或受控重定向。

### 阶段 4：测试资产导航和分层反馈

**目的**：让局部修改有局部反馈，端到端只承担它真正能证明的性质。

**工作项**：

- 新增测试目录说明（建议新增文件 **tests/README.md**）或把测试入口集中到现有测试合同，列出 company/client/presets/harness 各区的 owner、测试对象和不证明什么。
- 在测试导航中建立映射：源码/配置改动 → keyless spec → 装配 smoke → 机制 probe → replay scene → browser/真模型档；继续让每个脚本头注拥有触发条件、成本、状态。
- 区分新快照政策与历史资产事实：新 `workspace.expected` 要声明是否独立 oracle；旧场景是录制副本时在场景 README/manifest 标明，不篡改历史 payload。
- 让已有 `entry-probe-smoke` 成为新 Agent 首跑验收的可选真实入口，但不把它变成新的任务调度流程。
- 为日志世代、退役 profile、失效链接、generated 误编辑、tmp 出口和 preset/child 语义增加结构或 keyless 反证测试；真实 Web/模型检查只在相应改动面触发。

**交付物**：测试资产导航、场景元数据政策、入口探针首跑说明、针对高风险断点的 focused tests。

**完成证据**：一个 client、一个 preset、一个机制 helper、一个运行态脚本改动各有明确最窄检查；`pnpm test` 不吸收真模型/浏览器；`pnpm verify` 能拦住代表性失效指针。

### 阶段 5：物理目录调整（仅在前四阶段证明需要时）

**目的**：让稳定 owner 进入物理结构，避免“文档说清楚但目录仍误导”。

**候选方向**：

- **拟新增的 packages/company-pack/src/host/**：host 注册和工具入口。
- **拟新增的 packages/company-pack/src/domain/** 或 **src/read-model/**：可被 host/client 共同消费的公司逻辑；最终名称由依赖图和 interface 决定，不沿用含糊的 `lib/`。
- `packages/company-pack/src/client/`：浏览器交互与页面注册，保持现有面边界。
- `dev/` 下按启动配置、运行态说明、排练输入、临时输出建立清楚 owner；不把 gitignored session 数据强行提交。
- 测试、脚本、快照继续保留当前按消费职责分区，除非阶段 4 找到真实交叉污染。

**实施规则**：先生成 import/构建/发布/测试消费者图；一次只迁一个 owner；保留或更新必要兼容入口；每次迁移同 diff 更新 README、门禁、spec import 和文档链接；vendor 不动；历史 snapshot payload 不改。

**毕业条件**：目录名比旧名减少推断；至少两个独立消费者通过同一 interface 使用共享模块；迁移后路径门禁、keyless 测试、构建、发布形状和真实入口检查均通过。若目录只改变视觉、不降低错误修改概率，则否决迁移，保留文档标签方案。

### 阶段 6：整体验收与收口

**目的**：确认这是可驾驭能力的提升，不是文档数量增加。

**工作项**：

- 运行结构门禁与 keyless 回归。
- 按改动面运行 pack 构建、entry probe、preset/client 装配、日志导出/audit、必要 replay 和发布形状检查。
- 做一次人类走查：从根 README 进入，启动或定位 Web，不经过全量 E2E 找到一个 client/preset/脚本修改点，并解释状态与证据。
- 做一次新 Agent 走查：给定四个任务（改角色 skill、改 host 工具、改 client 页签、排查会话产物），记录它是否能在限定入口内找到 owner、命令和完成定义。
- 收集剩余发现：文档缺口、机械门禁缺口、运行态事实漂移、需要人裁决的目录迁移，分别回流为新 backlog 卡或 RFC，不在本计划中顺手扩大范围。

**最终交付物**：根入口、运行态地图、pack/preset/skill 矩阵、测试导航、run bundle 合同、失效指针修复记录、验证收据和一份变更 Note。

## 后续 RFC 拆分建议

本卡毕业为“该做”后，至少拆成以下独立 RFC；每条 RFC 自带 owner、非目标、验收命令和回滚方式：

1. **入口与运行态地图**：根 README、AGENTS 路由、project-map 首屏、runtime map。
2. **pack/source/generated 边界**：修正 src README、generated 标记、构建入口与 host/client/domain owner。
3. **preset/skill/child 与 agent loop 可观察性**：矩阵、session tool/skill 证据、文档和 focused check。
4. **运行态与 run bundle**：状态轴、scene manifest、profile 生命周期、tmp 出口与引用关系。
5. **日志世代选择修复**：统一 helper、v3/v4 fixture、snapshot/export/audit 回归。
6. **测试资产导航与历史 oracle 标注**：tests README、场景政策、entry-probe 首跑路径。
7. **物理目录迁移**：只有前述 RFC 后仍存在结构性误导时才批准。

## 风险与取舍

- **文档重复漂移**：根 README 只做入口；当前事实仍有唯一 owner，其他文档只链接。新增每个指针必须说明触发条件和目标用途。
- **迁移破坏消费者**：先做 import graph 和真实构建；不以文件移动成功作为完成定义。
- **run bundle 形成第二权威**：manifest 只引用 live log/workspace/snapshot，不复制或覆盖它们。
- **历史证据被“纠正”**：历史场景保留原 payload，新增元数据说明来源；政策只约束新资产。
- **开发态残留误读**：gitignored profile/home 可作为事实样本，但必须标 current/retired/generated/runtime，不能成为发布源码 owner。
- **验证成本失控**：每个 RFC 选择最窄真实检查；端到端和真模型只在行为/入口契约真正受影响时触发。
- **安全/工具态越界写入**：运行和审查优先显式重定向到 repo gitignored 区；任何系统 tmp、用户 home、浏览器缓存写入都在合同中说明。

## 毕业门

1. **问题成立**：至少有一份独立审查记录确认当前入口、状态或资产边界会导致人或 Agent 误判；本卡已有路径证据。
2. **目标可验收**：目标心智模型、四条状态轴、run bundle 最小字段、preset/skill/child 矩阵和测试分层均有明确完成标准。
3. **方案可实施**：阶段顺序、owner、消费者、验证、回滚和非目标明确；没有依赖未授权的 vendor 改动或全新调度系统。
4. **落地通道明确**：用户确认后，将阶段 1–6 拆成 `notes/proposed/` RFC；每条 RFC 实施完成后更新当前合同/Note，计划卡再迁入 `_done/_closed_plans/`，不让本卡成为第二任务队列。

## 仍待用户裁决

- 是否批准先做文档/入口/事实修复，再决定物理源码迁移。
- `run bundle` 是否仅作为 snapshot/scene manifest 的逻辑合同，还是需要一个独立的可提交 manifest 文件。
- 退役 `profiles/company` 的处理：删除、隔离为历史材料，还是保留但加入机械“不可作为当前入口”标记。
- `src/lib` 是否在依赖图核验后改名/拆成 `host` + `domain/read-model`，还是 generated/owner 文档已经足够。
- 是否把 entry-probe 设为所有新 Agent 的推荐首跑检查，或只作为排查入口。
