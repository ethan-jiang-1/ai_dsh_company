# 2026-10-06 · 测试资产收割机制：运行→收割→钉住

状态：implemented（两条目全部毕业：A `976e792` / B `ba2b3d7`；授权链 = 用户采纳「收割三问 + 资产层投资」框架并令设 ongoing goal；前包 = [observation-closeout](2026-10-06-observation-closeout.md)，三债全清后本包立「让资产增长机制化」）

## 已交付（两条目）

- **A 收割三问进现有收尾面**：dev-loop §12 收尾清单首条（①抓异常→BUG 卡+红绿 ②值得钉吗→录制场景/keyless 断言/视觉夹具 ③运行态事实→调试阶梯/Note；三问全「无」如实记）+ budget-and-ops demo runbook 收尾行 + dev-loop §0.5 goal 节奏补「简报带资产增量一行」。零新工具（D13）。
- **B 录当前组合基线场景 r6-baseline**：标准五角色动议（任务形状同 r2-motion）在当前组合（HEAD `976e792`）下真模型 60 分钟重录——归一化 fixtures（lead 1010 行 + 4 child）+ sidecar ×10 + workspace.expected 整盘拷贝（全角色 drafts + 四角色 journal，无 final：mid-flight 基线）+ snapshot.yml 全量元数据声明（来源性质=录制整盘拷贝、代码锚、cwd 如实）+ 原始录制 tar.zst 压缩归档。

## 输掉的方案（备选必载，留尸）

- 收割调度器/清单工具——磨清单已退役教训，中心队列必腐；三问进现有收尾面 = 零新载体。
- 为覆盖率铺测试——testing.md 否决过：测试变多 ≠ 绿有意义。
- 录多用户复杂大场景——r5b 已覆盖多用户形态；标准动议的当前基线才是缺口。
- 运行态事实直接钉断言——headless 收尾删目录等属运行态生命周期，keyless 面测不了。
- 等用户下次手动跑再录——e2e/录制 lane agent 可自主驱动真模型，等待是不必要延迟。
- **原始 raw 直存（实施中被证伪）**：17M raw 把 snapshots 顶到 66M 超预算——门禁自己的建议（tar.zst）是对的：17M→2.4M，provenance 保住、预算回落 50.9M/64M。
- **wall 3600s 换完整终局（实施中被证伪）**：第二次录制给足 60 分钟，lead 仍 0 turn/end、无 final——不是时长问题，是当前组合下 lead 编排轮长开（运行态事实，见下）。

## 验证记录（红绿收据 + 走查 + 收割三问 dogfood）

- **A**：走查三处在场（§12 首条 / runbook 收尾行 / §0.5 资产增量句）+ md-links 绿 + dev-loop 376/395 不破 + vitest 345 项。
- **B**：录制收据 = `--record --keep --wall 3600` 真模型完成（1 lead + 4 child，任务源 1 段）；回放收据 = presence 在场板同形 **PASS**（5 行同形）+ member/task 事件集合等价**红**（queued 41→35，尾部投递时序差被 wall 切尾放大；r2 27→25 同类记录项）→ 按判据档位政策如实声明**不声明可运行 replay**（r4 先例）；验收 = snapshots/README 索引行 + 资格行覆盖 + `pnpm orient --scenario replay/r6-baseline` 视图完整（代码锚/来源性质/引用全解析）+ snapshots-budget 50.9M/64M + verify ALL PASS + vitest 345 项。
- **收割三问 dogfood（本包即首个执行样本）**：①抓异常 = 三次都被既有机制当场抓住（wall 切尾 → 门禁预算红 → md-newline 红）②值得钉 = r6 场景本身 ③运行态事实 = **lead 编排轮长开**（60 分钟真跑 lead 0 turn/end，r2/r3 时代 turn 会正常结束——当前组合下 replay-smoke 的 turnEnds 完成探测在录制档不触发，wall 是唯一录制停止条件）、**wall 须远大于动议时长**（20 分钟只到全 drafts）、**queued 尾部时序差会放大**（切尾越多红得越狠）——三条入场景 README。
- 过程事故（如实）：perl 一行修尾换行把 11 个文件弄坏（削了没补），node 归一化修复——教训 = 对捕获产物做机械改写，用能验证的方式（gate 红→修→绿），不用一行流。

## 边界与未做

- r6 为 mid-flight 基线（无 final.md）：消费面 = 审计（deliverables-check --only）+ 与 r2 的组合演进对照 + orient 视图；不做回放判据。
- fixtures 15.8M 占 snapshots 预算大头（50.9/64M）——场景再增长时优先考虑 sidecar/raw 外置冷存（保 journal-audit 路径契约）。
- 20 个重探针仍按头注触发（本包非目标不变）。
