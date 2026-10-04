# 2026-10-04 · 多用户 BDD 加工·第二批：H7 分歧保留 + C4 原子发布读侧 + C5 scope 警告（probe ×2 首跑全绿）

状态：implemented（第二批交付，2026-10-04）。批准 = 用户令「继续下一批」（承接
[multi-user-bdd-batch1 Note](./2026-10-04-multi-user-bdd-batch1.md) 的加工次序）。

## 交付

- **`scripts/dissent-preservation-probe.mjs`（H7）**：lead 倾向接单（客户要 8 折）vs 成员 fin
  （CFO 职能）独立评估——判据三件：成员评估有规矩依据（非迎合）、`journal/h7-dissent.md`
  三要素（决定 + 成员原话引用 + 显式「分歧」标注并排陈列）、收口陈述提及分歧。**首跑 4/4**。
  质量超出判据：fin 给出「我不在 $16,000 上签字」（org.md:64 折扣线 + κ 成本口径条件式），
  lead 落盘两边立场**并排表格**，并把分歧**吸收进最终决定**（8 折不直落 → 先回价 9 折 $18,000
  + 3 年承诺）——「不抹平」不是原样照抄，是「吸收程序、保留分歧」。
- **`scripts/team-atomicity-probe.mjs`（C4+C5）**：双成员各 3 轮并发追加同一文件 + 每轮读回 +
  两个 writeScopes 重叠的 in_progress 任务。**首跑 3/3**：
  - C4a：共享文件 6 行俱全且**真交错**（w2 round 3 在 w1 round 3 之前——两成员真并发），
    无撕行/丢行/异物（原子发布读侧不变量成立）；
  - C4b：6 条读回观察回报；
  - C5a：`write scopes overlap with task-2` 警告**逐字在场**（advisory 语义 =
    两个不同 in_progress 任务的 scope 前缀重叠，task-view.ts 源码语义与观察一致）。

## 剩余（次序不变，接 batch1 Note）

- **第三批**：C6（interrupt 竞态）/ C7（cold-resume 邮箱恢复）——机制最重、prompt 最难驱动。
- **挂起**：C8（dsh-atomic-write 产品决策）、H6（成员动态是否进注意力中心——设计裁决）、
  H8（多人开门常态化）。

## 输掉的方案

- **C5 用「同任务双成员」触发警告**：源码核对（task-view.ts）——警告是**任务间** scope 比對，
  同任务双成员不触发；判据设计随真实语义改为双任务重叠（写判据前先读机制，避免造出恒红/
  恒绿的假探针）。
- **H7 判成员"必须反对"**：反对与否是成员的专业自由；判据钉的是**规矩依据在场**（J1）与
  **分歧若出现则被保留**（J2/J3）——本跑成员依 KB 事实自然反对（8 折破线），但探针不依赖它。

## 验证（实际跑过的）

- `dissent-preservation-probe` 首跑 exit 0，4/4；`team-atomicity-probe` 首跑 exit 0，3/3。
- `pnpm verify` ALL PASS（script-triggers ×30）；`pnpm test` 30 文件 283 用例全绿。
- 预算：两跑合计 ≈$4–6（帽 $8），各一次过。
