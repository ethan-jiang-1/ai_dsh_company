---
topic: bug-prevention-and-discovery
intent: 系统回答“在代码实践和编程范式上还能做什么以更早预防 bug”，并厘清防御式、进攻式、契约式与类型驱动设计的真实边界
---

# 问题一：根本上在代码实践里还能做什么，才能更早预防 Bug？

> **定位**：基于 [实证解剖](2026-11-23-post-pilot-bug-anatomy.md) 的 7 大缺陷族，结合本仓已钉住的 [DSH 防御模式库](None../../../../vendor/dsh/docs/defensive-patterns/README.zh.mdNone 与现代 TypeScript/React 工程实践，给出一套**可直接落地到代码写法**的七大预防范式。本文为设计研究，未修改产品源码。

---

## 0. 先纠正一个最致命的直觉误区：「防御式编程」≠「到处兜底」

用户问到「防御式、保守式、按约定写程序」是不是机会。对照 `BUG-283`–`BUG-332` 的真实代码，**必须先把“防御式编程”一分为二**——因为本仓近期有 **超过 15 张缺陷卡** 恰恰是**滥用“宽容式兜底（Permissive Fallback）”**亲手造出来的：

| 表面上像“防御式/保守式”的写法 | 实际后果 | 本仓真实事故 |
|---|---|---|
| `catch { return [] }` / `catch { return null }` | 把读失败/权限拒伪装成「本来就是空的」 | `BUG-291`、`BUG-305` |
| `row.root === 'archive' ? 'archive' : 'deliverables'` | 把损坏字段静默归一化成合法业务值 | `BUG-297`、`BUG-313`、`BUG-314`、`BUG-324` |
| `if (cells.length !== N) continue` | 静默丢弃坏行，统计数字默默少一截 | `BUG-303`、`BUG-310`、`BUG-311` |
| `currentCwd === undefined \|\| summary.cwd === currentCwd` | 把「尚未加载/未知」当成「全部放行」（fail-open） | `BUG-323` |
| `if (records.length >= 800) truncated = true` | “保守启发式”覆盖了协议明确的 `hasMore === false` | `BUG-332` |
| `item.id ?? item.what` | 缺身份时“兜底”用摘要，把不同实体塌成一个 | `BUG-299`、`BUG-312` |
| `x as never` / `JSON.parse(s) as T` | 让编译器闭嘴，把炸弹推迟到运行期 | `BUG-293` |

**真正的工程分界线（Defensive at the Perimeter, Offensive Inside）**：
- **在系统外部边界（磁盘、网络、JSON、用户输入、上游事件流）**：做**严格防御（Defensive Parsing）**——永不相信外部字节，但防御的结果**不是静默吞掉或胡乱兜底**，而是**全量解码成显式结果态（合法值 + 明确诊断/边界）**。
- **在系统内部边界（自写模块之间、函数前置条件、组件 props、状态机转移）**：做**进攻式编程 + 按契约设计（Offensive Programming & Design by Contract）**——违反前置条件就**立刻暴露（编译期报错或运行期 fail-closed / fail-loud）**，绝不用隐式默认值掩盖调用方错误。

围绕这条总原则，下面 7 项代码实践按对本仓的杠杆从高到低展开。

---

## 实践一：Parse, Don't Validate（解析而非校验）+ 全量代数解码

> **核心思想**（Alexis King / 类型驱动设计）：校验（validate）检查完输入后把知识扔掉，下游仍拿着弱类型反复猜；解析（parse）把不可信的 `unknown` 一次性变换成**自带不变量证明的领域值**，并把所有失败/丢弃收进显式返回类型。

### 在本仓的具体写法

1. **禁止“宽松读取 + 丢诊断”的双胞胎函数**：
   - `BUG-297` 的教训极其深刻：仓库里**早就写了**带诊断的 `parseStartupSettingsState`，但调用方顺手调了宽松版的 `parseStartupSettings`（坏 JSON 折成空配置）。
   - **规矩**：每个持久化格式只导出**唯一**一个全量解码器 `decodeX(raw: unknown): DecodeOutcome<X>`。若某个调用方确实允许降级成默认值，必须在调用点**显式解构 `outcome.ok === false` 并写明忽略/上报策略**——而不是提供一个“静默吞错版”便捷函数让人误用。
2. **禁止在解析循环里写无账本的 `continue`**：
   - 为集合类解析（台账行、成品索引条目、培养记录、会话事件）提供统一的小型组合子（不必引入重框架，甚至可直接复用 `vendor/dsh` 里已有的 `@deepseek-ai/schemastery` 或 40 行纯 TS 辅助）：
   ```ts
   export interface DecodedList<T, Drop> {
     readonly items: readonly T[]
     readonly dropped: readonly Drop[]
   }
   ```
   - 任何单条拒绝都必须 `dropped.push({ index, reason })`；调用方拿到的类型强制带有 `dropped`，不可能像 `BUG-303` / `BUG-310` 那样把坏行直接 `continue` 消失。
3. **禁止 `JSON.parse(...) as T`**：
   - 改为 `JSON.parse(...) as unknown` 过字段解码器；枚举/布尔字段必须严格判合法集合（缺省可允许 `undefined`，非预期类型一律进 `dropped`/`problem`），彻底消灭 `BUG-313` / `BUG-314` / `BUG-324`。

**可预防的缺陷族**：F2 全部 7 张卡（`BUG-297/303/310/311/313/314/324`）+ `cultivation-context-data.ts` 现行丢弃 `catalog.skipped` 的隐患。

---

## 实践二：Make Illegal States Unrepresentable（用类型系统让非法状态写不出来）

TypeScript 6 + `strict` + `exactOptionalPropertyTypes` + `noUncheckedIndexedAccess` 本仓已经打开（继承自 `vendor/dsh/tsconfig.base.json`），但目前大量代码只用到了“接口贴标签”，还没用到 TS 最强的三把武器：

### 2.1 判别联合状态机替代“平行布尔/可空字段”

**反例（制造 `BUG-291/294/323/328` 的元凶）**：
```ts
// 4 个独立字段可以组合出 2^4 = 16 种状态，其中一半是非法或自相矛盾的
interface BadPanelState {
  records: Record[] | null
  problem: string | null
  hasPending: boolean
  truncated: boolean
}
```
**正例（每个合法业务态独立成臂，空态只能由明确臂渲染）**：
```ts
type PanelState<T, B> =
  | { readonly kind: 'loading' }
  | { readonly kind: 'unready'; readonly reason: 'workspace-pending' }
  | { readonly kind: 'failed'; readonly reason: ErrorCode; readonly detail?: string }
  | { readonly kind: 'ready'; readonly items: readonly T[]; readonly boundaries: B }
```
配合单一纯函数 `emptyStateKind(state)`：
- `records.length === 0` vs `records.length > 0 && pending.length === 0` 必须各自有独立分支（`BUG-294` 写不出来）；
- 只有 `kind === 'ready' && items.length === 0 && !hasBoundary(boundaries)` 才能渲染「没有等你的事」（`BUG-305` / `BUG-328` 写不出来）。

### 2.2 穷尽检查（Exhaustiveness Check + `satisfies Record<Union, ...>`）

当一个领域联合类型扩充时（如 `AttentionKind` 加入 `'question'`，或 `AttentionBoundaries` 增加新维度）：
- 所有 `switch` 必须带 `default: return assertNever(x)`；
- 所有映射表（文案键、色调、历史重建器、边界渲染器）必须用 `satisfies Record<Kind, ...>`（不要写成 `Record<string, ...>`！注意 `DeliverablesTab.tsx:76` 的 `RESULT_TONES` 目前仍是 `Record<string, ...>`）。
- **效果**：新增一个类别或边界字段时，**编译器自动列出全仓所有漏同步的消费点**——直接消灭 `BUG-319`、`BUG-328`、`BUG-330`。

### 2.3 品牌类型（Branded / Nominal Types）守住语义边界

不需要任何运行时开销，仅靠 `unique symbol` 品牌就能把四类高发低级错误前移到编译期：

| 品牌类型 | 唯一构造入口 | 编译期直接堵死的缺陷 |
|---|---|---|
| `LocalizedText` | `t(key, params)` / `joinList(items, sep)` / `formatRelativeTime(parts, t)` | JSX 或 host 回执里塞入裸中文字面量、裸 ISO 串、裸 `join('、')`（`BUG-300/302/308/316/326/329` + 现行 `attention.ts:291`） |
| `SummaryText` | `attentionSummary(raw, max)` | 把未截断的长 `reason` / `question` 直接赋给列表摘要 `what`（`BUG-295`） |
| `EntityIdentity` | `{ kind: 'platform', id: string } \| { kind: 'synthetic', seq: string }`（必填，非可选） | 可选 `id?: string` 导致去重退化成摘要 `what`（`BUG-299/312`） |
| `CompleteText` vs `PreviewText` | `readFullText()` vs `readHeadPreview()` | 把 60 行预览窗口文本喂给全量记录解析器判坏（`BUG-321/322`） |
| `WorkspaceRelPath` vs `CompanyHomeRelPath` | `normalizeWorkspaceRel()` vs `normalizeHomeRel()` | 混用外层 workspace 根与 `.dsh-company/` 根（`BUG-286/289`、11-20 读取 Note 的 At/Workspace 分叉） |

> **克制提醒**：品牌类型有少量构造样板成本，**不要全仓滥用**；只用在已被历史事故反复证明“人肉记不住”的 3–5 个高价值接缝（特别是 `LocalizedText`、`CompleteText`/`PreviewText`、`EntityIdentity`）。

---

## 实践三：有界管线信封（Bounded Pipeline Envelope）与边界单子

11 月 22–23 日的 50 张卡里，**有界截断漏报边界就占了 13 张**（文件行数 240/2000、会话事件 800/1000、候选会话 20、条目上限 5、预览窗 60/240，以及现行尚未处理的 200/50/40/8/3）。

**病根**：有界读取函数返回裸数组 `T[]` 或裸字符串 `string`，上限常数和截断事实在返回那一刻就被丢弃了。

### 结构性解法

1. **统一原语 `Bounded<T>`**：凡对领域集合做任何上限截断（分页、滑窗、候选集切分、展示条数上限），必须通过唯一截断原语 `capSlice(items, cap, source)` 产出：
   ```ts
   export interface Bounded<T> {
     readonly items: readonly T[]
     readonly total: number | 'unknown'
     readonly truncated: boolean
     readonly droppedCount: number | 'unknown'
     readonly reason?: BoundaryReason
   }
   ```
2. **边界组合满足单子/幺半群律（Monoid `combineBoundaries`）**：
   - 第 6 轮在 `attention.ts` 已经自发演化出 `AttentionBoundaries` + `hasBoundary()`——把这一经验沉淀为通用习惯：**任何多源合并函数（`mergeAttention`、`readPendingAcrossSessions`、`useCompanyData`）必须同时合并数据与边界，绝不丢弃任何一条上游的 `boundaries`**（直接杜绝 `BUG-327` 丢弃 `ownAsks.capped`）。
3. **可证伪的截断判定（`limit + 1` 法则）**：
   - 协议提供了 `hasMore: boolean` 时**只信任协议**，绝不用 `items.length >= limit` 覆盖 `false`（`BUG-332`）；
   - 协议没有 `hasMore` 时（如文件行读取），永远多读 1 项（`limit + 1`），用 `raw.length > limit` 精确判定 `truncated`，绝不猜 `>= limit`。

---

## 实践四：按契约设计（Design by Contract）+ 内部进攻式断言 + Fail-Closed 默认

直接回应用户关于「按约定写程序」的思考——把隐含在注释里的“约定”变成**机器执行的契约**：

1. **前置条件显式断言（Precondition Invariant）**：
   - 对应 `BUG-293`（注入对象缺字段）、`BUG-283`（`spawnSync` 前 `cwd` 不存在）：在构造/挂载入口用轻量 `invariant(cond, message)` 立刻报错，绝不把 `undefined` 带进渲染期或把 `ENOENT` 压成 `exit null`。
2. **Fail-Closed 过滤器约定**：
   - 任何涉及**作用域/权限/租户/工作区隔离**的谓词（如 `BUG-323` 的 `cwd` 匹配、路径 containment、写 gate），写死规则：**「前提缺失（`undefined`/`null`/空串）= 拒绝/暂停（`false`），绝不等于无限制（`true`）」**。
   - 代码评审与静态检查对形如 `scope === undefined || item.scope === scope` 一律亮红灯。
3. **异常处理的“三选一纪律”**：
   - 针对扫描出的 **138 处静默 `catch`**：每处 `catch` 只能做三件事之一：
     1. 转为**带原因的结果态** `{ ok: false, reason, cause }` 向上返回；
     2. 包装上下文后**重新抛出**；
     3. 确属装饰性降级（如 `loadIdentity` 读品牌名）时，**必须写明固定前缀注释**（如 `// intentional-fallback: <理由>`），其余裸 `catch` 一律视为缺陷。
4. **后置不变量（Postcondition）与双边契约**：
   - 对应 [DSH general.zh.md「公共约定两侧都要遵守」](None../../../../vendor/dsh/docs/defensive-patterns/general.zh.mdNone：例如布局函数 `splitLayout(available, desired)` 自身保证后置不变量 `stacked || (board >= BOARD_MIN && chat >= CHAT_MIN)`（`BUG-315`）；分箱函数 `recordInbox()` 自身保证同一 UI 区块内的两个子箱互斥（`BUG-309`）。

---

## 实践五：声明即消费（Make Unconsumed Declarations Impossible）与数据/表达分离

针对 **F5（死声明）** 与 **F3（双语泄漏）** 的结构性根治：

1. **不要把“约束声明”和“约束执行”拆成两处**：
   - `BUG-306/307`：`LIST_CAPS` 声明在 hook 顶部，列表各自手动调 `capList` 和 `capControl`，结果 `mine` 忘了接，接上后又算错隐藏数。
   - **正法**：把“切片 + 隐藏数 + 展开控件模型”收成一个不可拆分的纯函数/hook `partitionCappedList(lists, cap, expanded)`——消费方**只能**通过它的返回值拿到 `visibleLists` 与 `hiddenCount`，想不接控件或算错隐藏数都不可能。
2. **表达层严格单向分层：`lib/` 只产结构，永不产自然语言**：
   - 沿 `BUG-302` 的 `timeParts()` 范式，把这条纪律提升为全仓 `src/lib/` 铁律：**`src/lib/**` 不允许返回面向用户的中文或英文句子**（只返回结构化 token，如 `{ kind: 'question-summary', first, total }`、`{ kind: 'present-done', label }`）。
   - `src/client/**` 与 `src/host/**` 用户可见文案全部经由类型化字典函数渲染；`joinList` / 分隔符（`、`、`；`、`, `）全部走 locale（消灭 `BUG-329` 及现行 3 处残余）。
3. **表单输入统一受控纪律**：
   - 凡数据来自外部 store 且支持重置/外部更新的输入控件，**禁止非受控 `defaultValue`**（`BUG-301`），一律封装为受控草稿 hook（外部值变化自动同步 + 同值失焦零写入）。
4. **多源同实体的唯一编码器（Single Identity & Codec Owner）**：
   - 当同一业务对象同时有「活体推送」和「历史事件流重建」两条路径（如 `AttentionItem` 的审批与问询），**必须在 `lib/` 定义同一份事件→条目编解码器与统一身份提取规则**，活体观察者只是在收到实时事件时调用同一函数（消灭 `BUG-295/299/312/319/325/331` 整条身份与文案分叉链）。

---

## 实践六：零类型系统逃逸（Zero Type Escape Hatches）

`BUG-293` 是一记极响的警钟：TypeScript 明明有能力在保存文件那一刻就拦住「槽注入缺了 `list`」，但它被一句 `undefined as never` 捂住了嘴。

- **彻底禁用 `as never` 和 `as any`**（现行 `src/` 里已有 0 处 `as any`，但仍有 **10 处 `as never`** 和 **42 处 `as unknown as`**）。
- 对 42 处 `as unknown as` 分两类处置：
  1. **Vendor 协议/Slot 窄接口适配**：集中收拢到 1–2 个薄适配器模块（带运行时字段校验或契约测试），禁止在业务组件/命令里随手强转；
  2. **事件载荷/JSON 载荷读取**：用 Type Guard（`isRecord` / 字段解码器）替代强转。
- 逐步收回 `tsconfig.test-*.json` 中 `exclude` 的测试文件，避免测试本身出现静默类型漂移。

---

## 实践七：子进程与资源生命周期的 RAII 封装（`tools/` 与 `host/`）

针对 `BUG-283`、`BUG-284`（以及 [DSH general.zh.md「dispose 必须达到完全停稳」](None../../../../vendor/dsh/docs/defensive-patterns/general.zh.mdNone）：

- 在 `tools/lib/core/` 提供统一的 `spawnManaged()` / `runCheckedSync()`：
  - `runCheckedSync` 自动校验 `cwd` 存在性，并优先检查 `result.error`（给出 `ENOENT`/`EACCES` 诊断而非 `exit null`）；
  - `spawnManaged` 自动安装 `SIGINT`/`SIGTERM`/`SIGHUP` 转发、子进程组回收与退出等待，彻底消灭孤儿进程持锁导致下次启动静默停写。

---

## 小结：七大实践与 7 大缺陷族的对应关系

| 代码实践 | 消除的核心维护义务 | 直接对应的 11-20～23 缺陷族 |
|---|---|---|
| 1. Parse, Don't Validate + 全量解码 | 不再靠人记住“别调宽松版 / 别写裸 `continue`” | F2（7 张） |
| 2. ADT + 穷尽检查 + 关键品牌类型 | 扩类/加边界/写文案时由编译器列出所有漏改处 | F3（7 张）、F4（7 张）、F6（4 张） |
| 3. `Bounded<T>` + 边界单子 + `limit+1` | 上限与截断无法在管线中途被丢弃 | F1（13 张） |
| 4. DbC 契约断言 + Fail-Closed + 三选一 `catch` | 未知不再放行、失败不再折成空态 | F1、F5、F6 |
| 5. 声明即消费 + `lib/` 无自然语言 + 单一多源编解码 | 声明不能成死代码、双源不会各自发明身份 | F3、F4、F5（5 张） |
| 6. 零 `as never` / 收拢 `as unknown as` | 类型系统不被局部强转掏空 | F5（`BUG-293`）、F2 |
| 7. 进程 RAII 封装 | 每个脚本不再手写信号转发与 `result.error` | F7（`BUG-283/284`） |
