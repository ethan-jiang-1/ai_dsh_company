# 2026-09-25 · 升 pin：dsh-v0.1.5-rc.2 → dsh-v0.1.7-rc.2

状态：proposed（材料已备于研究层；靶需从 rc.1 校正到 rc.2）

## 问题

本仓钉住 `vendor/dsh` = `dsh-v0.1.5-rc.2`（`fb2c4b9e698e30edb738bca4cf0618587db7d203`，submodule 干净、
`pnpm verify` 的 `vendor-pin` + `vendor-clean` 双门禁在案）。2026-09-25 只读核对：上游已发到
**`dsh-v0.1.7-rc.2`（`477b4f420553e8a52c2fbccc464d7561b239c443`，2026-09-24 21:39）**。

- 钉住版与 0.1.7 系列之间共 **7 个 tag**（rc.3 / 0.1.6-alpha.1–2 / 0.1.7-alpha.1–2 / 0.1.7-rc.1 / 0.1.7-rc.2）；
  `pin → rc.1` = 3304 commit（其中 **2211 non-merge**，与增量报告口径一致）。
- 既有材料 [upstream-delta](../research/2026-09-24-dsh-upstream-delta.md) +
  [pin-upgrade-and-harvest](../research/2026-09-24-pin-upgrade-and-harvest.md) 以 **rc.1** 收口，
  [ROADMAP.md](../../ROADMAP.md) 的 ⏸ 行也写 rc.1 ⇒ **靶落后一个 tag**。
- 研究树本地尚无 rc.2 对象（其 tag 只到 rc.1）。**2026-09-25 阶段 0 已实测核实**：`rc.1 → rc.2` =
  **346 commit / 3429 文件 / +136,313 −24,518**，且落在本仓依赖的面上（`user-questions` 含 timed waits and
  late replies、`approval` 说明本地化与 auto-review、`preset` 19、`schedule` 20 含禁用 shipped schedule、
  `projection`、`workspace-files` 链接解析）——**不是纯发布 bump**。GitHub API 早先显示的 317/317 只是那一个
  merge commit 自身的版本号改动，不代表区间。明细见 [upstream-delta §⑦](../research/2026-09-24-dsh-upstream-delta.md)。

## 方案

1. **阶段 0 · 靶校正【已取证，待收口】**：rc.2 已抓进 `vendor/dsh`（**https 官方 GitHub，7.7s；不动 origin、
   不动 vendor HEAD**；ssh:443 在本机 VPN 后不通）。`rc.1 → rc.2` 增量已核实并写进增量报告 §⑦；两份研究材料的
   靶已改 rc.2，ROADMAP 已按 rc.2 立项。**取源结论 = https**；submodule 的 origin 仍指本机研究树（未改）。
2. **阶段 1 · 影响面实测 + 升级七步**：**先换基座、构建、跑现有门禁**（`verify` / `test` / `preset-smoke` /
   `client-load` / `probe` / `release-smoke`）产**《实测影响面清单》**——逐条记：哪道门禁、红还是绿、归属
   原因（peer 名 / preset 声明形状 / 投影 API / 快照格式 / 构建配方）、适配动作。然后再照增量报告 §⑥ 逐项
   适配，不另发明：① `sync-dsh`（submodule 前移 + 簿记 + 兼容矩阵加列 + verify 双门禁重校）；② peerDependencies
   重写（`dsh-agent-presets` 在 0.1.7 不存在，拆为 `dsh-agent-preset` + `dsh-agent-preset-registry`；range 按新
   release 对齐——材料给的是 `^0.1.7-rc.1`，钉 rc.2 时以兼容门禁实测定）；③ preset 声明迁移（工程量主体；
   完成定义 = `preset-smoke` 真挂载）；④ client 数据层重写（`remote.agentTeams` → 投影；完成定义 = client-load +
   presence-e2e + 快照回归）；⑤ 快照回归策略（V3 照跑 + 新录 V4 + 单向门写进 Note）；⑥ 发布链全量（`release-smoke`
   穿新 peer 兼容门禁 + `deliverables-check` + `delegation-smoke`）；⑦ 拆分 = 升级单独立项，15 条收割项升级后独立进队列。
3. **阶段 2 · 收割项登记**（升级后）：从增量报告 §④ 的 15 条里逐条判"对本 pack 的用途 + 建议立项与否"，
   各给归宿（ROADMAP / 搁置池）。其中与**自治 seam** 相关的（job 完成唤醒 idle owner、workflow、
   `schedule` 现状）顺手核对，作为搁置池「自主节律」的复活判据输入——只登记证据，不因它改升级范围。

## 输掉的方案

- **停在 rc.1**：rc.2 紧随其后（仅发布工程 commit），单独钉 rc.1 一落地即落后；输给"钉最新 rc"。
- **钉研究树 HEAD 而非 tag**：vendor 铁律与 [release.md](../../docs/release.md) 要求钉 SHA/tag 并走发布门禁，
  HEAD 未过门禁；输给"钉 tag"。
- **把 15 条收割项塞进升级条目**：增量报告 §⑥⑦ 明说"不捆绑"（两天级工程会被拖成不可验收的大条目）；
  输给"升级单独立项、收割项后置"。
- **为"跑满 8 小时"自建调度循环**：搁置池已判缺上游 seam，且 D9/D13 禁自建调度器；输给"提 seam"。

## 验收

- 阶段 0：研究材料与 ROADMAP 的靶一致为 rc.2；`rc.1 → rc.2` 增量有本地证据——**已达成：结论 = 非纯发布，
  346 commit / 3429 文件，落在 user-questions·approval·preset·schedule·projection·workspace-files 六面
  （增量报告 §⑦）**。
- 阶段 1：**先产出《实测影响面清单》**（跑过哪些门禁、各自红／绿、红条的归属原因与适配动作、未覆盖的面），
  再逐项消红；`pnpm verify` 的 `vendor-pin` + `vendor-clean` 在 rc.2 上重校通过；`preset-smoke` 五角色真挂载；
  client-load + presence-e2e + 快照档绿；`release-smoke` 穿新兼容门禁；[AGENTS.md](../../AGENTS.md) 的
  vendor 簿记与兼容矩阵同步。
- 阶段 2：15 条收割项各有"立项／不立项 + 理由"与归宿。

## 风险

- 已列于增量报告 §⑤：peer 破面、preset 声明迁移工程量、V4 单向门；另有"`baseUrl` 解析环境"与
  "web-app 启动面兼容性"两项**需实测**。
- **阶段 0 推翻了"纯发布 bump"的预期**（rc.1→rc.2 = 346 commit，见 §⑦）⇒ 阶段 1 的《实测影响面清单》
  必须按这份增量逐面核对，不能只看 peer 破面那一项。
- 升级期间日用全局安装与本仓基线会分叉：按 [dev-loop §6](../../docs/guides/dev-loop.md) 的双 home 纪律跑，
  防"安静用错 home"。
- 取新 tag 的路径有一处现实坑：`vendor/dsh` 的 origin 指向本机研究树 `/Users/bowhead/deepseek-harness`，
  而 `.gitmodules` 写的是官方 GitHub ⇒ 阶段 0 先定取源，再动 submodule。
