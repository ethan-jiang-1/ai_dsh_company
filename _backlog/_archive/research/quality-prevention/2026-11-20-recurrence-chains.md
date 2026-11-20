---
topic: quality-prevention-recurrence-chains
intent: 追溯 C13–C17 修复承诺、实际判据与跨轮逃逸，识别能删除补洞义务的最小改进
---

# C13–C17：修复样本为何没有自动变成封闭合同

本材料只研究用户点名的近期历史，不实施产品修复。本轮是研究与交接，不是预防机制落地。

## 结论与统计口径

- **事实**：研究母体是 BUG-213..282，排除 BUG-212；按批次为 C13=213..222（10）、C14=223..232（10）、C15=233..242（10）、C16=243..262（20）、C17=263..282（20），合计 **70 张缺陷卡、5 批**。批次和编号由各轮 [C13 Note:5](../../../../notes/implemented/2026-11-17-shipped-package-boundary.md)、[C14 Note:5](../../../../notes/implemented/2026-11-18-shipped-shape-closure-and-low-confidence-runtime.md)、[C15 Note:5](../../../../notes/implemented/2026-11-18-shipped-key-closure-and-unreadable-inputs.md)、[C16 Note:5](../../../../notes/implemented/2026-11-18-pipeline-fingerprint-and-runtime-closure.md)、[C17 探索卡:12](../../settled_issues/2026-11-19-guard-residuals-and-runtime-edges.md)交叉对账。
- **口径**：70 是登记缺陷数量，不是独立根因数量、复发次数、真实用户事故数或探索命中率。本轮选 **4 条链**；A/B/C 跨4批，D跨3批；存在重叠背景，不相加为“复发 bug 数”。未逐篇通读70卡，不估算全仓复发率。
- **严格定义**：“同一 bug 回归”须旧红例在后续版本再次失败；本轮没有证明这种回归。“同失败类逃逸”指旧样本仍受保护，但相邻输入/消费者继续违反较宽产品要求；下文主要属于后者。主动修改策略还应单列，不能冒称旧修复无效。
- **推论**：主要机制是修复先把“已见证的坏输入集合”编码成判据，随后探索专攻集合外、跨引用或消费者末端；红→绿和覆盖率会稳定这些样本，却不会自动决定输入全集、未知值语义或用户可见后果。
- **建议**：下一步优先深化已有 owner 的集合性质/消费者合同；不再以“新增多少条负例”或“再开多少卡”代表预防成熟度。

## A：关键件 / schema（C14→C15→C16→C17）

**C13前史。** [C13 Note:26–29、51–53](../../../../notes/implemented/2026-11-17-shipped-package-boundary.md)保证shipped文本无未限定dev路径、当前包137 entries；但只读git `f1629047` 核验：`TEXT_FACE` 不含content、`files` 含`*`直接continue、尚无REQUIRED或patch集合判据。C14 BUG-223/224/226是这个新checker的判据逃逸，不能说C13那十个原始坏样本又坏。四轮主链从C14开始，以满足逐轮比较而不混算C13原始发布污染问题。

| 轮次与承诺 | 当时验收真正看见的东西 | 下一轮怎样逃逸 |
|---|---|---|
| C14：BUG-223/226，files glob 非空、12项关键件、patch 逐目标在包内；[Note:9–13](../../../../notes/implemented/2026-11-18-shipped-shape-closure-and-low-confidence-runtime.md)称“声明→实盘闭包” | `87d8b15d` 的 checker 是12条常量；正例只有CEO一个preset、关键content有entry但 `read` 可返回空字符串。该 fixture 仍应通过 | C15：删 PRD 模板仍 `[]`；patch 裁成6项也过；空 charter / 非法 JSON 仍过。不是已保护的entry又失效，而是“集合完整/内容可用”尚未入合同 |
| C15：BUG-233/234/237，扩大必需集、固定12个组合目标、trim非空、JSON可解析；[Note:9–14](../../../../notes/implemented/2026-11-18-shipped-key-closure-and-unreadable-inputs.md) | 缺指定模板、空charter、坏JSON等最小负例；真实137-entry包通过；[BUG-233:45–58](../../fixed_bugs/BUG-233-required-shipped-misses-runtime-content.md)、[BUG-237](../../fixed_bugs/BUG-237-required-shipped-empty-file.md) | C16：未被策展的content仍能缺；`seed.json={}`合法JSON却无法bootstrap；delivery对象/preset YAML只有存在性不足以证明消费者可用 |
| C16：BUG-244..250/261/262，84件inventory、最小schema、YAML parse；[Note:9–12](../../../../notes/implemented/2026-11-18-pipeline-fingerprint-and-runtime-closure.md) | 主要拒绝空对象、缺fields、缺inventory文件/引用；[当前对应测试:300–350](../../../../tests/repo/release/shipped-shape.spec.ts#L300)保留这些具名样本 | C17：合法字符串仍可越界、source/template仍可缺、files值可为对象；manifest版本、symlink、必需目录、重复项在源树gate与tarball checker不同义；[探索卡:104–117](../../settled_issues/2026-11-19-guard-residuals-and-runtime-edges.md)逐项记了观察方式 |
| C17：BUG-265..270/273/274，共享content合同、双向inventory、跨引用和目录派生 | [content合同:258–321](../../../../tools/lib/company/content-contract.mjs#L258)确实判版本/重复/未登记/必需件；[路径及引用:105–243](../../../../tools/lib/company/content-contract.mjs#L105)确实看seed target、delivery template与layers/files；[测试:60–185](../../../../tests/tools/content-contract.spec.ts#L60)有独立字面正反例 | 当前删除了“gate/checker各维护一份content语义”和“必需目录另抄一份”的义务；没有删除“新增必需运行时件要登记”的义务 |

**源码核验与边界。** [shipped checker:25、285–293](../../../../tools/lib/release/shipped-shape.mjs#L285)调共享实现；[REQUIRED_SHIPPED:48–57](../../../../tools/lib/release/shipped-shape.mjs#L48)的content部分从同一常量派生。[content owner:30–35](../../../../tools/lib/company/content-contract.mjs#L30)仍明确规定“加一件运行时必须读的文件就在这里加一行”。因此 inventory 封闭的是**盘上文件与登记文件相等**，required封闭的是**已登记的必需件不可被删除**；二者都不是自动证明“所有运行时读取都已登记”。

**独立性限制。** [shipped fixture:82–146](../../../../tests/repo/release/shipped-shape.spec.ts#L82)从生产 `REQUIRED_SHIPPED` / `EXPECTED_PATCH` 生成正例、inventory与文本；若生产清单漏一项，正例会同步变小。这对构造可运行夹具有用，但不能作完整集合的独立oracle。现有字面删除PRD等反例能守已知锚点；[content测试:72–80](../../../../tests/tools/content-contract.spec.ts#L72)两适配器调用同一函数验证一致性，不能独立证明共享合同正确。

**最小建议。** 留在 [content owner](../../../../tools/lib/company/content-contract.mjs) 与 [合同测试](../../../../tests/tools/content-contract.spec.ts)：以已有真实content/读取器为第二来源，钉一份小的“消费者所需输入→可用结果/明确拒绝”矩阵；必须包含删除非示例文件、合法JSON但跨引用失效、整个目录删掉，以及源树/tarball两适配器。新增读取路径时先回答其合同属于inventory还是required，避免把新列表再命名为全集。

## B：发布输入新鲜度（C14→C15→C16→C17）

| 轮次与明确保证 | 验收观察 | 逃逸与性质 |
|---|---|---|
| C14 BUG-227：sourceFingerprint检测旧包，gitSha只提示；[Note:14–17](../../../../notes/implemented/2026-11-18-shipped-shape-closure-and-low-confidence-runtime.md) | 指纹相等/不等、README.shipped变更；不以全部提交强制重打 | C15 BUG-235：dev README也进源指纹，修改不随包文档触发假过期；这是边界误报，不是漏报复发 |
| C15：去掉dev README；承认sanitizer/export-dist未入指纹，[Note:68–71](../../../../notes/implemented/2026-11-18-shipped-key-closure-and-unreadable-inputs.md) | 包源码集合修正；管线缺口已知但未在该批修 | C16 BUG-243：只改sanitizer旧包仍有有效sourceFingerprint；是已知未覆盖轴后续修复，不能算“C15承诺已修又坏” |
| C16：pipelineFingerprint含5个手写文件；[Note:9、34、51](../../../../notes/implemented/2026-11-18-pipeline-fingerprint-and-runtime-closure.md) | 历史 `21ff3ee7` 确为5项常量；[当前保留测试:665–668](../../../../tests/repo/release/shipped-shape.spec.ts#L665)只断言sanitizer在集内、结果是hash | C17 BUG-263/264：install-manual、market-index变字节指纹不变；已有5项本身没失效，漏的是另两个发布决定者 |
| C17：两个发布目录的顶层 `.mjs` ∪ 两个跨目录显式项 | [实现:68–104](../../../../tools/lib/core/pack-source.mjs#L68)确实目录派生；[测试:673–694](../../../../tests/repo/release/shipped-shape.spec.ts#L673)复制目录但只变异3条字面路径 | 删除了“同目录新增 `.mjs` 必须手记入清单”的义务；未递归子目录，跨目录仍要显式登记，不能说所有传递依赖已自动闭包 |

**建议。** 在 [现有指纹测试](../../../../tests/repo/release/shipped-shape.spec.ts#L673)直接枚举既有派生输入逐个变字节，并新增临时的未来文件后验证自动入集；保留明确的不属于该集合的对照。它会验证输入集随允许的树形增长，不只验证BUG-263/264这三个样本。不要为此搭全仓通用依赖图；先把“顶层目录规则+跨目录例外”的边界写准。

## C：缺revision状态合并→未知/删除→用户可见置信度（C14→C15→C16→C17）

| 轮次与承诺 | 真实实现 / 验收 | 下一轮怎样逃逸 |
|---|---|---|
| C14 BUG-230：旧pending不能覆盖无revision的completed；[Note:23–25](../../../../notes/implemented/2026-11-18-shipped-shape-closure-and-low-confidence-runtime.md)泛写“缺revision时保留投影” | `87d8b15d` 实际仅保护completed与deleted；测试观察completed不退、pending可前进、deleted不重开 | C15 BUG-240：无revision的in_progress仍被旧pending打回。此处可证明Note措辞比代码实际保证更宽；不是“缺revision一律skip”导致冻结 |
| C15：状态序只前进；[Note:20–24](../../../../notes/implemented/2026-11-18-shipped-key-closure-and-unreadable-inputs.md) | `56e4f986` 用rank比较；unknown rank=-1，deleted直接continue；[具名测试:255–260](../../../../tests/lib/presence/presence-board.spec.ts#L255)钉in_progress→pending | C16 BUG-257/258：未知status被当倒退丢弃，deleted无法显式重建。有限状态序没有定义“集合外”和“重建”的产品语义 |
| C16：unknown保留、deleted可重建，标revisionGap；[Note:16](../../../../notes/implemented/2026-11-18-pipeline-fingerprint-and-runtime-closure.md) | [当前合并实现:141–170](../../../../packages/company-pack/src/lib/presence/presence.ts#L141)、[测试:234–251](../../../../tests/lib/presence/presence-board.spec.ts#L234)证明值和gap字段 | C17 BUG-277/278：gap只到TeamViewLike；任务表/看板没有消费，未知状态仍像普通待办。读模型字段存在不等于用户能辨识推断 |
| C17：TaskRow/BoardCard透传gap，任务表/看板显示zh/en标记；[Note:66–70、118](../../../../notes/implemented/2026-11-19-guard-residuals-closure.md) | 实际渲染点在[任务表:106–107](../../../../packages/company-pack/src/client/tabs/TasksPanel.tsx#L106)、[看板:141–142](../../../../packages/company-pack/src/client/tabs/company-panels.tsx#L141)；[组件断言:129–153](../../../../tests/client/tabs/board-panel.spec.ts#L129)观察可见文案；[BUG-277:40–45](../../fixed_bugs/BUG-277-presence-revision-gap-not-consumed.md)另记组件还原会红 | 删除的是“每个UI消费者自行猜状态来源”的一部分；状态新旧证据不足仍在，gap策略没有创造缺失revision |

**政策变化需单记。** C14的deleted终态测试后来改为允许重建，这是明确改变策略；不能把C16允许重建讲成恢复C14同一合同。当前[测试:248–249](../../../../tests/lib/presence/presence-board.spec.ts#L248)还明确允许无revision的正常前进不标gap；故“所有缺revision事件覆盖都显式提示”的广义结论也不成立。

**建议。** 在 [presence测试](../../../../tests/lib/presence/presence-board.spec.ts)用有限状态表替换继续累加单例：已知状态×已知/未知状态×revision存在与大小关系×删除/重建；表内把保留、接受、删除、gap四种输出独立写定。挑gap=true与status未知两条贯穿到[board读模型](../../../../packages/company-pack/src/lib/presence/board.ts)和已存在组件测试；不需要浏览器或模型，也不把“状态序”冒充时间顺序。

## D：catalog final可用性（C15→C16→C17）

- C15 BUG-239：存在但不可读的final不得present；[Note:18–19](../../../../notes/implemented/2026-11-18-shipped-key-closure-and-unreadable-inputs.md)用 `accessSync(R_OK)`，验收是chmod不可读→warning+false。它没有保证内容可展示。
- C16 BUG-259：零字节final仍present；[Note:17](../../../../notes/implemented/2026-11-18-pipeline-fingerprint-and-runtime-closure.md)补size==0；[测试:243](../../../../tests/host/ledger/catalog.spec.ts#L243)钉零字节。
- C17 BUG-275：`'   \n'`有字节、可读仍present；[探索记录:125](../../settled_issues/2026-11-19-guard-residuals-and-runtime-edges.md)记warnings为空。当前[实现:70–83](../../../../packages/company-pack/src/host/ledger/catalog.ts#L70)用一次read+trim同时回答可读/非空白，[测试:252–260](../../../../tests/host/ledger/catalog.spec.ts#L252)钉纯空白。
- 同批BUG-276是另一条载体的降级缺口：旧catalog corrupt/unsupported被静默重建覆盖；当前[实现:171–179](../../../../packages/company-pack/src/host/ledger/catalog.ts#L171)先warn+备份。这不是final空白的同一bug。
- **推论**：从access到size到trim是同一“成品可用”失败类的相邻谓词逐层补足；当前删除了可读性与内容判空分开检查的义务，但仍只证明非空白，未证明文档质量或完整性。
- **建议**：在[既有catalog测试](../../../../tests/host/ledger/catalog.spec.ts)用小内容域（空、空白组合、正文+前后空白、不可读）检验“有可读正文才present；降级必有warning”性质；保留非root权限限制，不增加新扫描器。

## 已有2026-11-14棘轮为什么没有拦住

1. **复发升级规则有声明，尚未见合同级执行链。** [失败类表:30–35](../../../../tests/failure-classes.md)要求同类连续两轮且只有example时升级generator/model/meta；但[资产注册:12–23](../../../../tools/lib/core/asset-lanes.mjs#L12)明确name是冒烟/探针名，[define:165–190](../../../../tools/lib/core/asset-lanes.mjs#L165)的shape默认example且探针定义甚至没有shape。它不为这几份unit spec登记合同/输入域/复发轮次。不能从census有shape推出本轮链触发过升级；[杠杆Note:74](../../../../notes/implemented/2026-11-14-test-asset-leverage.md)也明确不造复发轮次字段。
2. **具名守卫保护历史样本，不度量合同闭包。** [bug-coverage测试:22–26](../../../../tests/repo/budget/bug-coverage.spec.ts#L22)查覆盖条数不下降及新BUG有具名标题，不运行“新增一件输入也受约束”的元性质。C17还需把动态BUG标题改成四条字面it才记到账，[Note:102–103](../../../../notes/implemented/2026-11-19-guard-residuals-closure.md)。账变准不等于判据变强。
3. **语句/分支覆盖不能识别遗漏的输入域。** C14记录checker 97.84/88.77覆盖与2237 tests绿，[Note:61–62](../../../../notes/implemented/2026-11-18-shipped-shape-closure-and-low-confidence-runtime.md)；C15仍可删未枚举模板而绿。旧分支全执行并不产生新required路径，复用生产清单的fixture又与它同步缩小。
4. **真实入口也有观察边界。** 各批真实安装/挂载证明当前整包能启动；A的逐件缺失、B的只改管线、C的未知/不完整wire都不是当前正常包的启动形状。[C15探索卡:94–96](../../settled_issues/2026-11-18-guard-closure-and-unreadable-inputs.md)已经正确区分这些载体，问题不在缺少一次全套冒烟。
5. **探索停止条件会延长补洞机制。** [C15:90、103](../../settled_issues/2026-11-18-guard-closure-and-unreadable-inputs.md)写“至少10张或2轮无新材料”，[C17:70、84](../../settled_issues/2026-11-19-guard-residuals-and-runtime-edges.md)升为20张。这些是当轮用户授权范围，不能倒推执行者违令；它们同时明确不声称完备。但若将bug配额延续为默认模板，会使“继续产卡”成为成功条件。此为未来流程激励推论，不是已量化的效率损失。

## 长期执行的最小改进位置与停止条件（建议，尚未实施）

| 位置 | 最小变更与验收 | 删除什么重复义务 |
|---|---|---|
| [失败类表](../../../../tests/failure-classes.md)的复发段 + 既有修复Note格式 | 下一次同类逃逸交接，必须写旧保证/反例改变的输入轴/负责输入集的owner/本次删掉的义务；只在当前批Note留4行，不造复发数据库 | 不再靠人重读整批卡才判断又补了样本还是改了合同 |
| [shipped-shape测试](../../../../tests/repo/release/shipped-shape.spec.ts) | B先试：所有允许目录成员逐件变异、新成员自动入集、非成员对照；一次删目录派生分支应整类红 | 同目录新增管线不补路径清单、不补同样一个测试 |
| [content合同测试](../../../../tests/tools/content-contract.spec.ts)与[seed读取器等价测试](../../../../tests/tools/kb-seeds.spec.ts) | A先补消费者来源的字面期望/跨引用结果；生产常量可造fixture，完整性期望不可仅从该常量生成；两消费者对同一世界输出同判据 | 防双实现回潮，并把策展清单的剩余义务保持可见 |
| [presence测试](../../../../tests/lib/presence/presence-board.spec.ts)与[catalog测试](../../../../tests/host/ledger/catalog.spec.ts) | C/D用有限状态/内容域系统枚举；每个降级输出追到一个真实消费者的现成组件或世界断言 | 不再等下一轮才补in_progress/unknown/空白的相邻样本 |
| 现有探索卡模板/开轮验收 | 完成已命名输入轴+负控+剩余边界即停止；重开由合同/消费者/输入域变化触发。取消最少开BUG数的验收项 | 不用连续产卡来证明工作量；不把“本轮没发现”解释为完备 |

不该增加：新门禁层、新全仓shape登记系统、自动解析所有历史卡的复发引擎、全仓通用schema框架、每轮真模型/浏览器兜底、更多固定文件清单、把覆盖率或具名BUG数继续抬高当收敛指标。既有owner、unit测试、现成元测试与修复Note足够承载首个试点。

建议以B为首个可验证切片：输入域最窄，目录规则已存在；成功标准是“新增允许成员自动受保护、移除派生逻辑元性质必红、无需添新gate或真入口阶段”。A/C/D按下一次对应合同变更推进，不授权从本研究自行开修。

## 本轮证据边界

- 首手材料：五批修复Note、两张已归档探索卡及定点缺陷卡、当前真实源码/tests；只读git核对 `f1629047`（C13）、`87d8b15d`（C14）、`56e4f986`（C15）、`21ff3ee7`（C16）历史实现/测试，避免把当前加强后的测试倒灌为旧验收。
- git核验发现C14实际保护终态而非全部缺revision输入，已在C链纠正；C15 Note对required数量自己有43/35两种写法，因此不以Note数字作为全集证明。
- 本轮实跑 `pnpm exec vitest run tests/repo/release/shipped-shape.spec.ts tests/tools/content-contract.spec.ts tests/lib/presence/presence-board.spec.ts tests/host/ledger/catalog.spec.ts`：4文件/140 tests全绿（1.82s）；层=keyless unit，失败类=纯逻辑/会话持久化/导出形态，本轮未植入新负控，历史负控仅按各原始载体引用。材料形状/全部相对链接另以只读脚本核验。
- 研究未运行真实模型、浏览器、安装或发布；没有探测新产品bug。全量verify/test未执行；本研究分工的单材料交接由主研究分支统一验收，不能把140个样本通过称作合同完备。
- 本研究分工限定仅新增本材料；题名页/索引登记由主研究分支统一收口。
