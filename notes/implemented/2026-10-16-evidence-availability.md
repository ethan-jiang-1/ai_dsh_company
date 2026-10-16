# 证据可得性声明（2026-10-16）：`final-not-presented` 不再把「证据不可考」报成「声明缺失」

状态：implemented（授权 = 用户 2026-10-16「_backlog/bugs/BUG-019… 不能处理了吗?」；缺陷卡 = [BUG-019](../../_backlog/_archive/fixed_bugs/BUG-019-final-present-evidence-lost.md)（已迁 fixed_bugs）；commit = 见本 Note 同轮）

## 为什么这张卡原来「处理不了」，以及它其实能处理的那半

首版诊断说「会话日志被清理 ⇒ present 证据永久丢失 ⇒ 判据把证据不可考报成声明缺失」。深挖后那个诊断被推翻（**本案是真阳性**：收口会话 95 次调用一次没调 `present`），但盲区本身是真的：`final-not-presented` 的判法「盘上有成品 ∧ 审计源里没有对应 present 事件」**分不清**「真没声明」与「那段时间的日志不在审计源里」。

上一轮我判定「给不出合格门票」，理由是：给判据加「无证据即放行」的救济会**掩盖真违规**。那个理由成立，但它只否掉了一种修法（无条件豁免），没否掉这个：**让调用方显式声明证据的覆盖范围**——声明了才降档，不声明照旧判红。

## 决定

判据加一维输入 **`evidenceMissingBefore`**（CLI = `--evidence-from <YYYY-MM-DD>`）：

- **声明了** ⇒ 落在该日期之前的「成品在盘 ∧ 无 present 背书」从**违规降为观察项** `present-evidence-missing`（新码，住基座 `WARNING`），退出码面不再含它；
- **不声明** ⇒ 维持严格判红（**没证据 ≠ 没问题**）；
- **日期取不到**（slug 里认不出日期的件）⇒ 视为未覆盖、照旧判红（宁可判红，不静默放过）。

日期按两类真实形状取：活跃/归档的目录名前缀（`deliverables/<日期>-<slug>/` 与 `deliverables-archive/<日期>-<slug>/`）；取不到则回落 slug 内嵌的 `<YYYY>-<MM>`。

## 输掉的方案

- **无条件把「无 present 背书」降为观察档**：败于掩盖真违规——本案就是真阳性（会话跳过 present），降档会把纪律缺口洗成「证据问题」。
- **判据自己去猜证据是否残缺**（例如「该动议日期早于审计源最早日志就降档」）：败于可被无关事实满足——「日志是别的会话的、恰好更早」会让真违规静默降档；覆盖面是**调用方才知道**的事实，该由调用方声明。
- **只加 CLI 旗标、不在 lib 里做**：败于判据单一来源——降档语义属判据，audit 脚本只做 IO；且住脚本里就测不到（`checks/**` 不许被 `tests/` 导入）。
- **把降档做成默认**（不声明也降）：败于与上一条同理——「没声明覆盖面」是常态，默认降档等于事实上取消这条违规。
- **给认不出日期的件也降档**：败于静默放过——没有日期就没有「在声明期之前」这个前提，只能按严格档走。

## 后果

- **盲区可表达了**：真遇到「那段时间的日志确实没有」时，审计可以如实报「证据不可考」而不是断言「没有声明」；`deliverables-check --evidence-from` 是它的入口。
- **严格档没被削弱**：不声明时的行为与改前逐字相同（原 3 条正向用例全绿即为证）；两条守卫钉住「present 在场的件不受影响」「声明期之后的件照旧判红」。
- **射程如实记在测试里**：认不出日期的 slug（如 `pilot`）吃不到这条声明——这是已知边界，写进了 spec 的注释（宁可判红，不静默放过）。
- 未做：让判据自动从 `snapshots/archive/<slug>/sessions/` 读归档日志（那是「扩大证据源」的另一条线，与「声明可得性」正交，本轮不动）。

## 验证

- **先红后绿**：4 条新断言先跑 ⇒ 降档那条红（`expected [ 'final-not-presented' ] to deeply equal []`）⇒ 实现 ⇒ `deliverables-audit.spec` 37 → 38 用例（含两条守卫）；负例留证行已进 spec（去掉降档分支 ⇒ 该条红；还原 ⇒ 绿）。
- **真入口两方向（造件 + 空日志源，隔离单一违规）**：
  - 未声明 ⇒ `违规 1 条：final-not-presented | deliverables/2026-09-22-probe/final.md`，**exit 1**；
  - `--evidence-from 2026-10-01` ⇒ `观察项 1 条：present-evidence-missing … ⇒ **证据不可考，不判红**`，**违规 0 条 ALL PASS，exit 0**。
- **严格档未被扰动**：真盘全盘 `deliverables-check`（不带旗标）依旧 0 违规；`all-in-ai-2026` 那条红早已由真实收口消掉（见 [closeout-quality-check](./2026-10-16-closeout-quality-check.md)）。
- **流程处置**：BUG-019 迁 `_archive/fixed_bugs`（status 已修 + 修复说明 + 首版诊断被推翻的留痕）；`guard-red-record` 先点红（卡未迁）→ 迁移后复绿；bugs/README、fixed_bugs/README 流水、_archive/README 索引、两处失效内链（`closeout-requires-present` 与 settled 卡的 3 处）同步。
- **全量**：`pnpm test` → `62 passed (62)` / **`581 passed (581)`**；`pnpm verify` ALL PASS。
