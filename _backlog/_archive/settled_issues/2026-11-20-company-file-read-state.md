---
status: 已结
opened: 2026-11-20
---

# 推敲：公司盘状态读取能否一次保留文本与失败类别

> 立卡：2026-11-20 ｜ 状态：已结 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：是 ｜ 审查：agent（独立盲审）— 初轮3位审阅者发现白名单/样本/互链/状态缺口；修正后由d10b9aed无历史上下文复审HEAD^到工作树，blocker=0；2条建议（单次故障标记、负控计数）均修正
>
> **结论/去向**：note — [workspace文件读取结果决定](../../../notes/implemented/2026-11-20-company-file-read-state.md)；代码/测试实施已在HEAD `5ac0446b`（非本会话作者提交，本会话保留历史并未提交）；startup settings同一结果修正、策略登记、负控和本卡归档为本轮未提交交付。
>
> **收口**：按用户授权自主实施。Issue立项时的“未授权/未实施”仅为历史原文，已由本轮实际授权和验证替代。研究结论缩限为：删除五消费者的重复payload读取与调用顺序协议，不声称总体预防优先级、安全漏洞修复、原子快照或性能提升。
>
> **授权边界**：仅本卡范围；不改vendor、不统一JSON schema/政策、不改写盘协议、不提交Git。共享HEAD已包含外部提交`5ac0446b`，未由本会话创建或改写。

**问题与期望结果：** 五个状态读取函数先检查文件问题，再取文本，但检查内部已经实际读过文本。能否由现有文件读取owner一次返回text/missing/unsafe，删除调用者“先判再读”的操作协议，同时保留各领域自己的解析、默认、版本与诊断？

**当前情况：** [候选比较与源码证据](../research/source-prevention-design/2026-11-20-source-prevention-options.md)比较了五类候选。本项有现成结果类型、五个真实消费者、无跨工具打包成本，适合作为有限接口整理；底层安全逻辑早已集中，不能据此认定它是全仓最高优先级预防工作，也未复现产品故障。两路设计review认可方向，要求补齐分类语义、观察变化和读取验收；下文按[验收设计](../../methods/validation-design.md)、[证据选择](../../methods/validation-evidence.md)及[下游交接](../../methods/issue-to-note.md)整理。

**立项时未决（已由后续授权与实证收敛）：** 接受有限收益和一次观察兼容边界；认可workspace公开入口及五个状态函数为测试面；现有测试入口可用真实文件call-through观察。最终结论与实证见本卡末尾「实施结论与收口证据」。

**下一步：** 无待实施工作。实现、独立审阅与全量验证完成，本卡关闭；不授予提交权限。

## 范围与排除项

拟议owner为[company-root](../../../packages/company-pack/src/host/run-bundle/company-root.ts)：暴露workspace语义的三态文件读取，复用已有安全读取与CompanyFileRead；旧便捷函数可从相同结果派生，保留其他现有调用者。

目标仅五个状态函数：

| 文件 / 函数 | 必须保持的领域政策 |
|---|---|
| [startup-store](../../../packages/company-pack/src/host/startup/startup-store.ts) / readStartupSettingsState | 缺失使用默认策略，unsafe有诊断，JSON坏值为corrupt |
| 同文件 / readStartupOptionsState | 缺失为空选项，unsafe/corrupt不冒充正常 |
| [bundle-manifest](../../../packages/company-pack/src/host/run-bundle/bundle-manifest.ts) / readBundleManifestState | 路径、legacy、unsupported及当前版本校验 |
| [catalog-state](../../../packages/company-pack/src/host/ledger/catalog-state.ts) / readCatalogState | missing/corrupt/unsupported及catalog字段检查 |
| [presented-ledger](../../../packages/company-pack/src/host/ledger/presented-ledger.ts) / readPresentedLedger | missing/corrupt/unsupported、布尔映射与审计政策 |

不统一这些领域的JSON schema、版本或默认；不顺手改delivery/seed/catalog算法/presence/发布指纹；不新增文件访问框架、包、配置或公开包入口；不改写盘行为。不声称一次结果能消除文件系统并发窗口，也不以此宣称漏洞修复或性能提升。

## 实施接口与兼容要求

行为类别只有确定性逻辑及同进程调用接线；无新增模型行为、Cordis装配、UI或持久化协议，不安排模型评测/浏览器/安装演示来代替读取验收。

现有owner已提供 `readCompanyFile(workspace, rawRel): CompanyFileRead`；先沿现有 `ensureCompanyRoot(workspace)` 校验根，再以 `stripCompanyPrefix: true` 调用原读取实现。保持带/不带 `.dsh-company/` 前缀的原语义。`readCompanyFileAt(companyHome, rel)` 保持确切根和不剥前缀，不用它直接替代workspace入口。

原 `companyFileProblem`、`readCompanyText` 作为从同一workspace结果派生的有损视图保留；五个目标函数改为各消费一次完整结果。收益仅是删除这五处调用次序与重复读取责任；保留旧视图不代表结构上禁止未来调用者再组合它们。不增JSON解析层、不统一领域失败政策。

### 稳定输入的兼容表

这里的missing/unsafe是底层当前返回的类别，**不是精确errno或“已证明不存在”**：[plainFileProblem](../../../packages/company-pack/src/host/fs/safe-file.ts#L27)把lstat异常归missing，[实际读取](../../../packages/company-pack/src/host/run-bundle/company-root.ts#L260)把打开/读异常归unsafe。继承当前分桶，不在本题修订权限错误分类；不新增io-error类别。

| 消费者 | missing | unsafe | text：空白 / 合法 / 坏JSON或形状 / 版本 |
|---|---|---|---|
| readStartupSettingsState | 默认设置，problem=null | 默认设置，problem=unsafe | 空白也为默认且null；合法保留所选值；坏JSON/形状为corrupt；v>1为unsupported，其他非法版本为corrupt |
| readStartupOptionsState | 空选项，problem=null | 空选项，problem=unsafe | 空白为空选项且null；合法按原清洗保序；坏JSON/非对象为corrupt；不新增原解析器没有的版本拒绝 |
| readBundleManifestState | status=missing并保留path | status=corrupt，保留原路径不安全文案 | 空白/坏JSON仍走原错误；合法值与expectedPack校验保持；v2仍legacy，更高版本仍unsupported，其余原校验不变 |
| readCatalogState | status=missing | status=corrupt，保留原catalog路径不安全文案 | 空白/坏JSON/坏字段为corrupt；合法结果保持；高schema为unsupported |
| readPresentedLedger | status=missing并保留path | status=corrupt，保留原账本路径不安全文案 | 空白/坏JSON/坏布尔映射为corrupt；合法账本保持；高schema为unsupported |

期望源为原公开读取函数及[settings/options解析器](../../../packages/company-pack/src/lib/startup/startup-settings.ts#L192)、[启动状态矩阵](../../../tests/host/contract/startup-state-agreement.spec.ts)、[账本状态矩阵](../../../tests/host/contract/ledger-state-agreement.spec.ts)；用真实文件和独立字面量固定，不从新helper生成期望。现有宽松解析、schema字段和路径文案不随本重构收紧。

### 一次观察的变化与恢复

- 成功读取后按这次取得的文本解析；不因省略的“第二次读取”报不可读。旧代码首次成功后文件改变/消失可能走corrupt，新代码可继续解析首次文本。这是授权实施的一次观察变化，不承诺与任意竞态完全等价。
- owner读取内部仍包含路径检查、lstat/realpath和打开读取；检查前缺失可得到missing，检查后打开失败可得到unsafe。只承诺目标文件内容读取**至多一次尝试**，不承诺原子快照或消除文件系统竞态。
- 读取/解析失败不创建、不覆盖、不修复文件；保持各消费者原降级策略。文件恢复后下一次调用重新读取，不加缓存或重试。根/父目录/叶子坏形状不能被新helper无条件降为默认。
- catalog/ledger目标函数中误导性的companyHome参数/JSDoc按实际workspace语义澄清，不改变真实寻址，不开展全仓重命名。

## 已知与未决

- 实施前：[companyFileProblem](../../../packages/company-pack/src/host/run-bundle/company-root.ts#L275)和[readCompanyText](../../../packages/company-pack/src/host/run-bundle/company-root.ts#L281)各自执行完整安全读取；第一步丢文本，第二步丢失败类别，五个调用者再组合。现在便捷视图委托完整结果，五个目标状态读取者直接消费完整结果。
- 已知：[CompanyFileRead/readCompanyFileAt](../../../packages/company-pack/src/host/run-bundle/company-root.ts#L360)已存在三态，但At以确切companyHome为根、不剥公司盘前缀。不能把workspace消费者直接换到At。
- 已知：catalog/ledger参数即使命名companyHome，当前调用的仍是workspace版读取；[账本真实调用断言](../../../tests/host/contract/ledger-state-agreement.spec.ts#L60)传world.ws。草案应按实际语义而非变量名迁移。
- 已落实：workspace与At根语义、便捷视图委托、稳定状态映射及一次观察变化见上节；call-through观测已接入R，真实返回值与目标路径读次数共同断言。
- 授权：用户已授权本卡范围实施与自主验证；Git提交未授权。

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

以下验收在实施前作为方案提出，现按实际证据逐项结论。设计依据为[validation-design](../../methods/validation-design.md)；测试使用workspace公开三态入口与五个真实状态函数、真实文件，不mock owner或解析器返回值。

命令别名（均为现有入口；接口与反例已落实，最终全量包含R/S/L/B）：

- R：`pnpm test tests/host/contract/file-shape-agreement.spec.ts` — 读形状及workspace/At语义；原company-root-safety主要证写入，不能充当此项证据。
- S：`pnpm test tests/host/contract/startup-state-agreement.spec.ts tests/host/startup/startup-store.spec.ts` — 启动状态、空值与版本。
- L：`pnpm test tests/host/ledger/catalog.spec.ts tests/host/contract/ledger-state-agreement.spec.ts` — catalog/账本状态与不破坏旧导出。
- B：`pnpm test tests/host/run-bundle/bundle-manifest.spec.ts` — manifest合法/坏值/legacy/高版本。

| 行为 / 类别 | 输入及独立期望 | 可观察通过条件 | 反例 / 互补 / 恢复 | 证据owner与命令 / 局限 |
|---|---|---|---|---|
| workspace与At根语义 / 确定性 | 同一真实文件、workspace带/不带公司盘前缀、确切companyHome；文本字面量 | workspace两种rel读到相同文本；At保留原rel语义；根/父/叶symlink、越界、非文件保持原拒绝 | 前缀负控：workspace `stripCompanyPrefix=false`，R 94项中52失败；恢复后R 94/94。现有root-symlink-out与root-file形状断言覆盖根拒绝；没有另做移除ensureCompanyRoot的单独变异 | R；不能证明原子性 |
| 五消费者稳定映射 / 确定性 | 兼容表；每个消费者正常、missing、unsafe、空白、坏JSON、parseable bad shape及适用版本 | 五处真实公开入口返回原类别、值、路径、诊断；不采用外部/坏文本 | unsafe→missing负控：startup settings筛选共10项，directory/symlink/open-failure 3失败、其余7通过；其余84项跳过。恢复后focused R绿 | R/S/L/B；旧状态矩阵和新增R样本合验 |
| 原便捷视图兼容 / 确定性 | 同一真实形状；三态结果与原明确的有损投影 | companyFileProblem/readCompanyText对其他调用者保留原结果；At入口不受迁移影响 | text/missing/unsafe字面量和次数断言；workspace单测用独立文本固定期望 | R；保留视图不禁止未来调用者重组 |
| 五处使用一次结果 / 接线＋确定性 | 五目标文件真实字节与独立固定的业务结果 | 每个公开状态入口目标文本读取恰一次；未读/拒绝0次；打开失败≤1次 | 原TDD基线五处各因2次/期望1次失败；后续负控恢复startup-settings旧配对时9个场景红。结果由真实owner、解析器和文件验证 | R：只对绝对目标路径观察node:fs；不计模块加载和非目标读取 |
| 一次观察与失败 / 确定性 | 缺失/拒绝、读后改写/删除、打开失败、坏JSON/字段、恢复 | 首次文本决定本次解析；不写回；下次调用重读并恢复 | R五消费者×10输入（含parseable bad shape）检查返回值、原盘字节和下一次恢复 | R；调用次数不宣称原子快照 |
| 接口及维护成本 / 结构＋语义审 | owner、旧视图委托、五消费者合并差异 | 一处workspace完整结果；五个状态读取协议删除；领域默认/版本/schema/写入未扩面 | 生产/测试差异审与独立盲审；无新增包、配置、生产hook或JSON owner | `pnpm typecheck` / `pnpm verify` / `pnpm lint` / `pnpm dup`，最终验证回执见随卡交付证据 |

### 输入族与维护边界

适用域为现有文件形状族及上表五个明确消费者，不建立消费者注册表。R沿现有形状owner枚举，断言执行非空；新增workspace完整读入口须进入已有读取对照，并以当前未存在的合法子路径/文件名见证其不硬编码目标文件。各消费者的最低正确值/失败类别独立固定，不能从生产列表或新helper返回值生成两边期望。

所有五处接线均须覆盖，记录实际消费数及负控加载成功证据；固定accept/reject、恒missing、重复读或省略消费者连接应命中对应互补断言。负控只选本次改动承诺的最小变化，真实加载、见红后还原，不新建runner/gate。R/S/L/B仍由现有 `pnpm test` 自动执行。

删除的维护义务是五处先判后读和文本/类别重建；领域schema、失败映射、文案、未来消费者是否应取有损视图仍由作者维护，不宣称动态发现业务全集或降低总体事故率。

### 授权与交接

- **日期/接收方/类型**：2026-11-20；本开发会话；实施及验证。研究、立卡后，用户追加「setup goal 静默，自主执行，遇到困难，自我克服。记着，我需要有质量的调整，你要自己验证，一定要说出证据，好吗」，本卡限定范围成为后续goal；用户随后要求继续。Git提交仍未授权。
- **具体落点**：company-root公开workspace完整结果，两个便捷视图委托；五个既有状态函数消费一次结果；真实文件合同验收和有限node:fs call-through观察例外；持久接口取舍落[决定Note](../../../notes/implemented/2026-11-20-company-file-read-state.md)。
- **共享历史**：外部HEAD `5ac0446b` 声称五处，实际只迁移四处；本轮工作树补齐readStartupSettingsState。没有改写或创建提交。

## 实施结论与收口证据

- **实现**：有限接口整理成立；领域解析、schema/版本/默认/文案与写入不变。一次观察不是文件系统原子快照，missing/unsafe仍是原保守桶。
- **定点**：R 94项通过；其中五个消费者×10输入=50项，workspace/At/便捷视图4项，其余40项为既有形状与路径合同；既有S/L/B合计5文件85项通过。R单次观测约0.41秒，94项是测试用例数，不冒充断言条数。
- **红证**：旧配对startup-settings 9项红；workspace不剥前缀52项红；unsafe折missing时startup-settings directory/symlink/open-failure 3项红。加载成功，失败均来自文本、次数或分类断言。变异均恢复；同入口恢复后绿色记录在Note。
- **测试政策**：此前node:fs观察器未列白名单，被独立审阅阻断；现于[testing](../../../docs/testing.md)登记只针对本spec的绝对目标路径call-through窄例外，并在spec注明不能证明跨进程/其他I/O API/原子快照。未引入生产注入hook。
- **审阅/最终命令**：前轮三个独立审阅发现白名单、坏形状样本、Note双向指针与卡片状态问题，均修订；d10b9aed独立语义与归档复审0 blocker，两建议已修并复核。最终 `pnpm test --reporter=dot` 265 files / 2401 tests通过（24.74s）；首次唯一红为覆盖生成表行号，生成刷新后同命令绿。`pnpm typecheck`通过、`pnpm lint` 0 warning/error、`pnpm dup` 0 clones；`pnpm verify` ALL PASS（2个无对象replay门skip）；`pnpm notes:audit` 死路径/缺回链/状态错误均0。
- **收割**：未复现新的材料性产品故障；资产为五消费者真实文件断言及workspace/At互补见证，没有新runner/gate；没有新的运行态操作事实。
