---
topic: presets-delegation-architecture
intent: 两个只读实验——用 --dump-config 读真实声明组合（H6）、用归一化矩阵量化底座/delta（H1/H2），回答结构选项在 DSH 上是否可验证、可生成
---

# 组合实验：keyless 声明面读数 + 底座/delta 矩阵

> 两个实验都只读：`--dump-config` 不启动会话、不调模型；矩阵脚本只解析 YAML。脚本与快照在本题目录，
> 不落生产代码。结论仍标事实/推论。

## 实验 A（H6）：`--dump-config` 能读到什么

命令（本仓 dev profile，只读）：

```sh
node --import tsx/esm vendor/dsh/apps/cli/src/bin.ts --profile company --dump-config
```

事实：

- 输出 **2,662 行**，含 profile 的完整插件树；**13 个 `@deepseek-ai/dsh-agent-preset` 行**（4 个 vendor：
  standard/ptc/minimal/cordis；9 个本仓：ceo/vp-eng/vp-sales/coo/cfo/cmo/researcher/SA/SQA）。
- 每个 preset 行的 `config.plugins` 是**嵌套 group**（`cordis:group`），需要递归展开 `config` 数组才能
  拿到真实子行；脚本 [dump-presets.mjs](dump-presets.mjs)（只读）做这件事。
- 展开后的声明面与静态 preset 源**逐项一致**（快照 [dump-presets.json](dump-presets.json)）：

| preset | child rows | subagent 行 | control | workflow |
|---|---:|---|---|---|
| ceo | 29 | 6 命名（research/vp_eng/vp_sales/SA/SQA/vp_cmo） | ✗ | ✗ |
| vp-eng | 32 | generic+fork+SA+SQA+vp_cmo | ✓ | ✓ |
| cfo | 27 | generic+fork | ✓ | ✗ |
| researcher | 5 | — | ✗ | ✗ |
| system-qa | 6 | — | ✗ | ✗ |

- 这说明：**H6 的“声明 vs 实际”矩阵可以做 keyless 原型**——用 dump 读本仓 9 个 preset 的子行，
  与能力清单/期望矩阵比对；能抓到“源 YAML 改了但组合没生效/被 bundle patch 覆盖”的漂移。
- 它**不证明** per-session 实际工具面（`request/header.tools` 要一次模型 turn），也不证明 team 工具
  在根被 shadow（那是安装时行为）。这两项仍需会话级/探针级读数。

## 实验 B（H1/H2）：底座 vs delta 的归一化矩阵

脚本 [composition-matrix.mjs](composition-matrix.mjs)（精确 config）与 [composition-names.mjs](composition-names.mjs)
（按插件名）只读解析 9 个 preset；快照 `composition-matrix.json` / `composition-names.json`。

事实：

- 9 个 preset 共 **186 个子行**，去重后 **29 种 (name, config)**；按**名字**去重是 **28 种**。
- **精确 config 全 9 角色共有只有 3 种**：`persona`（但 prefix 不同……见下）、`tool-fs-search`、`tool-todo`。
  按**名字**全 9 角色共有 4 种：`persona`、`tool-fs`、`tool-fs-search`、`tool-todo`。
  - 差异来源：`persona.prefix` 每角色不同；`tool-fs` 在 researcher 上是 `{write:false,edit:false}`；
    `skill-filesystem` 的 `customSkillDirs` 每角色不同；`agent-instructions` 的 config 相同。
- **22 种名字出现在 6–8 个角色**（time-context、schedule、fs、jobs、goal、plan-mode、compaction、
  skill、ask-user、present、web、bash、browser-use、subagent、control 等）。
- **2 种只在 vp-eng**：`workflow-ptc`、`tool-workflow`。
- 角色 archetype：**6 个“full role”**（ceo/vp-eng/vp-sales/coo/cfo/cmo）有 ~20–29 个子行；
  **3 个 leaf**（researcher/SA/SQA）只有 2–6 个；leaf 没有 subagent/control/workflow。
- delta 的构成（按角色）：persona、skills 目录、subagent 行（toolName/agentPreset/maxDepth）、
  control 两行、workflow 两行、tool-fs 的只读开关、model/agentOptions（当前未设）等。

推论（I）：

- **H1 可行，但不是“复制粘贴消除”**：底座是“full role”与“leaf worker”两个 archetype + 每角色变量；
  生成器需要模板变量（persona 文本、skills 路径、命名委派行、depth、control/workflow 开关、
  model/agentOptions），而不是简单 include。输出仍是自包含 YAML。
- **H2 的能力清单可以直接从 delta 形状长出来**：archetype、channels、depth、worker profile、
  control、workflow、skills、model。矩阵本身就是清单的第一版读数。
- 生成器的**风险**：注释/`!!js` 顺序、生成物可读性、diff 噪音、DSH Loader 对默认值的处理；
  这些要靠“生成后解析回读 + 与现有 dump 比对”的测试，而不是肉眼。
- 在**目标结构未定**之前先写完整生成器是过早优化；本轮只证明“delta 模型覆盖全部行”，
  生成器原型留到方案选定后。

## 两个实验对结构选项的更新

| 选项 | 实验结论 |
|---|---|
| H1 构建期生成 | **可行**；底座=2 archetype，delta=角色变量；需生成后回读测试 |
| H2 能力清单 | **可行**；字段可从 delta 直接提取（archetype/channels/depth/worker/control/workflow/model/skills） |
| H6 面级矩阵 | **部分可行且已原型**：dump-config 读声明面；会话实际工具面仍需一次 turn/探针 |
| H4 worker 组合 | 行级 `agentPreset` 已确认（affordance 材料）；生成器可把 generic 行钉到 worker preset |
| H3 合同单家 | 与生成本无关；词频材料已给证据 |

## 复算

```sh
node _backlog/_archive/research/presets-delegation-architecture/composition-matrix.mjs
node _backlog/_archive/research/presets-delegation-architecture/composition-names.mjs
node --import tsx/esm vendor/dsh/apps/cli/src/bin.ts --profile company --dump-config > /tmp/dump.yml
node _backlog/_archive/research/presets-delegation-architecture/dump-presets.mjs /tmp/dump.yml
```
