# 2026-10-05 · RFC 生命周期的 TDD 红绿环（proposed → implemented）

状态：implemented（2026-10-05 用户令原话归纳：「从 proposed 推进到 implemented 一定要遵循类似 TDD 的手段——先考虑怎么测，实现后看测试满足了吗，反复做对；整个过程一定要证据，不要随性发挥，内化到流程里」。同 diff 落地 = 生命周期环 + 门禁底线 + 本 Note）

## 决定

RFC 条目的执行序列从「读 RFC → 呈批 → 实施 → 收尾」显式化为 **TDD 式红绿环**，每步带证据（循环形状对齐通用 TDD 教义：红先绿后、垂直切片、公共边界先行约定）：

1. 呈批含「怎么测」——检查面/seam/判据在 Plan Mode 呈批时先行约定，未约定不写测试；
2. 红 = 判据先行（机制面实现前先红；行为/UX 面场景先立；文档/流程面走查判据先立）；
3. 绿 = 最窄实施让红转绿，复跑同一检查见绿；
4. 不绿不收口：一个切片一个循环（一检查 → 一实现 → 复验），判据本身错了就改判据并明说——弱化断言凑绿不是修法；
5. 收尾 = 红/绿收据与实跑命令写进毕业 Note 验证节，才迁 `implemented/`。

**落点（一处事实一个家）**：

- 环的**序列合同**唯一家 = [notes/proposed/README.md](../proposed/README.md) 生命周期段（条目开工必读处——这是每个 RFC 实施者必然经过的位置，无需再向 AGENTS/dev-loop 复制指针）。
- 红/绿**判据**（什么算证据、分层证明边界、prove-it-red、防假绿）已有唯一家 = [docs/testing.md](../../docs/testing.md) §3——未改动、不复述。
- 执行链通用规则 = [dev-loop](../../docs/guides/dev-loop.md) §1（未改动）；Note 分类/生命周期/证据规则 = [notes/README](../README.md)（本 Note 落地同日由 D35 从 dev-loop §12 迁出为分类 owner——见 [notes-taxonomy-owner](./2026-10-05-notes-taxonomy-owner.md)；环的序列合同不受影响）。
- **机器底线** = `proposal-scheduled` 门禁扩展：RFC 必须带「## 验收」节（「怎么测」的载体；无验收节的 RFC 不能住 proposed/）。

## 输掉的方案

- **重门禁**（毕业 Note 必须含验证节文本 / RFC 验收节必须点名具体红检查名）：门禁查文本只挡缺席不挡空壳——写空节即过，仪式性合规；证据真实性本由 prove-it-red + 人审兜。且 implemented 存量 Note 节名不一（验证记录/验证与未覆盖面/…），回扫即假红。门禁只守结构底线「验收节在场」。
- **把环复述进 dev-loop §1**：§1 是通用执行链（含非 RFC 维护改动），环是它在 RFC 条目上的实例化；两处写 = 第二事实家必漂；且 dev-loop 391/395 行预算无空间。
- **在 testing.md 加生命周期节**：预算 75/75 满；且 testing.md 是「什么算证据」的家，不是「流程序列」的家——序列住 proposed/README。
- **不设任何门禁（纯合同）**：用户明令「不随性发挥」；本仓既定教义「规则不留空气——升格门禁 / Note / 显式作废三选一」，结构底线可机械查，查了。

## 验证记录

- 门禁反证三步（prove-it-red，红→还原→绿；2026-10-05 实跑）：
  - ① 红：fixture（`2099-01-01-gate-fixture-no-acceptance.md`，带批准标记、无验收节）进 proposed/ → `pnpm verify` 退出码 1，`FAIL proposal-scheduled: 这些 RFC 不合规：2099-01-01-gate-fixture-no-acceptance.md 缺「## 验收」节（验收 = RFC 三件之一，「怎么测」先行的载体——见 notes/proposed/README 生命周期段）`；
  - ② 还原：删 fixture；
  - ③ 绿：复跑 `pnpm verify` → `verify: ALL PASS`，其中 `PASS proposal-scheduled ×6（批准标记 + 验收节）`、`md-links ×899 / 201 files`、doc-budget 五文件全在界内（AGENTS 94/105、dev-loop 391/395、testing 75/75）。
- 既有六条 steerability RFC 全部自带「## 验收」节，且验收写法（红→绿先行、fixture 覆盖、走查记录进实施 Note）与本环同构——零回改。
- 本条自身按其面选证据：文档/流程面 → 走查判据 = 门禁反证三步 + verify 全绿（非机制面，无 keyless spec 对象）。
