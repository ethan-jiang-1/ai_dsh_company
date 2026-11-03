# 2026-11-03 · release-smoke 补卸载：remove 只摘插件、数据留下、可重装

状态：implemented（2026-11-03；用户授权「打扫卫生 + 持续改善」；D7 卸载轴）

> 上游 = [第五轮七维打扫卡](../../_backlog/_archive/settled_issues/2026-11-03-repo-hygiene-round5.md)
> 审计 = [第五轮七维审计](../../_backlog/_archive/research/repo-hygiene-round5/2026-11-03-seven-dimension-audit.md) R5-10

## 决定

`checks/smoke/release-smoke.mjs` 在首启/二启之后新增第 ⑦ 步：`plugin remove dsh-company-pack` →
断言 profile bundles 不再含包、安装副本已移除、公司状态（`.dsh-company/bundle.json` 字节 + `kb/company.md`）
保留 → 用同一 tarball 重装 → 断言 bundles 恢复且公司状态字节不变。

## 输掉的方案

- **另写 `uninstall-smoke.mjs`。** 要重复“干净 profile + 真 tarball + 首启”整段脚手架，第二套安装形状必与
  release-smoke 漂移；卸载本来就是安装生命周期的下一格，住同一个脚本里证据最省。
- **remove 后再 boot 一次。** 那会验 DSH 通用 web 组合能否空跑，不是本包的卸载承诺；本包的承诺是
  “摘插件、不删数据、可重装”，三条都能在不 boot 的情况下用盘上事实判定。真启动已在第 ⑥ 步验过。
- **只写进手册、不做冒烟。** 本轮审计实测：卸载承诺此前从未被任何脚本执行过；没有执行证据的承诺 =
  下一个 agent 的假绿。

## 验证（实跑）

```text
source run/env.sh
node checks/smoke/release-smoke.mjs --tarball _dist/dsh-company-pack-0.7.1.tgz \
  --expect-sha bd77facf6ea1b86fbccb348ac4fffe8f5e83ec4c2ef9891d80947284079cd2de
# ALL PASS（39 + 5 项；第 ⑦ 步原话）
#  PASS plugin remove 后 bundles 不再含 dsh-company-pack（bundles = @deepseek-ai/dsh-base, @deepseek-ai/dsh-web-app）
#  PASS 安装副本已移除（node_modules/dsh-company-pack 不在）
#  PASS 公司状态保留（bundle.json 字节不变 + kb/company.md 在场）
#  PASS 重装后 bundles 含 dsh-company-pack（bundles = @deepseek-ai/dsh-base, @deepseek-ai/dsh-web-app, dsh-company-pack）
#  PASS 重装后公司状态未变（不覆盖用户数据）
```

红证：未单独制造；第 ⑦ 步在未改实现前不存在（审计时 grep `release-smoke` 无 `remove`），
新增后第一次实跑即为上面的绿。若 remove 行为退化（例如 DSH 改为删数据），第 3 项会红。

## 后果与边界

- release-smoke 成本约 +5–10s；它仍是认证档（不进 `pnpm test`）。
- 不证明 Desktop 的 Remove 按钮（只证明 CLI `plugin remove`；应用内卸载按钮不在本轮范围）。
- 不证明卸载后不残留 `$DSH_HOME/company/` 治理面（本包刻意留下；手册已写清删除面）。
