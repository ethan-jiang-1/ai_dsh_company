# bootstrap 计划：在生产源头排除不完整载荷

状态：implemented；批准：用户在生产源头研究提交后于2026-11-20「继续」，会话明确承接研究推荐的bootstrap局部试点，用户随后再次要求继续。

上游 = [质量预防卡](../../_backlog/issues/2026-11-20-quality-prevention-contract-pilot.md)；依据 = [生产源头研究](../../_backlog/research/quality-prevention/2026-11-20-production-source-prevention.md)。

## 决定

[BootstrapEntry](../../packages/company-pack/src/host/run-bundle/bootstrap.ts)保留现有计划/执行入口，改为dir、skip-file、create-file判别联合。create-file必须携带一个payload：source及sourceRel，或content及text；互斥字段用never拒绝经变量绕过的混入。dir/skip不携带payload或文件mode。空内联文本仍是合法内容，本切片不引入内容非空业务规则。

planBootstrap对既存文件产出无payload的skip；待创建种子和角色章程明确选source，角色org/owners补行明确选content。applyBootstrap先处理skip与dir，再按payload.kind读取来源；删除sourceRel空字符串兜底及双来源优先级。无新的转换层、运行时拒绝分支、门禁或调度器。

这是收窄内部TypeScript计划形状，外部落盘字节、补缺/替换、计数和warning策略保持。计划对象的内部形状改变：skip不再保留sourceRel，内部直接调用者需迁移。原来的content优先于sourceRel是有文档的行为，不是本轮发现的bug；两个生产者不需要双来源。本轮未更改已有落点、symlink、父目录、写权限、wx或temp+rename检查。

收益是作者不再靠记忆保证创建文件有来源，也不用维护两来源优先级；执行者不再兜底缺来源。路径是否存在、安全、可读及计划后文件系统变化仍靠执行检查，联合类型不能保证I/O安全；不宣称整体探索缺陷数或缺陷率改善。

## 输掉的方案

- 保留原可选字段、只加更多运行时例子：作者仍能构造缺来源的计划，执行者仍需兜底。
- 仅在顶层sourceRel/content上做XOR：本轮中间版本已编译通过，但执行者仍保留优先级和空路径兜底，未完成研究要求的义务删除；最终选显式payload。
- skip要求携带来源：执行者本就先跳过，不读取来源；独立skip分支表达真实行为，避免携带无用信息。
- 为旧双来源形状增加宽松Adapter，或顺手集中delivery规则解码：前者保留旧维护义务，后者需要另一组信任与失败政策，不属本切片。

## 状态事实与载体

| 事实 | 唯一入口 | 读载体 / 写载体 |
|---|---|---|
| 合法计划形状 | BootstrapEntry | 两计划生产者写；applyBootstrap读；不持久化该计划 |
| 内容来源选择 | payload.kind | source相对pack，content内联；执行者只消费已选来源 |
| 执行结果 | BootstrapResult | 原created/skipped/warnings；文件系统检查仍归原执行者 |
| 编译期拒绝 | [bootstrap spec](../../tests/host/run-bundle/bootstrap.spec.ts)的类型见证 | pnpm typecheck实际包含host spec；Vitest不检查ts-expect-error |
| 文件行为 | [bootstrap spec](../../tests/host/run-bundle/bootstrap.spec.ts)、[roster spec](../../tests/host/run-bundle/roster-backfill.spec.ts) | 真实临时盘与tracked业务锚点；不从新类型生成expected |

主题检索已核对[content试点](2026-11-20-quality-prevention-contract-pilot.md)、[产品类型单源](2026-11-11-product-type-single-source.md)与[状态根写门](2026-11-13-state-root-write-gate-sweep.md)。本决定补充内部计划约束，不取代其内容保障、类型选择或文件系统保护；无旧决定被推翻。

## 验证

| 层 | 失败类 | 实跑与负控（见过红） |
|---|---|---|
| 编译期 | 类型/导入、非法内部状态 | 先在原宽类型加入3条ts-expect-error，`node ./node_modules/typescript/bin/tsc -p tsconfig.test-company.json`退出2，3个TS2578；最终`pnpm typecheck`通过 |
| 见证反证 | 类型约束退化 | 用TypeScript API从实际AST提取最终类型和见证函数到虚拟文件：当前0诊断；放宽payload可选及互斥后5个TS2578；删除预期错误标记后5个TS2322；合法dir/source/content/skip仍通过；未覆盖cast/any绕过 |
| 真文件keyless | 会话/持久化、业务规则 | `pnpm test tests/host/run-bundle tests/host/contract/company-root-safety.spec.ts`：12文件205条通过，含真实种子字节、角色合并、重入、symlink/落点防护；新增skip无载荷+计划后源消失对照保持warning并继续创建其他种子 |

新对照首次仅expected文字写成“公司”而fixture是“公司身份”失败，核对原fixture后修正expected并重跑同命令通过；未改生产语义迁就测试。类型XOR中间版的生产者/测试读取窄化错误均按新联合迁移，未cast绕过；未使用的类型见证函数用void引用保留编译检查，避免伪装为Vitest行为测试。

全量`pnpm test`通过265文件/2347 tests；`pnpm verify` ALL PASS（两项replay新鲜度门无对象）；`pnpm typecheck`、`pnpm lint`、`pnpm dup`、`pnpm notes:audit`及`git diff --check`通过。BUG覆盖生成表因spec行号变化用既有生成器刷新；census重生成无diff。未执行安装、模型、浏览器或发布检查。

独立规范审`1c7e5735-097b-43b0-ab8a-55fbd735b1f8`对照当前diff、仓规、测试合同与Note：0 findings/0 blockers；确认测试在实际typecheck范围，strict及exactOptionalPropertyTypes开启，变量混入也被拒绝；原文件系统保护分支保持。独立需求语义审`09b558fc-8df8-4357-bc91-48c052e0378f`按policy四输入核对：0 blockers；验收未缩成玩具、注释与实现一致、无未完成验收藏入未覆盖轴。可选增加反向混合来源与skip-mode负控未采纳：当前实现已拒绝，现有5项负控足以覆盖本次承诺，不再扩张试点。

收割三问：未发现材料性产品缺陷，不建BUG卡；新增5项编译期负控、4种合法形状对照及1项skip/源消失真实文件对照，未加门禁；无新增运行态事实或部署操作。类型变异在虚拟文件中执行，无生产树临时替换或遗留任务。

## 未覆盖轴

- [covered] 内部构造的非法状态、来源执行与现有文件防护分别由类型检查和真实文件回归承担 → [bootstrap spec](../../tests/host/run-bundle/bootstrap.spec.ts)。
- [policy] 任意JS/any/cast、外部JSON验证不由TypeScript保证；不新增兼容Adapter或通用规则框架 → [生产源头研究](../../_backlog/research/quality-prevention/2026-11-20-production-source-prevention.md)。
- [policy] 本批无浏览器、真模型、安装、发布或跨文件事务；现有运行文件合同保持 → [质量预防卡](../../_backlog/issues/2026-11-20-quality-prevention-contract-pilot.md)。
- [unprovable] 局部类型约束减少可构造状态，不证明长期总体缺陷率、真实产品需求完整性或消除文件系统竞态 → [原状态根写门](2026-11-13-state-root-write-gate-sweep.md)。
