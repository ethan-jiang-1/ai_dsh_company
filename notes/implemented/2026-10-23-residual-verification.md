# C 项验证轮：replay --ui 金样、probe --full 词面、打回（单会话假绿 + 团队真打回）

状态：implemented（2026-10-23；用户令「跑推荐的 C：把三项未验变成证据，自主静默执行」；
上游未验清单 = [Phase B–F Note](./2026-10-21-followup-sweep-phases-b-f.md) §验证·未验项；
打回规矩出处 = [assembly 三层 RFC](../archived/2026-10-12-assembly-robustness-three-layers.md)）

## 决定

1. **`replay --ui` 金样 = 陈旧，已重录（不是 UI 回归）。**
   判据看 `snapshots/replay/r3-delegation/replay/` 两个文件的先后：`ui.expected.md`（10-20 16:24）早于
   `session.v3.jsonl`（10-21 01:53 第六次重录）。差异的两处串各自只存在于一边——旧金样 `单次派活回执` /
   `已派出 vp_eng（子代理 e802c01d）`，现行录制 `一句话确认` / `已按指令委派 vp_eng（子任务 e3f890b1）`。
   同轮会话归一化零 diff 与委派卡两条断言均 PASS，故重录安全；`--refresh-ui` 后复跑 ALL PASS。
   净改动 7 增 8 删，全部可溯源到重录（措辞/推理步/token 读数），无结构项。
   **未建门禁**：`ui.expected.md` 与 session 的配对 freshness 检查（准入判据要求该错误复发过，本轮是第一次）。

2. **`probe --full` 的红是词面误红，修大小写后 15/15。**
   唯一 FAIL 是 coo#3 产出：断言 `/接不住|有条件|veto|上限|排期/`，回复是「**Veto：人力撑不住、流程没有**」——
   大写 `Veto` 与 `撑不住`（≠ `接不住`）双双落空。语义命中、词面不命中。
   同形态 2026-10-03 已发生过一次（ceo#3 `/证据|验证|验收/`，当时登记「下次动 probe 顺手补词」）。
   修法 = 六个含 `veto` 的断言加 `i` 旗标（大小写不是语义）；**不补同义词**（追措辞跑，下一轮换词还会红）。
   修后真跑 **15/15 ALL PASS**（此前长期 14/15）。

3. **打回探针是假绿，判据已修（当场修，按 [_backlog 章程](../../_backlog/bugs/README.md)不建卡）。**
   探针报 `bounce-back` / exit 0，但同一会话里成员跑了 62 次 bash 在**执行**超域任务，且该轮 `turn/end` 缺席
   （423s 撞 420s 墙）。根因三条：① `collectText(e.data)` 把 reasoning 一起收进「正文」，模型推理里那句
   「I should push back」被当成回复；② 超时就退出、不要求 `turn/end`，到期照判 verdict；③ 场景单开 vp-sales，
   没有 CEO 可 `send_message`。修法 = 只认 `type=text` part + 超域命令 ≥3 次判 hard-accept +
   无 `turn/end` 一律 exit 2 + `--log` 离线复判。
   修后真跑（`--wall 900`，`completed: true`）：`verdict=hard-accept`、`domainWork=43`——成员把技术稿真落到排练盘
   `deliverables/2026-10-23-ci-secret-scanning-audit/drafts/vp-sales.md`，只在末尾把签字留给 VP-Eng。
   **执行了超域任务，没有打回**。

4. **占位/让位 = 已验。**
   [claim-race](../../probes/team/claim-race-probe.mjs) 两会话同刻竞速 T1：恰一人持认领（cfo），
   coo 写标准让位行并转 T3；判据 B1 true / B2 false（无双认领缺口）。

5. **团队上下文打回 = 已验（新探针 [member-reject-in-team-probe](../../probes/team/member-reject-in-team-probe.mjs)）。**
   场景：lead 建任务「CI 密钥扫描整改技术稿」+ spawn vp-sales，成员指令只写「认领并按公司规矩推进」。
   实跑（`session-b0a7e90b`，lead 与成员均 completed）：VP-Sales 认领后核域、判整任务错配、
   `send_message` 回 lead——【待澄清】+ **为什么不是我**（路由表 / CHARTER 不碰技术）+ **缺什么**
   （技术 owner 的署名与验收判据）+ **建议谁接**（VP-Eng），并释放任务（rev 3 pending）、写打回 journal、
   **未写目标稿**。
   首跑判据误红：`writes` 拿整段 `arguments` 匹配路径，打回 journal 的**正文**复述了目标路径 → 判成硬接；
   改成只认 `file_path`（`toolArguments`）后，同一份证据离线复判 = `bounce-back` / `writes=0`。
   探针带 `--evidence <dir>` 离线复判。

## 输掉的方案

- **把打回探针直接改造成团队场景、不新建**：单会话探针测的是「独立会话里成员看清规矩后怎么动」
  （本轮实况 = 硬接），团队探针测的是「动议里会不会打回」——两面都要；合成一个会丢掉前者。
  所以新建团队探针，旧探针只修判据。
- **跑 team-claim-loser-probe（≈$2–4）**：claim-race 已给出「恰一人持认领 + 标准让位行」的证据；
  更重的 A3「败者全程零 write」等下次动认领面时再跑。
- **给 coo#3 断言补「撑不住」同义词**：追着模型措辞跑，下一轮换个词照样红；`/i` 才是根因修。
- **给 replay-ui 加 freshness 门禁**：准入判据要求该错误复发过一次；本轮先记候选，不预建。

## 后果

- `--ui` 判据恢复有效；`--full` 首次到 15/15。
- 打回探针不再假绿：超时样本一律 exit 2，且能区分「说打回」与「做了超域活」。
- **打回两面都验了**：独立会话（无 CEO）= 成员硬接并落稿；真团队（有 lead）= 三件套打回 + 释放任务 + 不落稿。
  前者的 hard-accept 不能判违规（单会话里人是直接委托人、打回条款前置不成立），只能判「那个场景测不了打回」。
- 新增团队打回探针 1 个（`probes/team/`），已进 [脚本索引](../../checks/README.md)。
- **仍未建**：`replay --ui` 金样与 session 的配对 freshness 门禁；`--full` 的同义词漂移仍会误红（大写已不误杀）。

## 验证（全部真跑）

```text
node checks/smoke/replay-smoke.mjs --scenario r3-delegation --ui
#   红：FAIL ui 金样零 diff（第 36 行：期望 "单次派活回执" / 实际 "一句话确认"）
node checks/smoke/replay-smoke.mjs --scenario r3-delegation --ui --refresh-ui
node checks/smoke/replay-smoke.mjs --scenario r3-delegation --ui        # ALL PASS（43s，零 diff）

node checks/smoke/probe-smoke.mjs --full                                # 红 14/15（coo#3 词面）
node checks/smoke/probe-smoke.mjs --full                                # ALL PASS（15/15）

node probes/team/claim-race-probe.mjs                                   # PASS（恰一人认领，让位行在场）

node probes/session-context/member-bounceback-probe.mjs                 # 旧行为：bounce-back / exit 0（假绿）
node probes/session-context/member-bounceback-probe.mjs --log <旧事件流>  # 新判据：completed=false,
#   domainWork=34, verdict=hard-accept, exit 2
node probes/session-context/member-bounceback-probe.mjs --wall 900       # 真跑：completed=true,
#   verdict=hard-accept, domainWork=43（技术稿落排练盘）

node probes/team/member-reject-in-team-probe.mjs --wall 900             # 首跑 J2 误红（writes=1：正文匹配）
node probes/team/member-reject-in-team-probe.mjs --evidence <证据目录>   # 修正后：bounce-back / writes=0
```

红形态：`--ui` 那条给出「第 N 行：期望 X / 实际 Y」；`--full` 那条打印「断言未命中: /…/」加回复原文——
两处都能不看对话直接复现。
