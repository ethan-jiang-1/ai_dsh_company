---
topic: quality-prevention-production-source-design
intent: 在真实规则与原始输入接缝上评估生产源码预防设计、历史因果关系及实施前的有界反证
---

# 生产源头预防：减少事实副本、解释分叉与失败信息丢失

本材料补足[前次生产研究](2026-11-20-production-source-prevention.md)中尚未展开的高价值领域设计。
基线为 `a542d799`；只读源码与历史材料，仅新增本文。**这是研究与交接，不是产品实施或缺陷修复。**

## 结论与优先级

源码方法能让未来预防更容易：把“每位调用者正确理解原始值”改为“调用者只能拿到已解释的领域值”，
并将集合、来源和失败语义留在真正拥有它们的 Module。收益应以删除的维护义务衡量，不以类型更漂亮衡量。
在本切片中，最值得先做可行性实验的是 **delivery-rules 的共享领域解码**，随后才考虑 product check-rules。
它连接[历史 A 链](2026-11-20-recurrence-chains.md)的 JSON→schema→跨引用逃逸；
但历史主链发生在发布判据，并没有证明这两个运行时读者曾造成事故，不能宣称重写会消除那批历史 bug。

| 方法 | 已有源码事实与历史关系 | 本次判断 |
|---|---|---|
| 原始值→已验证领域值 | delivery 两个运行时读者各自解释；静态合同与领域 gate 另有判据，详见下文 | 先评估，可删除真实重复解释义务；不是 must-fix |
| 从权威集合派生 | [pipeline](../../../tools/lib/core/pack-source.mjs#L68)已从允许目录顶层派生，跨目录仍显式；[历史 B](2026-11-20-recurrence-chains.md) | 新目录/后缀出现时重审范围；当前无全依赖图重写依据 |
| 用类型排除非法内部状态 | bootstrap payload union 已由 `a542d799` 完成；[实施 Note](../../../notes/implemented/2026-11-20-bootstrap-plan-payload-contract.md) | 局部收益成立，不能替代规则/消费者研究 |
| 让证据随值 | [presence](../../../packages/company-pack/src/lib/presence/presence.ts#L124)已有 revisionGap，board/UI 已消费；[历史 C](2026-11-20-recurrence-chains.md) | 新原因/消费者出现时评估统一 evidence 值；类型不能强制 UI 呈现，也不能创造 revision |
| 在副作用 owner 判可用性 | [catalog](../../../packages/company-pack/src/host/ledger/catalog.ts#L69)已一次 read+trim 取代 access/size 叠补；[历史 D](2026-11-20-recurrence-chains.md) | 第二个同语义消费者出现才考虑复用；空值并非所有领域都非法 |

**没有发现并复现新产品 bug。** 下列不一致是可定位的维护风险或尚未封闭的合同；不据此开卡、增加测试或实施。

## 1. 当前发布内容到底保证了什么

[content 合同](../../../tools/lib/company/content-contract.mjs#L258)由[源树 gate](../../../checks/gates/content-manifest.mjs#L53)
和[shipped checker](../../../tools/lib/release/shipped-shape.mjs#L285)复用：检查 manifest 版本、inventory 非空/安全/无重复、
盘面双向对账、文件非空可读、JSON 可解析、tier 引用以及人工登记关键件和派生目录。
源树适配器另报告 symlink；shipped 调用传的是 entry 文件集合，没有同一 symlink 参数，不能泛称载体能力完全相同。

| 规则事实 | 当前 owner / 实际保证 | 运行时读者实际使用 |
|---|---|---|
| delivery 基础形状 | [contentJsonProblems](../../../tools/lib/company/content-contract.mjs#L222)：非空 deliveryMode、kind=delivery、非空 documents | `/delivery` 主要使用 documents；提醒使用 documents/v1Reminder |
| 文档与包内引用 | [jsonKeyRefProblems](../../../tools/lib/company/content-contract.mjs#L153)：entry/template 在 files 中、owner 非空、file 为 drafts/<slug>.md | `/delivery` 只局部检查 file 前缀；提醒用更窄文件名正则 |
| requiredFields / v1Reminder | 同一合同：键引用 documents；数组及元素约束（空数组可通过） | requiredFields 不由本次两个命令执行；v1Reminder 决定提醒子集 |
| requiredSections | [delivery gate](../../../checks/gates/delivery-mode-sources.mjs#L60)只检查键属于 documents；同处检查 file 重复 | `/delivery` 逐项 text.includes；共享合同没校验该字段值/元素形状 |
| deliveryMode=目录 id | [delivery gate](../../../checks/gates/delivery-mode-sources.mjs#L54)，而非 contentJsonProblems | 运行时按 meta 选成员，没有核对规则自报 id |
| product 形状/引用 | [content 合同](../../../tools/lib/company/content-contract.mjs#L201)：非空 productType/layers/files、files 文件名、layers→files、defaultLayers⊆layers、retiredPrefixes 字符串数组 | `/req` 消费 layers/defaultLayers/retiredPrefixes，没用 files 选读文档 |

因此“发布检查只判合法 JSON”是错的；“所有消费者语义已统一”也超出实现。
例如 layers 目前只要求非空数组，未逐项要求非空字符串；requiredSections 值形状未集中验证。
这些观察只说明发布成功不是任意 JSON 都可安全消费的全证明，不证明现行真实包已经失效。
关键件集合仍是[人工策展](../../../tools/lib/company/content-contract.mjs#L30)，inventory 自洽不会自动发现漏登记的运行时需求。

## 2. 原始输入、信任周期与失败政策

模型可写的是动议 meta/company 中的 **选择 id**；规则文本来自 pack content。
[delivery](../../../packages/company-pack/src/host/commands/delivery-command.ts#L120)和
[product resolution](../../../packages/company-pack/src/host/commands/req-command.ts#L154)先做成员/路径检查，不能把两者当任意 workspace JSON。
`/req` 的 delivery 提示与提醒读取还有自己的检查；本提案不顺手统一全部路径 I/O。

| 消费点 | 当前读取/缺省 | 当前失败政策，提案应保留 |
|---|---|---|
| `/delivery` | [131–156](../../../packages/company-pack/src/host/commands/delivery-command.ts#L131)：JSON.parse 后 as；documents 缺省 {}，每文档 sections 缺省 [] | 未知模式、无 content、缺规则、语法坏→error；productized 提前成功/提醒 |
| `/req` 交付提醒 | [100–124](../../../packages/company-pack/src/host/commands/req-command.ts#L100)：独立局部 as；v1Reminder 非数组时取 documents 全部键，过滤 file | 无 content/安全成员失败/读取或解析异常→两种内置提醒；提醒不阻塞编号校验 |
| `/req` 产品规则 | [154–183](../../../packages/company-pack/src/host/commands/req-command.ts#L154)：meta 优先 company；都未声明→默认；JSON.parse 后 as | 已声明但未知/缺文件/语法坏→error；无 content 时保留旧默认 |

`as` 本身不验证值，但不能只凭 `as` 判断缺陷。正常发布包已经经过上节保护，风险主要是规则演进时的解释漂移、
未走同一发布路径的开发内容或安装后字节改变。当前读取器每次读盘，未持有“验证后不可变”的领域快照。

两种可接受信任模型应先择一：①发布验证＋运行时相信同版本不可变产物；②在运行时读取时解码，发布也复用同一领域判据。
①需要明确不可变生命周期和产物/消费者配对依据，不能用一次 verify 推导未来读取值已验证；②多一点解析工作，但自然适配现有按次读取。
不预设每次都必须全 inventory 扫描，也不先加入缓存/全局 registry；缓存失效会新增本题没有的义务。

## 3. 真实合法形状与不能抹平的默认值

真实内容是[project-services](../../../packages/company-pack/content/delivery-modes/project-services/delivery-rules.json)、
[managed-service](../../../packages/company-pack/content/delivery-modes/managed-service/delivery-rules.json)、
[business-software](../../../packages/company-pack/content/product-types/business-software/check-rules.json)、
[hardware-software](../../../packages/company-pack/content/product-types/hardware-software/check-rules.json)。
前两者分别有 5/6 份文档，均显式给 requiredSections/v1Reminder；后两者分别支持 3/6 层，默认均到 PRD。
这四个当前成员不是未来允许域的全集；不能生成只认四个 id 的 decoder。

- delivery：documents 非空，每项 file/owner/template 满足现有合同；requiredFields 与 requiredSections 都是可选映射。
  sections 省略/文档键省略→没有 section 要求；显式 [] 也没有要求。v1Reminder 省略→全部文档，[]→不提醒。
  **省略不是“坏规则”**；提案应保留，不要求每个文档必须有 section，也不增加 requiredFields 的产品检查。当前 requiredSections 整体或单文档值为 null 也因 `?.[key] ?? []` 解释为无要求；保留此行为或拒绝 null 须单列兼容决定，不能混同于已有静态拒绝的 requiredFields=null。
- product：layers 是非空字符串集合，不能缩为六个标准 Layer。[req 自定义层分支](../../../packages/company-pack/src/host/commands/req-command.ts#L273)
  和[现有 custom 对照](../../../tests/host/commands/req-command.spec.ts#L387)明确支持 ROADMAP/US 等层走说明而不跑五层 checker。
- defaultLayers 与 retiredPrefixes 省略须保留 undefined；显式 [] 要保留 []。
  [checker](../../../packages/company-pack/src/lib/docs/requirements-check.ts#L452)用 ?? 继承默认，[] 是有效覆盖；不能归一成同一值。
  不把当前 package 的 retiredPrefixes 或默认三层复制进新 decoder。
- notes 等非消费字段保持可扩展，不为“严格 schema”拒绝未来元数据；不自动修正大小写、trim section 或去重数组。
  若要收窄既有接受域（如重复文件或 id 不符），须单列兼容决定，不混称纯重构。

## 4. 可评审的提案：领域解码共享，失败政策留给消费者

建议的 **Seam** 位于 pack 自己的纯领域 Module，输入为 `unknown`，不读盘、不注册命令、不返回用户文案。
它具有两个领域入口而非万能 schema registry：delivery 解码先做，product 是可独立拒绝的后续切片。
拟议 Interface（设计记号，不是已实现声明）：

```ts
type Decoded<T> = { ok: true; value: T } | { ok: false; problems: readonly RuleProblem[] }
type RuleProblem = { path: string; code: string }
decodeDeliveryRules(raw: unknown): Decoded<DeliveryRuleSet>
decodeProductRules(raw: unknown): Decoded<ProductRuleSet>
```

delivery 有效值保留 id/entry，以及按 JSON 顺序排列的 documents；每项为 `{key,file,owner,template,sections,fields}`。
sections/fields 在每项下归一为数组；提醒引用在解码内解析为有效 document/file 列表，省略与 [] 依上节解释。
解码验证对象/元素形状与内部 key 引用，逐字段拒绝问题，返回领域值而非给原始对象贴类型。
product 有效值保留 productType、string layers、files 及可选 defaults/retired；标准层筛选/自定义层业务路由仍归 `/req`。

**包内文件是否存在**由工具持有的 files 集合判断：领域值暴露 entry/template 等引用即可，工具做集合成员检查。
requiredSections 键归属随其他内部引用迁入 decoder；仅当静态 Adapter 也调用共享 decoder 时删除 gate 中该循环。若选择纯TS运行时切片，gate原检查仍保留。目录 id 相等仍归目录 Adapter 的政策。
file 去重若迁入 decoder，应先确认是否将源树 gate 的政策推广到运行时/shipped，而非默认为现有同义合同。
目标是把共享的纯形状/内部引用判据放一个 owner；inventory、tier、包内存在性、目录组合仍归原 tools/gates。
expectedId 若加入 Interface，只用于显式选定的 id 一致政策；不是为了偷加 shipped 当前没有的拒绝条件。

`/delivery` 拿有效值检查世界文件，invalid 返回 error；`/req` 提醒拿同一有效值取提醒文件，invalid 走既有 fallback；
产品 resolution 则 invalid 返回 error。**共享领域含义，不统一失败政策。**
有一项不能假装兼容：当前部分结构坏但可解析输入会得到空结果而非抛异常，新增 invalid→fallback/error 会改变其行为。
必须在实验中列出旧/新结果，单独确认收窄政策，不能声称所有字节行为不变，也不能因此直接开缺陷卡。

## 5. 共享 owner 的发布成本：不能反向依赖 tools

[包 files/exports](../../../packages/company-pack/package.json#L32)不发布 src/tools；运行时由
[tsc＋tsdown](../../../packages/company-pack/tsdown.config.ts#L9)构造 lib/index/client；
[工具命令](../../../package.json#L19)直接由 Node 执行 .mjs，现行 content-contract 不依赖 pack 已构建产物。

| 可选位置 | 能删除的义务 | 真实成本 / 限制 |
|---|---|---|
| pack 纯 TS，两个运行时读者用它 | 删除 delivery 两个局部 cast/字段解释；保留静态合同重复 | 改动窄，但不是发布＋运行时单 owner，不能冒报完整收益 |
| pack 内纯 JS/MJS＋JSDoc/类型检查，工具直接读源码，tsc/tsdown 内联运行时 | 同一纯领域逻辑可被工具和运行时使用 | 要实证 JS 输出/声明、Node 源码 import、构建图与发布自包含；保留源码→工具的单向依赖 |
| 工具导入生成 lib 或 pack 运行时反向 import tools | 看似直接共享 | 前者制造验证依赖旧 build/先构建循环，后者运行时缺文件；不推荐 |

host 配置已 [allowJs/rootDir/include](../../../packages/company-pack/tsconfig.host.json#L8)，但这不是新 MJS 发射、声明与 bundle 成功的证据。
Zod 已存在不意味着应该加新框架；无论手写或现有库，重点是领域语义唯一家与两个真实 Adapter，不能再包一层只转发的浅 Module。
若 JS 方案的类型表达迫使维护另一份独立 schema，优先承认 TS 小切片只取得部分收益，或停止，不为“全共享”扩大构建系统。

## 6. 实施前的廉价有界实验与负控（尚未执行）

先做一次独立于产品替换的可行性实验；本轮未实施产品替换，下面是拟议实验，不是已经获得的红绿证据。
时间盒一个工作时段；只选 delivery，两个当前真实规则＋小型内存变化，不扫描全仓找新 bug。

1. 固定基线：逐字段抄出两真实文件的文档、sections、提醒子集及两命令现有结果；期望不用 decoder 自己生成。
   加合法对照：省略 sections、空 sections、省略 reminder、空 reminder、额外 notes、额外合法文档。
2. 在丢弃式副本验证选定共享位置：plain Node 工具可从源码调用；host 类型检查能推导有效值；正常构建后仅用发布允许文件可调用。
   不能要求先导入整个插件、挂 Cordis 或新建公共 export；出现构建新鲜度循环就 no-go。
3. 只选两个坏见证：一个字段类型不适合消费、一个 reminder 引用不存在；应得到定位到字段的 invalid。
   它们检验提案机制，不宣称当前用户事故。工具附加 template 缺失对照，确认文件存在性仍由工具负责。
4. **负控**：在副本移除内部引用判据，第二坏见证须被错误接受；移除运行时 decoder 调用，消费者验证须发现拒绝/降级不再发生。
   合法对照必须继续成功，否则没有证明减少误报。只验证 decoder 自己的返回值不足以证明生产者已接入。
5. 比较旧/新 invalid 结果，要求 `/delivery` 明确拒绝而提醒继续按既有 fallback；核对正常文档顺序、计数、section 文本不变。
   记录删掉哪些调用者判断，以及是否产生相同的新判断。无需添加常驻 gate、测试框架或执行浏览器/模型。

**go**：两个运行时读者不再各持 shape cast/sections/reminder 解释；若声称静态共享，静态形状实现也确实删除；
文件/模板存在性、不同失败政策仍各有 owner；四类默认对照通过，负控能红，发布不带工具和源码依赖。
**stop/no-go**：必须加第二 schema、靠 cast 绕过类型、跨域 registry/缓存、新公共包、先构建才能 verify，或合法默认行为变化；
以及预估迁移/维护成本大于实际可删除的两处解释义务时，停止在研究结论，不继续用新框架证明项目值得做。

## 7. 删除什么，保留什么，以及历史收益上限

- 可删除：delivery 两运行时读者各自的形状假定、字段缺省与 reminder 引用折算；若静态真共享，再删除静态重复形状判断。
  product 切片另删除一个局部 cast，并集中其结构/default 语义；不要把两个领域入口计成三份同义 decoder。
- 保留：内容作者决定交付业务要求、必需运行时件策展、模板/文件存在性、id 与目录选择安全、标准/自定义层路由、各命令的失败政策与用户可见解释。
- 不会解决：[独立六文档锚点](../../../tests/host/commands/delivery-command.spec.ts#L117)中的“规则、模板、文档同步删一项”。
  自洽的五份文档仍是合法规则；decoder 不知道业务承诺原本六份。不能删除独立业务期望，也不应硬编码六份进通用解码。
- 历史相关性：A 链证明“只看可解析/局部 schema”会留下邻接轴；共享 decoder 收回解释知识，有助于后续字段一次变更。
  B 的输入集合、C 的证据到用户、D 的可用性 owner 各需自己的源码方法，不能算进本提案的历史覆盖率。

下一次改源码前，可直接沿本切片画出 raw→领域 owner→真实消费者：先决定 missing/empty/unknown/error 的含义及失败后的可见状态，
再决定输入集合是封闭枚举还是允许增长，最后选择派生集合、集中解释、带证据的值或内部联合类型。
对照本次 sources，设计的完成问题是“删掉了哪份事实副本、哪处分叉或哪条逐字段透传义务”，并用独立结果＋负控证伪收益。
这对应钉住源码的[显式正确性、单一事实与证据原则](../../../vendor/dsh/docs/defensive-patterns/README.md#why-these-rules)，以及[在公共操作归一失败](../../../vendor/dsh/docs/defensive-patterns/general.md#honor-public-contracts-on-both-sides)；是作者的设计方法建议，不新增流程门禁。内容任务的推理质量、业务要求是否足够，仍不会由 schema 自动保证。

分工作者没有运行产品测试、负控、构建或安装；源码中的既有测试只用于核对承诺。主研究者另实跑只读内存探针：两份真实delivery规则各自将首项requiredSections值改为null，共享contentJsonProblems仍返回[]，gate键成员判据仍满足，而值不是字符串数组。该对照只展示接受域与声明差异：运行时null本就按无要求处理，未运行handler、未修改包、未证明事故或主张null必须非法。

独立只读审阅`80fca2e3-2044-48e6-983d-04fba15d370c`对照真实消费者/判据/构建配置，0阻断；其两项建议已纳入：null现有语义及接受域收窄需明示、静态未共享decoder时不能删除gate原检查。结构核验因Markdown行号伪锚点失败，已改为文件链接/真实标题锚点；`pnpm verify`最终ALL PASS（2门无回放对象），`git diff --check`通过。收尾`pnpm test`为265文件/2347条通过，`pnpm notes:audit`退出0、取代缺回链0；这些证明研究载体与仓库回归状态，不证明拟议decoder奏效。产品/tests/vendor差异为空。本轮收割：未复现材料性产品异常；未新增常驻场景/夹具/门禁；未发生需新增运行态操作知识的事实。
本研究没有证明事故率降低或回收工时；其交付是明确的领域设计、兼容清单、共享位置选择及能在实施前叫停的实验。
题名页、原 Issue 整合与结项由主研究者处理；本文不变更旧决定、Note、索引、卡片或产品状态。
