---
topic: 生产源头预防设计的候选比较
intent: 从当前生产读取者和事实拥有者判断哪项局部设计能减少未来修改义务，并为独立新Issue提供边界与停止条件。
---

# 生产源头预防：先减少哪一种修改义务

> 独立问题：在现有保护之后，哪个生产 owner 的接口变化能减少事实同步、重复解释或失败信息重建，且收益超过包、构建和政策负担？
> 先前 content、bootstrap、类型检查试点只是已有基础，不是本题范围、验收或生产实施授权；本题先研究，再由结论形成新 Issue。
> 本文是研究与交接，不是生产落地；没有修改产品、测试、配置或提交 Git。

## 研究口径

研究日为2026-11-20；依据为本轮直接读取的当前工作树源码，未假定工作树等于某个已发布包。
比较的是修改一次规则需要同步哪些生产位置，而不是以历史缺陷数、文件长度或测试数量排名。
接口包含调用次序、根路径含义、失败类别与默认政策；共享同一底层函数并不自动消除调用方义务。
下述收益是可证伪的设计推论，不是运行收益测量；没有执行测试、性能测量或故障注入。
研究限五个候选域，catalog 同时作为文件读取消费者和另一类重复事实的对照，不另开全仓审计。

## 当前已经解决什么

- content 的源树门禁与 tarball 检查已经共享 [content-contract](../../../tools/lib/company/content-contract.mjs#L1)，不是两套互不相干的 schema 判据。
- bootstrap 文件计划已用 payload 判别联合表达内容来源，并从 seed 清单生成计划，见 [bootstrap](../../../packages/company-pack/src/host/run-bundle/bootstrap.ts#L34)。
- run-bundle 路径已从共享常量派生，见 [run-bundle](../../../packages/company-pack/src/host/run-bundle/run-bundle.ts#L10)。
- 公司盘根、中间目录、普通文件读取与原子写已经有 [company-root](../../../packages/company-pack/src/host/run-bundle/company-root.ts#L1) owner；不需要另造文件访问框架。
- presence 已统一事件与投影折算，并保留 revisionGap，见 [presence](../../../packages/company-pack/src/lib/presence/presence.ts#L112)；看板还有 statusGap，见 [board](../../../packages/company-pack/src/lib/presence/board.ts#L32)。
- release/dev 包源指纹已共享 owner，发布管线目录也已派生枚举，见 [pack-source](../../../tools/lib/core/pack-source.mjs#L1)。

这些保护把当前研究从“补齐验证”转向“调用方还必须知道什么”；不能把已收口的重复工作再报作增量。

## 五个候选的比较

| 候选与生产 owner | 现有保护之后仍留下的义务 | 可删除的义务与成本 | 判断 |
|---|---|---|---|
| A 公司盘文件读取：company-root | 五个状态读取函数先判文件问题，再取文本；两次 owner 读取，调用方重建顺序与失败映射 | 复用已有三态结果，消除前置判定加读取的协议；同包 host，无新构建面；需保护 workspace/companyHome 语义 | 首选，先验证兼容再实施 |
| B runtime 规则解码：delivery/req + content-contract | 同份 delivery JSON 被两个运行时读者各自 cast、投影；校验 owner 不等于运行时解码 owner | 可收拢字段解释；仅 host 内共享成本低，跨工具共用则增加源文件格式、类型与打包义务 | 次选，暂缓跨树统一 |
| C seed 解释：bootstrap + kb-seeds | 路径、类型占位、重复项解释分布于生产、维护工具与合同判据 | 可共享纯解释；但警告跳过与抛错政策不同，清单事实早已同源；跨包面成本同 B | 暂缓，先保留政策差异 |
| D presence 证据：presence/board | revisionGap/statusGap 与原始投影字段并存，下游需透传证据标记 | 更强证据类型可能减少漏传；需同时改折算、看板、任务板，且仍保留 vendor 兼容逻辑 | 暂缓，收益尚未超过迁移面 |
| E 发布输入归属：pack-source | 跨发布目录的决定者仍需显式登记；将任意目录都收入会放大失效面 | 自动追依赖可少登记，代价是依赖解析/误失效/发布政策新负担 | 维持现状，本轮不建新机制 |

### A：事实已在 owner 内，接口却把它丢掉

[companyFileProblem](../../../packages/company-pack/src/host/run-bundle/company-root.ts#L265) 并非只做 stat：它调用完整读取，然后把 text 折成 null。
[readCompanyText](../../../packages/company-pack/src/host/run-bundle/company-root.ts#L273) 再调用相同读取，把 missing/unsafe 折成 undefined。
因此下列五个生产函数都在调用方组合“问题检查→再次读取→解析”，不是五套底层安全算法：

| 消费者 | 当前组合 | 应保留在消费者的政策 |
|---|---|---|
| [startup settings](../../../packages/company-pack/src/host/startup/startup-store.ts#L47) | companyFileProblem + readCompanyText | 缺失为自动；unsafe 单列；JSON 坏形状为 corrupt |
| [startup options](../../../packages/company-pack/src/host/startup/startup-store.ts#L71) | 同上 | 缺失为空集合；unsafe/corrupt 仍有诊断 |
| [bundle manifest](../../../packages/company-pack/src/host/run-bundle/bundle-manifest.ts#L216) | 同上 | legacy/unsupported/版本校验及路径文案 |
| [catalog state](../../../packages/company-pack/src/host/ledger/catalog-state.ts#L27) | 同上 | missing/corrupt/unsupported，schema 与 presented 检查 |
| [presented ledger](../../../packages/company-pack/src/host/ledger/presented-ledger.ts#L42) | 同上 | missing/corrupt/unsupported，布尔映射及审计账本语义 |

已有 [CompanyFileRead 与 readCompanyFileAt](../../../packages/company-pack/src/host/run-bundle/company-root.ts#L360) 正是 text/missing/unsafe 三态。
但 At 接受确切 companyHome 且不剥 `.dsh-company/` 前缀；workspace 版读取会先定位公司盘并剥前缀。
不能因为 catalog/ledger 的参数名叫 companyHome，就直接替换成 At；它们目前调用的是 workspace 版函数。
推荐由 owner 暴露 workspace 版三态读取，保持原有根路径处理，旧便捷函数再从该结果派生。
这把读取事实交给调用方一次；解析器、版本政策和用户文案仍留在各消费域。
收益不是安全漏洞已证实，也不是完整消除并发窗口；这里没有运行证据支持这些声称。

catalog 还提供一个反例：[产品 slug 解释](../../../packages/company-pack/src/lib/deliverables/deliverables-catalog.ts#L94) 会 trim 并回落目录名，
[工具 catalog](../../../tools/lib/company/deliverables-catalog.mjs#L54) 则直接使用 `get('slug') ?? fallback`。
这是现存解释分叉的源事实；本轮不把它扩成 bug hunt，也不将 catalog 算法共享夹带进 A。
共享这份算法还需同时处理工具侧元信息 owner 与发布形状，收益成本与 A 不同。

### B：真正的共享对象是领域解释，不是所有错误政策

[/delivery](../../../packages/company-pack/src/host/commands/delivery-command.ts#L126) 读规则并 cast，随后解释 documents 与 requiredSections。
[/req 的提醒](../../../packages/company-pack/src/host/commands/req-command.ts#L100) 再读同一 JSON，解释 v1Reminder/documents，并在异常时使用内置提醒。
[/req 产品类型读取](../../../packages/company-pack/src/host/commands/req-command.ts#L154) 又单独解析 check-rules；这是另一领域，不能为了统一 JSON 而并入首片。
[contentJsonProblems](../../../tools/lib/company/content-contract.mjs#L222) 已负责结构与跨引用，但不会给运行时产出已解释的规则值。
局部 host decoder 可减少两个读者的字段知识；强制两个读者同样报错却会改变提醒的兼容政策。
若要求工具与生产同源，pack 不可反向依赖工具；[现有包 files/exports](../../../packages/company-pack/package.json#L32) 不发 src。
[现有构建](../../../packages/company-pack/tsdown.config.ts#L26) 是 host/client 双入口，源 TS 不能被无构建工具入口自然共享。
因此新叶模块格式、声明生成、指纹覆盖与安装验证都成为设计成本，不能只比较少了几次 cast。

### C：seed 已同源，解释与操作政策仍分离

[生产 readSeeds](../../../packages/company-pack/src/host/run-bundle/bootstrap.ts#L181) 明示路径判据与维护合同存在第二实现，并有等价性保护的源码约定。
生产在未声明或未知 productType 时 warning 并跳过相关 seed，其余继续；这是部分可用性政策。
[维护 readSeeds](../../../tools/lib/core/kb-seeds.mjs#L53) 对无法解析的类型抛错；其 target 检查、去重与生产实现也分散。
共享纯路径/占位解释可能有价值，但不能把 warning 与抛错抹成统一失败行为。
将整份 bootstrap I/O 或 seed 操作器搬到工具层，会倒置生产依赖；新增公共包也会产生版本与安装义务。
既有 manifest 派生已经删除手写文件列表，不能再用“删除第三份 seed 清单”作为此候选收益。

### D/E：已收口部分不能被新抽象重新扩张

[presence 合并](../../../packages/company-pack/src/lib/presence/presence.ts#L124) 已处理投影缺 revision、旧事件、删除和 owner 映射。
[client 数据面](../../../packages/company-pack/src/client/data/use-company-data.ts#L151) 集中调用它；任务板与看板展示已有 gap 信息。
可考虑让不确定性成为更明确的结果类型，但没有证据表明需要另一套事件存储、全局状态机或新同步框架。
[releasePipelineFiles](../../../tools/lib/core/pack-source.mjs#L63) 已随两个管线目录增长，另保留少量跨目录项。
[readiness](../../../tools/lib/release/readiness.mjs#L45) 已共用产物对齐判据；剩余显式登记是设计取舍，不能从表存在推出必须自动追依赖。

## 建议的新工作项与行为边界

建议独立 Issue：**公司盘 workspace 三态读取接口是否能替代五处“先判再读”协议**。
第一阶段核对兼容与接口草案，产出逐消费者映射；批准实施后才改 owner 和五个函数。
目标 owner 是 [company-root](../../../packages/company-pack/src/host/run-bundle/company-root.ts)，受影响消费者仅上表四个文件、五个读取函数。
拟议接口是 workspace + rel → 现有 CompanyFileRead；不新增通用 JSON store、schema 注册器、依赖注入框架或公共导出。

必须保持：

- 同一普通文件文本仍交给原解析器；所有版本、legacy、schema、默认值和审计语义保持。
- workspace 与带/不带 `.dsh-company/` 的相对路径兼容语义保持，不让调用方猜根。
- 缺失仍按每个消费者原政策处理；根/父目录/叶子的坏形状仍被拒绝。
- 当前稳定输入上的诊断类别和文案保持；JSON 错误不合并成文件缺失。

明确变化：每个目标状态读取使用一次带结果类别的 owner 读取；不再先丢弃文本，再重新取文本。
现有“第一次成功、第二次读取失败”的分支不再由两次观察构造；这需要在接口设计中明确，而不是声称完全等价。
底层安全读取失败当前归 unsafe，消费者应保持既有稳定状态映射；如需细分 IO 原因，另列兼容决策，不偷偷改词表。

## 可证伪的成功与停止检查

1. 先画出五个函数对 text/missing/unsafe/坏JSON/高版本或legacy 的原有映射，缺一项就不进入实施。
2. owner 的 workspace 入口保持现有根解析与前缀规则；At 入口继续保持确切 companyHome 语义。
3. 实施后的五处不再组合 companyFileProblem + readCompanyText；旧便捷函数可为其他现有消费者保留。
4. 每个目标函数只消费一次读取结果；JSON 解析及领域默认仍可在自身模块单独理解与修改。
5. 在正常、缺失、已存在坏形状、坏JSON与版本分支上，通过原公开读取入口验证原有分类与内容。
6. 实施阶段才运行对应 host 用例、类型检查及仓规要求的检查；本轮没有测试绿灯，不能拿研究当实现证据。
7. 若必须统一四个领域 schema、改变默认政策、增加包/公开导出/构建入口，停止该切片并回卡比较。
8. 若只能减一层包装、五个调用方仍需先判再读，则删除测试未通过，选择不改生产。

成本预算是一项同包 owner 接口、旧便捷函数委托、五个读取点的映射检查；无新增包、发布入口或全仓迁移。
仍需人工维护领域 schema、提示文案和消费者的失败政策；此项不宣称一次解决所有规则漂移。
相较 B/C，A 的优势来自已存在的结果类型与五个真实消费者，而不是它改动文件最少。

## 下游路由与本轮限制

A 值得形成上述独立 Issue；Issue 应先记录兼容问题和完成条件，不把本报告当作生产实施许可。
B/C 作为备选，只有后续真实字段或 seed 规则变更需要多处同步时，再量化共享叶模块是否划算。
D 等待证据透传新增真实消费者或局部类型表达不足；E 保持目录派生加显式跨目录登记。
允许最后结论为“不改生产”：兼容映射不能保持或删除的义务不足时，以记录结论结束新 Issue。
本轮完成了当前源码阅读与候选比较；没有运行产品、安装、性能或失败注入验证，也没有声称缺陷已修复。
题名页、研究索引和新 Issue 由父会话维护；报告交接后由父会话审阅与决定路由。
