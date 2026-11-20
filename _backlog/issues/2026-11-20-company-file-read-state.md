---
status: 推敲中
opened: 2026-11-20
---

# 推敲：公司盘状态读取能否一次保留文本与失败类别

> 立卡：2026-11-20 ｜ 状态：推敲中 ｜ 类型：Task ｜ 毕业：未定 ｜ 可关闭：否
>
> 来源：用户2026-11-20要求生产源头方向独立「先research再出新issue」，既有成果只作基础。本卡在[独立研究](../research/source-prevention-design/README.md)完成候选比较后建立，不承接旧content试点卡的范围、验收或授权。
>
> 当前去向未定；本轮只研究、立卡与交接，不是生产落地，不提交Git。实施与提交均未获本轮授权。

**问题与期望结果：** 五个状态读取函数先检查文件问题，再取文本，但检查内部已经实际读过文本。能否由现有文件读取owner一次返回text/missing/unsafe，删除调用者“先判再读”的操作协议，同时保留各领域自己的解析、默认、版本与诊断？

**当前情况：** [候选比较与源码证据](../research/source-prevention-design/2026-11-20-source-prevention-options.md)比较了五类候选。本项有现成结果类型、五个真实消费者、无跨工具打包成本，适合作为有限接口整理；底层安全逻辑早已集中，不能据此认定它是全仓最高优先级预防工作，也未复现产品故障。两路设计review认可方向，要求补齐分类语义、观察变化和读取验收；下文按[验收设计](../methods/validation-design.md)、[证据选择](../methods/validation-evidence.md)及[下游交接](../methods/issue-to-note.md)整理。

**未决问题：** 用户是否接受下述有限收益和一次观察语义；拟议workspace入口及五个公开消费者是否为实施时认可的测试接口；实际文件读取观测能否在现有测试中可靠接入。未决项不以文档结构检查代替。

**下一步：** 本卡先交付行为/兼容/验收提案；再给用户展示接口及五处调用的具体改动草案。用户确认范围、观察变化与测试接口后才申请实施；本轮不写测试、不改生产或生成RFC/Note。

## 范围与排除项

拟议owner为[company-root](../../packages/company-pack/src/host/run-bundle/company-root.ts)：暴露workspace语义的三态文件读取，复用已有安全读取与CompanyFileRead；旧便捷函数可从相同结果派生，保留其他现有调用者。

目标仅五个状态函数：

| 文件 / 函数 | 必须保持的领域政策 |
|---|---|
| [startup-store](../../packages/company-pack/src/host/startup/startup-store.ts) / readStartupSettingsState | 缺失使用默认策略，unsafe有诊断，JSON坏值为corrupt |
| 同文件 / readStartupOptionsState | 缺失为空选项，unsafe/corrupt不冒充正常 |
| [bundle-manifest](../../packages/company-pack/src/host/run-bundle/bundle-manifest.ts) / readBundleManifestState | 路径、legacy、unsupported及当前版本校验 |
| [catalog-state](../../packages/company-pack/src/host/ledger/catalog-state.ts) / readCatalogState | missing/corrupt/unsupported及catalog字段检查 |
| [presented-ledger](../../packages/company-pack/src/host/ledger/presented-ledger.ts) / readPresentedLedger | missing/corrupt/unsupported、布尔映射与审计政策 |

不统一这些领域的JSON schema、版本或默认；不顺手改delivery/seed/catalog算法/presence/发布指纹；不新增文件访问框架、包、配置或公开包入口；不改写盘行为。不声称一次结果能消除文件系统并发窗口，也不以此宣称漏洞修复或性能提升。

## 拟议接口与兼容要求

行为类别只有确定性逻辑及同进程调用接线；无新增模型行为、Cordis装配、UI或持久化协议，不安排模型评测/浏览器/安装演示来代替读取验收。

拟议在现有owner提供 `readCompanyFile(workspace, rawRel): CompanyFileRead`（未实现）；先沿现有 `ensureCompanyRoot(workspace)` 校验根，再以 `stripCompanyPrefix: true` 调用原读取实现。保持带/不带 `.dsh-company/` 前缀的原语义。`readCompanyFileAt(companyHome, rel)` 保持确切根和不剥前缀，不用它直接替代workspace入口。

原 `companyFileProblem`、`readCompanyText` 作为从同一workspace结果派生的有损视图保留；五个目标函数改为各消费一次完整结果。收益仅是删除这五处调用次序与重复读取责任；保留旧视图不代表结构上禁止未来调用者再组合它们。不增JSON解析层、不统一领域失败政策。

### 稳定输入的兼容表

这里的missing/unsafe是底层当前返回的类别，**不是精确errno或“已证明不存在”**：[plainFileProblem](../../packages/company-pack/src/host/fs/safe-file.ts#L27)把lstat异常归missing，[实际读取](../../packages/company-pack/src/host/run-bundle/company-root.ts#L260)把打开/读异常归unsafe。继承当前分桶，不在本题修订权限错误分类；不新增io-error类别。

| 消费者 | missing | unsafe | text：空白 / 合法 / 坏JSON或形状 / 版本 |
|---|---|---|---|
| readStartupSettingsState | 默认设置，problem=null | 默认设置，problem=unsafe | 空白也为默认且null；合法保留所选值；坏JSON/形状为corrupt；v>1为unsupported，其他非法版本为corrupt |
| readStartupOptionsState | 空选项，problem=null | 空选项，problem=unsafe | 空白为空选项且null；合法按原清洗保序；坏JSON/非对象为corrupt；不新增原解析器没有的版本拒绝 |
| readBundleManifestState | status=missing并保留path | status=corrupt，保留原路径不安全文案 | 空白/坏JSON仍走原错误；合法值与expectedPack校验保持；v2仍legacy，更高版本仍unsupported，其余原校验不变 |
| readCatalogState | status=missing | status=corrupt，保留原catalog路径不安全文案 | 空白/坏JSON/坏字段为corrupt；合法结果保持；高schema为unsupported |
| readPresentedLedger | status=missing并保留path | status=corrupt，保留原账本路径不安全文案 | 空白/坏JSON/坏布尔映射为corrupt；合法账本保持；高schema为unsupported |

期望源为原公开读取函数及[settings/options解析器](../../packages/company-pack/src/lib/startup/startup-settings.ts#L192)、[启动状态矩阵](../../tests/host/contract/startup-state-agreement.spec.ts)、[账本状态矩阵](../../tests/host/contract/ledger-state-agreement.spec.ts)；用真实文件和独立字面量固定，不从新helper生成期望。现有宽松解析、schema字段和路径文案不随本重构收紧。

### 一次观察的变化与恢复

- 成功读取后按这次取得的文本解析；不因省略的“第二次读取”报不可读。旧代码首次成功后文件改变/消失可能走corrupt，新代码可继续解析首次文本。这是拟议接受的变化，等待用户确认，不承诺与任意竞态完全等价。
- owner读取内部仍包含路径检查、lstat/realpath和打开读取；检查前缺失可得到missing，检查后打开失败可得到unsafe。只承诺目标文件内容读取**至多一次尝试**，不承诺原子快照或消除文件系统竞态。
- 读取/解析失败不创建、不覆盖、不修复文件；保持各消费者原降级策略。文件恢复后下一次调用重新读取，不加缓存或重试。根/父目录/叶子坏形状不能被新helper无条件降为默认。
- catalog/ledger目标函数中误导性的companyHome参数/JSDoc按实际workspace语义澄清，不改变真实寻址，不开展全仓重命名。

## 已知与未决

- 已知：[companyFileProblem](../../packages/company-pack/src/host/run-bundle/company-root.ts#L266)和[readCompanyText](../../packages/company-pack/src/host/run-bundle/company-root.ts#L274)各自执行完整安全读取；第一步丢文本，第二步丢失败类别，五个调用者再组合。
- 已知：[CompanyFileRead/readCompanyFileAt](../../packages/company-pack/src/host/run-bundle/company-root.ts#L360)已存在三态，但At以确切companyHome为根、不剥公司盘前缀。不能把workspace消费者直接换到At。
- 已知：catalog/ledger参数即使命名companyHome，当前调用的仍是workspace版读取；[账本真实调用断言](../../tests/host/contract/ledger-state-agreement.spec.ts#L60)传world.ws。草案应按实际语义而非变量名迁移。
- 草案约束：workspace与At根语义、便捷视图委托、稳定状态映射及观察变化见上节；这些是拟议实施条件，非已实施事实。
- 证据缺口：现有真实文件用例可保护分类，但不能直接证明内容读取次数；需在原测试入口落实目标文件的call-through观测。未确认可靠观测方式前，该验收项为证据不足，不以源码关键词搜索代替。
- 人的判断：接受有限维护收益、一次观察的兼容边界、测试接口及后续实施/提交授权；事实查证由agent完成，不把普通实现选项逐项推给用户。

## 方案与取舍

1. **首选草案**：在现有company-root中返回三态读取结果，五处各自对一次结果分支，文本仍交给原解析器。目标删除的是重复读取与调用次序责任，不删除领域失败政策。
2. **保持现状**：若旧包装已足够、迁移不能保住重要行为或不能删除五处协议，则明确不改，不为抽象而抽象。
3. **不选万能JSON读取器**：会把各领域schema/版本/文案耦合，无法以本题收益证明成本。
4. **暂缓规则或seed共享**：它们也是源头机会，但跨工具与运行时共享会增加发布/类型/构建义务，且失败政策不同；本卡不夹带。

## 事实与读者

- 事实owner：公司盘路径解析、读取结果类别仍归company-root；JSON含义与用户文案归各消费域。
- 唯一研究入口：[生产源头预防设计](../research/source-prevention-design/README.md)；本卡承接具体后续取舍，不复制旧试点清单。
- 读载体：公司盘已有startup/manifest/catalog/presented状态；本题不增加持久化事实或写载体。
- 环境坏法：根/父目录/叶子坏形状、缺失、不可读、坏JSON及高版本；稳定状态与读取期间变化需分开说明。

## 验收标准

以下是**拟议下游验收，全部未执行**。设计依据为[validation-design](../methods/validation-design.md)；需用户确认测试接口后才写测试。公开接口为workspace三态读取及五个领域状态函数；不测私有路径函数、不mock自有owner返回值冒充真实文件。拟议文件系统call-through只用于有明确“至多一次内容读取”承诺的定点观察，不给普通领域断言加调用次数约束。

命令别名（均为现有入口；需在原文件补足拟议接口与反例后才可满足下表）：

- R：`pnpm test tests/host/contract/file-shape-agreement.spec.ts` — 读形状及workspace/At语义；原company-root-safety主要证写入，不能充当此项证据。
- S：`pnpm test tests/host/contract/startup-state-agreement.spec.ts tests/host/startup/startup-store.spec.ts` — 启动状态、空值与版本。
- L：`pnpm test tests/host/ledger/catalog.spec.ts tests/host/contract/ledger-state-agreement.spec.ts` — catalog/账本状态与不破坏旧导出。
- B：`pnpm test tests/host/run-bundle/bundle-manifest.spec.ts` — manifest合法/坏值/legacy/高版本。

| 行为 / 类别 | 输入及独立期望 | 可观察通过条件 | 反例 / 互补 / 恢复 | 证据owner与命令 / 局限 |
|---|---|---|---|---|
| workspace与At根语义 / 确定性 | 同一真实文件、workspace带/不带公司盘前缀、确切companyHome；文本字面量 | workspace两种rel读到相同文本；At保留原rel语义；根/父/叶symlink、越界、非文件保持原拒绝 | 临时使workspace剥前缀失效或漏根校验，对应坏路径/合法对照须失败；不得以加载异常算命中 | R，在现有公开读取用例扩面；不能证明原子性 |
| 五消费者稳定映射 / 确定性 | 上节兼容表；每个消费者正常、missing、unsafe、空白、坏JSON及适用版本 | 五处实际公开入口返回原类别、值、路径、诊断；不采用外部/坏文本 | 将新读取的unsafe折为missing，startup不得仍绿；原子类断言必须辨别，不能只归一not-ok；文件修好后下一次返回合法结果 | S/L/B；逐类缺项先补断言，不以总通过数代替 |
| 原便捷视图兼容 / 确定性 | 同一真实形状；三态结果与原明确的有损投影 | companyFileProblem/readCompanyText对其他现有调用者保留原结果，At入口不受迁移影响 | 有内容、missing、unsafe均执行；文本必须有独立字面量，不能只比较两个同源函数相等 | R及对应现有消费测试；保留视图不禁止未来重组 |
| 五处使用一次结果 / 接线＋确定性 | 各目标文件的一份合法真实内容；期望类别/值在运行前固定 | 从每个公开状态入口发起，保留真实owner与文件读取；仅过滤目标绝对路径，内容读取尝试=1且业务值正确 | 临时恢复任一处“判后再读”，该项须红；有效读取互补继续通过；0次读取也必须失败 | 在S/L/B原测试内定点观察node:fs真实读取，不统计模块加载/其他文件；可接入性尚未验证，该项目前证据不足 |
| 一次观察与失败 / 确定性 | 读前确认缺失/拒绝；读到合法文本后改变/移除目标；打开失败；随后恢复文件 | 确认缺失/拒绝的形状不尝试内容读取；打开/读失败尝试≤1且沿原unsafe映射；取得文本不重读；下次调用能恢复；无写回 | 文件系统层受控故障只影响目标路径，真实解析仍执行；若无法可靠观察，记录证据缺口再决定，不加生产测试钩子/全局缓存 | 对应S/L/B；这项行为变化需用户确认，不能声称所有竞态等价 |
| 接口及维护成本 / 结构＋语义审 | owner、两个旧视图、五消费者改动草案 | 一处workspace完整结果；五处协议删除；默认/版本/schema/写入未扩面 | 若引入新包/构建入口、统一schema或五处仍判后再读，停止；删除测试通过范围仅这五处 | 差异语义审＋未来 `pnpm typecheck`、`pnpm verify`、`pnpm lint`、`pnpm dup`；结构绿不证价值 |

### 输入族与维护边界

适用域为现有文件形状族及上表五个明确消费者，不建立消费者注册表。R沿现有形状owner枚举，断言执行非空；新增workspace完整读入口须进入已有读取对照，并以当前未存在的合法子路径/文件名见证其不硬编码目标文件。各消费者的最低正确值/失败类别独立固定，不能从生产列表或新helper返回值生成两边期望。

所有五处接线均须覆盖，记录实际消费数及负控加载成功证据；固定accept/reject、恒missing、重复读或省略消费者连接应命中对应互补断言。负控只选本次改动承诺的最小变化，真实加载、见红后还原，不新建runner/gate。R/S/L/B仍由现有 `pnpm test` 自动执行。

删除的维护义务是五处先判后读和文本/类别重建；领域schema、失败映射、文案、未来消费者是否应取有损视图仍由作者维护，不宣称动态发现业务全集或降低总体事故率。实施时记录定点命令耗时与实际断言数；本文没有这些实跑数据。

### 实施前门票与交接

- **已准备**：命名问题、范围/排除、真实替代方案、稳定兼容表、观察变化、可执行验收命令和负控设计。
- **尚缺**：用户确认有限收益/观察变化及测试接口；具体接口和五处改动草案；目标文件call-through观测的可行性。缺项留在本卡，不推给实施Note卸责。
- **批准后去向建议**：同批交付owner＋五消费者＋对应断言；若形成持久接口取舍，按notes规则评估同批Note，拟议落在[implemented](../../notes/implemented/)目录。当前不创建文件、不记为已批准去向；明确申请时再定具体文件，若仅机械整理可由implementation承载。
- **状态规则**：本卡仍为推敲中/毕业未定；只有用户确认结论、明确下游去向后，才按[交接方法](../methods/issue-to-note.md)记录申请。`待落地`、验收表或拟议Note去向都不授予实施/提交权限。

## 关闭条件

- 用户已看到具体修改范围、兼容映射与后续动作，并决定实施或不做；本卡不自行视为批准。
- 用户确认结论，且申请类型、日期、接收方和持久去向已按交接方法记录，问题轨即可按章程收结；不强制等下游实施验收，不把本卡变为第二份交付总账。不做时保存停止理由与去向。
- 若选择实施，真实代码差异及上述验证由下游工作承担；本卡不能用尚缺的兼容检查换取假完成，交接也不等于实现已交付。

## 本轮记录

研究报告先完成，再建立本卡。设计review两路认可有限接口整理，指出旧读取测试选择错误、三态不等于精确原因、两次观察变一次需明示。本轮依用户要求提前读取methods，补齐兼容表、正式验收标准和交接缺口；只修订本卡，不改方法正文、生产源码、测试、配置，不提交Git。拟议实现/负控/内容读取观测均未执行，不以文档或原有回归绿灯冒充落实。
