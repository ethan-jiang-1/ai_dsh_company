---
topic: 原生质量机制如何预防整类缺陷
intent: 将 FAQ30/31 的实践追溯到本仓钉版本，给出独立判据、生命周期性质与 company 预防插入点。
---

# 从探索补洞转向原生预防：证据、状态与测试资产

> 本材料是研究交接，不是机制落地；只新增本文，没有修改代码、门禁、合同或 notes。

## 范围与版本

**观察**：2026-11-20 在 company 工作区只读查询，`git submodule status vendor/dsh` 返回 `b830ec950faba0a46dda564be3e2d854afed94f1`。根[版本簿记：83](../../../../AGENTS.md)登记同一 SHA。下面的原生结论仅针对这份 pin；FAQ 是研究线索，外部工作树当前代码和移动的 GitHub master 都不替代它。

已阅读 FAQ30 的[质量实践：7](<../../../../../deepseek-harness/_faq_on_digested/30_schemastery-basics/03-repo-quality-practices.md>)、[设计纪律：28](<../../../../../deepseek-harness/_faq_on_digested/30_schemastery-basics/05-practical-design-disciplines.md>)、[消费链：9](<../../../../../deepseek-harness/_faq_on_digested/30_schemastery-basics/02-dsh-consumers-and-lifecycle.md>)，以及 FAQ31 的[开发走查：9](<../../../../../deepseek-harness/_faq_on_digested/31_preset-quality/02-development-walkthrough.md>)、[行为验收：35](<../../../../../deepseek-harness/_faq_on_digested/31_preset-quality/03-behavior-evaluation.md>)、[长期开发：45](<../../../../../deepseek-harness/_faq_on_digested/31_preset-quality/04-long-term-development.md>)、[原生验证：54](<../../../../../deepseek-harness/_faq_on_digested/31_preset-quality/05-native-verification-reference.md>)、[生命周期：23](<../../../../../deepseek-harness/_faq_on_digested/31_preset-quality/06-lifecycle-reference.md>)及[运行时出处：121](<../../../../../deepseek-harness/_faq_on_digested/31_preset-quality/research-runtime.md>)。FAQ 的实跑记录属于其原研究，本轮不继承通过计数。

本文“观察”指已读的政策、实现和断言；“推论”是从它们导出的解释；“建议”尚未实施。未执行测试、record/refresh、真模型、浏览器或服务器；没有证明公司缺陷发生率已经下降。

## 为什么一直探索、一直补，仍难收敛

**观察**：原生已有三个不同的假绿实例。

| 事故 | 已有证据为何没抓住 | 后来预防的类别 |
|---|---|---|
| ACP 有 178 个绿单测、100% 行覆盖，仍无法创建/恢复会话 | 手工挂插件替生产入口补齐 `inject`，平铺 Context 又绕过真实 fiber 查找拓扑；见[复盘：91](../../../../vendor/dsh/docs/postmortem/0001-acp-default-export-drops-inject.md) | 测真实 Loader、导出解包和实际调用拓扑；用无 Key 的真实会话操作覆盖不依赖模型的部分，见[守卫记录：104](../../../../vendor/dsh/docs/postmortem/0001-acp-default-export-drops-inject.md) |
| 文件工具没有注册，快照仍绿 | refresh 把 `UNKNOWN_TOOL` 收为新 expected，稳定复现了错误；见[影响：19](../../../../vendor/dsh/docs/postmortem/0002-js-expression-disabled-filesystem-tools.md) | 对新日志与已提交 fixture 独立拒绝不可能结果，见[守卫：41](../../../../vendor/dsh/docs/postmortem/0002-js-expression-disabled-filesystem-tools.md) |
| 改 GUI，却验收另一个端口；早期测试把超时误判为快速拒绝 | HTTP 200、构建成功、boot manifest 和原页面被混为一谈；见[根因：34](../../../../vendor/dsh/docs/postmortem/0003-web-agent-gui-feedback-loop.md) | 绑定原目标身份，观察具体状态；测试应区分自然退出、超时和从未监听，见[教训：53](../../../../vendor/dsh/docs/postmortem/0003-web-agent-gui-feedback-loop.md) |

**推论**：探索是在既有结构上采样，新增坏例本身不会减少重复真相、旁路调用、异步状态组合或错误 oracle。只给每个现象添提示词、分支和通过样例，还会增加下一次必须记住的义务。这解释一种不收敛机制，不是对本仓全部历史缺陷的统计归因；原生要求首先把正确性写进结构，并让状态只有一个拥有者，见[防御原则：11](../../../../vendor/dsh/docs/defensive-patterns/README.md)。

**建议**：每次发现问题先问“未来同类错误怎样变得不可表示、必经检查或可稳定证伪”，再选最小资产。探索继续寻找未知面；已知失败类应迁入拥有它的操作、真实入口和独立判据，而不是永久依赖人工重复走查。原生明确要求守卫能被目标回归打红，见[真实入口政策：40](../../../../vendor/dsh/docs/testing.md)。

## 根本预埋：减少维护义务，再增加判据

**观察**：DSH 曾有独立 settings 注册，重复 schema、默认值、持久化和通知；现行决定让插件 Config 拥有业务配置，表单写 profile patch，仍走 Loader 协调，见[问题：9](../../../../vendor/dsh/.agents/notes/implemented/architecture/2026-09-19-profile-owned-live-configuration.md)与[决定：13](../../../../vendor/dsh/.agents/notes/implemented/architecture/2026-09-19-profile-owned-live-configuration.md)。volatile 的正确性收在 `Entry.update`，profile、HMR 和直接更新都经过它，见[统一入口：13](../../../../vendor/dsh/.agents/notes/implemented/architecture/2026-09-18-volatile-config-references.md)。

**推论**：最有杠杆的预防不是再建一个同步器，而是删掉第二个业务来源；不是提醒每个 UI、CLI、监听器记得补通知，而是由拥有状态的公共操作完成校验、提交和生命周期。配置之外，交付状态、授权和派生 UI 也可用同一问题审视，但本文没有逐个审计它们。

**建议**：设计时先写出默认值、读取者、写入位置、重启恢复来源；再写候选校验、提交点、通知点及失败保留对象。重复事实应合并，独立领域状态则保留自己的拥有者。不能为“只有一个真相”把配置、业务记录和执行中参数强塞成同一对象；FAQ 明确区分[三份状态：9](<../../../../../deepseek-harness/_faq_on_digested/30_schemastery-basics/02-dsh-consumers-and-lifecycle.md>)。

## 四类证据各自回答什么

| 证据 | 可以支持 | 不能证明 |
|---|---|---|
| 真实加载、精确能力集 | 当前组合经 Loader 激活，目标 Agent 实际拥有指定工具/提示词 | 模型能正确选用；权限已在执行器强制 |
| 模型输入快照 | 实际组装的 system、tools 及变化符合已审查期望 | 模型理解、决策改善；单独 sidecar 覆盖所有后续方法正文 |
| recorded replay | 固定模型流下，当前执行、日志、交接与已声明外部效果符合期望 | 当前真实模型会产生这些决策 |
| 真模型任务＋独立结果判据 | 当前模型在给定版本、任务和环境中的实际表现 | 未测任务、未来模型或所有波动下的普遍保证 |

**观察**：真实组合政策要求只替换外部或非确定边界；源码映射不覆盖 built exports，见[原生政策：39](../../../../vendor/dsh/docs/testing.md)与[产物入口：41](../../../../vendor/dsh/docs/testing.md)。原生 preset 测试逐项比较工具全集，避免“挂载成功但贡献为空”，见[精确目录断言](../../../../vendor/dsh/apps/cli/tests/web-agent-presets.e2e.ts#L299)。

**观察**：prompt/schema sidecar 固定完整输入序列，并有专属拥有者，见[pin 规则：87](../../../../vendor/dsh/packages/test-support/session-snapshot/README.md)；比较实际 system 与 schemas 的代码在[输入断言](../../../../vendor/dsh/packages/test-support/session-snapshot/src/suite.ts#L1583)。只改 skill 正文而摘要不变，目录可能不重发；需要另看加载结果，见 FAQ 的[正文更新证据线索：52](<../../../../../deepseek-harness/_faq_on_digested/31_preset-quality/02-development-walkthrough.md>)，本文未继续读取该用例源码。

**观察**：replay 明确用固定模型 transcript 驱动真实 Agent，见[包定义：28](../../../../vendor/dsh/packages/test-support/llm-replay/README.md)；其不向 provider 模型发请求，见[限制：136](../../../../vendor/dsh/packages/test-support/llm-replay/README.md)。所以刷新了 prompt 的同时，旧轨迹仍可能通过。原生将真实 API 行为证据与无 Key plumbing 区分，见[政策：25](../../../../vendor/dsh/docs/testing.md)。

**建议**：测自主方法或协作选择时，只给业务目标和约束；明确指定成员、工具、步骤的任务作为机制连通测试。保留“缺依据时不下结论”和“依据完整时正常完成”的配对样例，避免全部拒绝也得高分。此为验收设计，依据 FAQ 的[指定路径边界：37](<../../../../../deepseek-harness/_faq_on_digested/31_preset-quality/03-behavior-evaluation.md>)与[正反例：25](<../../../../../deepseek-harness/_faq_on_digested/31_preset-quality/03-behavior-evaluation.md>)，本轮没有运行这些任务。

## 预期与实测不能共源：独立到哪一层

**观察**：原生要求从外部重读文件/重跑命令，不信模型自报，未授权修改的文件要字节一致，见[结果政策：35](../../../../vendor/dsh/docs/testing.md)。写入场景的完整工作区期望独立维护，record/refresh 都不重写，见[快照政策：14](../../../../vendor/dsh/docs/testing.md)。实现将最终实测树与独立期望比较；未声明可变则比较初始树，见[状态断言](../../../../vendor/dsh/packages/test-support/session-snapshot/src/suite.ts#L1593)。捕获包含文本、二进制、链接和空目录，见[捕获实现](../../../../vendor/dsh/packages/test-support/session-snapshot/src/workspace.ts#L87)。

**推论**：独立性至少有三层：预期来自需求/已认可规则，不从本次输出倒推；实测来自独立观察，不从“成功”文案推断；刷新输入/日志不自动刷新业务 oracle。若期望和实测都调用同一个错误解析器或同读被误删的 YAML，测试可能只证明两份错误一致。完整树也不证明网络、远端系统和全部文件元数据，需要各资源拥有者另行观察。

**观察**：company 的 skill 冒烟期望从当前角色目录、YAML 声明和部署方法层生成，见[期望计算](../../../../checks/lanes/preset.entry.mjs#L224)。它能抓装配与声明不一致；若某个必需共享根在声明和推导期望中同时消失，这类一致性比较不能独立证明产品仍具备该方法。这是静态推论，没有故障注入证据。

**建议**：保留动态一致性检查，同时在相关场景旁手写少量“产品必须拥有/必须没有”的关键能力和已知业务真值，不另造全仓第二名册。对 shared parser 用不同实现的参考真值或全通道等价类矩阵；company 现有[纪律：53](../../../../docs/testing.md)已经要求这一点。回放还应独立拒绝结构化不可能状态，原生对 fresh log 的 `UNKNOWN_TOOL` 检查见[实现](../../../../vendor/dsh/packages/test-support/session-snapshot/src/suite.ts#L1347)。

## 生命周期与状态性质怎样验证

以下“现有断言”均指本轮读过源码，未实跑；“增加性质”是迁移建议。

| 性质 | pin 中现有断言 | company 应怎样构造能区分机制的场景 |
|---|---|---|
| 即时更新保留身份，通知只看见完整提交 | 比较实例/引用身份，观察两字段已一并提交，重复同值不通知，见[测试](../../../../vendor/dsh/scripts/loader-volatile-update.spec.ts#L56) | 两实例取不同值；一次更新多字段，在真实消费者通知里读取；不能手工替产品补发通知 |
| 无效候选与混合变更各有语义 | 无效值不改旧引用；普通字段变化释放旧实例并产生新引用，见[测试](../../../../vendor/dsh/scripts/loader-volatile-update.spec.ts#L85) | 同时检查旧引用、新实例、通知次数与消费者参数；只断言 `.get()` 的末值不够 |
| 局部失败不等于整树事务 | 无效 entry 保留旧运行值但 raw 候选已变，健康 entry 继续提交，见[测试](../../../../vendor/dsh/scripts/loader-volatile-update.spec.ts#L481) | 按运行值、raw、磁盘、实例分别写后置条件；禁止把 catch/旧值未变概括为全局回滚 |
| 嵌套入口仍走同一更新语义 | Group/Include 经 boot＋profile patch，检查父子身份及混合变更，见[测试](../../../../vendor/dsh/scripts/loader-volatile-update.spec.ts#L451) | 选产品实际存在的嵌套组合走公共操作；不只测平铺夹具 |
| 持久化、并发与失败恢复有界 | 写后检查真实消费者与磁盘，销毁后重启恢复，见[测试](../../../../vendor/dsh/packages/settings/settings/tests/configuration.spec.ts#L9)；相同 revision 两写仅一成功，见[测试](../../../../vendor/dsh/packages/settings/settings/tests/configuration.spec.ts#L48) | 两写都持同一旧 revision；另测高层遮蔽/激活失败。局部 patch 恢复不冒充崩溃或任意外部副作用事务，见[恢复用例](../../../../vendor/dsh/packages/settings/settings/tests/configuration.spec.ts#L151) |
| 旧/新 Agent 与 child 的版本不同 | 旧 Agent/child 保留 retired revision，最后引用释放后才收集，见[测试](../../../../vendor/dsh/packages/preset/agent-preset-registry/tests/registry.spec.ts#L38) | 同 ID 定义 A→B：旧父仍 A，新 Agent 为 B；child 省略 preset 跟 A，显式同 ID 取 B，比较实际请求工具，见[对照用例](../../../../vendor/dsh/packages/subagent/subagent/tests/activation-presets.spec.ts#L144) |
| 取消请求、操作终结、资源释放是不同事件 | 原生要求 registry dispose 后观察移除，见[政策：9](../../../../vendor/dsh/docs/testing.md)；并发资源必须拥有到 teardown，见[执行模型：21](../../../../vendor/dsh/docs/testing.md) | 可控 Promise 暂停旧操作，触发取消/卸载，验证最后一次日志/文件写入的依赖仍有效；释放后等真正 settled，再证明无晚到通知/残留资源 |

**建议**：对操作 A 更新中、B 更新后的时间语义，测试应先让 A 进入已知暂停点，再更新、启动 B、读取真实采用参数，最后释放 A 并等待清理；这比 sleep 后读末值更能覆盖竞态。该安排来自 FAQ 的[可控并发建议：68](<../../../../../deepseek-harness/_faq_on_digested/30_schemastery-basics/03-repo-quality-practices.md>)，不是上表 Loader 测试已经验证每一种业务操作的声明。

**限制**：本轮只核对了进程内 revision 与 child 对照；普通会话重启、继承 child 冷恢复和新空白草稿复用不能混成一条规则。FAQ 的[精确分支：49](<../../../../../deepseek-harness/_faq_on_digested/31_preset-quality/research-runtime.md>)可供后续按产品承诺选测试，本轮未读取这些冷恢复用例，不能宣布 company 已覆盖。

## 给 company 的七个预防插入点与反例

以下均是复用现有拥有面补强的候选，不是新增项目、中央流程或自动门禁的实施授权。

| 插入点 | 预埋机制/资产与可证伪例 | 反例：仍会补不完的做法 |
|---|---|---|
| 1. 新增状态修改操作的设计处 | 先定位唯一拥有者、提交点、失败状态，所有调用者走同一操作；让一个替代调用入口也触发拒绝。依据[公共更新入口：13](../../../../vendor/dsh/.agents/notes/implemented/architecture/2026-09-18-volatile-config-references.md) | UI 校验一次，CLI/事件监听另写一套；缺陷出现后逐个入口补提醒 |
| 2. preset 真实挂载与能力验收 | 保留现有[session/create](../../../../checks/lanes/preset.entry.mjs#L170)，增加关键承诺的精确工具/方法正负断言；误删必需能力应使断言失败。参照[原生全集比较](../../../../vendor/dsh/apps/cli/tests/web-agent-presets.e2e.ts#L299) | roster 零 broken 或由同份 YAML 生成期望就宣称角色能力完整 |
| 3. persona/skill 改动同 diff | 让最终输入、目标正文与任务正反例对应；适用条件改动至少保留正常完成和合理停止两面。已有[改动面映射：30](../../../../tests/README.md)可承载 | 只测源文件有“禁止编造”字样；把全拒绝当可靠 |
| 4. 重要执行轨迹首次成为资产时 | 固定模型流、保留下游真实执行、审输入与日志，独立维护外部结果；坏文件和未知工具必须各自打红。依据[外部结果政策：60](../../../../docs/testing.md)和[原生 guard](../../../../vendor/dsh/packages/test-support/session-snapshot/src/suite.ts#L1347) | 为当前坏输出 refresh 全部 expected；把现有[foundation 回放：69](../../../../tests/README.md)当 company 业务覆盖 |
| 5. 持久化与跨载体规则新增处 | 走现有[host 合同测试/载体登记：36](../../../../tests/README.md)，补同 revision 竞争、失败后字节、重启读取、旁路写入场景；参考[原生并发断言](../../../../vendor/dsh/packages/settings/settings/tests/configuration.spec.ts#L48) | 只测序列化器往返；读写共用同一错误实现；只断言抛错 |
| 6. 注册、热替换、取消和升级处 | 生命周期矩阵钉旧/新/继承/显式选择，dispose 后观测撤回；可控暂停验证旧任务最后依赖。依据[retention 测试](../../../../vendor/dsh/packages/preset/agent-preset-registry/tests/registry.spec.ts#L38)与[资源纪律：21](../../../../vendor/dsh/docs/testing.md) | 同 ID 当永久版本锁；发 abort 就视为完成；固定等待后假定资源已释放 |
| 7. 缺陷结案与资产维护处 | 按现有[共享原语/独立参考真值纪律：53](../../../../docs/testing.md)追到失败类；给最小判据一个已知坏例，确认 runner 真执行、实际命中数非零，再复用到相邻消费者。零执行不算绿，见[本仓纪律：52](../../../../docs/testing.md) | 为每次事故加专名 if，检查器从未见红；又建一份重复清单却不改变调用和判据 |

## 收口判准与后续边界

**建议**：研究后优先选择一个高频共享失败类，验证它是否已经减少重复来源/旁路，是否有真正经过生产入口的断言、独立 oracle 和能打红的反例；再比较相邻消费者。已有同类资产则补缺失性质，不为研究再建一套纪律。原生[证据原则：15](../../../../vendor/dsh/docs/defensive-patterns/README.md)要求主张可反驳、可重算。

**推论**：能收敛的是“同一失误必须靠多少人、多少入口、多少份副本共同记住”，不是所有未知 bug 的数量归零。当前文档只能证明 pin 中存在这些机制、政策和用例；company 的实际覆盖、runner 接通、守卫红绿及模型收益仍要各自实测。这份材料没有给它们补发通过证明。
