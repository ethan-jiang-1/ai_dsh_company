---
topic: quality-prevention-repository-implementation
intent: 将本仓跨轮逃逸、现有自动执行链和有界反证收敛成可实施的长期预防方案
---

# 从本仓现状出发：把“已修的例子”升级为“随变更继承的保障”

## 1. 这次要改变的结果

用户 2026-11-20 追加要求：研究必须结合本 REPO，改善“东西写了以后，仍靠没完没了 exploratory test 寻找 BUG”的低质量重复，想清楚后再思考落地。本轮是深化研究与实施交接；未改产品、测试判据、开发纪律或历史卡的状态。

**定性：本仓不缺测试政策；缺的是把一个较宽承诺变成输入域明确、跨消费者、能被反证且随成员增长的可执行资产。** 现有红→绿、覆盖率和具名守卫通常保护了已见样本；它们不能自动替作者决定“所有哪些输入”“未知/缺失怎样处理”“最后哪个消费者需要看见结果”。这三件未定，新一轮就能沿相邻输入轴继续产卡。

因此长期改善分成两个互相依赖的动作：**把正确性责任收回生产 Module；在同一变更里交付能够自动扩张、验证关系和拒绝分支的资产。** 既有制度继续作为入口，不再添一层质量流程或全仓登记表。

## 2. 为什么这是本仓的问题

[四条跨轮链](2026-11-20-recurrence-chains.md)追到 C13–C17 的历史代码和当前 tests。母体为 70 张登记卡、5 批，选4条链定点研究；未把70卡当70个独立根因或真实用户事故。

| 链 | 连续补洞是怎样发生的 | 当前确实做对了什么 | 仍需自动保护什么 |
|---|---|---|---|
| 关键件与 content | 文件存在 → 非空 → 最小 schema → 路径/跨引用/版本 → 两消费者同义 | C17 已让源树和 tarball 同调 [content 合同](../../../tools/lib/company/content-contract.mjs#L258) | 未来成员、整族删除、合法结构中的坏引用；共同实现错误不能靠“两边相等”发现 |
| 发布输入指纹 | 源字节 → dev README 误纳入 → 管线5条 → 漏手册/市场入口 → 目录派生 | [输入集实现](../../../tools/lib/core/pack-source.mjs#L68)已删除同目录新增 `.mjs` 要手记的义务 | 集合每个成员都影响指纹；新增允许成员自动入集；跨目录与子目录的明确边界 |
| presence | 无 revision 的 completed → in_progress → unknown/deleted → gap 传播到 UI | [合并逻辑](../../../packages/company-pack/src/lib/presence/presence.ts#L124)及组件已分别有回归 | 状态×revision关系×未知值的完整有限表，结果追到真实读模型/组件；不能拿状态序冒充时间顺序 |
| catalog final | 不可读 → 零字节 → 纯空白 | [一次 read+trim](../../../packages/company-pack/src/host/ledger/catalog.ts#L74)合并可读性/空白判断 | 小内容域和正文前后空白等关系；可展示不等于领域内容合格 |

这些多是“同失败类的相邻输入逃逸”，并未证明旧红例重新失败。presence 的删除后重建还包含策略改变，不能全部算修复回归。

## 3. 为什么已有纪律没有自动完成这件事

1. [测试宪法：53](../../../docs/testing.md)与[修复方法：75](../../methods/bug-fix.md)已有唯一原语、独立参考/全通道矩阵要求。**无需再宣布同一规则**；需要让修复方案和验收真写出其量词、输入域及跨消费者后置条件。
2. [复发升级：32](../../../tests/failure-classes.md)说连续两轮且只有 example 应升格；[注册表](../../../tools/lib/core/asset-lanes.mjs#L165)却以 smoke/probe 为资产单位，不记录 unit spec 的合同或复发链。实读注册表为30 smoke（29 example、1 generator）、66 probe缺省example；这**不是265份 spec 的形状统计**，不能据此说全仓没有模型/生成式测试。
3. [具名守卫算法](../../../tools/lib/repo/bug-coverage.mjs#L47)识别标题；[棘轮](../../../tests/repo/budget/bug-coverage.spec.ts#L22)保证数量不降、新修卡有名。实读279张已修卡中174张有具名守卫、105张无具名标题；这是保守索引口径，不能把105张当没测，也不能把174张当已消除174类风险。
4. [shipped 正例：82–146](../../../tests/repo/release/shipped-shape.spec.ts#L82)从生产 REQUIRED/EXPECTED 造夹具。这对接线有用，但遗漏必需件时双方会一起变小；完整性必须另有消费者来源的小锚点，而非再手抄全树。
5. 自动执行并不空缺：[pre-push](../../../.githooks/pre-push#L32)已经跑 verify、类型、lint/dup、fast、surface、test:checks、coverage；[门禁自测 runner](../../../tools/repo/run-check-tests.mjs#L14)按目录发现，Vitest[按后缀发现](../../../vitest.config.ts#L19)。**新资产进入既有位置就能继承执行，无须新 runner。** PR CI仍只verify；[干净环境](../../../.github/workflows/fresh-clone.yml#L47)每周/手动另跑全量。成本和环境取舍已在[CI：3–9](../../../.github/workflows/ci.yml)解释，本轮不建议把全量安装/模型塞进每次push。
6. [C16探索卡：26](../../issues/2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md)与[C17：70](../../_archive/settled_issues/2026-11-19-guard-residuals-and-runtime-edges.md)以“至少20张”为目标/停止条件之一。当时有用户明确要求，执行该要求并非违规；但**不能把产卡配额继承为未来默认质量验收**。配额会让成功更像继续找出边角，而非完成某个可复用保护。

## 4. 长期机制落在哪：沿现有入口改变完成条件

下面是建议，尚未生效。用现有验收/修复方案中的一段和测试本身承载，不新增表、卡头字段或格式门禁。

| 时点与现有 owner | 实际要交出的东西 | 自动保障怎样继承 | 不接受什么替代 |
|---|---|---|---|
| 方案形成：[验收设计](../../methods/validation-design.md) | 一条窄承诺：适用输入来源、允许/拒绝/降级结果、最终消费者；说明有限范围与未知态 | 测试按该输入来源遍历；新增成员自动参加，或类型穷尽要求补分支 | “所有都正确”、文件存在、仅命令成功 |
| 修复定因：[bug-fix](../../methods/bug-fix.md#2-confirm-the-cause-and-sweep-the-class) | 对照上轮保证与新反例，指出新轴；说明这次消除了哪项调用者/清单同步义务 | 原语/Module拥有校验、状态提交和失败结果；调用者经过同一 Interface | 跨三个调用者手补三份判断；只留一句“已同类排查” |
| 测试实现：已有 spec 与 checks 自测 | 1个审查过的合法基例；成员变化/关系；必要负控；独立事实锚点 | 遍历生产输入集用于发现成员；期望由领域规则、独立参考或审查字面量给定 | 从生产函数输出推导expected；固定文件列表冒充未来输入 |
| 收尾：[close-out：21–37](../../../.agents/skills/close-out-definition/SKILL.md) | 审阅者检查“删分支/加消费者/删整族后会怎样”，报告所删维护义务与剩余义务 | 沿原有独立盲审和test/test:checks执行；不再重复列一张证明账 | 测试条数、shape标签、具名BUG数、覆盖率代替判别力 |
| 剩余探索：未来探索卡的本轮验收 | 预先命名输入轴/假设和预算，完成判决可为confirmed/refuted/unknown；不设最少BUG数 | 已保护类先用现成资产检查；发现同类逃逸，先深化该owner资产 | 无新输入/无新承诺仍“再来一轮”；预算用完当质量通过 |

具体改法应当**替换**现有步骤中过于宽泛的“同类排查/反例验证”，不要给每次机械小改叠加完整表单。单点业务条件仍可用一个回归例子；出现横切共享语义或同类逃逸时才需要明确输入域/关系/跨消费者资产，沿既有宪法第7条。

输入集合有三种处理，不能混为“全自动”：目录规定的成员可以派生；有限状态/枚举应穷尽或明确缺省；业务必需性需要人确定。`REQUIRED_CONTENT_FILES`仍是最后一种，自动生成inventory不能证明运行时从此不缺能力。第一阶段保留并显式验证该义务，不发明全仓静态依赖推导。

## 5. 本轮有界实验：确认首个切片可行

基线 HEAD `936123a6fbff828fde99e99886dacaa2956d959e`；vendor pin `b830ec950faba0a46dda564be3e2d854afed94f1`；当前包0.11.9。没有改 tracked 源码、现有测试或 `_dist`。

### 5.1 两消费者对12个世界的判别

从当前源content复制普通文件；从当前0.11.9 tarball读取真实非content文本作为基例，content部分按同一变换替换entries/read。源码路径真实调用 [contentProblems](../../../checks/gates/content-manifest.mjs#L42)，tarball路径真实调用 [checkShippedPackage](../../../tools/lib/release/shipped-shape.mjs#L208)。先按合同写期望再执行，非仅检查两边相等。

| 变换 | 预先写定的期望 | 源 / shipped实测 |
|---|---|---|
| 原样；新增非必需普通成员并登记；重命名template并同步引用/inventory/tier | 接受 | 三组均接受 |
| 新成员漏登记；必需templates整目录删除且同步删登记；必需charter纯空白 | 拒绝 | 三组均拒绝 |
| delivery-rules为合法JSON `{}`；template引用缺失；seed target含`..` | 拒绝 | 三组均拒绝 |
| manifest未来版本；inventory重复；tier引用缺失 | 拒绝 | 三组均拒绝 |

**结果：12/12达到预定期望。** 这是当前实现已有能力的证据，不是发现12个新BUG；也不是覆盖了整个输入域。tarball只作为entries/read抽象，没有重打、重压缩、安装或走发布就绪链。

### 5.2 三个拒绝分支是否真起作用

在gitignored目录克隆共享合同及两个消费者，只将消费者的相对import改为绝对URL以加载克隆；tracked文件不变。逐一移除以下唯一锚点：

| 隔离变异 | 对应坏世界 | 原实现 | 变异实现 | 合法基例 |
|---|---|---|---|---|
| manifest版本判断恒false | version=2 | 两边拒绝 | 两边误接受 | 两边仍接受 |
| 反向inventory判断恒false | 新增未登记成员 | 两边拒绝 | 两边误接受 | 两边仍接受 |
| JSON合同调用替成空列表 | delivery-rules=`{}` | 两边拒绝 | 两边误接受 | 两边仍接受 |

**结果：3个负控均被先写的期望区分；正反各跑，共6组通过实验断言。** 说明把这些性质做成常驻资产可以识别对应退化；这不是整仓mutation score，也未证明所有现有测试对这些变异都有效。

两脚本及原始JSON在本机gitignored `runtime/tmp/quality-prevention/`；长期复跑不得依赖它们。下一节给最小可重建命令，完整资产的分期验收见[实施卡](../../issues/2026-11-20-quality-prevention-contract-pilot.md)。没有将临时脚本充当已交付回归资产。

### 5.3 最小重建配方（从仓库根，需现有0.11.9 tarball）

此配方重建三组代表性正反世界，证明两个消费者对其有预期判别；它不代替上面12组或隔离变异的完整实现。

```sh
node --input-type=module <<'JS'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { contentProblems } from './checks/gates/content-manifest.mjs'
import { listContentFiles } from './tools/lib/company/content-contract.mjs'
import { checkShippedPackage } from './tools/lib/release/shipped-shape.mjs'
import { readTarball } from './tools/release/shipped-shape.mjs'
const base = resolve('runtime/tmp/quality-prevention')
mkdirSync(base, { recursive: true })
const source = resolve('packages/company-pack/content')
const texts = Object.fromEntries([...listContentFiles(source).files, 'manifest.json'].map(rel => [rel, readFileSync(join(source, rel), 'utf8')]))
const version = JSON.parse(readFileSync('packages/company-pack/package.json', 'utf8')).version
const pack = readTarball(resolve(`_dist/dsh-company-pack-${version}.tgz`))
const baseline = Object.fromEntries(pack.entries.map(entry => [entry, pack.read(entry)]))
for (const kind of ['baseline', 'future-version', 'unlisted-member']) {
  const map = { ...texts }
  if (kind === 'future-version') { const m = JSON.parse(map['manifest.json']); m.version = 2; map['manifest.json'] = JSON.stringify(m) }
  if (kind === 'unlisted-member') map['generic/research-unlisted.md'] = '# member\n'
  const root = mkdtempSync(join(base, 'rebuild-'))
  for (const [rel, text] of Object.entries(map)) {
    const file = join(root, 'packages/company-pack/content', rel)
    mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, text)
  }
  const sourceAccept = contentProblems(root).problems.length === 0
  const shippedAccept = checkShippedPackage({ pkg: pack.pkg, entries: [...pack.entries.filter(entry => !entry.startsWith('package/content/')), ...Object.keys(map).map(rel => `package/content/${rel}`)], read: entry => entry.startsWith('package/content/') ? map[entry.slice('package/content/'.length)] : baseline[entry] }).length === 0
  assert.equal(sourceAccept, kind === 'baseline'); assert.equal(shippedAccept, kind === 'baseline')
  console.log(kind, { sourceAccept, shippedAccept })
}
JS
```

## 6. 落地顺序：先交付一族，别先治理全仓

**首个实施包选content合同族**：四轮链清楚，当前Module已有两个真实消费者，本轮正反和3个分支负控已验证可行；测试只需沿现有Interface深入，不需发明新生产架构。具体范围和验收住[实施卡](../../issues/2026-11-20-quality-prevention-contract-pilot.md)，这里解释取舍。

- 第一阶段：一个有界的content族矩阵、3个关键变异、真实消费者接线，与现有验收/修复/收尾入口接起来；改动应保留全部旧事故守卫。不会要求所有变更跑全套矩阵。
- 第二候选：发布指纹的逐成员字节变异与未来成员入集，输入域更窄、成本低；独立研究员优先推荐它。先未选，因为本轮对content双消费者/负控已有更完整可行性证据，且它直接对应最多阶段的遗漏合同问题。若content第一阶段过大，**应明确缩成指纹切片再重写验收**，不以玩具版本冒充content已完。
- 后续随下一次相关改动：presence有限状态表与gap消费链、catalog内容域；模型自主选择/领域成果单列任务评估。它们不是现在自授权的整仓执行队列。
- 首轮材料推荐的“发布证据缺项”仍是有效候选，但目前只有共享函数反例，模式/manifest/全部消费者映射未核清；不再把它列成本轮优先试点，避免从窄发现直接改发布合同。

## 7. 怎样知道少了重复劳动

第一阶段看三个可立即证伪的结果：**新增已允许成员无需补一份保护清单；删核心拒绝分支矩阵必红；同一坏世界被所有适用消费者拒绝且合法对应世界通过。** 单有一张矩阵或一个generator标签不算。

运行成本先测同一命令基线/变更后各一次，记录实际枚举数和时间，不凭感觉设“必须少于X毫秒”。快核随test/test:checks；只有额外扩大seed/输入域才用既有generative/weekly，不能把核心拒绝分支藏到每周档。

长期只在现有修复材料记录：逃逸属于已保护轴、从未承诺的轴还是合同变化；自动重现是否已具备；本次还要人同步哪项东西；探索预算和范围。下一次同类逃逸若仍在承诺域内，先查测试没执行、判据共错、消费者漏接或输入域根本没生成，而非又独立补一条spec。无需为了统计复发去回填279张历史卡或制造第二本账。

研究结论的出口已经具备：真实跨轮机制、承载位置、首切片、可执行验收、后续触发与不做项。尚未证明缺陷率下降，须在后续可比变更与探索预算下观察；不能把零新卡当成收益，也不能用此不确定性无限延长本轮研究。

## 8. 本轮研究交付的验证与审阅

2026-11-20，研究与首批卡已登记，题名页为已定性，首批卡已整理为等人拍板，首批范围与拟RFC去向待确认、未批准实施。没有改生效合同/产品源码/常驻测试/门禁/skill，也没有取代既有Note。新材料是研究交接，无需为研究回执另建implemented Note。

| 实跑检查 | 层 / 失败类 | 负控与证明边界 |
|---|---|---|
| `pnpm verify` | 结构 / 规则与归位、引用 | ALL PASS；两项replay freshness无对象，不算行为通过；本轮未改门禁判据，未为文档复做门禁mutation |
| `pnpm test` | keyless / 当前逻辑与接口回归 | 265文件、2324 tests通过，18.33s；证明现有基线未被研究破坏，不证明未来方案已实施 |
| 本文5.1、5.2隔离脚本 | 纯逻辑与消费者接线 / 导出形态、规则合同 | 12世界达到预期；3共享分支变异的正反6组达到预期；坏世界被变异漏过的见证已在原始JSON中观察 |
| 本文5.3原样提取bash执行 | 可复制研究配方 / 两消费者共同content合同 | baseline接受、未来版本/未登记成员均拒绝；3组通过；未执行安装或发布 |
| 独立只读盲审 `b027a7b7-59d8-45e2-94d7-d35cbc7db7a3` | 语义 / 授权、合同、证据分层、Note归属 | blocker=0，建议3项均已收紧首批卡：逐变换/消费者计数、新成员见证；通用skill不固化两个消费者；业务锚点到真实结果/读取路径。审阅者未重跑作者实验，未重算全仓历史统计 |

收割三问：①深化实验未发现预期外产品异常；首轮窄发现仍按原证据边界保留，本轮未开新BUG或冒称修复。②动态成员/关系与分支负控值得常驻，已写入首批卡，但尚未新增常驻资产；本轮资产增量是研究证据和可审方案。③未碰到需新增环境操作手册的运行态事实；vendor tracked树保持干净。未来消费者调用负控仍是首批卡验收，本轮未执行。

现有方法的具体修订、全部动态成员资产、消费者接线变异、成本前后比较属于未来实施；模型/浏览器/发布未执行且非本轮研究验收。下一步是采用或调整首批卡范围，再依实际授权实施，不继续无界找BUG。
