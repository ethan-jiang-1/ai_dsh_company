# 2026-11-03 · D2：640 行 host spec 拆三族 + 导出面收窄 + isRecord 收家

状态：implemented（2026-11-03；A- D2 批次）

> 上游 = [第五轮七维打扫卡](../../_backlog/issues/2026-11-03-repo-hygiene-round5.md)
> 评分 GAP：D2 host spec 640 行；根入口 `export *` 17 符号无消费者；`tool-card` 第 4 份 `isRecord`。

## 决定

1. 把原 `cultivation.spec.ts`（640 行）按命令族拆为 `cultivation-command.spec.ts`（266 行，10 例）、
   `cultivation-context.spec.ts`（198 行，8 例）、`cultivation-maintenance.spec.ts`（133 行，5 例）；
   共享脚手架 = `tests/support/cultivation-harness.ts`（注册替身/临时盘/命令调用）。断言零改动。
2. 根入口删除 `export * from './lib/presence.ts'` / `'./lib/doors.ts'`；`pack-exports.spec` 钉住
   host 运行时导出集合 = `['apply','inject']`（loader 契约 + 防 barrel 再次漏出）。
3. `tool-card.parseArgsObject` 改用 `lib/guards.ts` 的 `isRecord`（删掉第 4 份内联实现）。

## 输掉的方案

- **保留 640 行一份。** 失败只报一个文件名；三族命令的 setup/断言混住。
- **每族复制 helper。** 三份注册替身/临时盘必然漂移；共享 support 模块是唯一家。
- **保留 `export *`。** 无仓内消费者，却把 `presence/doors` 内部读模型变成公开 API；loader 只需要
  `inject/apply`，收窄是长期正确的公开面。
- **在 tool-card 里再收一份 `isRecord`。** 已有 `guards.ts` 单一实现；重复是 R3-22 同类债。

## 验证（实跑）

```text
npx vitest run tests/company/cultivation-command.spec.ts \
  tests/company/cultivation-context.spec.ts tests/company/cultivation-maintenance.spec.ts
# 3 files / 23 tests passed（原 host 23 例）
npx vitest run tests/harness/repo/pack-exports.spec.ts
# 2 passed（host 导出集合 = apply/inject）
npx vitest run tests/client/ui/team-tool-card.spec.ts tests/client/ui/delegation-card.spec.ts
# 16 passed（isRecord 迁移未改行为）
pnpm test
# 134 files / 1073 tests（0 skipped）
```

红证：`pack-exports` 的集合断言在保留 `export *` 时会红（多出 presence/doors 符号）；
`team-tool-card` 的 5 例在 `isRecord` 未导入时会红（parse 落空、标题退回兜底）——本轮实际先红后绿。

## 后果与边界

- 公开 host 面只剩 loader 需要的 `inject/apply`；外部若曾从包根 import `presence/doors`，需改从
  `src/lib/*` 或自行复制——本包是插件不是库，这是有意的收窄。
- 未拆的 15 个 >100 行函数仍在（P3）；本批只收测试层次与公开面。
