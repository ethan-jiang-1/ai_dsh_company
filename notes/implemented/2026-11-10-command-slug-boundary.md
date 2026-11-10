# 2026-11-10 · 命令 slug 的目录边界：`/req check` / `/prd check` 只认单段 deliverables 目录名

状态：implemented（2026-11-10 交付；上游 = [BUG-057](../../_backlog/_archive/fixed_bugs/BUG-057-command-slug-path-traversal.md)）
> 同机制的上游决定：[需求命令](../../_backlog/_archive/settled_issues/2026-11-07-requirements-command.md)（操作员命令、命令层不写盘）、
> [BUG-058](../../_backlog/bugs/BUG-058-command-datablocked-reason.md)（同一命令面的诊断缺口；本 Note 不覆盖）。

## 问题

`/req check <slug>` 与 `/prd check <slug>` 把操作员输入直接
`join(workspace, '.dsh-company/deliverables', slug, 'drafts')`。`path.join` 规范化 `..`，
于是 `../zz-outside` 能读到 deliverables 根之外的 `drafts/` 与 `meta.md`：

- `/req check ../zz-outside` → **success** 回执（真读到了根外的需求文档）。
- `/prd check ../zz-outside` → 内容判据错误（`opportunities[0].segment 缺失` 等），不是 `缺 MRD/PRD`。

只读、本地操作员触发，所以不是 P1；但命令契约写的是「deliverables 目录名」，执行面没有边界。
两条 handler 是同一形状的两份拷贝，属于「操作员输入 → 文件路径，没有边界校验」这一失败类。

## 决定

1. **共享一个 host-only 解析器**：`packages/company-pack/src/host/commands/deliverable-path.ts`
   的 `resolveDeliverablePath(workspace, slug)`：
   - slug 必须是 `^[A-Za-z0-9][A-Za-z0-9._-]*$`，且不是 `.` / `..`；
   - 解析后再用 `relative(deliverablesRoot, dir)` 做 defense in depth：`''` / `..` 开头 / 绝对路径都拒绝；
   - 失败返回可直接回给操作员的 `text`（`非法 deliverables 目录名「…」…`）。
2. **两条命令只调这一个函数**：`req-command.ts` / `prd-command.ts` 不再各自 `join`；合法 slug 的
   `root`/`dir` 与旧行为逐字一致。
3. **helper 住 host，不住 `src/lib`**：`src/lib` 被 host 与 client 两面共同编译，client 面没有
   `types: ["node"]`；第一次放 `src/lib` 时 `tsc -b` 直接 `TS2591 Cannot find name 'node:path'`。
   这不是风格选择，是双编译面的硬约束。

## 输掉的方案

- **只改 `parseReqCheck`/`parsePrdCheck` 的 token 校验**：解析器仍要返回 slug；校验放在解析里会让
  `parse*` 的既有 spec（形状解析）与目录解析耦合，且 `/req`/`/prd` 仍各一份。共享 `resolve*` 更窄。
- **只做 `basename(slug) === slug`**：`basename('..') === '..'`，还要额外判 `.`/`..`；不如单正则 + 相对路径双保险。
- **把 helper 放 `src/lib`**：client 面 TS2591（见上），已实测失败，不选。
- **在命令层直接 `realpath` 后比较**：会要求目标目录存在，改变「缺文档 → 点名路径」的既有回执；
  当前用纯字符串/`relative` 边界，不碰文件系统。
- **顺手修 BUG-058 的 dataBlocked 文案**：不同根因（启动态/诊断），用户裁断「058 留决策」；本 Note 不夹带。

## 后果

- 越界 slug 现在返回 `非法 deliverables 目录名「…」：只允许单段目录名…`；合法 slug 的正常回执不变。
- `/deliverables audit <path>` 仍按 path 语义工作（它本来就接受路径），不在本修复面。
- helper 是 host-only；client 面不会因 `node:path` 再红。

## 验证

- 红：先给两条命令 spec 加 `../zz-outside` / `.` / `..` / `a/b` 用例（fixture 在
  `.dsh-company/zz-outside/drafts`，checker 注入 spy）——修前 **2 failed**，实际读到根外并调用了 checker。
- 绿：加 `resolveDeliverablePath` 后 `pnpm vitest run tests/host/commands/req-command.spec.ts
  tests/host/commands/prd-command.spec.ts` = **20 passed**；`resolveDeliverablePath` 的越界分支
  在两个 spec 中各被四条 slug 覆盖。
- 真入口：重建 pack（`tsc -b` + `tsdown`）并 `plugin add link:` 到 dev profile 后，
  `/req check ../zz-outside` → 非法目录名错误；`..%2Fzz-outside` / `.` / `..` 同样拒绝；
  `/req check 2026-11-10-probe-cmd-business-software` 仍 success（层 MRD/StRS/PRD、动议类型 business-software）。
- 门禁：`pnpm verify` ALL PASS；`pnpm test` 173 files / 1440 tests（修复前）；`pnpm typecheck` 绿。
  修复后的全量以收尾提交为准。

## 未验 / 未覆盖

- BUG-058 的 dataBlocked 原因/回执（用户裁断留决策）；`/deliverables audit` 的 path 语义；
  Windows 分隔符下的真实入口（逻辑用 `node:path`，单测在 macOS；`relative` 分支与平台无关）。
