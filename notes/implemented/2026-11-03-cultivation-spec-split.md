# 2026-11-03 · 929 行培养 spec 首刀：纯读模型与 host 行为分家

状态：implemented（2026-11-03；用户授权「打扫卫生 + 持续改善」；D2 R5-23）

> 上游 = [第五轮七维打扫卡](../../_backlog/issues/2026-11-03-repo-hygiene-round5.md)
> 审计 = [第五轮七维审计](../../_backlog/research/repo-hygiene-round5/2026-11-03-seven-dimension-audit.md) R5-23

## 决定

把原 `cultivation.spec.ts`（640 行，现已拆为 command/context/maintenance 三份）中**纯 `src/lib/cultivation.ts`** 的 7 个 describe（recordStamp/timeLabel、
journalTitle、inboxRows、record 写读往返、recordInbox、methodSkillText、feedbackItems）原样移到
`tests/company/cultivation-lib.spec.ts`；原文件保留 host 命令/存储/背景/CAS/revoke/archive/check 的 23 例。
断言零改动，只搬位置与 import。

## 输掉的方案

- **继续一个 929 行文件。** 失败只报一个文件名，读者要在大文件里找是哪一族；纯函数与真临时盘
  host 行为混住，跑快档也要加载 fs/命令注册。
- **按四个模块全拆。** 当前 helpers（`cultivationRegistrations`/`withCultivationWorkspace`/`invokeCultivation`）
  被 host 各族共用；一次拆四份会把 helper 复制四份或建第三份共享文件，churn 大于收益。首刀只切
  依赖最少、收益最直接的 lib 面。
- **把 lib 测试放进独立的层目录。** `tests/README.md` 的区按“面”（company/client/presets/harness）分，
  不按 layer 分；新增区会与现有导航冲突。先按文件分，区不动。

## 验证（实跑）

```text
npx vitest run tests/company/cultivation.spec.ts tests/company/cultivation-lib.spec.ts
# 2 files / 44 tests passed（lib 21 + host 23）
```

红证：未单独制造；两文件合计 44 例与原 44 例一致，搬运未增删断言。若 import 漏项，vitest 直接报
未定义标识符（本次首跑即通过）。

## 后果与边界

- host spec 仍有 641 行（`host/cultivation.ts` 本身 710 行）；下一步可按命令族（adopt/revoke/verify/archive）
  再拆，但 helpers 要先有共享家。
- 未改任何产品代码；`pnpm test` 的文件数 +1，用例数不变。
