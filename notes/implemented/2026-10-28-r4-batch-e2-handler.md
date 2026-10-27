---
状态：implemented（2026-10-28，第四轮批 E2：command handler 首刀）
---

# 批 E2：把 cultivation 命令 handler 的两大分支拆成命名函数

> 上游 = [第四轮六维打扫卡](../../_backlog/_archive/settled_issues/2026-10-28-repo-hygiene-round4.md)；审计 = [第四轮报告（R4-08）](../../_backlog/_archive/research/repo-hygiene/2026-10-28-six-dimension-audit-round4.md)。

## 决定

1. `cultivationCommandHandler` 从“338 行、8 个子命令全在一个闭包”改成**分派壳**：
   - `commandCorrectOrSuggest`（correct / suggest，含 `--context` 解码与服务端读背景）；
   - `commandRevoke`（revoke，含 pending journal / 回滚 / 删除方法）；
   - 其余 adopt / reject / verify / archive / purge / check 仍内联，下一刀继续。
2. 新增 `CultivationCommandContext`（face/root/recordsDir/config/storage/ctx）与
   `CultivationCommandResult`；子命令只依赖这个上下文，不再从外层闭包捕获 7 个变量。
3. handler 现在约 206 行；两个最大分支各自 60/90 行，失败时可按函数名定位。

## 输掉的方案

- **一次把 8 个子命令全拆**：拒绝。当前一轮改动面过大，先拆最大且行为最独立的两支；其余分支继续用现有测试兜。
- **把 handler 改成 map of handlers 一次性替换**：拒绝。dispatch 表会掩盖 `sub` 的缺省错误文案；先用显式 if 分派，等 8 支都拆完再收表。

## 后果

- `cultivationCommandHandler` 338 → **206 行**；correct/suggest/revoke 的行为与错误文案逐字不变。
- 外层 handler 只保留 face/dataBlocked/scope/splitBody/tokens 的公共前置与分派；子命令不再重复这些前置。
- 未动：adopt/reject/verify/archive/purge/check 六支仍内联；`CultivationBoard` 483 行、host `apply` 326 行、client `apply` 201 行仍待拆。

## 验证

- `pnpm test tests/company/cultivation.spec.ts` → **40 tests passed**（命令/守卫/revoke 回滚覆盖）。
- `pnpm test` → **110 files / 974 tests**；`pnpm verify` → ALL PASS；`pnpm typecheck` → exit 0。
- `git grep -n "function cultivationCommandHandler"`：338 → 206 行（按下一函数行号差计）。

## 未验 / 下一步

- 剩余六支未拆；E3 继续拆 adopt/reject/verify/archive/purge/check，或转 `CultivationBoard`。
- 未做真模型/真页面；本批只动 host 纯命令层，keyless 覆盖足够。
