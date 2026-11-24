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
   台账 slug 集合复用 `parseMotionLedger` 的行有效性（列数/空行/表头）；`yamlScalarOrProblem` 对未闭合/带尾巴引号报
   `problem`，宽松版返回空串、身份文件整份作废；`DoorRow.preset` 用 `string | null`，`workspace_doors` 省略未设置键。

## 输掉的方案

- **在 target 上放 `global['__DSH_ERROR_CAPTURE_ORIGINAL__']` 字符串键**：会与页面其它脚本争用全局命名空间；
  `WeakMap` 随 target 生命周期回收，且不暴露可被误改的全局引用。
- **每次安装先恢复再重装**：卸载语义变成「隐式重置」，中间那一层安装失去可逆性；环栈保留逐层可逆。

## 状态事实与载体

| 事实 | 唯一入口 | 读载体 / 写载体 |
|---|---|---|
| 错误捕获安装/卸载 | [`installErrorCapture`](../../packages/company-pack/src/client/wiring/error-ring.ts) | `WeakMap` 单例状态；`tests/client/wiring/error-ring.spec.ts` 钉双层语义 |
| follow 事件窗口 | [`applyStreamFrame`](../../packages/company-pack/src/client/data/company-stream.ts) | `useCompanyData` 消费；`tests/client/data/company-stream.spec.ts` |
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
- `pnpm verify` ALL PASS。

## 未覆盖轴

- [covered] 双层安装/逐层卸载的环栈语义 → 去向：[error-ring.spec.ts](../../tests/client/wiring/error-ring.spec.ts)
- [policy] 同一 target 上 vendor 侧的 `console.error` 包装不计入本包保证 → 去向：[error-ring.ts](../../packages/company-pack/src/client/wiring/error-ring.ts)
- [covered] 事件窗口的封顶/丢弃计数与 history 裁剪 → 去向：[company-stream.spec.ts](../../tests/client/data/company-stream.spec.ts)
- [covered] 未知 cwd / 子会话继承 / 尾斜杠归一 → 去向：[cultivation-context-data.spec.ts](../../tests/client/cultivation/cultivation-context-data.spec.ts)
- [covered] 签核工具 en/zh 回执与 ASCII 分隔符、诊断命令 en 描述/用法 → 去向：[signoff-language.spec.ts](../../tests/host/commands/signoff-language.spec.ts) 与 [command-language.spec.ts](../../tests/host/commands/command-language.spec.ts)
- [policy] 浏览器侧没有 realpath，`/var` 与 `/private/var` 这类 symlink 别名仍可能漏配（host 侧 canonical 化不适用于 client）→ 去向：[cultivation-context-data.ts](../../packages/company-pack/src/client/cultivation/cultivation-context-data.ts)
