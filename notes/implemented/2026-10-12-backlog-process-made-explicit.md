# 2026-10-12 · _backlog 制度显性化：缺陷通道、双轨状态生命周期、agent 门牌

状态：implemented（2026-10-12 用户点头落地借鉴卡 `_backlog/_archive/settled_issues/2026-10-12-backlog-process-made-explicit.md`；源仓 `ai_dsh_loop_advisor` 同日同法落地）

## 问题

本仓 `_backlog` 制度 2026-10-09 整体借自 `ai_dsh_assitant/_backlog` 后，「没写下来」的缺口在七处成立（借鉴卡审计，缺口语义 = 制度在场但无文）：缺陷修复流悬空（谁授权/走哪条通道/凭什么算「查明」——任务源法只认已批 RFC 与用户点名）、bugs 模板无验收字段（BUG-001 的修复候选与依赖即兴写在散文里）、双轨处理门票无一处说一次、无 agent 面（规则纯拉取，嵌套 AGENTS.md 自动注入的平台能力闲置）、severity 无人消费、状态生命周期零碎且缺陷侧空心（缺陷只有「活跃」一值）、就地修复的同类排查无落点。源仓同日完成同题评审（两仓制度同源、同钉 vendor `dsh-v0.2.0-rc.2`），用户点名借入本仓：「内容可能会调整，但基本上应该你们是一致的」。

## 决定

- **缺陷通道与修复授权**（章程新节「缺陷的通道」）：缺陷卡生命 = 分诊 → 调查中 →（根因有证据确认＋修法选定＋`## 已修判定` 写好）→ 修复就绪 → 修复已落地 → 已修判定满足 → 归档已修。`修复就绪` 翻转即门票**且**授权，限 P1/P2 修复型；P0 或触碰章程/常设指令/docs 合同/company-pack 公开行为/已记录决定之一 → 不自授权，走用户/问题 RFC。这是 severity 的消费者与铁律的限定例外（带日期写入章程）。
- **双轨状态生命周期**（章程新节，翻转表唯一家）：frontmatter `status` = 当前阶段唯一家；状态行 = 镜像＋历史（门禁互查）；问题轨四值保留（推敲中/等人拍板/已结/叫停），缺陷轨「活跃」改名「调查中」并增 修复就绪/修复已落地/等人拍板；共享翻转律 = 沉默不翻转、翻转必带守卫与记录、出口值只在归档同改；回翻带守卫合法（证伪/用户答复/用户重启）；根因纪律 = 假设→确认须证据，撤回留卡。状态行新增 `毕业：` 封闭头 `未定｜做｜以后做｜不做｜消化`。
- **agent 门牌**：新建 `_backlog/AGENTS.md` 薄门牌（五目录定位、走法、两张门票、枚举、指针）——平台嵌套 AGENTS.md 随第一方文件操作自动注入（本机实测：门牌创建后立即随本会话注入），规则唯一家仍是章程与各 README；根 AGENTS.md 布局行加指针。
- **就地修复排查落点**：当场修掉不建卡的，其同类横切排查一句话记该轮轮次回执①行（有 Note 随 Note）——解「模板问横切排查、当场修的没有卡可写」的自相矛盾。
- **bugs 模板**：加 `## 已修判定`（含搭载依赖字段）；状态节列新枚举并指回章程。
- **开发环 §0.5 对账**：任务源清单加唯一例外指针句（修复就绪自授权），规则唯一家 = 章程，不双写。
- **门禁修订**（`tools/lib/backlog-liveness.mjs`，既有类修订不新增族）：缺陷轨枚举表扩容改名、状态行↔frontmatter 镜像互查、问题卡 `毕业：` 封闭头；反证在 `tests/harness/backlog-liveness.spec.ts`（24 例）。

## 输掉的方案

（与借鉴卡选择表同源，本仓拍板采纳）

- **agent 面 = 只写 README（纯拉取）**：否——规则必须抵达落进 `_backlog/` 却没读手册的 agent；门牌靠平台自动注入，不靠 agent 自觉。
- **门禁验收在场族立即升格**（按状态必备节：修复就绪卡必带 `## 已修判定`）：延后——用户裁定「先格式」，记承压候选；首次「缺验收卡什么都没红」时重提。真树植入 修复就绪缺已修判定卡实测**不报警**，如实记为延后。
- **修复通道 = 搭用户轮/问题 RFC**（历史实践）：用户已否——缺陷卡就是工作项。
- **token 随源仓英文**（deliberating/waiting-for-owner/…）：否——本仓章程/门禁/文档全中文面；同一状态机＋1:1 映射表保证跨仓一致，与源仓「形式本地化、思想一致」互为镜像先例。
- **`待修` 收窄为源仓仅叫停义**：否——保留本仓宽语义（叫停或判定延后都入待修，行上写清；判定延后按 triggers.md 记触发句）。
- **`blocked` 状态**：不取——平台 goal 机需要它因为自主环必须自报僵局；卡是读者消费的，依赖搭载在已修判定/下一步。
- **`proposed`/`rejected` 新终态**：不取/延后——从未发生的形状不发明词汇。
- **RFC 走 proposed/ 再毕业**：本卡缺省是「RFC 进 notes/proposed/」，但本仓 Note 生命周期（agent-note-definition 步骤 2：决定随当前变更已交付 → 直接 implemented）+ proposal-graduated 门禁（该毕业的不许赖在 proposed/）同轮压缩——本 Note 即毕业记录；卡上拍板行已如实记录该适配。
- **只前进的状态机**：否——BUG 撤回先例要求带守卫回翻。

## 后果

`_backlog` 五缺口闭（1/2/4/5/6/7；缺口 3 复现本仓本已在场）；缺陷修复有了自带授权边界的通道；severity 有了消费者；规则对落进本区的 agent 自动可见；状态翻转有法可依且门禁互查。源仓与本仓现在跑同一部状态机（映射表：deliberating↔推敲中、waiting-for-owner↔等人拍板、settled↔已结、suspended↔叫停、investigating↔调查中、fix-ready↔修复就绪、fix-landed↔修复已落地、fixed↔已修），用户跨仓一套心智模型。后续：本 Note 是该决定的 rationale owner；章程/模板/门禁是现在时事实的家；借鉴卡已按关闭法归档。

## 验证

- **红证（真树植入，2026-10-12 实跑原话）**：在 `_backlog/` 真目录植入 5 张卡（刻意未索引，未索引告警属预期噪声）→ `node checks/run-gates.mjs` 红：
  ① `_backlog/issues/2026-10-12-zz-redmirror.md:1 状态行「等人拍板」与 frontmatter「推敲中」不一致（镜像互查）`；
  ② `_backlog/issues/2026-10-12-zz-redmirror.md:1 「毕业：马上做」头不在封闭集（未定|做|以后做|不做|消化）`；
  ③ `_backlog/issues/2026-10-12-zz-rednoline.md:1 缺状态行（> … ｜ 状态：<frontmatter 值> ｜ …）`；
  ④ `_backlog/bugs/BUG-013-zz-redactive.md:2 status "活跃" 不属于此桶`；
  ⑤ BUG-014（`修复就绪`＋镜像行）无任何活状态问题（新值接受）；BUG-015（`修复就绪` 缺 `## 已修判定`）不报警——验收在场族延后，如实不查。删除植入卡后复跑 → `verify: ALL PASS`（还原即绿）。
- **spec**：`npx vitest run tests/harness/backlog-liveness.spec.ts` 24/24（含镜像互查、毕业封闭头、旧值拒绝、新值接受、延后族五个新控制；首次跑 1 failed——spec 的 `index()` 助手对活跃池是覆写不是追加，多卡夹具改为一次写全索引后绿，判据未动）。`pnpm exec vitest run tests/harness/backlog-liveness.spec.ts tests/harness/foundation-links.spec.ts` 41/41。
- **全量**：`pnpm verify` ALL PASS；`pnpm test` 47 文件 / 482 用例全过。真模型/浏览器验收不适用（纯流程/文档/门禁变更）。
- **门禁抓到两处真错（如实记）**：收口轮中途 `link` 抓归档卡 issues 自引链接少一层目录（`../issues/` → `../../issues/`），`bare-path` 抓本 Note 状态行引用卡片旧路径（git mv 后）——修正后绿。两处都是本次新增检查面之外的既有门禁正常工作。

## 适配与来源

借源 = `/Users/bowhead/ai_dsh_loop_advisor/_backlog/issues/2026-10-12-backlog-process-made-explicit.md`（机器本地路径，刻意不链接）及其引用的生命周期研究（平台三台状态机读自同钉 vendor + 22 张归档卡观察；本仓归档证据另行核对：28 已结/12 已修/0 叫停待修，四结论全发生过）。前序制度落地 = [backlog-issue-lifecycle](./2026-10-09-backlog-issue-lifecycle.md)（部分取代关系：该文仍是 2026-10-09 借入决定的 rationale owner，本文扩展其制度，不重写其决定）。
