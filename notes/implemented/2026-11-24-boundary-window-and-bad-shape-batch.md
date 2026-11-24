状态：implemented（2026-11-24）；批准：用户 2026-11-24 指令「修 _backlog/bugs 最新发现的问题」并建批次 goal 推进｜上游 = [BUG-363](../../_backlog/_archive/fixed_bugs/BUG-363-error-capture-install-not-idempotent.md)

# BUG-360..369 批次收口：边界窗口、坏形状与可逆安装

## 决定

1. **全局安装必须可逆、幂等（[BUG-363](../../_backlog/_archive/fixed_bugs/BUG-363-error-capture-install-not-idempotent.md)）**：
   `installErrorCapture` 对同一 target 只保留一层 `console.error` 包装；安装/卸载用环栈维护「当前环」，
   重复安装只让栈顶收条目，卸载退自己那层、退到零才恢复原始函数。包装与原始函数的对应住
   `WeakMap<target, ConsoleCaptureState>`，不写全局字符串键。
2. **流数据层有界（[BUG-365](../../_backlog/_archive/fixed_bugs/BUG-365-company-data-unbounded-event-accumulation.md)）**：
   `applyStreamFrame` 是纯函数窗口（`EVENT_WINDOW = 1_000`，保留尾部）：history 帧裁剪并记丢弃，
   event 帧超窗丢头并累计 `dropped`；`useCompanyData` 的 `activityCapped` 合并数据窗口与展示窗口的省略数。
3. **作用域过滤 fail-closed（[BUG-366](../../_backlog/_archive/fixed_bugs/BUG-366-context-candidates-fail-open-on-unknown-cwd.md)）**：
   `projectContextSessions` 在当前会话 cwd 未知时返回零候选 + `contextCwdUnknown` 原因（`listSessions` 变 `ok:false`）；
   行 cwd 缺失排除、子会话经 parent 继承；比较前统一分隔符/尾斜杠。
4. **工具面/诊断命令语言注入（[BUG-367](../../_backlog/_archive/fixed_bugs/BUG-367-signoff-tool-result-and-reason-always-chinese.md)）**：
   `signoffReason`/`signoffDecisionNote` 增加可选 `text(zh,en)`（缺省 zh 兼容旧调用）；`registerSignoffTool` 接
   `{ language }` 并订阅切换重注册；`/company-diagnostics` 改走 `registerLocalizedCommand`，描述与全部错误/成功回执成对。
5. **坏形状与缺失值不折成好值（[BUG-362](../../_backlog/_archive/fixed_bugs/BUG-362-ledger-slugs-accept-malformed-rows.md) / [BUG-368](../../_backlog/_archive/fixed_bugs/BUG-368-yaml-scalar-unbalanced-quote-kept-and-trailing-dropped.md) / [BUG-369](../../_backlog/_archive/fixed_bugs/BUG-369-workspace-doors-unset-preset-chinese-placeholder.md)）**：
   台账 slug 集合用「表头列数 / 非全空行 / 非分隔行」的行有效性（与 tools 孪生同判据）；`yamlScalarOrProblem` 对未闭合/带尾巴引号报
   `problem`，宽松版返回空串、身份文件整份作废；`DoorRow.preset` 用 `string | null`，`workspace_doors` 省略未设置键。
6. **时间窗口双边（[BUG-364](../../_backlog/_archive/fixed_bugs/BUG-364-instance-guard-future-heartbeat-never-expires.md)）**：
   `shouldWarn` 加 `SKEW_MS` 下界（`ts <= now + SKEW`），`writeBeat` 写自己的同时裁掉过期/超前邻居；
   未来心跳不再永久告警，坏记录不再长期留在 localStorage。
7. **文本与格式归一（[BUG-361](../../_backlog/_archive/fixed_bugs/BUG-361-first-text-keeps-crlf-carriage-return.md) / [BUG-360](../../_backlog/_archive/fixed_bugs/BUG-360-format-tokens-1000k-instead-of-1m.md)）**：
   `firstText` 先用 `\r\n?`→`\n` 归一、切首行后再 trim；`formatTokens` 对舍入后的 k 档值再判一次档，
   999 950 及以上进 M，不再出现 `1000k`。

## 输掉的方案

- **在 target 上放 `global['__DSH_ERROR_CAPTURE_ORIGINAL__']` 字符串键**：会与页面其它脚本争用全局命名空间；
  `WeakMap` 随 target 生命周期回收，且不暴露可被误改的全局引用。
- **每次安装先恢复再重装**：卸载语义变成「隐式重置」，中间那一层安装失去可逆性；环栈保留逐层可逆。

## 状态事实与载体

| 事实 | 唯一入口 | 读载体 / 写载体 |
|---|---|---|
| 错误捕获安装/卸载 | [`installErrorCapture`](../../packages/company-pack/src/client/wiring/error-ring.ts) | `WeakMap` 单例状态；`tests/client/wiring/error-ring.spec.ts` 钉双层语义 |
| follow 事件窗口 | [`applyStreamFrame`](../../packages/company-pack/src/client/data/company-stream.ts) | `useCompanyData` 消费；`tests/client/data/company-stream.spec.ts` |
| 实例心跳新鲜度 | [`shouldWarn`](../../packages/company-pack/src/client/wiring/instance-guard.ts) | `startInstanceGuard` 消费；`instance-guard.spec.ts` |
| YAML 标量坏引号 | [`yamlScalarOrProblem`](../../packages/company-pack/src/lib/docs/yaml-scalar.ts) | `parseCompanyIdentity` / bootstrap / req 消费；`yaml-scalar.spec.ts` |
| 门投影未设置 preset | [`doorsFromSessions`](../../packages/company-pack/src/lib/presence/doors.ts) | `workspace_doors` 工具省略键；`workspace-doors.spec.ts` |
| 背景候选作用域 | [`projectContextSessions`](../../packages/company-pack/src/client/cultivation/cultivation-context-data.ts) | `listSessions` 消费；`tests/client/cultivation/cultivation-context-data.spec.ts` |

## 验证（真跑过）

- **BUG-363**：`pnpm test tests/client/wiring/error-ring.spec.ts` —— 还原前 1 failed（一条错误进两个环、卸载后旧环增长）；修复后 9/9 passed。
- **BUG-365**：`pnpm test tests/client/data/company-stream.spec.ts` —— 无界实现下「追加封顶」红；窗口化后 2/2 passed。
- **BUG-366**：`pnpm test tests/client/cultivation/cultivation-context-data.spec.ts` —— fail-open 过滤还原后 3 failed；修复后 12/12 passed。
- **BUG-367**：`pnpm test tests/lib/accounting/signoff.spec.ts tests/host/commands/signoff-language.spec.ts tests/host/commands/command-language.spec.ts` —— 还原语言注入前 4 failed；修复后 10/10 passed。
- **BUG-362**：`pnpm test tests/tools/deliverables-catalog-tools.spec.ts` —— 还原前 1 failed；修复后 13/13。
- **BUG-368**：`pnpm test tests/lib/docs/yaml-scalar.spec.ts tests/client/ui/brand.spec.ts` —— 还原前 3 failed；修复后全绿。
- **BUG-369**：`pnpm test tests/lib/presence/doors.spec.ts tests/host/workspace/workspace-doors.spec.ts` —— 还原前 3 failed；修复后全绿。
- **BUG-364**：`pnpm test tests/client/wiring/instance-guard.spec.ts` —— 还原单边判据前 2 failed；修复后 7/7 passed。
- **BUG-360/361**：`pnpm test tests/lib/accounting/budget.spec.ts tests/lib/shared/text-and-status.spec.ts` —— 还原前 2 failed；修复后全绿。
- 盲审复审后：`pnpm test` 2749/2749、`coverage-ratchet` PASS（218 文件）、`pnpm lint` 0 违规。
- `pnpm verify` ALL PASS。

## 独立只读盲审（362/366/368/369）

2026-11-24 由无本次历史上下文的只读子代理审 `c62865ac` / `19b95966` / `5d877e75` / `bbf4dc79`：**BLOCKING**（2 阻断 + 3 中低），处置：
1. **阻断 · 366** 未知 cwd 的 `problem` 只到 `listSessions` 类型层，picker 仍按 `.ok` 折成空列表 → `listSessions` 返回 `ok:false`，picker 新增 `sessionsProblem` 并优先渲染原因、抑制通用空态；补 sources + picker 两层用例。
2. **阻断 · 362** 授权提交 `c62865ac` 用 `headerWidth` 收窄，导致 host 台账夹具（2 列表头）红，且与台账面板判据分叉 → 恢复 `parseMotionLedger` 委托、tools 孪生只认两种权威 7 列表头；host 夹具改权威表头，并补「非权威表头 / 重复表头」用例。
3. **中 · 368** 双引号里 `\` 后只跳过 `"`，合法 Windows 路径被判未闭合 → 反斜杠后任意字符都跳过；补路径用例。
4. **中 · 368 消费面** 坏标量在 `/req`、bootstrap、delivery 退化成「未声明」而非报错 → 本轮不做响亮错误（改动跨三个命令面），按 fail-closed 保留默认并在「未覆盖轴」登记；身份面已整份作废。
5. **低 · 362** 重复表头被当数据行产出字面量 `slug` → `parseMotionLedger` 显式跳过重复表头；两侧同判据。
6. **369 PASS**；顺手把排序比较器抽成具名 `compareDoorPreset` 并补四组合用例（覆盖率）。


## 未覆盖轴

- [covered] 双层安装/逐层卸载的环栈语义 → 去向：[error-ring.spec.ts](../../tests/client/wiring/error-ring.spec.ts)
- [policy] 同一 target 上 vendor 侧的 `console.error` 包装不计入本包保证 → 去向：[error-ring.ts](../../packages/company-pack/src/client/wiring/error-ring.ts)
- [covered] 事件窗口的封顶/丢弃计数与 history 裁剪 → 去向：[company-stream.spec.ts](../../tests/client/data/company-stream.spec.ts)
- [covered] 未知 cwd / 子会话继承 / 尾斜杠归一 → 去向：[cultivation-context-data.spec.ts](../../tests/client/cultivation/cultivation-context-data.spec.ts)
- [covered] 签核工具 en/zh 回执与 ASCII 分隔符、诊断命令 en 描述/用法 → 去向：[signoff-language.spec.ts](../../tests/host/commands/signoff-language.spec.ts) 与 [command-language.spec.ts](../../tests/host/commands/command-language.spec.ts)
- [policy] 368 的非身份消费面（`/req`、bootstrap、delivery）对坏标量仍按「未声明」回退默认，不报响亮错误；身份面已拒绝。→ 去向：[yaml-scalar.ts](../../packages/company-pack/src/lib/docs/yaml-scalar.ts)
- [covered] 362 非权威/重复表头、366 picker 原因、368 转义反斜杠、369 排序四组合 → 去向：[catalog.spec.ts](../../tests/host/ledger/catalog.spec.ts) / [cultivation-context-picker.spec.ts](../../tests/client/cultivation/cultivation-context-picker.spec.ts) / [yaml-scalar.spec.ts](../../tests/lib/docs/yaml-scalar.spec.ts) / [doors.spec.ts](../../tests/lib/presence/doors.spec.ts)
- [policy] 浏览器侧没有 realpath，`/var` 与 `/private/var` 这类 symlink 别名仍可能漏配（host 侧 canonical 化不适用于 client）→ 去向：[cultivation-context-data.ts](../../packages/company-pack/src/client/cultivation/cultivation-context-data.ts)
