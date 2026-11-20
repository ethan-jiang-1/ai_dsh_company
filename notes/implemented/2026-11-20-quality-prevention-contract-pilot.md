# content 合同族：随成员增长的预防资产

状态：implemented；批准：用户 2026-11-20「好的，整理整理变成计划之后 setup goal准备落地了……质量最重要……有证据……静默自主执行……直到最终结果」；content首批已交付，原定验证与独立审阅完成。整体exploratory缺陷数或缺陷率改善未证明。

上游 = [实施卡](../../_backlog/_archive/settled_issues/2026-11-20-quality-prevention-contract-pilot.md)；依据 = [研究题](../../_backlog/_archive/research/quality-prevention/README.md)。

## 问题与结果

连续修复保护了已见样本，但新增成员、共享判据退化或消费者漏接仍可能等待下一轮探索才发现。本批让content的成员与关系自然进入既有自动回归，用独立业务锚点防止生产清单与测试一同缩小，并让开发入口要求相称证据。这是针对性自动防回归试点；没有改变packages/company-pack的生产实现，不能据此预测下一轮exploratory会少发现多少缺陷。用户随后明确该疑问不是新增生产修改要求，按原范围交付。

## 决定

- [世界构造](../../tests/support/content-worlds.mjs)从当前content普通文件与manifest建立基例，通过纯合同与两个真实Adapter复用。23个轴/505世界：逐成员缺/空/空白/漏登记、46必需件同步移除、17必需目录族、未来成员、版本/重复/tier/安全路径、三类JSON及全部声明entry/template/seed/layers/files/defaultLayers关系。独立基数核对每轴选择；同一合法基例防一律拒绝。
- [纯合同spec](../../tests/tools/content-contract.spec.ts)进入现有Vitest；[两消费者自测](../../tests/checks/content-family.test.mjs)由现有test:checks自动发现。未来成员进入缺/空/空白/漏登记四种生成变换，固定旧枚举负控必须失去见证；共享模板作为seed源与entry时同步改名，旧引用拒绝。
- 共享合同与两消费者隔离克隆，保留meta语义、唯一锚点与模块身份；移除version/反向inventory/JSON三个分支，两个消费者都误收对应坏世界；分别移除两个Adapter调用时，本侧误收、另一侧仍拒绝。合法对应世界始终通过。
- [生产bootstrap锚点](../../tests/host/run-bundle/bootstrap.spec.ts)独立点名CEO与process-docs映射，tracked源经真实计划/落盘观察字节；产品类型按真实目录发现，另保留已承诺类型字面锚点。CEO缺源整体拒绝；产品类型缺源按现有合同warning并跳过该seed，其余继续。
- [delivery锚点](../../tests/host/commands/delivery-command.spec.ts)保留六个独立业务ID/文件/模板，经真实handler观察缺文档拒绝与成功结果。两项seed映射缩小、六项规则+模板+文件同步缩小共8负控均无法缩小独立expected。
- [验收方法](../../_backlog/methods/validation-design.md)、[修复方法](../../_backlog/methods/bug-fix.md)与[收尾skill](../../.agents/skills/close-out-definition/SKILL.md)在原入口要求相称的域、独立期望、适用消费者、负控、未来见证与维护收益。单点机械改动保持最窄检查，探索按命名轴/判决/预算，无默认BUG配额。

没有生产行为、Interface、gate、probe、runner、content manifest或vendor修改。新增测试共享的是世界构造，不是第二份生产判据；合成shipped包只证明checker的entries/read输入，不冒充安装产物。

## 输掉的方案

- 再探索一批并按BUG数量交差：只能增加样本，不能删除逐成员维护义务。
- 生产REQUIRED驱动全部expected：漏项时同源缩小；只用于发现已承诺成员，独立业务结果另锚定。
- 新建通用schema/runner/shape总账：现有Module/Adapter与自动发现已足够，新增接口没有收益。
- 更窄指纹切片：本轮content的跨轮链、双消费者与变异证据更完整；指纹仅作维护方法的第二应用域。
- 一律依赖两个消费者相等：共享错误也会相等，必须对照变换独立规则和业务字面锚点。

## 状态事实与载体

| 事实 | 唯一入口 | 读载体 / 写载体 |
|---|---|---|
| content合同 | [content-contract](../../tools/lib/company/content-contract.mjs) | 两Adapter读；生产判据本轮未改 |
| 测试域/预期关系 | [content-worlds](../../tests/support/content-worlds.mjs) | pure spec与Adapter自测读；克隆世界经真实函数返回问题 |
| 业务必须性 | 真实bootstrap与delivery使用需求 | 对应spec独立字面锚点；不复抄完整REQUIRED清单 |
| 自动执行 | 现有Vitest / [checks发现](../../tools/repo/run-check-tests.mjs) | test与test:checks；不另加调度 |
| 开发证据选择 | validation-design / bug-fix / close-out | 作者与审阅者；实际走查结果见验证 |

## 归位

维护方法随做法变，留backlog methods；收尾只检查原承诺是否获得证据，留开发skill；产品实例只在测试，不进角色/preset。换公司/产品类型不改共同步骤；换方法可替换矩阵/变异做法，仍保留独立期望与消费者骨架。卡中四问、两测与第二应用域已先行，最终草案删除测试另见验证。搬家成本高的生产Interface复用，低成本方法文本只更新现有owner；未来若方法不再适用，换方法层，不造通用框架。更低层的单一测试无法承担跨任务证据选择，故只把这部分保留在维护方法/skill。

本决定补充[共享合同收口](2026-11-19-guard-residuals-closure.md)的常驻保护，不推翻其生产设计，也不取代原证据政策；无完整取代Note。

## 验收

原[卡中验收](../../_backlog/_archive/settled_issues/2026-11-20-quality-prevention-contract-pilot.md)逐项保留；确定性资产、方法触发/互补走查及独立语义审完成。实际命令如下。

## 验证

| 层 | 失败类 | 实跑命令与负控 |
|---|---|---|
| pure keyless | 纯逻辑/数据变换 | `pnpm test tests/tools/content-contract.spec.ts`：11 tests通过；23轴505世界每轴基数匹配，合法/坏世界依独立规则 |
| Adapter自测 | 共享判据/消费者漏接 | `node tests/checks/content-family.test.mjs`：5/5通过；3共享分支×两消费者、2独立断接均产生目标漏收且合法仍收；固定旧枚举失去未来见证；共享引用合法改名绿/旧源红 |
| 真文件keyless | 会话/持久化、业务规则 | `pnpm test tests/host/run-bundle/bootstrap.spec.ts tests/tools/kb-seeds.spec.ts tests/host/commands/delivery-command.spec.ts`：58 tests通过；8个业务清单缩小负控捕获命名断言，缺源/缺文档拒绝保持真实语义 |
| 全量keyless | 所有既有回归 | `pnpm test`：265文件/2346 tests通过，17.70s；首次仅生成census/BUG行号漂移2失败，按既有生成器刷新后同命令绿 |
| 类型/静态 | 类型/导入、文档生成物 | `pnpm typecheck`、`pnpm lint`、`pnpm dup`通过；`pnpm verify`通过；最终状态与研究承接指针变更后复跑确认；没有以结构门替代语义证据 |

五文件成本命令 = `pnpm test tests/tools/content-contract.spec.ts tests/repo/release/shipped-shape.spec.ts tests/host/run-bundle/bootstrap.spec.ts tests/tools/kb-seeds.spec.ts tests/host/commands/delivery-command.spec.ts`。成本同命令实测（一次样本，不声称统计性能结论）：窄Vitest五文件由110 tests/real5.27s到132 tests/real2.63s（缓存差异，不宣称加速）；test:checks由10文件/real11.70s到11文件/real14.17s，新增族自身约5.55s。基线checks有一条旧SLA错误文案断言失败，已维持同一坏输入与拒绝判据、更新为现行具体诊断；最终11 PASS/0 FAIL。早期并行高负载测到46.66s，未拿它作为稳定基准或隐藏；核心仍留自动lane。

独立代码语义审 `6c46964c-0d47-4dcb-a8c3-ce5da14161a7` 按policy四输入发现3类阻断并已修复：动态引用轴/逐轴计数、新成员漏登记生成见证、共享模板seed/entry改名。修后独立node5/5、窄三文件59/59，剩余阻断0。最终生命周期/证据盲审 `c20e19ec-8c9a-45d3-9ead-7c6570aecb45`：决定类KEEP、无额外实质阻断，命令/成本/证明边界一致；其指出的卡片旧状态、58/59/132选择命令及资源清理说明已修。方法新上下文走查 `a8b73d33-fc08-4652-91f2-e70ed0936599` 读取实际三入口后：content与指纹触发的证据设计PASS，纯拼写修改仅窄diff+verify、比例性PASS；不是运行这两个未来变更或统计模型评测。指纹走查正确区分package变化影响release/dev、pipeline只影响release、vendor/lock只影响dev，未伪称已经补其资产。删除新增要求后，逐消费者/轴计数、未来见证、加载确认、维护收益等不再成为必选，而独立期望/互补/红证等原骨架仍在；两项归位删除测试均PASS。具体指纹dev spec未在预算内定位，走查明确要求沿现有消费者补证，不把方法设计当成指纹实施。走查子代理叶工具13次超原8次上限，结果按一次定性走查使用，不作为预算合规证据；未留运行任务。

收割：本轮异常是过期SLA自测文案及生成物漂移，均非材料性产品缺陷，原命令红后修绿；新资产为动态世界、消费者失效与业务必须性见证，无新BUG卡/模型场景/门禁；未触运行态新事实，无需新增probe或调试阶梯。

资源清理：新资产无子进程；临时目录由finally/after按本测试创建的绝对边界删除。全量与独立复跑后，检查runtime/tmp的content-family-/bootstrap-business-/delivery-business-前缀残留为0；静态检查未改vendor。

维护收益：普通新增成员自动进入缺/空/漏登记与关系变换，不再手工逐件补同型样例；REQUIRED仍需随真实读取需求维护，业务ID/目标/模板字面锚点仍需按产品决定审阅，目录自动发现不证明业务完整性。

## 未覆盖轴

- [covered] 原验收的确定性合同、两消费者与独立业务锚点均有常驻证据，不是枚举BUG标题数 → [content-family](../../tests/checks/content-family.test.mjs)。
- [policy] 安装、浏览器、真模型、发布与指纹/presence/catalog新资产不在本批范围 → [上游卡](../../_backlog/_archive/settled_issues/2026-11-20-quality-prevention-contract-pilot.md)。
- [unprovable] 单轮不能证明长期缺陷率下降或自动发现任意新增读取需求；必须性仍由需求与独立业务锚点维护 → [业务bootstrap锚点](../../tests/host/run-bundle/bootstrap.spec.ts)。
