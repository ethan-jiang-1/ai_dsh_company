# snapshots 预算门禁的覆盖修复（2026-10-16）：收敛切片两代命名都要计数

状态：implemented（授权 = 用户 2026-10-16「继续」（接我在上一轮回执里列的 BUG-019 候选 B 那条线）；事故 = 同轮实测发现；commit = 见本 Note 同轮）

## 决定

**收敛切片的「识别与计量」判据移入 `tools/lib/converge-rules.mjs` 的 `convergenceSlices({scenes, bytesOf})`，预算门禁改调它**，匹配按**代际**而不是前缀字面：

- 旧命名 `memory-convergence-<日期>[-N]`（至 2026-10-07 的 7 个切片）；
- 新命名 `convergence-<日期>`（`tools/converge.mjs` 现行 `evName`）。
- 门禁输出加**精确字节数**（`…2.6M/16M（精确 2688209B）`）——见「输掉的方案」。

## 事故（怎么发现的）

修 BUG-019 候选 B 前先查「收敛动作有没有导出会话日志这一步」，顺手撞见**守卫漏扫**：

- `snapshots-budget` 门禁存在的理由写在自己的注释里——「收敛切片是**唯一无界增长源**」；
- 但它的过滤器是 `scene.name.startsWith('memory-convergence-')`，而现行 `converge.mjs` 产出的目录叫 `convergence-<日期>`；
- 实测：`canonicalSnapshotScenes` 认到 **9** 个收敛切片，门禁只数了 **7** 个——`convergence-2026-10-12`（252K）与 `convergence-2026-10-16`（176K，本轮收敛产出）**完全在预算外**；
- 即：**门禁漏扫了它本该盯的那一类增长的 40% 实例**，而且漏得静默（`PASS 2.2M/16M` 看着很正常）。

## 输掉的方案

- **只改过滤器、不加精确字节输出**（首版）：败于**测试写不出判别式**——`mb()` 只保留一位小数，64KiB 与 128KiB 都渲染成 `0.1M`，拿文案断言会「因错的原因通过」（实测：变异回旧过滤器后断言仍绿）。加精确字节后同一变异立刻红（`65536B ≠ 131072B`）。
- **判据留在门禁里、测试直接 import 门禁**（第二版）：败于**分层守卫**——`tests/` 禁止导入 `checks/**`（起进程/真服务属认证档）。这不是可以绕的规矩，于是按正路把判据搬进 `tools/lib/`（收敛命名知识本来就属那里），门禁与测试都从 lib 取。
- **在测试里临时造一个真 `snapshots/` 树**（第三版设想）：败于污染仓库结构——判据已参数化，纯函数直接喂假场景即可，不必碰真树。
- **顺手把「收口同批导出会话日志」也做了**（BUG-019 候选 B 本体）：**本轮不做**——`snapshots` 总量已 57.1M/64M（头寸 ~7M），把会话日志放进证据目录是「新增体积」决策，且至少需要动 `converge.mjs` 的归档流程与 `session-log-export` 接线；按「结构性变更不在顺手修里夹带」的纪律留给专门一轮（BUG-019 卡里记录）。

## 后果

- 预算门禁恢复全覆盖：9/9 收敛切片、合计 2688209B（2.6M/16M）——**此前的 2.2M 是少算的**。
- 覆盖由 keyless 单测钉住（`tests/harness/snapshots-budget.spec.ts` 4 条）：两代都计入、只旧、只新、空面；**并已用变异证明判别力**（退回旧过滤器 ⇒ 精确字节断言红）。
- 命名知识单源：此后收敛切片再换代际，改一处（`convergenceSlices`）+ 一条断言即可。
- 遗留（记在 BUG-019）：`snapshots/archive/convergence-*` 仍不含会话日志，故归档件的 `present` 证据仍会随 `$DSH_HOME` 清理而丢失——**本轮的修复只保证「体积增长可见」，不保证「证据可审」**。

## 验证

- **红（先造，门禁自身）**：收敛子预算常量 `16 → 0.02` ⇒
  `FAIL snapshots-budget: memory-convergence-* 累计 2.2M > 0.02M——收敛切片是唯一无界源（压旧切片或外置）`（verify: 1 FAILURE）→ 还原 ⇒ 绿。
- **红（覆盖判别力，测试自身）**：把 `convergenceSlices` 退回旧前缀 `startsWith('memory-convergence-')` ⇒
  `× 两代切片都要计入（实际：…（精确 65536B））: expected … to contain '（精确 131072B）'`（1 failed | 1 passed）→ 还原 ⇒ 4 passed。
- **绿 + 真实覆盖自证**：`pnpm verify` → `PASS snapshots-budget 收敛切片 2.6M/16M（精确 2688209B）`；独立脚本列出的 9 个切片与门禁计数集合一致。
- **全量**：`pnpm test` → `62 passed (62)` / `570 passed (570)`（新增 spec 4 条 + converge-rules 既有）；`pnpm verify` ALL PASS。
- **负例留证行**已写进门禁注释头（`snapshots-budget.mjs`）。
