---
status: 已结
opened: 2026-11-20
---

# 把 content 的跨轮补洞收成随成员增长的合同回归

> 立卡：2026-11-20 ｜ 状态：已结 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：是 ｜ 审查：agent（独立盲审）— 2026-11-20 独立只读子代理归档复核：8 条验收逐条有承接、Note「未覆盖轴」无验收销账、去向 note 与两条 Note 成立、迁档/索引/链接闭合，0 BLOCKER；实施期独立审 `6c46964c` / `c20e19ec` / `a8b73d33` 见实施 Note
>
> **结论/去向**：note — [实施Note](../../../notes/implemented/2026-11-20-quality-prevention-contract-pilot.md) + [bootstrap 局部试点 Note](../../../notes/implemented/2026-11-20-bootstrap-plan-payload-contract.md)。用户 2026-11-20接受content首批、形成计划并授权自主实施。动态矩阵、独立业务锚点、3共享分支与2接线负控及原开发入口修订已落地；证据与维护边界归Note。
>
> 来源：用户 2026-11-20「这个研究要结合本 REPO……再挖挖看本着现状如何改善，想明白后/研究清楚后，我们需要思考如何落地」；研究题 = [quality-prevention](../research/quality-prevention/README.md)。
>
> 用户 2026-11-20 追加确认：研究后的内容最终通过本卡承接落地，研究结论、后续取舍和实施进展必须同步更新到这里。
>
> 本卡是本题当前唯一活跃承接卡。首批content实现与证据归实施Note，用户追加的生产源头研究在此保留范围、结论与去向；执行进度归会话plan/todo，不另建执行总账。

> **收口（2026-11-20）**：content 合同族首批与 bootstrap 局部试点均已交付并有独立 Note/提交；追加的生产源头研究已定性（`54880b62`）并以[研究题](../research/quality-prevention/README.md)归档。剩余候选「规则领域解码 / delivery 两读者默认」按卡内「优先级与出口」记为以后做：下一次改动 delivery-rules 或两读者之一、或需删掉重复解释义务时，先按 production-source-design §6 做时间盒可行性实验（负控 + 独立期望 + stop/no-go 判定）；实验与后续实施均需用户另行授权，未授权不排期。本题与卡同批迁档，材料冻结不回填。

## 研究后的结论与取舍

- 本仓已有测试政策和执行链；首批应深化现有合同与常驻资产，使新增成员自动受保护、关键拒绝分支退化可被发现、所有适用消费者持续接线。无需另建门禁层或质量总账。
- 首批建议选 content 合同族：C14–C17 的连续逃逸链清楚，共享 Module 与两个真实消费者已经存在，本轮12组世界和3项分支负控提供了可行性证据。详细依据见[本仓实施研究](../research/quality-prevention/2026-11-20-repository-implementation.md)。
- 指纹逐成员性质是第二候选，输入域更窄；当前先选 content 是因为双消费者与反证证据更完整。若实施前确需缩范围，应先在本卡重写范围与验收，不能把窄切片算作全部完成。
- presence、catalog和模型任务质量按相关变更触发扩面；首轮 required-config/readiness 发现仍需单独核清合同与消费者，不并入本批。探索按命名轴、判决和预算验收，不默认以最少BUG数衡量完成。

## 试点结果、当前研究与下一步

**期望结果：** content 增加一个允许的普通成员、已有成员变空/缺失、跨引用失效或共享合同分支退化时，现有自动回归能够沿同一个输入域发现变化；不用等下一轮人工 exploratory 为它再开一张相邻样本卡。对不能自动推导的业务必需性，保留明确的人工责任和独立事实锚点。

**研究阶段情况：** C14–C17 从“存在→非空→schema→跨引用/双消费者同义”连续加深；[共享合同](../../../tools/lib/company/content-contract.mjs)与两消费者已经有价值。本轮研究验证12组世界与3个隔离分支变异可行，详见[实验证据](../research/quality-prevention/2026-11-20-repository-implementation.md)。现有回归大多仍是具名样本；生产 REQUIRED 派生的正例不能独立证明必需全集。

**追加研究结论：** 首批content试点提交为 `d8b07b5c`；随后按用户指令形成[生产源头研究](../research/quality-prevention/2026-11-20-production-source-prevention.md)。当前生产已有不少集中owner与边界保护；可行手段是原始规则转已验证领域值、用联合类型排除非法计划组合、减少降级证据复制。源码审阅与compiler可行性负控支持局部收益，不证明已有产品bug或总体缺陷率改善。

**源码试点：** 研究提交为 `b0d88f4b` 后用户「继续」，会话明确承接bootstrap局部类型试点，用户随后再次要求继续。当前两个计划生产者与执行者均改用显式payload联合，删除创建文件缺来源兜底与双来源优先级，skip不读取载荷；内部计划形状收窄，原落盘与文件系统检查保持。决定与实跑证据归[源码试点Note](../../../notes/implemented/2026-11-20-bootstrap-plan-payload-contract.md)。

**生产源头深化结论：** 用户重申「改完了提交之后……research一下，在生产源头是不是有手段……更容易防范」；bootstrap试点 `a542d799` 仅覆盖局部内部构造，不能替代该问题。[深化研究](../research/quality-prevention/2026-11-20-production-source-design.md)按历史A/B/C/D链核对：集合派生、catalog一次可用性判断、presence降级传播已在生产起作用；新增规则领域解码最值得评估，但不是已证实故障或自动实施项。

**优先级与出口：** 先明确delivery两读者的合法默认、字段引用与不同失败政策，验证纯领域解释能否集中且不制造源码/构建循环；TS局部共享与工具/运行时真共享收益分列，实验需负控、独立业务期望与停止条件。B/C/D按新目录、新原因/消费者、第二个同语义读取者出现时再深化；不泛化成全仓schema/依赖图/事务重构。作者未来改动先画输入→拥有者→消费者、定义失败后状态，再证明少维护哪份事实。研究不自动授权生产变更，总体缺陷率改善未证明。

## 用户确认与下游申请

- 申请日期 / 接收方：2026-11-20 / 用户。
- 受理与授权：用户明确接受content首批、整理计划并自主落地直至产出，实施记录为[已交付Note](../../../notes/implemented/2026-11-20-quality-prevention-contract-pilot.md)。
- 已确认：研究结合本仓、以本卡承接、范围为content合同族及相关维护入口，质量以实跑证据为准；不另开指纹/presence/catalog实施队列。
- 当前追加：生产源头研究已独立提交；用户「继续」后承接研究推荐的bootstrap局部试点。仅排除非法内部计划组合，不扩到delivery/presence/catalog重构；本卡保留研究与两批实施的真实去向。
- 关闭（2026-11-20）：不另提交申请——剩余候选按触发再开新卡引用本卡与归档研究；本卡去向 = note（两条实施 Note），不再等待下游受理。

## 范围与排除项

**范围：** 一个 content 合同族的动态成员矩阵、独立关键事实锚点、源树与 shipped 两真实消费者接线、3个核心分支负控；把“输入域/消费者/独立期望”的选择与收尾检查放进现有验收、修复和收尾入口，成为后续相关变更的做法。

**排除：** 不改用户产品语义、角色内容或模型路线，不自建 schema 框架，不加 gate/probe/runner/合同总账，不回填279张历史卡，不把所有 spec 都登记 shape，不改 CI 安装策略，不执行真模型/浏览器/发布，不以本卡顺便修复初轮的 required-config/readiness 发现。若测试发现需改变产品合同的情况，单独分诊；不能靠更新 expected 消掉失败。

## 已知与未决

- [跨轮依据](../research/quality-prevention/2026-11-20-recurrence-chains.md)区分“旧bug回归”“相邻输入逃逸”和策略变化；本卡针对第二种，不夸称所有近期缺陷都是同一bug复发。
- [共享实现](../../../tools/lib/company/content-contract.mjs#L258)拥有inventory、版本、必需件和跨引用；[源树门禁](../../../checks/gates/content-manifest.mjs#L42)另有tier预算；[shipped消费者](../../../tools/lib/release/shipped-shape.mjs#L208)另有包元数据。只要求共同content合同的接受/拒绝一致，错误文字和消费者额外规则无需逐字相同。
- REQUIRED仍需按真实读取面维护；inventory随盘面生成不能证明删掉的能力仍存在。少量独立锚点应来自已确认消费者需求，不手抄第二份完整必需清单。
- 本卡内常驻资产必须可从tracked源及合成内存包重建，不能依赖本机 `_dist` 或 `runtime/tmp`。临时真实tarball实验只作为可行性证据。

## 方案与取舍

### 1. 在已有测试里表达输入域与关系

沿 [content-contract.spec.ts](../../../tests/tools/content-contract.spec.ts)扩充共享逻辑检查；沿 [gates-negative.test.mjs](../../../tests/checks/gates-negative.test.mjs)组织两消费者的content矩阵。按仓库分层，Vitest不import gate/CLI入口，node自测可调用真实门禁纯入口与shipped纯函数。共同夹具若确有两个消费者才抽入 `tests/support/`，只存世界构造和独立期望，不生成生产判据。

矩阵输入来源、操作和预期如下：

| 输入域/变换 | 预期 | 怎样跟随新增成员 |
|---|---|---|
| 当前inventory逐件删除，登记保留 | 拒绝缺文件 | 直接遍历合法基例inventory；非空选择且断言实际执行数 |
| 当前REQUIRED逐件删除，且同步移除inventory/tier；必需目录整族删除并同步登记 | 拒绝缺必需件/必需族 | 遍历已承诺必需集/派生目录；另有消费者来源字面锚点防清单一起缩小 |
| 当前inventory普通文件逐件替换空/纯空白 | 拒绝空内容 | 枚举源树成员；不新增第二份成员表 |
| 新增安全普通成员并登记；同一成员不登记 | 前者接受、后者拒绝 | 测试构造之前不存在的成员，不能只挑当前固定路径 |
| 非REQUIRED template同步改名并更新所有content内引用/登记；仅改引用指向缺件 | 前者接受、后者拒绝 | 遍历delivery文档引用并明确可改名子集；必需名变化不适用此正性质，保留字面正反例 |
| seed source/target，delivery entry/template，check-rules layers/files/defaultLayers | 合法对应关系通过，越界/断引用/覆盖失配拒绝 | 3类JSON按现有读取合同分别生成，不从被测输出求expected |
| manifest版本、inventory重复、tier断引用、路径跨平台形状 | 合法通过；不支持/不安全/重复/缺件拒绝 | 有限形状域显式列定，避免把无穷字符串域宣称穷尽 |

不要对所有域做笛卡尔积。单轴变换先隔离归因，少量组合只覆盖真实依赖；每个变换同时有合法基例，避免“一律拒绝也全绿”。每个适用变换、每个消费者分别断言枚举计数与对应失败见证，总数非零不能掩盖某一轴空选。新成员先注入合法基例，再进入逐件遍历，删/空/漏登记三种变换都须实际观察到新路径。保留已有BUG具名反例，不用新矩阵洗掉旧红证。

独立事实锚点至少覆盖：CEO章程来自[seed映射：50](../../../packages/company-pack/content/kb-setup/seed.json)及[bootstrap结果断言](../../../tests/host/run-bundle/bootstrap.spec.ts#L84)，应从tracked出厂content经真实bootstrap观察计划/落盘章程或缺源拒绝；既有bootstrap spec自造seed只证机制，不能替代生产映射锚点；seed的 `.dsh-company/kb/process-docs.md` 来自[bootstrap产品类型结果](../../../tests/tools/kb-seeds.spec.ts#L26)；managed-service的交付文档来自[业务规则：5](../../../packages/company-pack/content/delivery-modes/managed-service/delivery-rules.json)，由[真实命令](../../../packages/company-pack/src/host/commands/delivery-command.ts#L140)读取，已有[六份文档结果锚点](../../../tests/host/commands/delivery-command.spec.ts#L122)。实施时沿这些消费者补必要正反世界，不能只 `expect(REQUIRED).toContain(...)`，也不能只跟随生产集合自动改变期望。本卡不承诺自动发现任意新增读取路径。

### 2. 证明关键分支与消费者接线都有效

对共享合同做3项隔离变异：移除manifest版本拒绝、移除反向inventory拒绝、移除JSON合同调用。[现有mutation自测](../../../tests/checks/gate-mutation.test.mjs)只克隆单个gate并将依赖指回原源码，不能直接用来变异共享依赖。本试点应在测试临时目录同时克隆合同与两个消费者，把两消费者的合同import重定向到克隆，其余依赖保留原始解析；或采用等效的测试加载隔离，但不为测试扩大生产接口。每个mutant使用唯一模块身份避免缓存串扰，保留原始`import.meta.url`语义，先断言确实加载mutant，再观察其是否漏收坏世界。本轮临时实验已按这种克隆/重定向验证可行，常驻实现不得依赖临时脚本。锚点必须唯一且存在；没命中算失败。每项均要求：原实现拒绝对应坏世界、变异实现误接受、合法世界在两实现均通过。

同一content世界分别经source gate与shipped消费者；不能拿“直接调共享函数两次”冒充两消费者。接线负控再移除其中一个消费者的共享合同调用，该消费者的坏世界必须被矩阵发现。这样覆盖“合同本身退化”和“消费者不再调用”两种失效；共享实现正确性仍靠独立期望，不能只比两边输出相等。

### 3. 把做法接回已有开发动作

规则的事实家留在[测试宪法](../../../docs/testing.md)，不复制新制度。修改应尽量替换现有模糊步骤：

- [validation-design](../../methods/validation-design.md)：对横切共享语义/同类逃逸，在原验收输入中写明适用输入来源、承诺量词、失败/降级语义、最后消费者与独立期望；普通单点改动不强制新表单。
- [bug-fix](../../methods/bug-fix.md)：既有“同类排查”步骤引用上项；本次与上轮反例差在哪个轴、删了哪项同步义务，写进现有方案/根因段，不另立复发账。
- [close-out-definition](../../../.agents/skills/close-out-definition/SKILL.md)：现有反证/盲审检查对照承诺域、所有适用消费者及其接线负控（本content试点为两个），并报告还需人维护什么；不新增回执列数或第二份证据表。
- 探索任务沿[已有自动化预算政策](../../../docs/policy.md#p3-自动化只许是轻任务硬上限不许无限跑)：在validation-design的适用说明中明确探索按命名轴/判决/预算验收；BUG数量只观察，不默认设最低配额。历史卡不重写，用户后续明确指定数量时仍以用户指令为准。

修改方法/skill前加载相应skill并独立审阅；它们只规定怎样形成/检查证据，具体content输入域住测试。禁止把本研究全文塞入常驻入口。

## 必要步骤与真实前提

[研究与实施建议](../research/quality-prevention/2026-11-20-repository-implementation.md)已完成：12组世界、3项分支负控、独立审阅0阻断，研究收尾verify与265文件/2324 tests通过。这些不是下表的实施证据。

| 候选步骤 | 交付结果与完成依据 | 真实前提 |
|---|---|---|
| 动态成员与独立业务锚点 | 方案第1节；每个适用变换/消费者有计数、新成员删/空/漏登记见证，业务锚点观察结果或拒绝 | 首批范围获确认；tracked基例与合成shipped包均合法，先测窄命令基线 |
| 分支与消费者接线反证 | 方案第2节；3项共享分支和两条调用接线分别有失效见证，合法世界仍通过 | 上一步的独立期望/世界可复用，变异锚点唯一且克隆隔离 |
| 开发入口与持续执行 | 方案第3节；触发/互补两类走查有输出，test/test:checks自动执行，成本比较与独立审阅齐备 | 前两步已证明资产判别力；方法/skill拟改文本完成归位检查 |

这些是同一结果的必要候选步骤，不是独立执行授权。后续研究若改变范围/验收，先同步本卡；进入RFC/Note时在此记录承接去向、边界与未决事项，执行进度不在两处镜像。

## 验收标准

下表为本批原定实施验收，逐项保留；实际完成事实与命令输出记承接Note。不得用研究临时脚本代替常驻检查。

| 命令/位置 | 必须观察的断言 | 红形态/负控 |
|---|---|---|
| `pnpm test tests/tools/content-contract.spec.ts tests/repo/release/shipped-shape.spec.ts` | 确定性合同：各适用变换计数非零；合法成员/非必需template改名通过；旧守卫仍在；期望来自独立规则 | 删除必需件且同步缩登记、合法JSON坏引用；逐轴空选/一律拒绝均失败 |
| `pnpm test tests/host/run-bundle/bootstrap.spec.ts tests/tools/kb-seeds.spec.ts tests/host/commands/delivery-command.spec.ts` | 确定性业务结果：真实源装配CEO章程、产品类型编号合同；managed-service保留独立文档锚点并通过命令 | 缺对应源拒绝；同步删除一项业务必需交付文档及规则时独立字面期望失败；不能只比两个动态清单 |
| `pnpm test:checks` | 同一世界经source gate与shipped消费者达到独立期望；3项分支负控与两个消费者调用负控均可观察 | 阉割对应拒绝分支/共享调用时坏世界漏过，矩阵断言必须红；原实现恢复绿 |
| `pnpm test:checks` + 现有动态成员矩阵 | 测试夹具新增普通成员后，删/空/漏登记自动进入枚举；至少一个原测试未写死的成员被实际验证 | 将枚举改成固定已知样本，新成员见证必须红；空选择不可算通过 |
| `pnpm verify` + `pnpm test` | 文档/回归一致；既有自动发现与pre-push路径仍执行新资产，无额外手动runner | 先用以上负控证明判别力；仅“全部通过”不能替代负控 |
| `pnpm typecheck`、`pnpm lint`、`pnpm dup`（相关代码/测试变化时） | 类型、源码规范、重复检查符合现有完成定义 | 不为矩阵复制多份生产规则，不降阈值凑绿 |
| 方法/skill草案走查（实施时原样使用草案；结果记承接RFC/Note） | 文档/流程：分别给“content同类逃逸”“指纹共享输入变更”生成输入域/独立期望/适用消费者/拒绝或降级证据选择；给“单点文案润色”沿既有最窄检查；本行无需产品模型API | 删除草案中的输入域/独立期望/消费者要求后，上述结果缺项即不合格；润色被强加全族矩阵也不合格；机器不能代判流程合理性，交独立审阅 |
| 独立只读语义审 | 授权/合同/分层/Note四输入；核对上述走查与常驻测试，覆盖所有承诺且未固定样本缩水；人侧只保留范围/授权裁决 | 输入域漏掉、期望同源、少一个消费者、将未来收益写成已实现均阻断 |

成本比较：同一窄命令基线和变更后各测一次，记录枚举数、进程耗时与资源清理；快速核心进入既有test/test:checks。扩大seed等非核心再使用现有weekly。若成本超出迭代预算，优化世界构造/避免反复解包；不能默默把核心负控降为手动。

## 落地证据

- 改动面：`tests/checks/content-family.test.mjs`、`tests/support/content-worlds.mjs`、`tests/tools/content-contract.spec.ts`、`tests/host/run-bundle/bootstrap.spec.ts`、`tests/host/commands/delivery-command.spec.ts`、`tests/tools/kb-seeds.spec.ts`、`packages/company-pack/src/host/run-bundle/bootstrap.ts`、`_backlog/methods/validation-design.md`、`_backlog/methods/bug-fix.md`、`.agents/skills/close-out-definition/SKILL.md`。
- 实跑：`pnpm test tests/tools/content-contract.spec.ts`（11 tests）；`node tests/checks/content-family.test.mjs`（5/5）；`pnpm test:checks`（11 PASS / 0 FAIL）；`pnpm test`（265 files / 2346 tests）；`pnpm verify`、`pnpm typecheck`、`pnpm lint`、`pnpm dup` 通过——证据与未覆盖轴见[实施 Note](../../../notes/implemented/2026-11-20-quality-prevention-contract-pilot.md)。

## 事实与读者

- 事实（拟改变）：content族不只按历史BUG逐例受保；其输入成员和关键关系进入常驻回归；相关开发动作从同一个输入域选择验收。
- 唯一入口：共享content判据Module；两消费者是适配器，维护特有规则。
- 读载体 / 写载体：测试构造世界→源树门禁/shipped纯函数→独立断言；后续开发者读现有验收方法，审阅者读既有收尾skill。
- 环境坏法：文件缺/空/目录/symlink、JSON形状/引用、版本/来源；本卡不把进程内抽象等同于安装全链。

## 抽象度

本卡拟改的是仓库维护方法与收尾流程，不是company角色能力。具体content判据只进其合同测试；通用入口保留怎样选证据与检查后果。

- 换公司要改吗？→ 共同验收/收尾骨架不改；CEO章程、交付模式、业务必需项只影响具体测试与内容合同，不能写进通用skill。
- 换产品类型要改吗？→ 证据选择步骤不改；seed展开与产品类型字面期望随其合同改，留在bootstrap/seed spec。
- 换做法要改吗？→ 会。矩阵、mutation、固定样本属于可替换维护方法，选择住validation-design；skill只检查承诺是否获得相称证据，不强制某一种工具或固定数量。
- 只有机制本身变才改吗？→ 共享content判据与两个适配器的接口/接线随机制改；单家公司/方法数字不进入这些接口。
- 第二消费者：共同步骤分别服务[content合同族](../../../tests/tools/content-contract.spec.ts)与[指纹输入族](../../../tests/repo/release/shipped-shape.spec.ts)，本卡走查两者；源码gate与shipped是content合同的两个适配器，不冒称第二家公司。新增通用包/框架无必要。
- 两测已对拟改骨架做删减：删CEO/managed-service/business-software/3项/2个后，覆盖适用输入与消费者的骨架成立；再删“动态成员矩阵/定向mutation/固定样本负控”，可观察结果、独立期望与触发/互补状态的骨架仍成立。具体方法留低层；本轮未据此宣称skill有效。
- 搬家成本：跨测试/适配器的接口成本高，第一天复用现有seam；方法文本成本低，只修改既有owner，不新抽框架。换方法若仍迫使改preset，即归位错误。
- 红牌自查：通用层不写公司实例/阈值；不动persona；不新增能力档/通用层；业务例子不升为规则；仅维护层文档与测试，无content新增，故不改content manifest；相关索引随卡状态更新。实施Note另按真实取舍写归位理由。

## 卡片质量审查

2026-11-20按本仓问题卡流程复核，修正了状态/下一步不一致、拟去向与申请不明确、抽象度缺失、关闭条件混同实施验收、生产业务锚点未纳入命令、共享依赖负控加载方式不清及改名适用域过宽。独立只读审阅 `db7c6c75-fcd6-4136-95f8-a464d9edf3ca` 复核后：作为待裁决材料阻断0；收窄分支回翻建议已吸收。此结论只评价卡片质量，不是实施批准或实施验收。

研究/卡片交接提交为 `3094418a`，当时未改常驻方法、skill、产品或测试。其后用户明确授权本批实施：265文件/2346 tests、test:checks 11 PASS/0 FAIL及types/lint/dup通过；代码盲审发现3类缺口均修复、复核0阻断，最终方法与生命周期审阅见实施Note。研究阶段审阅不冒充实施审阅。

## 关闭条件

原content试点采用“明确授权同轮实施”路径，原验收逐项由实施Note承接、已完成；用户现追加生产源头研究，故本卡回到推敲中继续承接，不将原试点交付等同追加研究完成。新增研究须给出源码证据、可行手段/取舍及是否值得实施的判断，再记录真实去向。

- 批准形成RFC：按proposed合同生成真实RFC、完整带走本卡范围/验收/未决项并建立回链，记录审查与受理事实，再按章程完成本卡交接；不能称作预防机制落地。
- 明确授权同轮实施：依批准范围实施，证据记真实Note/提交并回链本卡；只有实施验收成立才称落地。此路径不预填implemented。
- 结论确认但请求仍由用户持有：记录`pending — 用户（日期）`后按章程判断离场；不把等待下游实施强写成所有问题卡的关闭前提。

本卡离场不删除或弱化尚未实施的验收；由明确下游接住，实施进度归会话plan/todo。后续扩面须有真实合同变化或同类逃逸触发，无触发不继续开探索轮。
