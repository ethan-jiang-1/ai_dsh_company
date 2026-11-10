# 2026-11-03 · 发布 readiness 指路：命令表加 release --check，两个 readiness owner 划界

状态：implemented（2026-11-03；用户授权「打扫卫生 + 持续改善」；D4/D7 R5-03 的可做部分）

> 上游 = [第五轮七维打扫卡](../../../_backlog/_archive/settled_issues/2026-11-03-repo-hygiene-round5.md)
> 审计 = [第五轮七维审计](../../../_backlog/_archive/research/repo-hygiene-round5/2026-11-03-seven-dimension-audit.md) R5-03

## 决定

1. 根 `AGENTS.md` 命令表新增 `pnpm release --check`（注释：dist 与源码指纹；verify 绿 ≠ 可发布）。
2. `docs/contracts/release.md` 的“发布前必跑”清单补 `pnpm release --check`，并明确 `verify` 绿不等于可发布。
3. `dist-freshness` 的 PASS 行补“可发布性看 `release --check`”；`release-ready` 的 PASS 行补
   “源码指纹看 `release --check`”。两个绿不再看起来像同一个 readiness。

## 输掉的方案

- **让 `pnpm verify` 在 `_dist` 过期时红。** dev 常态就是“源码前进、`_dist` 尚未重打”；把 verify 变红会
  逼每次改代码都先重打发布物，层次放错。
- **现在重打 `_dist`。** 那是发布动作（改内容必 bump / 需要版本决策），不是本轮卫生项；本轮只把
  “谁说了算”指清楚。
- **只改文档不改门禁输出。** 读 verify 输出的人比读 release.md 的人多；PASS 行必须自己带边界。

## 验证（实跑）

```text
pnpm verify
# ALL PASS（doc-budget AGENTS.md 84/84；dist-freshness/release-ready PASS 行带 release --check 边界）
pnpm release --check
# exit 1（预期：pack 源码面已变但 _dist 没重打）——本轮不重打，只把这条命令放进入口链
```

红证：未单独制造；门禁消息是输出文案，不改判定。`AGENTS.md` 84/84 是 doc-budget 上限，已实测 PASS；
再加行须先搬/压（门禁会红）。

## 后果与边界

- 新 agent 在首屏就能看到 `release --check`，不会把 `verify` 绿当成“可以发”。
- `_dist` 仍过期、`market-index` 仍声明未发布的 0.7.1；那是发布决策（需用户/版本 bump），不在本轮。
