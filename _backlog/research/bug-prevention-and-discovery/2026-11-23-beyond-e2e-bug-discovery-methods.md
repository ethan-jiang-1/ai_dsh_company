---
topic: bug-prevention-and-discovery
intent: 系统回答“除了端到端，还有哪些更低成本、更系统的手段能主动发现代码里的 bug”，并给出 49 张真实缺陷卡的回溯捕获矩阵
---

# 问题二：除了靠端到端，还有哪些更好的手段找代码里的 Bug？

> **核心前提**：在 11 月 20–23 日修复的 49 张缺陷卡里，**43 张（87.8%）最终用秒级 keyless `vitest` 就能稳定打红**。E2E 之所以成了主力找虫器，是因为在「人工写单点示例单测」和「人工跑真浏览器 E2E」之间，存在一片巨大的**自动化发现真空带**。本文系统梳理 10 类填补这片真空的非 E2E 找虫手段，全部锚定本仓真实技术栈。

---

## 全景图：四层非 E2E 找虫兵器谱

```
[层 1：静态分析与自定义 AST 猎手]      毫秒–秒级 · 零运行 · 覆盖全仓每一行代码（哪怕没测试）
            ↓
[层 2：生成式 / 性质 / 畸形输入 / 差分]  秒级 · 无浏览器无模型 · 自动构造人类想不到的组合反例
            ↓
[层 3：无头组件集成 / 变异测试 / 死码]   秒级–分钟级 · 抓接线崩溃、交互失步与测试自身盲区
            ↓
[层 4：轴驱动白盒对抗审计]              按需/阶段收口 · 用清单+工具探针做有界代码审计
            ↓
[最后一层：E2E（真进程/真浏览器/真模型）] 只负责前四层物理上看不见的 10–15% 真集成问题
```

---

## A. 静态分析与结构化代码猎手（成本最低、回报最快）

### 手段 1：把 `oxlint` 从“只查未使用变量”升级到真正的正确性扫描器

**现状痛点**：读 `.oxlintrc.json` 可知，本仓虽然接了 `oxlint 1.81.0`，但规则里**几乎只开了 `no-unused-vars`**！连 React hooks、空 catch、unsafe 强转、switch 穷尽都没有开。

**可立刻开启的正确性规则（零新依赖，秒级）**：
- `typescript/no-explicit-any` + 禁用 `as never`（可由自定义 AST 或 lint 规则实现）→ **直接拦住 `BUG-293`**；
- `no-empty`（含空 `catch` 检测）→ 拦住静默吞异常；
- `react-hooks/exhaustive-deps` & `react-hooks/rules-of-hooks` → 拦住 effect 漏依赖导致的旧快照/不刷新（如 `useCompanyData` / `AttentionTab` 订阅闭包过时）；
- 后续按需评估 `oxlint-tsgolint`（type-aware）：`no-floating-promises`、`switch-exhaustiveness-check`、`no-unnecessary-condition`（抓类似 `BUG-332` 或 `BUG-323` 的永真/冗余条件）。

### 手段 2：基于本仓已有 TypeScript Compiler API 的「自定义 AST 缺陷猎手」

本仓 `node_modules/typescript` 已就位，**零新依赖**即可用 `ts.createSourceFile` 写 150 行轻量 AST 扫描脚本（比正则准确十倍：自动跳过注释、类型声明、测试夹具，精准识别语法节点），专抓本仓高频复发家族：

| AST 猎手规则 | 精准扫描的语法模式 | 能直接抓出的历史卡 / 现行隐患 |
|---|---|---|
| **H1. 类型逃逸猎手** | `TSAsExpression` 目标为 `never` / `any`，或 `JSON.parse(...)` 直接被 `as` 强转 | `BUG-293`；现行 10 处 `as never`、7 处 `JSON.parse(...) as T` |
| **H2. 双语泄漏猎手** | `src/client/**`（除字典文件）与 `src/lib/**`、用户可见 `host/commands/**` 中出现含 CJK 字符或中文标点（`、；：（）`）的字符串/模板字面量；或 `client/` 中 `.join('、'\|'；'\|', ')` | `BUG-302/308/316/326/329`；**今日可立刻抓出** `attention.ts:291`、`CultivationBoardSections.tsx:286`、`company-panels.tsx:159`、`cultivation-context-data.ts` 5 处 |
| **H3. 静默吞错猎手** | `CatchClause` 块体为空或仅 `return null/undefined/[]/{}/false` 且无 `// intentional-fallback:` 标记 | `BUG-291/305`；现行 138 处静默 catch 逐批收口 |
| **H4. 解析器无账 `continue` 猎手** | 解析函数内的 `continue` 语句所在块未写回诊断计数器（或未标 `// structural-skip:`） | `BUG-303/310/324` |
| **H5. 裸上限切片猎手** | `src/client/**` 与 `src/lib/**` 中 `.slice(0, CAP)` / `.slice(-CAP)` / `{ limit: N }` / `maxMessages: N` 未通过 `Bounded<T>` 原语或未消费 `eof`/`hasMore` | `BUG-298/304/317/318/320`；**今日可立刻抓出** `client/index.ts:339`、`use-company-data.ts:114`、`cultivation-context-data.ts:192,209` |
| **H6. 非受控输入与 Fail-Open 猎手** | JSX 中的 `defaultValue=`（受控表单外需显式豁免）；形如 `x === undefined \|\| y === x` 的作用域过滤表达式 | `BUG-301`、`BUG-323` |
| **H7. 工具/车道防腐猎手** | `checks/` 与 `probes/` 中引用已退役的顶层 `journal/`、`deliverables/`、`kb/`（无 `.dsh-company/`）；Playwright `getByRole`/`getByPlaceholder` 使用单语硬编码字符串；`tools/` 中裸 `spawn`/`spawnSync` 未检查 `error` 或未接信号转发 | `BUG-283/284/286/287/289` |

### 手段 3：全仓死代码与“声明未消费”静态分析（`knip` / 导出引用图）

- **解决什么**：发现声明了却没人用的常量、配置键、字段、导出函数与幽灵文件（`BUG-306` 的 `LIST_CAPS.mine`、`BUG-315` 的 `BOARD_MIN` 在布局层未被消费、未接线的 helper）。
- **做法**：定期跑 `knip`（只读审计脚本，不强制进每次 pre-push）+ 对对象字典类配置（如 `LIST_CAPS`、`FILTER_KEYS`）用 TS 静态类型或单测校验全键被消费。

---

## B. 生成式、对抗式与差分无模型测试（自动发现“人类没想到的边界”）

> **本仓已有铁证**：`tests/lib/docs/markdown-shape.property.spec.ts` 用 1000 个 seeded 随机文档做 `mdast` 差分，一次性终结了 `BUG-152/165/168/172/176/181` 六连环解析逃逸。**把这套已被本仓验证有效的打法，复制到 `client/lib` 的解析器与读模型，是回报率最高的测试升级。**

### 手段 4：性质测试（Property-Based Testing — `fast-check` 或 seeded 生成器）

不再手工写“6 条审批截成 5 条”这种单点样例，而是直接断言**对任意随机输入都成立的数学不变量**（自动 shrink 到最小反例！）：

1. **有界管线诚实性不变量**（覆盖 `attention`、`useCompanyData`、`cultivation-data`、`workspace-text`）：
   - 随机生成 `N ∈ [0..1500]` 条事件、`M ∈ [0..35]` 个会话、`K ∈ [0..15]` 条审批与问询；
   - 断言：`visible.length <= CAP`；`visible.length + capped === total`；只要 `N > MAX_EVENTS` 或 `M > SCAN_CAP` 或 `K > ASKS_CAP` 或任一会话读失败或 `cwd` 缺失，必有 `hasBoundary(boundaries) === true`；
   - 断言：**边界诚实反向不变量**：若所有源均未截断（包括**恰好等于 800 条且 `hasMore === false`**！）且无失败，则 `hasBoundary(boundaries) === false`（**直接抓出 `BUG-332`**！）。
2. **身份与去重代数不变量**（覆盖 `mergeAttention`、`attentionItemKey`、`recordInbox`）：
   - 任意两条不同 `id` 的审批/问询，哪怕 `what` / `reason` 逐字相同或前 160 字相同，合并后条数必须为 2 且 React key 互异（**直接抓出 `BUG-299`、`BUG-312`**）；
   - `recordInbox(records, viewer)` 对任意包含 `proposerRole === targetRole === viewer` 的记录集（open / adopted / rejected），同区块内子箱交集必须为空（**直接抓出 `BUG-309`**）。
3. **多子列表折叠一致性不变量**：
   - 随机生成 `(lenA, lenB) ∈ [0..12] × [0..12]`，断言 `controlVisible === (renderedCount < lenA + lenB)` 且文案里的总数等于 `lenA + lenB`（**直接抓出 `BUG-306`、`BUG-307`**）。
4. **响应式布局几何不变量**：
   - 随机生成 `available ∈ [200..2400]`、`desired ∈ [0..2000]`，断言要么 `stacked === true`，要么 `board >= BOARD_MIN && chat >= CHAT_MIN && board + chat + GAP <= available`（**直接抓出 `BUG-315`**）。
5. **长文本与摘要边界不变量**：
   - 随机生成长度 `0..10000`、含换行/Emoji/CJK 的文本，断言所有 `AttentionItem.what` 单行且 `length <= ATTENTION_SUMMARY_MAX`，且超长时必保留 `detail`（**直接抓出 `BUG-295`**）。
6. **预览窗口与全文一致性（Round-Trip Fuzz）**：
   - 随机生成前置元数据行数 `1..120`、前言字数 `0..600` 的合法培养记录与 journal，喂给 `readRecordHead` / `readHead` 加载管线，断言**绝不把合法文档误判进 `brokenRecords` 或丢失真实 `# 标题`**（**直接抓出 `BUG-321`、`BUG-322`**）。

### 手段 5：结构化畸形输入模糊测试（Structured Malformed-Input Fuzzing）

针对全仓所有外部数据解析器（`parseCatalog`、`parseMotionLedger`、`parseStartupSettingsState`、`parseStartupOptionsState`、`parseRecord`、`parseCompanyIdentity`、`pendingApprovals`、`pendingQuestions`、`decodeDeliveryRules`、`decodeProductRules`），写一个通用的**通用畸形变异引擎**（约 80 行）：

- **输入变异算子**：
  - 顶层坏类型（空串、截断 JSON、`null`、`[]`、数字、BOM+CRLF）；
  - 逐字段类型反转（字符串→数字/数组/对象/null/空串，布尔→`"false"`/`1`/`null`，枚举→`"bogus"`）；
  - 表格专属变异（改坏表头一词、单元格内插入裸 `|`、缺列、多列）；
  - 工具参数变异（`questions: []` / 1 题 / 3 题 / 缺 `question` 字段 / 坏 JSON）。
- **统一神谕（Oracle）**：
  - 凡被变异成**非协议允许值**的输入，解析器**必须**返回非空诊断（`problem` / `skipped > 0` / `badRows.length > 0` / `headerOk === false`），**绝不允许**输出“合法正常态且零警告”——这一条测试就能一次性扫死 `BUG-297/303/310/311/313/314/324/331`！

### 手段 6：差分测试（Differential Testing：三组高回报交叉对照）

1. **活体 vs 历史差分（Live ↔ History Parity Oracle）**：
   - 对任意随机生成的“请求 + 应答/未应答”事件流（同时涵盖审批与单/多问题问询），分别喂给：
     - 路径 A：活体观察者（`attention-observers.ts`）；
     - 路径 B：历史重建器（`pendingAsks`）；
   - 断言：A 与 B 产出的语义条目数量相等、`what`/`detail` 一致，且 `mergeAttention(live, history)` 的长度等于单源长度（**无重复、无遗漏**）——直接拦住 `BUG-292`、`BUG-295`、`BUG-319`、`BUG-325`、`BUG-331`！
2. **全组件双语渲染扫面（zh ↔ en Bilingual Render Sweep）**：
   - 对 `src/client/` 下**每一个面板/视图/卡片组件**（覆盖正常态、空态、加载态、错误态、全边界态）以及 `src/host/` 的**每一个注册命令**（含 `description`、`input.hint`、成功回执、用法错误、停写错误、路径安全错误）：
     - 在 `locale = 'en'` + 纯 ASCII 业务夹具下用 `renderToStaticMarkup` / 命令执行渲染 → 断言输出**零 CJK 字符**且**零中文全角标点**（`/[一-龥、；：（）「」]/` 不命中）且**零裸 ISO 时间戳**；
     - 在 `locale = 'zh'` 下渲染 → 断言无意外泄漏的未翻译英文模板词（如裸 `session: `）。
   - **成本**：纯进程内，**不到 1 秒跑完全仓所有组件与命令的双语状态矩阵**——彻底终结 `BUG-300/302/308/316/326/329` 以及今天刚被扫描出的 `attention.ts:291` 等残留！
3. **Host ↔ Client 共享语义差分**：
   - 如 `catalog` 产出的 JSON 必须 100% 通过 `parseCatalog` 且 `skipped === 0`；`cultivation` host 写出的记录必须 100% 通过 client 的 `parseRecord` 且不进 `brokenRecords`。

### 手段 7：基于状态机的随机交互序列测试（Stateful Model-Based Testing）

用极轻量的模型测试驱动核心状态机（`StrategyPanel` 表单、`CultivationBoard` 收件箱、`AttentionTab` 数据流、`useWorkspaceText` 轮询/取消）：
- 定义动作集：`editInput`、`blur`、`resetToAuto`、`externalStoreUpdate`、`adoptLastItem`、`failLoad`、`recoverLoad`、`switchSession`、`emitLiveEvent`、`reloadHistory`；
- 随机跑 200 步动作序列，每一步后检查不变量：
  - `StrategyPanel`：`inputValue === (dirty ? draft : storeValue)`，重置后 `inputValue === ''` 且再失焦不触发写入（**直接抓出 `BUG-301`**）；
  - `CultivationInbox`：总记录数 `> 0` 且待办 `=== 0` 时，绝不出现「工作区还没有记录」（**直接抓出 `BUG-294`**）；
  - `AttentionTab`：无会话或 `cwd` 未知时，绝不扫描跨工作区且不显「没有等你的事」（**直接抓出 `BUG-290`、`BUG-323`、`BUG-328`**）。

---

## C. 交互接线测、测试测谎仪与契约新鲜度（填补单测到 E2E 的中间断层）

### 手段 8：无头 DOM 组件与真 Slot 接线测试（jsdom / Happy DOM + React Testing）

**现状断层**：`tests/client/` 目前大量使用 `renderToStaticMarkup`（只跑首帧同步渲染，**不执行 `useEffect`、不触发 `onBlur`/点击事件、不校验真实 `slots.register` 的 `inject()` 返回值**）。这就是为什么 `BUG-293`（`CommandScopeHint` 渲染即崩）、`BUG-290`（无会话敲命令无反馈）、`BUG-301`（重置后失焦写回）逃出了 2500 条单测，直到真浏览器 E2E 才炸！

- **补齐方式**：不跑 Playwright，而在 Vitest 中为关键交互与**全部已注册的 client slots** 增加轻量 jsdom 挂载测试：
  - 遍历 `packages/company-pack/src/client/index.ts` 注册的每一个 slot，用真实的 `SlotRegistry` + 最小完整 store 快照调用其 `inject()` 并实际挂载组件（有会话态 + 无会话态 + 空态 + 错误态）；
  - 任何 `undefined as never` 或渲染期异常**在 100ms 内当场崩红**（**直接抓出 `BUG-293`、`BUG-290`**）。

### 手段 9：定向变异测试（Mutation Testing — 测试套件的“测谎仪”）

本仓已有 2600+ 测试和 `coverage-ratchet`，但**高覆盖率 ≠ 强断言**（一个没断言 `capped` 的测试可以把 `pendingApprovals` 的行覆盖率跑到 100%，却完全抓不住 `BUG-320` 或 `BUG-332`）。

- **做法**：在 weekly 或大改动收口时，对高缺陷密度的纯核心目录（`src/lib/presence/`、`src/lib/accounting/`、`src/lib/startup/`、`src/lib/cultivation/`、`src/client/data/`、`src/client/presence/`）跑定向变异测试（如 StrykerJS 搭配 Vitest runner，或扩展本仓已有自写变异器）。
- **它专抓哪类漏网之鱼**：
  - 边界算符变异（`>=` ↔ `>`）→ **直接暴露 `BUG-332`**（缺少 `records.length === 800 && hasMore === false` 反例）；
  - 布尔条件变异（`&&` ↔ `||`、删除 `=== undefined` 保护）→ **直接暴露 `BUG-323`、`BUG-328`**；
  - 返回值变异（把 `skipped += 1` 删掉、`capped` 置 0）→ **直接暴露 `BUG-310`、`BUG-320`、`BUG-327`**。

---

## D. 定向白盒审计（把“人工跑 E2E 碰运气”变成“轴驱动代码扫雷”）

### 手段 10：清单化轴驱动对抗代码审计（Axis-Driven White-Box Sweep）

当上线新面板、新解析器或做阶段质量收口时，不再泛泛“跑一遍 E2E 看看坏没坏”，而是先运行 **手段 1 + 2 的静态扫描报告**，再由独立只读审阅者沿本仓实证沉淀的 **7 问白盒清单** 逐模块审一遍源码：

1. **有界问**：本模块所有数组/事件流/文件读有没有固定上限？上限被触发时边界是否随返回值一直传到 UI 并压住空态？恰好等于上限但未截断时会不会误报？
2. **解析问**：所有外部字节/JSON/Markdown/事件流解析，有没有 `continue`、`as T` 或宽容三元把坏形状静默吞掉或归一化？
3. **双语问**：有没有任何面向用户的文字、时间、错误原因、元数据或列表分隔符绕开了 locale？`lib/` 有没有吐出自然语言？
4. **身份问**：跨源（活体/历史）和源内去重键、React `key` 是否用稳定身份而非摘要？多源实体是否共用同一编解码器？
5. **状态问**：有没有把「加载中 / 读失败 / 权限拒 / 工作区未就绪 / 0 条记录 / 有记录但 0 待办」任意两个状态折叠到同一分支？
6. **声明问**：本模块声明的每一个常量（上限、最小宽度、枚举映射、槽注入字段）是否都在真实消费点生效且有不变量约束？
7. **生命周期问**：所有订阅、定时器、`AbortController`、子进程、lease 是否在卸载/信号中断时彻底停稳？

---

## 回溯验证：如果这 10 类手段先上场，11 月 20–23 日的 49 张已修卡能早拦住多少？

逐张对照 `BUG-283`–`BUG-332`（排除撤回的 `BUG-288`，共 49 张已修卡），标注**最早可拦截它的非 E2E 手段**：

| 最早可拦截层级 | 拦截卡号清单 | 数量 | 占比 |
|---|---|---:|---:|
| **层 1：静态分析 / AST 猎手 / 类型约束** | `BUG-283`(spawn error), `284`(spawn signal), `286`(旧路径根), `287`(硬编码英文定位器), `289`(旧 `journal/` 路径), `293`(`as never`), `301`(`defaultValue`), `302/308/316/326/329`(双语 CJK/标点扫描), `303/310`(解析器裸 `continue`), `305`(静默 `catch`), `306`(死声明), `323`(fail-open 谓词) | **17 张** | **34.7%** |
| **层 2：性质测试 / 畸形 Fuzz / 差分 / 双语渲染扫面** | `BUG-295`(长文本摘要性质), `297/311/313/314/324`(畸形输入 Fuzz), `298/304/317/318/320/327/328/332`(有界管线性质), `299/312/319/325/331`(Live↔History 差分与身份性质), `300`(双语/无 ISO 渲染扫面), `307/309`(折叠/分箱性质), `315`(布局几何性质), `321/322`(预览/全文 round-trip fuzz), `330`(扩类文案穷尽) | **25 张** | **51.0%** |
| **层 3：jsdom 交互/状态机组件测试** | `BUG-290`(无会话态提示), `BUG-294`(采纳末条后空态状态机) | **2 张** | **4.1%** |
| **合计：E2E 之前可自动捕获** | — | **44 张** | **89.8%** |
| **真正需要实境/环境/跨语义验收（保留给 E2E 或人工语义审）** | `BUG-285`(已废止语义的冷车道漂移), `BUG-291`(多 workspace 真盘操作混淆 + 错误诊断), `BUG-292`(产品语义范围定义：单会话 vs 全局待办), `BUG-296`(未重建产物新鲜度——已补门禁),（另注：`283/284` 虽可静态提示，仍需进程级冒烟终验） | **5 张** | **10.2%** |

> **诚实边界说明**：上述回溯是**事后映射（Retrospective Attribution）**，证明的是“这些手段在原理与机械判据上具备捕获对应缺陷族的能力”，而非声称“一上线就能零漏网”。真正的效果需要在后续实施时用**负控（注入对应缺陷确认抓红）**与**跨轮逃逸率观察**来实证。

---

## E2E 应该退回到什么角色？

把 85–90% 的结构性、解析性、边界性、双语性、接线性缺陷交还给前四层后，E2E 不再是“廉价找虫机”，而是回归它不可替代的本职：
1. **真实边界装配**：真 `dsh` 二进制、真 Cordis 加载、真 WebSocket/RPC 协议、真浏览器 CSS/焦点/视口渲染；
2. **端到端用户心智与产品语义**：例如 `BUG-291`（用户看着培养页不知道看的是哪个 workspace）、`BUG-292`（面板标题承诺的作用域与用户预期不符）这类**规格本身是否合理**的问题；
3. **跨进程/升级/故障恢复**：多窗口、并发写、升级中运行、真实 tarball 安装形状。
