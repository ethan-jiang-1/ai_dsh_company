# 2026-10-03 · `_backlog` 章制回借（D33）

状态：implemented（2026-10-03。起因 = 用户令「治理规矩要从 `/Users/bowhead/ai_dsh_loop_advisor/_backlog`
学习来整理我们的 `_backlog/`，尽量借鉴，整个结构多少都是一样的」；两项制度级拍板 = 全日期卡名、
两桶解禁，均为用户当轮选择）。上承 [D31 立层](2026-09-28-backlog-deliberation-space.md)。

## 问题

D31 立层时借的是 ai_deerflow_deep_research_v2 的当年形状；该制度随后经 ai_dsh_architect 传入
ai_dsh_loop_advisor，advisor 又于 2026-10-03 从 ai_deerflow_dr_v3 吸收了主干框架并升级了门禁——
**本仓送出去的制度在外面进化了一代，本仓停在 D31 形状**。同时本轮盘点实测出三处账实矛盾：

1. 毕业门第二行写「待触发→关闭迁档」，实践却是等待卡留活跃区（2026-10-02 治理轮刚把两笔验证债
   从 Note 迁进卡）——README 与实践打架；
2. 归档索引烂：`2026-09-28-float-geometry-memory` / `-dag-edge-routing` 两张已毕业卡不在
   `_done/README.md` 索引；
3. 活跃列表烂：`2026-10-02-`×2 两张活跃卡不在 `plans/README.md` 活跃列表。

## 决定

1. **主干框架入章程**（借 deerflow_dr_v3 经 advisor）：缓冲区 → 加工线（notes/proposed/ →
   implemented/）→ 回流/写回，一张图一次说清；随行三条硬规则 = 无 RFC 不生效 / 卡记思考 Note 记
   决定 / 写回不夹带。**合成规则（反双记账）**：卡是变更前推敲，判断一落「该做」变更痕迹即进
   `notes/proposed/`、卡关闭；已在归属 Note/合同落位的待触发项不另立卡。
2. **章程/账本二分**：`_backlog/README.md` 是章程（只在制度级决定时动，每次带流程 Note）；
   其余 README 是账本（行随卡走）。检验法：凡点名活卡、计数或现值的进索引、永不进章程。
3. **门语义理顺（确认本仓口径）**：待触发事实家 = **等待卡**（活跃区，状态行写触发+判收；
   2026-10-02 治理轮决定不逆转）；**毕业卡永不复活**——触发兑现以新卡/新 RFC 回场引用旧卡。
4. **两桶解禁再借（用户拍板②）**：`_done/_suspended_plans/`、`_done/_suspended_bugs/`（搁置 =
   队列决定跟明确指令走，agent 不得自行判搁置；搁置卡非实施授权）+ `reference/`（喂活跃卡的
   研究材料，随卡归档进 `_done/_reference/`）；`_misc/` 定性为退役历史池（点名才读、不再收新件）。
5. **全日期卡名（用户拍板①）**：`YYMMDD-` → `YYYY-MM-DD-`，与 notes 树统一为全仓一种日期格式；
   9 张卡 `git mv`（6 活跃 + 3 归档），活指针修复 = scripts 注释 ×2 + intents.md + notes 回链 ×5；
   snapshots 里的纯文本提及不动作历史。
6. **门禁升格**：`plans-liveness` → `backlog-liveness`——制度目录在场 ×9 + 活跃卡状态行
   （plans 含毕业门判断、bugs 含状态）+ **索引交叉核对**（每张卡/材料件必须被四份 README 之一
   点名；反向死链由 md-links 硬档扫描覆盖）。
7. **bugs 卡小件**：模板补「暴露的失败类」节（契约探针纪律进模板）；状态行**追加律**（修完只追加
   判定不重写）；Next BUG ID 权威值从 `_done/README.md` 迁 `_fixed_bugs/README.md`（编号权威住
   归档侧的落点对齐 advisor）。

## 关键取舍与约束

- **索引交叉核对升格依据（FAQ 15）**：不是预铺——活违规两处就是本轮实测证据（上面问题 2/3），
  先修后防，负例见验证节。
- **`_suspended_*` 与等待卡的边界**（防止借回的桶长成第二队列）：已判断的待触发项住等待卡或归属
  Note，**不进搁置池**；搁置池只收无判断、用户明令暂停的卡。不借清单相应改写为这条边界（原行
  「_suspended_* 不借」按用户裁决删除）。
- **`reference/` 与留存参考的边界**：借的是随卡归档制；advisor 也不借的「常驻跨卡 `_reference_`
  池」仍不借——活得比卡久的材料语义仍归 docs/index.md §外部研究材料登记 + notes/archived/。

## 输掉的方案

- **待触发项照 advisor 原样「关闭卡、触发住 Note」**：会逆转 2026-10-02 治理轮刚做的迁移（验证债
  从 Note 迁进卡正是为了可检索、可点名），且本仓 notes 树无 advisor 那样的合同边界表作触发落点；
  两事实家打架，否。
- **索引交叉核对继续挂「有压力再借」**：压力已现成（活违规两处），不借 = 门禁明知故纵，否。

## 验证（实际跑过的）

- `pnpm verify` ALL PASS——新门禁三 PASS 行：`backlog-liveness 制度目录 ×9` / `状态行 ×6` /
  `索引交叉核对`。
- **反证（红→还原→绿）**：① 删 `_done/README.md` 一行索引 → `backlog-liveness 索引交叉核对` 红
  （点名 `没被任何索引点名`）→ 还原 → 绿；② 删一张活跃卡的「状态：」行 → `状态行` 红 → 还原 → 绿
  （记录见 verify.mjs 门禁注释）。
- `pnpm test` keyless 全绿（数量以实跑为准）。
- 索引修复证据：`_done/README.md` 补 2026-09-28 两行、`plans/README.md` 补 2026-10-02 两行
  （门禁升格依据的活违规，先修后防）。

## 登记与指针

- 台账：docs/index.md D33 行（D31 行补回借注）+ 外部研究材料登记 +1 行（第五处外部源 =
  ai_dsh_loop_advisor/_backlog）；AGENTS.md 布局行；guides/dev-loop §12 门禁名随手改。
- `_backlog/` 全部 README 重写/新增（章程 1 + 账本 9）；verify.mjs 门禁块重写。
- 借鉴源核对：advisor `_backlog` 全部 10 份文件读毕后定形状（README + plans/bugs/reference/_done
  五份子账 + 样卡）；引用版本 = 该仓工作树 2026-10-03 当日态；外部仓持续演进，机制结论以本仓
  `_backlog/README.md` 为准。
