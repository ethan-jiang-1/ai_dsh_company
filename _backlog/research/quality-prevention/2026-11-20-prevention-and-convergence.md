---
topic: 从探索补洞转向可积累的质量预防
intent: 对照两组 FAQ 与本仓现有资产，解释补洞循环的结构性原因并提出有边界的预防试点和收敛标准
---

# 质量预防与收敛：先减少正确性义务，再验证承诺

## 1. 本轮判断

**可以把主要发现方式从人工探索前移到设计约束和自动回归；不能用“再加纪律、再加测试数量”直接获得收敛。** 本仓已有共享原语、生成式差分、门禁变异、按面执行和独立盲审。下一步应检验这些资产能否覆盖明确的产品承诺，尤其是必经入口、必要证据、真实消费者和最终结果。[测试宪法：53](../../../docs/testing.md)、[既有治理决定：11](../../../notes/implemented/2026-11-14-institutional-test-ratchet.md)已经要求其中多项，本研究不把它们当作新发明。

**对“没完没了”的解释分两层。** 已能证实的是：部分判据只认识局部输入形状，某些行为测试的题目直接给出路线答案，产品仓的回放也不覆盖公司行为。这些因素使自动绿灯无法承担较强的质量声明。尚不能证实的是：它们各贡献了多少现场缺陷，以及近期错误率是否下降；本轮没有按根因重算历史缺陷或做长期对照。

本轮交付是研究与立项依据，未改变产品、测试政策、门禁或 preset；建议不是已生效规则，也没有把发现自动升级为修复工作项。

## 2. 范围、版本与证据等级

- 日期：2026-11-20，Asia/Shanghai；本仓基线 `936123a6fbff828fde99e99886dacaa2956d959e`；分支 `schemastery`，开始时工作树干净。
- DSH 权威：只读的钉 SHA `b830ec950faba0a46dda564be3e2d854afed94f1`；本轮核对其 HEAD 与零改动。外部 FAQ 是研究线索，不以其链接的 master 充当本仓版本事实。
- 输入：[FAQ30 总览](../../../../deepseek-harness/_faq_on_digested/30_schemastery-basics/answer.md)、[配置设计纪律](../../../../deepseek-harness/_faq_on_digested/30_schemastery-basics/05-practical-design-disciplines.md)、[FAQ31 总览](../../../../deepseek-harness/_faq_on_digested/31_preset-quality/answer.md)、[行为评估](../../../../deepseek-harness/_faq_on_digested/31_preset-quality/03-behavior-evaluation.md)、[长期开发](../../../../deepseek-harness/_faq_on_digested/31_preset-quality/04-long-term-development.md)、[本仓案例审读](../../../../deepseek-harness/_faq_on_digested/31_preset-quality/research-company.md)。原生机制的版本核对见同题材料表。
- 证据分层：读源码确认的判据、本轮两个隔离对照实验、历史 Note 自报的运行记录、未来建议，分别叙述。历史红绿和 FAQ 的实跑记录没有冒充本轮执行。
- 不开展无边界 bug hunt；不跑真模型、浏览器、发布、全局安装或部署。研究验证只检查文档变更与既有 keyless 回归，不评价当前模型的业务能力。

## 3. 已有资产为什么还可能只是在补洞

### 3.1 规则已经相当完整，缺口在承诺如何被证明

| 已有安排 | 本次看到的证据边界 | 对收敛的影响 |
|---|---|---|
| 共享原语 + 同类复发升格 | [既有决定：11](../../../notes/implemented/2026-11-14-test-asset-leverage.md)与[复发规则：30](../../../tests/failure-classes.md)已有；Markdown 的[独立 AST 差分](../../../tests/lib/docs/markdown-shape.property.spec.ts#L85)真在比较结构 | 有能力拦一类错误，但只能覆盖生成器表达的语法和比较的投影；不能据此说所有解析或所有业务行为都受保 |
| 静态 config 必填检查 | [实现](../../../checks/gates/preset-required-config.mjs#L70)收集 config 下任意更深层键；只遍历角色清单，且[跳过无 config 行](../../../checks/gates/preset-required-config.mjs#L80) | “识别到 20 行”不等于每行被正确校验；新增 YAML 形状可能落到旧判据之外，见实验 A |
| 发布证据绑定源码和产物 | [就绪函数](../../../tools/lib/release/readiness.mjs#L71)要求 verify/test 为 pass，再拒绝已出现的非 pass 值；[现有测试](../../../tests/repo/release/docs-only.spec.ts#L59)也以两个键作为全对齐样本 | 同一错误假设可以同时进入实现与测试；缺记录不同于有失败记录，见实验 B |
| CEO 组队真模型检查 | [题目](../../../checks/lanes/product-team-e2e.entry.mjs#L59)指定成员、工具、任务与依赖；[停止条件](../../../checks/lanes/product-team-e2e.entry.mjs#L105)是中间投影出现 | 能证明指定路线和投影接线，不能证明自主选路、最终产物或完成交付；“跑了真模型”仍会证明错命题 |
| 场景同 diff、回放新鲜度 | [当前场景盘面：10](../../../snapshots/README.md)仅 foundation 文件工具合成回放、空壳 UI 金样和入口答卷；[宪法：43](../../../docs/testing.md)明说公司行为回放已移部署仓 | 产品仓缺少可独立复跑的公司任务轨迹；管线可跑不能代替行为覆盖，需有合成场景或可查的外部证据关联 |
| 按面强制选检查 | [注册表](../../../tools/lib/core/asset-lanes.mjs#L367)让 preset 改动跑挂载；[模型行为资产：66](../../../tests/CENSUS.generated.md)仍是手动档 | 是覆盖接线，不自动保证每次行为变化有相应决策和结果评估；不能把选到 lane 等同于验证充分 |
| hook 与 CI | [本地 hook](../../../.githooks/pre-push#L32)跑较多行为检查；[PR CI](../../../.github/workflows/ci.yml#L21)止于 verify，完整干净环境检查另有周期 | 执行位置有已解释的成本取舍，但“本地跑过”“所有提交必经”“干净安装跑过”是不同保证 |

以上既包含已知边界，也包含对照实验。不是七个新 bug 的分诊结果；本轮没有证明用户发布实际受损或历史检查全部无效。

### 3.2 反复补洞的四种结构

1. **输入集合靠人枚举。** 新路径、新目录、新消费者必须再补一行，否则旧检查仍绿。最近的[守卫残余面决定：7](../../../notes/implemented/2026-11-19-guard-residuals-closure.md)已经把多项输入改为目录派生和单一实现，这正是减少未来维护义务的办法；不能每轮再把同一思想写成新制度。
2. **形状或单步矩阵不足以证明跨操作序列。** [startup 形状矩阵](../../../tests/host/contract/startup-state-agreement.spec.ts#L30)和[ledger 非破坏矩阵](../../../tests/host/contract/ledger-state-agreement.spec.ts#L66)已保护有价值性质，但没有因此证明所有“写入→失败→重试→重启”序列。跨时间错误需要在相关 owner 处补操作序列和失败点验证，而非无限加静态形状。
3. **测试保留实现假设。** 实验 B 的二键“成功”样本与实现一致；实验 A 对“同名键存在”的理解过宽。测试可以全部命中仍接受错误。要从承诺独立构造反例，针对关键条件做变异，而不只检查行被执行过。[SQLite 的 mutation 说明](https://sqlite.org/testing.html#mutation_testing)也区分“走过分支”和“该分支影响结果”。
4. **把观察代理量当成最终目标。** 能加载、工具有调用、任务板有边、文件有标题、verifier 说 pass，分别是有限事实。它们替代自主决策或领域成果时，就形成不受测试保护的承诺。[FAQ31 的分层建议：35](../../../../deepseek-harness/_faq_on_digested/31_preset-quality/03-behavior-evaluation.md)明确分开机制、决策和领域质量。

这里的因果关系是有源码支持的工程推断，不是长期缺陷率的统计结论。“探索仍发现 bug”本身也不能证明策略失败：新功能、不同输入范围及更强探索都会改变发现数。

## 4. 应在什么地方预埋保障

优先顺序是：减少状态与分支 → 正确性进入拥有者的必经操作 → 用独立性质与反例验证 → 接到合适执行位置 → 为剩余未知安排有预算探索。每项都复用现有载体。

| 插入点 | 要固定的承诺 | 资产与纪律怎么承载 | 必须能推翻它的反例 |
|---|---|---|---|
| 设计任务时 | 谁拥有状态、谁写、谁读、失败/重启保留什么 | 在现有验收或研究材料写一段；不另建质量台账。先问能否删除副本和额外通知步骤 | 新调用者需要手抄校验/通知才能正确，就还没有把义务收回拥有者 |
| 公共读写/更新操作 | 所有获准调用者经过相同边界；非法输入无未授权副作用 | 复用现有 service/路径原语/typed 状态；单测与跨消费者契约覆盖读、写、mkdir 等真正通道 | 通过另一个公开入口写入、坏状态退化成空值后覆盖旧数据 |
| 配置和组合 | 实际解析、加载、作用域与精确能力集合成立 | 静态检查只承诺其子集；真实 Loader/挂载检查补动态表达式与最终组合 | 顶层缺键却在嵌套处同名、support 漏装、额外写工具泄漏 |
| 持久化和生命周期 | 可接受的终态、非破坏、幂等、旧操作与新操作的时间语义 | 在现有 owner 测试扩展有限状态模型/操作序列；用可控暂停安排时序，少量真进程验证系统边界 | 保存中断、重复请求、取消后落盘、重启恢复、两个写者竞争 |
| 模型输入与执行 | 实际 prompt/tool schema/skill 正文正确，相同历史决策的执行不退化 | 合成任务的组装输入基线 + 当前真实工具回放 + 独立结果断言；沿既有 replay 机制扩展 | 工具漏注册仍刷成 UNKNOWN_TOOL；仅改 persona，回放沿旧调用仍绿 |
| 模型决策与业务成果 | 给目标即可选合理方法；资料缺失时停止，补齐时完成；结果可核验 | 真模型正反题、独立资料/计算/产物验收；保留未用于调优的题，逐例保留首次失败和成本 | 题目泄漏工具路线、一律拒绝拿高分、没有终态或合格产物却判成功 |
| 交付证据与测试自身 | 必要检查全部存在且 pass，证据与所测版本对应 | 复用现有 lane 注册/manifest；消费者验证必要集合，缺失/跳过/超时保持不同状态；变异验证拒绝分支 | 删掉一项必要证据、空选择、runner 不再调用、变异后仍全绿 |

配置校验只能保证声明覆盖的输入条件；工具不暴露、执行器限制和沙箱也各有范围。把可机械禁止的动作交给实际执行边界，可以减少依赖提示词服从；模型的事实判断与业务取舍仍需任务评估。[FAQ30 的质量边界：7](../../../../deepseek-harness/_faq_on_digested/30_schemastery-basics/04-assessing-quality-claims.md)反对由约束推出任意任务都正确。

### 4.1 测试资产应该积累什么

- **例子**留住具体事故；**生成器/参考差分**扩展输入语言；**状态模型**验证动作序列；**定向变异**验证判据；**真实组合**检验生产接线；**合成回放与独立结果验收**保护轨迹；**真模型题**检验当前决策。按失败性质选，不要求每次凑齐所有类型。
- 单一生产原语与独立参考真值并不矛盾。生产消费者共享一个规则；测试的期望来自独立领域规则、参考实现或手工审查的事实。测试仅调用同一生产函数生成 expected，会把同一个 bug 复制成“正确”。
- 独立性取决于期望如何产生与如何评审。合成、authored fixture 可以根据需求独立编写；它不会仅因不是真实录制就失去价值，也不会因目录叫 expected 自动成为独立真值。[当前 fixture 来源声明：18](../../../snapshots/README.md)需逐场景理解。
- 新错误的最小反例回收到已有 owner；可复跑的 seed/步骤与关键版本进入场景自身或现有证据载体。不是每个 bug 新增常驻 probe、一篇制度或一个 runner。[既有资产 ROI 决定：17](../../../notes/implemented/2026-11-10-exploration-asset-strategy.md)已经支持此取舍。
- 状态模型也须有限：只建一个高风险 owner 的测试参考模型，不建设新的产品状态机框架。可参考 [Hypothesis 的操作序列与逐步不变量](https://hypothesis.readthedocs.io/en/latest/stateful.html)，无需因此增加 Python 或新依赖。

## 5. 建议的最小试点与明确出口

这是一份可选实施顺序，尚未授权开工；每个试点能独立验收。建议先 A，再按实际痛点在 B/C 选一个，不同时整仓改造。

### A. 先验证“缺证据不得判就绪”的闭合程度

- 候选 owner：[现有发布就绪函数](../../../tools/lib/release/readiness.mjs#L67)及其消费者。[发布合同：130](../../../docs/contracts/release.md)已有必跑项及 preset/内容改动的条件检查；待核实的是这些义务怎样映射不同模式的 manifest 与消费者判据，不凭本研究另定清单。
- 期望机制：生产者与消费者引用同一份适用检查集合；消费者判断必要集合包含关系与每项结果。未知 schema/版本、缺记录、skip、超时、失败不能被当作该项 pass；不自动扩大每次都要运行的集合。
- 资产：以完整合法 manifest 为正例，逐一删除每个必要键，逐一改为 fail/skip/not-run/timeout，检查错误分类；若允许可选检查，另保留合法省略正例。
- 反证：破坏“必要键存在”的分支，新负例必须红；还原后通过。再经真实发布入口验证缺项拒绝。**研究实验 B 不代替这一步。**
- 出口：实际合同、生产者、两个入口与负例一致；不增门禁文件、探针或第二份检查清单。完成这一条只证明证据完整性，不证明业务结果。

### B. 用一个合成业务任务打通“组装→决策→成果”

- 从[现有组队检查](../../../checks/lanes/product-team-e2e.entry.mjs#L59)的承诺出发，先裁清它要测机制还是自主决策；复用驱动，不保留夸大的名称与注释。
- 固定路线题继续检查机制；另给不泄漏路线的业务目标，配一个只需单职能结果的反题。若产品承诺某种任务关系，再检查该关系；否则允许已认可的多种合理路线。
- 资料与交付验收先写：完成终态、必要文件、内容对应与来源、关键引用或计算、获准目录/原件保护；缺资料版与补齐版成对。不把 exact wording 或 verifier 的 pass 作为成果正确性。
- 首次真模型运行在独立 home/临时 workspace 且有调用、墙钟、成本预算；保留原始结果。工程轨迹可脱敏后接入真实 company-pack 组合的合成回放，最终期望不随 record/refresh 自动更新。
- 出口：同一版本的真实输入、真实执行、独立成果判据可查且可复跑；报告明确区分固定轨迹回放与当前模型决策。小样本仅报告逐题分母，不宣称普遍成功率。

### C. 对一个高风险状态 owner 做有界序列验证

- 根据实际复发根因，选择一个持久化/更新服务；从已有[非破坏矩阵](../../../tests/host/contract/ledger-state-agreement.spec.ts#L66)或生命周期测试扩展，不预先断言全仓缺模型测试。
- 先写三到五条独立性质，例如失败不损旧字节、重复操作幂等、恢复后状态等价、取消后不再提交；按该 owner 合同确定，不能机械套用“全事务回滚”。
- 建议试验预算：100 个固定 seed × 最长 12 步，明确动作与可控失败点；真进程仅覆盖无法进程内观察的路径。将发现缩成可重放的最短步骤；预算是候选起点，先量耗时再决定是否接入既有 lane。
- 出口：已命名状态/转移/失败点都有可解释覆盖，关键性质各有负控，资源清理完成；没有“又跑一轮看看”的必要条件。

## 6. 怎样判断真的收敛、什么时候停止探索

**收敛对象必须是“某版本、某范围的承诺”，不能是整个仓永远零 bug。** 建议用现有验收与证据材料记录，不先造仪表盘。

| 要观察的量 | 怎么解释 | 不能拿什么替代 |
|---|---|---|
| 同类根因是否还从探索逃逸 | 在相近探索预算与范围下，区分已防护类、新类、新功能；记录重复类是否已能自动重现 | 关闭卡数量、累计 bug 数、没有发现就当质量提高 |
| 少维护了哪些义务 | 删除了几份重复规则、手写输入集合、通知步骤或未消费资产；新增消费者能否自动继承保障 | 文件搬家、目录数量或单纯多一道 gate |
| 关键性质是否真能抓错 | 必经入口、配对正反例、核心变异被拒绝，所有适用消费者参与 | 单测条数、行覆盖率、只搜 import 或注释 |
| 业务结果与代价 | 逐题成功/失败/超时/缺证据、首次结果、人工返工、墙钟/调用成本 | 有一次成功、平均分掩盖严重错误、挑最好重试 |
| 资产是否仍被执行 | 适用选择数、执行结果、版本与执行位置能对账，空选择显式不构成通过 | 资产已登记、历史 Note 曾说通过 |

质量验收的出口：本次范围内约定的性质和反例验证完成，适用入口与消费者已有证据，关键变异能杀死，所需业务题达到各自接受条件。探索活动另有预算，到限必须停止并报告已知结论和具体缺口；预算结束、记录了不合格结果都不表示质量验收通过。任何验收条件未达成，不把它塞进未覆盖声明当作完成。

一次有界探索可例如 30 分钟、最多 3 个命名假设，每个假设事先写预期失败类；这是研究建议的起点，不是现行政策或统计阈值。没有新机制线索、只在已保资产的等价类上重复时结束；发现不同根因时记录待研究点，不自动延长本轮。

重新打开的触发是支持范围/组合/模型/上下文策略改变、新用户任务或同类逃逸复发。测试资产随变更复用，探索查剩余未知。[SQLite 的 fuzzcheck](https://sqlite.org/testing.html#the_fuzzcheck_test_harness)从大量探索输入里保留少量有新行为的样本，说明探索可以持续而日常回归有界；本仓不照搬其规模和长期算力预算。

目前没有同口径的跨轮缺陷率与探索工时数据，本轮不能承诺这些试点会减少多少 bug 或几轮后“结束”。试点应先验证自动拦截能力与运行成本，再决定扩面。

## 7. 本轮对照实验：旧判据究竟接受什么

两个实验均在本仓基线上导入现有纯函数/门禁，无 tracked 产品文件改动；进程退出码均为 0，表示实验完成，**不是产品判据已修复**。A 的夹具留在 gitignored `runtime/tmp/quality-prevention/config-YE9Zo9`；长期复现按下面配方重建，不依赖该临时目录存在。

### A. 顶层缺键、嵌套同名键

来源：[必填键收集](../../../checks/gates/preset-required-config.mjs#L67)。执行 `node --input-type=module`，构造隔离 root：

```sh
node --input-type=module <<'JS'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { run } from './checks/gates/preset-required-config.mjs'
const base = resolve('runtime/tmp/quality-prevention')
mkdirSync(base, { recursive: true })
const root = mkdtempSync(join(base, 'config-'))
mkdirSync(join(root, 'vendor/dsh/docs'), { recursive: true })
const catalog = ['<!-- BEGIN GENERATED config-catalog:@research/test -->', '```ts config-catalog', 'export interface Config {', '  requiredTop: string', '}', '```', '<!-- END GENERATED config-catalog:@research/test -->'].join('\n')
writeFileSync(join(root, 'vendor/dsh/docs/config-catalog.md'), catalog)
mkdirSync(join(root, 'packages/company-pack/presets/ceo'), { recursive: true })
for (const key of ['requiredTop', 'other']) {
  const rows = Array.from({ length: 20 }, (_, i) => `- id: row-${i}\n  name: '@research/test'\n  config:\n    wrapper:\n      ${key}: value\n`).join('')
  writeFileSync(join(root, 'packages/company-pack/presets/ceo/agent.cordis.yml'), rows)
  run({ root, ok: console.log, fail: console.error })
}
JS
```

实际输出：`preset-required-config ×20 行（声明了 config 的行，必填字段齐——判据 = vendor config-catalog）`。随后把 20 个嵌套 `requiredTop` 改成 `other`，同一门禁回调报 20 项 `requiredTop` 缺失。

**结论范围：** 证明此静态门对键的归属辨识过宽；20 行下限没有防住。夹具用了合成包和最小 catalog，没有执行真实 Loader，不能据此声称真实 preset 挂载也接受同样错误。

### B. 缺少检查记录与明确失败的区别

从仓库根执行以下命令；输入身份全部是隔离合成值。

```sh
node --input-type=module <<'JS'
import { readinessProblems } from './tools/lib/release/readiness.mjs'
const input = { version: 'research-fixture', sourceFingerprint: 'source', pipelineFingerprint: 'pipeline', artifactSha256: 'artifact' }
const manifest = { ...input, artifact: { sha256: 'artifact' }, dirty: false, checks: { verify: 'pass', test: 'pass' } }
console.log(readinessProblems({ ...input, manifest }))
console.log(readinessProblems({ ...input, manifest: { ...manifest, checks: { ...manifest.checks, preset: 'fail' } } }))
JS
```

实际结果依次为 `[]` 与 `[ 'manifest 有未通过的检查：preset=fail' ]`。[实现](../../../tools/lib/release/readiness.mjs#L71)与[原有成功样本](../../../tests/repo/release/docs-only.spec.ts#L59)均与此一致。

**结论范围：** 此函数没有要求 verify/test 之外的检查记录必须存在；正常生产者仍可能完整执行并生成记录，外层还可能有其他拒绝条件。本轮未构造完整产物与 manifest，没有声称全发布路径可绕过。若要修复，须先对照发布合同与全部消费者分诊。

## 8. 方案取舍与未定问题

- 未选“再全面 exploratory 一轮”：会产生新实例，不能回答哪类义务已被消除；后续探索以已知缺口与预算为入口。
- 未选“一 bug 一 gate/probe”：[既有政策：19](../../../docs/policy.md)已约束总量；优先复用 owner，必要时退役重复资产。
- 未选“全部行为搬进 keyless replay”：它固定旧决策，无法验证新 prompt 对当前模型的效果；也无需把真实部署资料搬回产品仓。
- 未选“每个 PR 全量真模型 + 全安装”：先按承诺选层和适用范围，比较成本；不能拿昂贵当证据充分。
- 未选“再写一份通用质量制度或调度器”：已有合同、完成定义、lane、fixture 与 manifest；本轮建议的价值应由少维护的义务和能自动拦住的反例验证。

仍待确认：最有业务价值的首个合成任务；既有发布必跑合同与不同模式 manifest/消费者的准确映射；部署仓行为资产能否向产品变更提供可查关联；近期同根因逃逸的可比基线。以上是试点前的窄问题，不构成扩大研究或实施范围的授权。
