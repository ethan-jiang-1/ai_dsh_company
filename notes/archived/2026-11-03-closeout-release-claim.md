# 2026-11-03 · 收尾完成定义：发布类声明必须贴 release --check 原始行

状态：implemented（2026-11-03；七维复评 D3/D4 防复发）

> 上游 = 2026-11-03 七维复评：0.8.2 A- 收口 Note 声称 `release --check # READY 0.8.2`，实际
> `_dist/release-manifest.json` 是 `dirty:true` + `release-smoke:fail` + gitSha 落后；机器没绿，Note 先绿。

## 决定

- `close-out-definition` skill 的「证据四链」加一条：**发布类声明（READY/已发布）必须贴
  `node tools/release.mjs --check` 的原始 READY 行 + commit SHA；没有输出行的 READY 不算证据**。
- 完成判据加同款 checkbox：没有就标「未发布/未执行」。
- 不在 `verify` 里做“Note 文本必须含 READY”的机械门：Note 是散文，提取会误伤/造假；先把规则
  放进 agent 必读的收尾 skill，等复发再按 P2 判据考虑门禁。

## 输掉的方案

- **加一个“Note 必须贴 release 输出”的 grep 门禁。** 格式不可靠（多种写法、历史 Note），且能贴假输出；
  机械门只该判可判的东西。
- **只改 0.8.2 Note。** 那一篇已加 banner；规则不写进收尾 skill，下一次还会重犯。

## 验证

- 规则落点 = [close-out-definition SKILL](../../.agents/skills/close-out-definition/SKILL.md)（步骤 2 + 完成判据）。
- 本仓当前的发布声明示例 = [0.8.5 Note](../implemented/2026-11-03-release-0.8.5.md)（贴了 `READY 0.8.5 @d2105027`
  与 7 项检查），可作正例。
- 这是散文规则，无新增可跑脚本；`pnpm verify` 只证链接/预算。
