---
topic: quality-prevention-production-source-prevention
intent: 核查当前生产源码仍需人工维持的输入、计划与降级合同，比较源头预防机会及一个小试点的收益边界
---

# 生产源码能否减少未来补洞义务

本文记录 `b0d88f4b` 时点的研究与交接，当时不改生产源码。用户随后「继续」承接的小型bootstrap试点与现行类型事实见[实施Note](../../../notes/implemented/2026-11-20-bootstrap-plan-payload-contract.md)；下文宽类型与可行性探针是研究基线证据，不是当前类型声明。

## 判断

**能，但应按“删除了哪项决策或同步义务”选择切片。** 当前源码已经拥有不少深 Module，不能把已有保护包装成待建方案。最有领域价值的机会是把规则文件从原始 JSON 转为已验证领域值；最容易用小变更评估的机会是收窄 bootstrap 的计划形状。原子写和降级传播则已有实质实现，当前证据不足以支持重做。

[跨轮链研究](2026-11-20-recurrence-chains.md)解释历史逃逸；[实施研究](2026-11-20-repository-implementation.md)提出测试资产方案；[已完成试点 Note](../../../notes/implemented/2026-11-20-quality-prevention-contract-pilot.md)明确生产实现未变。本次直接读取当前源码，不把历史材料的提议当成当前缺陷，也不把新测试通过当成已经深化生产 Interface。

| 候选 | 当前需要人保证的事实 | 可删除的义务 | 当前判断 |
|---|---|---|---|
| 规则 JSON → 已验证领域值 | `/delivery` 与需求提醒各自理解同一 delivery-rules；发布合同另做检查 | 两个运行时读取点分别断言、判形和折算的义务 | 领域价值最高；先决定信任面与失败政策，不直接改 |
| bootstrap 文件计划形状 | 两个计划生产者正确填入 sourceRel/content，执行者知道两者优先级 | 待创建文件的无来源、双来源可构造状态，以及缺来源的执行兜底 | 推荐保持现有生产者行为、收窄内部类型的小试点，收益严格局部 |
| 状态/文件副作用与降级 | presence 标记透传、catalog 扫描告警、写入顺序 | 进一步让降级证据随值传递，而非逐字段同步 | 已有 owner 和末端保护；暂不重构 |

这些是维护义务与设计机会，**本轮未证明新产品 bug、当前合法包失效或缺陷率下降**。

## 1. 原始规则进入运行时：验证一次，再由消费者决定失败政策

**当前做对的事。** `/delivery` 先检查模型可写的 mode 是安全、存在的 content 成员，再读规则；规则来自 pack，而非直接接受 workspace 任意 JSON（[delivery:120](../../../packages/company-pack/src/host/commands/delivery-command.ts#L120)）。源树和 shipped 检查已经共用 `contentJsonProblems`，检查 deliveryMode/kind/documents 及引用（[合同:222](../../../tools/lib/company/content-contract.mjs#L222)）。这降低了正常已验证包带坏规则的风险，不能假定当前发布包不可信。

**残留的具体义务。** 运行时 `DeliveryRules` 的三个字段全部可选，JSON.parse 后直接断言该类型；检查命令用 documents 缺省空对象，逐文档检查 file，再取 requiredSections（[类型:40](../../../packages/company-pack/src/host/commands/delivery-command.ts#L40)、[读取/消费:131](../../../packages/company-pack/src/host/commands/delivery-command.ts#L131)）。需求提醒另外读取同一 delivery-rules，另写局部类型、v1Reminder 缺省、文件名过滤和异常回退（[提醒:100](../../../packages/company-pack/src/host/commands/req-command.ts#L100)）。这里确有 **2 个运行时解码点**；静态合同是第三个相关判据拥有者，但并非同义的第三个运行时解码器。

因此作者目前必须知道：已通过发布检查的文本可被哪些运行时假设消费；增加字段或改变形状时两个读者怎样协调。`as DeliveryRules` 本身不履行运行时验证。上述源码足以证明义务存在，**不足以证明它已导致本轮故障**；未向安装包植入坏 JSON 验证，也不据此开缺陷卡。

**建议的因果变化。** 在 pack 内建立一个窄的纯 Module：`unknown → valid rules | invalid problems`，有效值必须有非空 documents、每项有效 file、已归一的 sections/reminder 引用；消费者再读文件。两个读者的形状断言与字段缺省从各自一份降为一个 owner；调用者只保留业务政策。检查命令可拒绝 invalid，提醒仍可按现有约定降级。**共享有效值，不共享“失败必须怎么处理”。** 是否要求全部字段、哪些缺省合法，须从现行规则和消费者承诺确定，不能由通用 schema 自动决定。

**不能机械合并。** 维护合同返回问题列表，还校验 inventory 跨引用；运行时读取有不同的可用事实。pack 不应反向 import 不随包发布的 tools；既有 bootstrap 注释已明确这条发布约束（[bootstrap:173](../../../packages/company-pack/src/host/run-bundle/bootstrap.ts#L173)）。若未来推进，应只下沉可共享的领域解码到 pack 纯逻辑，再由工具适配文件集合；先证明构建、类型和发布形状可承载。不要把文件 I/O、产品必需性与提醒回退一起塞入一个大校验器。

**seed 是有价值的反例。** 生产 `readSeeds` 已集中路径、重复 source/target、源存在和类型占位政策（[bootstrap:200](../../../packages/company-pack/src/host/run-bundle/bootstrap.ts#L200)）；工具侧也已从 seed.json 派生，删除了旧手抄文件清单（[工具 owner:1](../../../tools/lib/core/kb-seeds.mjs#L1)）。但生产对缺类型 warning+跳过，工具对缺类型抛错（[生产:231](../../../packages/company-pack/src/host/run-bundle/bootstrap.ts#L231)、[工具:77](../../../tools/lib/core/kb-seeds.mjs#L77)）；现有测试分别钉住政策与路径等价（[工具测试:90](../../../tests/tools/kb-seeds.spec.ts#L90)、[路径矩阵:118](../../../tests/tools/kb-seeds.spec.ts#L118)）。**删除重复事实不等于统一全部行为。** 当前没有证据值得为此扩大为 seed/delivery/check-rules 通用框架。

## 2. bootstrap 计划：让内部作者不能构造缺 payload 的文件操作

**当前做对的事。** `planBootstrap` 先读取 seed；不可接受时返回空计划，合法时给每个文件填 sourceRel（[计划:125](../../../packages/company-pack/src/host/run-bundle/bootstrap.ts#L125)）。角色补种复用同一执行者：章程来自 sourceRel，org/owners 合并结果来自 content（[补种生产者:477](../../../packages/company-pack/src/host/run-bundle/bootstrap.ts#L477)）。执行时仍逐项检查 workspace 落点、父目录、symlink、目标形状，创建用 wx，替换用 temp+rename（[执行:259](../../../packages/company-pack/src/host/run-bundle/bootstrap.ts#L259)、[写入:317](../../../packages/company-pack/src/host/run-bundle/bootstrap.ts#L317)）。它已是有 Depth 的 Module，不应再套一层转发 Interface。

**残留义务。** `BootstrapEntry` 用独立的 kind 与可选 sourceRel/content/mode 描述所有条目（[类型:34](../../../packages/company-pack/src/host/run-bundle/bootstrap.ts#L34)）。对于 file，payload 存在性允许四种组合：无、仅 sourceRel、仅 content、两者都有。执行者在 `content !== undefined` 时优先用 content，否则读取 `sourceRel ?? ''`（[执行:328](../../../packages/company-pack/src/host/run-bundle/bootstrap.ts#L328)）。两者都有是**现有文档规定的优先级**，不是缺陷；本次检查的两个生产者也均构造了可用来源。问题是作者仍须记住一项 payload 完整性规则和一项优先级规则。

**源头变化。** 保留现有计划/执行 Seam，只把条目变成 dir 与 file 的判别联合；待创建 file 的 payload 再是 `{kind:'source', sourceRel}` 或 `{kind:'content', text}`。dir 不携带 file payload/mode。这样待创建 file 的 **4 种存在性组合变成 2 种显式合法选择**；执行者删掉空字符串路径兜底和两来源优先级，两个生产者必须明确选一种。`action:'skip'` 在执行者中先返回，不需要读取 payload（[跳过:274](../../../packages/company-pack/src/host/run-bundle/bootstrap.ts#L274)）；实施时应明确 skip 是否独立成不带 payload 的分支，不能称无 payload 的 skip 也非法。不要顺手重写计数、warnings 或持久化顺序。内部类型会收窄，外部产品行为拟保持。

此改变只封闭**仓内 TypeScript 作者构造计划**的错误域，不能验证外部 JSON、不能证明 source 文件仍存在，也不能防止文件系统在计划后变化。readonly 和联合类型都不是 I/O 安全证明；原有执行检查仍必需。它直接减少一项局部作者义务，却不解决历史多数跨引用、未知值和用户可见降级问题。

**本轮可行性证据（主研究者实跑，本文作者未重复执行）。** 从当前源码 AST 提取 BootstrapEntry，使用现有 TypeScript 编译器及虚拟内存文件检查：合法 source-file、inline-file，加上缺 payload 的 create-file、带 content 的 dir，当前类型四例均无诊断。只在内存换成 dir/file 联合、file 要求 sourceRel/content 恰一项后，两合法对照仍通过，两坏见证各得到 TS2322。未修改生产文件或迁移 executor，不能称整仓 typecheck 通过；双来源的现有优先级不是该负控中的“坏输入”。最小见证如下，复做时用源码当前声明替换 `Entry` 建基线，再用提案联合替换：

```ts
type Common = { rel: string; action: 'create' | 'skip' }
type Entry = Common & (
  | { kind: 'dir'; sourceRel?: never; content?: never; mode?: never }
  | ({ kind: 'file'; mode?: 'create' | 'replace' } & (
    | { sourceRel: string; content?: never }
    | { content: string; sourceRel?: never }
  ))
)
const source: Entry = { rel: 'x', action: 'create', kind: 'file', sourceRel: 'state/x.md' }
const inline: Entry = { rel: 'x', action: 'create', kind: 'file', content: 'x' }
const missing: Entry = { rel: 'x', action: 'create', kind: 'file' }
const dirPayload: Entry = { rel: 'x', action: 'create', kind: 'dir', content: 'x' }
```

此见证验证 XOR 表达的可行性，不是最终 tagged payload 设计；skip 是否单列尚未评估，不预设其迁移。

## 3. 原子写与降级证据：已有保护值得保留，进一步深化要有真实消费者

**副作用已经集中。** catalog 的 final 判定一次 read+trim 同时回答可读、非空白，并生成 warning（[catalog:69](../../../packages/company-pack/src/host/ledger/catalog.ts#L69)）；坏旧索引先 warning 并尽力备份（[重建:171](../../../packages/company-pack/src/host/ledger/catalog.ts#L171)）。读取结果已是 ok/missing/corrupt/unsupported 联合（[读状态:17](../../../packages/company-pack/src/host/ledger/catalog-state.ts#L17)），最后经共享原子写 Module 提交（[catalog:216](../../../packages/company-pack/src/host/ledger/catalog.ts#L216)）。共享写入还有 temp 后复验父目录、失败清理；源码明确只收窄、不能完全关闭 TOCTOU（[原子写:165](../../../packages/company-pack/src/host/run-bundle/company-root.ts#L165)）。不能建议“加原子写”而忽略已有实现。

**原子文件不等于跨文件事务。** bootstrap 是逐项执行，失败 warning+继续（[bootstrap:341](../../../packages/company-pack/src/host/run-bundle/bootstrap.ts#L341)）；这是补缺操作的现有行为。catalog 索引又是派生数据（[catalog:1](../../../packages/company-pack/src/host/ledger/catalog.ts#L1)）。若未来出现必须同时提交的业务事实，才值得把“计算→验证→提交”的多载体不变量收回唯一 owner；本次未证明这种需求。直接加回滚日志/事务层会引入恢复与迁移责任，不能以抽象上的原子性获益为理由实施。

**降级已经到最终用户。** presence 合并有单一 owner，保留未知状态或 deleted 重建时标记 revisionGap，按 revision 拒绝旧覆盖（[合并:124](../../../packages/company-pack/src/lib/presence/presence.ts#L124)）；board 把未知状态折为 pending，同时记录 statusGap，并透传 revisionGap（[归一:199](../../../packages/company-pack/src/lib/presence/board.ts#L199)）。TaskRow 和 BoardCard 各声明两标记，boardColumns 再逐字段拷贝（[形状:33](../../../packages/company-pack/src/lib/presence/board.ts#L33)、[卡:139](../../../packages/company-pack/src/lib/presence/board.ts#L139)、[拷贝:234](../../../packages/company-pack/src/lib/presence/board.ts#L234)）；任务表、看板都渲染它们（[表:103](../../../packages/company-pack/src/client/tabs/TasksPanel.tsx#L103)、[卡面:139](../../../packages/company-pack/src/client/tabs/company-panels.tsx#L139)）。

残留义务是新增降级原因时，要同步 **2 个读模型形状、1 次拷贝、2 个显示点**。未来可让必填的 evidence 值随任务一起传递，例如精确、状态推断及原因，而非分别声明并逐字段复制的布尔标记；这将减少原因的逐字段复制，不能删除两个 UI 的呈现责任。必须保留未知原值及“状态序不证明时间序”的政策。当前消费者已受保护（[组件正反对照:129](../../../tests/client/tabs/board-panel.spec.ts#L129)），没有证据值得现在迁移全部模型；改成联合也不会自动迫使 UI 把所有原因显示出来。

## 唯一推荐的小试点：bootstrap payload 联合，先验证局部收益

仅建议另行授权时执行；本研究没有实施。选择它是因为 owner、两个生产者、执行者都在一个现有 Module，且可以不改变外部行为验证“非法内部状态变少”。**这是成本低的设计试验，不是领域价值最高的全局方案，也不是后续生产修改的前置任务。**

- **精确 owner/Seam：** [bootstrap 的 BootstrapEntry](../../../packages/company-pack/src/host/run-bundle/bootstrap.ts#L34)；同时调整本文件 planBootstrap、planRoleBackfill 与 applyBootstrap 的 payload 分支。保留既有函数入口；不新建框架或通用 Adapter。
- **行为承诺：** 当前正常计划、输出字节、补缺、角色合并、warning/skip 与错误策略不变；双来源优先级退出内部可构造模型。现有生产者无需该双来源行为。若发现真实调用者依赖它，先停止并审查兼容性，不能静默改行为。
- **证据：** 实施时跑 `pnpm typecheck`；沿[bootstrap spec](../../../tests/host/run-bundle/bootstrap.spec.ts)与[角色补种 spec](../../../tests/host/run-bundle/roster-backfill.spec.ts)验证现有创建/重入/替换/坏路径。已完成试点的[真实源业务锚点:78](../../../tests/host/run-bundle/bootstrap.spec.ts#L78)继续观察 CEO/process-docs 落盘字节，不用新计划类型自行生成 expected。
- **负控：** 临时在受 typecheck 覆盖的生产计划构造点，分别构造缺 payload、同时两种 payload 的 `action:'create'` file，及携带 file payload 的 dir，均须编译失败；正常 source/content/dir 三例须编译通过。若用 `@ts-expect-error` 常驻，须确认删除联合约束会产生 unused directive 错误，不能只断言运行时抛错。无需为此新增产品拒绝分支或门禁。
- **成本/取舍：** 改一个内部类型及两个生产者/一个执行者；现有测试字面计划会有迁移成本，实际数量须实施时核对，不报猜测行数。引入一个 payload tag，换掉两可选字段的优先级知识；类型更严格，但运行时复杂度应持平或下降。
- **拒绝触发：** 若必须保留宽松旧计划 Adapter、靠 cast 绕过新类型、扩到跨包共享 schema，或执行者仍保留缺来源/双来源兜底，则这次没有删除义务，应撤回此试点。发现双来源真实需求也应重新设计，不能用“类型安全”压过行为。

暂不实施规则共享解码：它比上述试点更接近历史语义逃逸，但需要先明确 packaged content 的受信周期、invalid 的用户可见结果、两读者不同缺省，以及静态工具与 pack 的发布 Seam；无当前事故证据时不应将其升级为 must-fix。暂不实施降级证据全面改型或跨文件事务：现有 owner/末端保护已经工作，前者迁移触点多，后者尚无必须原子提交的事实。三者不是待执行队列。

## 证据与局限

- 基线只读核对：`pwd` 为本仓根；`git rev-parse HEAD` 为 `d8b07b5c2028e2223bd02184d2e7ac5c53737080`；最初 `git status --short` 空。直接读取本文所链源码与定点测试，不借全局 DSH 版本作生产依据。
- 本文作者未运行产品行为实验、测试或植入生产负控；主研究者运行的内存编译对照及限制见第2节。测试源码只说明已有保护和预定验证位置，历史实跑归原 Note。未运行模型、浏览器、安装、发布，也未搜索新缺陷。文档链接/形状由本材料交接时做只读核验，整体门禁由主研究者收口。
- 因果计数是所见 Interface 的字段组合、读者和透传位置数量，不是缺陷减少数、开发工时估计或覆盖率。未遍历所有规则内容、所有消费者与整个仓库；未证明推荐类型方案的实际构建/迁移成本。
- 下一次是否做源码变更，应由需要取消的真实维护义务决定。纯研究结论允许“不改”；现有合法包与保护资产继续有效，不需要靠下一轮探索产卡来证明本研究有用。
