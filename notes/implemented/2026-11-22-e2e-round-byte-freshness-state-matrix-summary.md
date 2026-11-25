状态：implemented（2026-11-22）｜上游 = [BUG-293](../../_backlog/_archive/fixed_bugs/BUG-293-command-scope-hint-slot-crash.md)、[BUG-294](../../_backlog/_archive/fixed_bugs/BUG-294-cultivation-no-pending-lies-about-empty-workspace.md)、[BUG-295](../../_backlog/_archive/fixed_bugs/BUG-295-attention-item-unbounded-approval-reason.md)、[BUG-296](../../_backlog/_archive/fixed_bugs/BUG-296-real-page-lanes-stale-client-bundle.md)

# E2E 设计轮的四张卡：字节新鲜度 / 状态矩阵 / 摘要边界

## 决定

这一轮的四张卡不是四个补丁，是**三种「判据没闭合」**，各落一条可复用的机制：

1. **A 字节新鲜度（296 → 293）**：真页面车道的「绿」必须证明它跑的是**当前源码**构建出的字节。
   - `tools/lib/core/client-bundle.mjs`：按「client + 它 import 的 lib + 构建配置 + package.json」的
     **目录级**输入集算 sha256（新增文件自动纳入，不手写清单）；产物缺失 / 无指纹 / 指纹不一致
     三种 problem 各自点名，message 带先构建的命令。
   - `tools/dev/build-client.mjs`：`tsc -b + tsdown` 后写构建指纹文件（`lib/` 下，gitignored）；构建失败不写指纹 ⇒ 旧产物继续被判过期，不假装成功。
   - 三条真页面车道（`ui-scene` / `client-load` / `client-error-chain`）启动前比对，不一致 `exit 2`。
2. **B 状态矩阵（294）**：「需要我处理」的空态从「两态」扩成**四格**——
   `records === null` 加载 ／ `recordsProblem != null` 不可达 ／ `records.length === 0` 目录空 ／
   有记录但 `needsDecision` 空（新文案 `inboxNoPending`，zh/en 同批）。每格一条文案、一条断言。
3. **C 摘要边界（295）**：外部长文本（模型写的审批理由可到 KB 级）不得直接进列表行。
   `attentionSummary`（空白压平 + 160 字钳制）是**唯一实现**；活体登记与历史重建共用它
   （去重键依赖 `what`，两处截断不同源就会重复），全文降为 `detail` 供 `title`/详情面。

## 输掉的方案

- **「记得重建就行」**：296 的现场就是所有人都以为在跑新字节。不设机械判据，下次还会假绿。
- **车道内无条件自动构建**：把成本塞进每条车道，且无法防「构建失败但旧产物在」——失败仍会被当成绿。
- **在组件里给 `list` 加 `?.` 吞掉缺失**：会让提示永久静默，等于把 bug 修成哑巴（293）。
- **把待办理由截断就算完**：活体与历史各自截断会让同一条审批在 `mergeAttention` 里变两条；必须同源。
- **只给 `what` 加 tooltip、不钳制**：列表高度仍随模型输出膨胀，面板「一屏看清」的用途仍然失守。

## 状态事实与载体

| 事实 | 唯一入口 | 读载体 | 写载体 |
|---|---|---|---|
| client 产物新鲜度 | `tools/lib/core/client-bundle.mjs` | 三条真页面车道启动处 | 构建指纹文件（`lib/` 下，gitignored；构建脚本写） |
| 构建 + 写指纹 | `tools/dev/build-client.mjs` | 车道报错时点名它 | tsc/tsdown 产物 |
| 培养页空态四格 | `packages/company-pack/src/client/cultivation/CultivationInbox.tsx` + `cultivation-actions.ts` | 培养面板 | `records` / `recordsProblem` / `needsDecision` |
| 待办摘要钳制 | `packages/company-pack/src/lib/presence/attention.ts`（`attentionSummary`） | 活体登记 + 历史重建 + 列表行 | 外部 `reason`/question/消息文本 |

## 验证（真跑过）

- **296 反证**（同一条命令）：改一行 client 源码不重建 → `node checks/lanes/ui-scene.entry.mjs --isolated`
  **EXIT=2**：`pack client 产物过期（指纹 56a7d880490e ≠ 源码 1ef3c34efd88）——…先构建：node tools/dev/build-client.mjs`；
  `client-load`、`client-error-chain` 同条件同样 EXIT=2；`node tools/dev/build-client.mjs` 后同命令 **ALL PASS**。
- **293**：spec 渲染 inject 真实产物（恢复 `list: undefined as never` → 1 failed / 3 passed；还原 4/4）；
  真页面 `ui-scene --isolated` 修前 EXIT=1（`slot entry crashed … reading 'subscribe'`）、修后 ALL PASS 且
  `consoleProblems` 空；隔离实例空白会话出现提示文本、发首条消息后 0 次。
- **294**：真页面（隔离 workspace 放一条 `status: adopted`、零待办）渲染「没有需要你处理的记录（共 1 条，已处理的在下面）。」
  而同屏「已采纳」仍在——不再自相矛盾；spec 两态互斥 + en 单复数。
- **295**：1 KB `reason` 的 fixture 断言 `what ≤ ATTENTION_SUMMARY_MAX`、空白压平、活体+历史同源去重后 1 条、
  `detail` 保留全文。
- 收尾：`test` 2456、`verify` ALL PASS、`typecheck` 0、`lint` 0、`dup` 0、`coverage-ratchet` PASS（208 文件）；
  `ui-scene --isolated --expected` ALL PASS（金样未变）。

## 未覆盖轴

- [environment-gap] 造「挂起审批」仍要 `DSH_PERMISSION_MODE=workspace-write`（本机 `sandbox-exec` 被禁，默认 `never` 自动拒）→ `run/env.sh`
- [policy] client 指纹的输入集是目录级（client + lib + 构建配置）；若将来 client 引入这两目录之外的源，需扩清单 → `tools/lib/core/client-bundle.mjs`
- [covered] 四格空态与摘要边界 → `tests/client/cultivation/cultivation-board.spec.ts`
- [covered] 新鲜度三态（缺失/无指纹/过期）→ `tests/tools/client-bundle.spec.ts`
