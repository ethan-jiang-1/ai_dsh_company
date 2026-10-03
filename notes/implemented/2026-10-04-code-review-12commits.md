# 2026-10-04 · 12 提交双轴 code-review：1 假绿面修复 + 反向门禁补落 + 两项登记

状态：已交付（Standards/Spec 双轴并行复查 `a219bcd..32c77d5` → 2 处修复（均带红绿证据）+ 2 项登记待人拍；审查原文不复制进本 Note，处置与证据如下）

## 修复 ①：migration-rehearsal `--execute` 假绿面（Standards 硬违规）

子门禁（deliverables-check / authorship-audit）验收失败时 `:114` 无条件 `process.exit(0)`——
违反脚本头注自述「退出码 1=有判据未满足」+ dev-loop §1「证据不许假绿」。
**红绿证据**（真盘 deliverables/ 为空 ⇒ 迁移步骤空转、③ 只读，反证安全）：
剥 PATH 里的 zstd 令 deliverables-check 退 2 → 旧码 `exit=0`（假绿实锤）→ 修后 `exit=1`；
正常环境 authorship-audit 输出逐字回归一致（一致 70/不可考 0）。

## 修复 ②：反向门禁「present 在而结果≠终态 → 红」（Spec 缺失项，布局卡评审修正 6）

卡两处点名（评审修正 6 + §④ 门禁清单），落地时只落了留空观察项 `META_RESULT_PENDING`。
**补落**：lib `presentResultRows`（纯逻辑）+ `META_FINAL_RESULTS`（词表去「进行中」）+
`auditDeliverables().leadFinalSlugs` 新返回面 + check 侧接线（`PRESENT_RESULT_NOT_FINAL`）。
- 语义：present 是**收口动作** ⇒ 收口后「结果」必须落终态词；留空/进行中都红（P6 病：
  结果靠 CEO 自觉回写没人盯）。无 meta 不在射程（T-9 观察项管，防同一条双报）。
- **红绿**：spec ×2 先红（2 failed）→ 实现后 30/30；**真盘反证**：q4 meta 结果临时改「进行中」
  ⇒ `present-result-not-final` 红 ⇒ git 还原 ⇒ ALL PASS。真盘存量 23 话题全部终态 ⇒ 首跑零红。
- 测试 275→277。

## 登记不修（待人拍/触发挂起）

1. **无产物动议事实家**（布局卡毕业门决策点 2：「kb/motions 轻 meta vs 台账人工附录段」）：
   五点拍板覆盖了 0/1/3/4/5，**决策点 2 未拍未落**——integration-50w-signoff 类至今无 meta 之家。
   卡文明言「全是要人拍的」⇒ 待用户拍板，不代理决定。
2. **Redis R0-2(b) meta 建档抢注**：前置（布局卡 B1 毕业）已 fire 但 (b) 未落地，登记仍挂旧触发
   （redis-r0 Note）——涉及手册腾位（195 顶格）与机制形状选择，随下次动议轮顺手立项。

## 核对后不成立/已覆盖的指控（防复犯）

- 「双写违反 B1+B4 意图」：landing Note L3 用户拍板 ② = **B1 全覆盖 + 一致性观察门禁、B4 降
  Phase 2 待触发**——卡倾向输给用户决定，对话在案（5d8c071），非相悖。
- 「feedback D1 未经 RFC」：5d8c071 用户批「feedback 两者都要」⇒ 手册半边 + 读模型半边均有授权。
  **真缺口 = 点击实况验证**——本轮回填（E2E 动议里浏览器点 👍 + 培养页签呈现断言，见同日 E2E Note）。
- 判断题 smell 登记备查：migration-rehearsal 命名不落 `*-{check,probe...}` 门禁面（头注自愿合规）；
  fs-guard-probe 头注缺整场墙钟上限（§10 三上限只写了成本与单轮超时）；authorship-audit 双根
  遍历形状重复未抽（缩进已修，抽共用留待下次动该文件顺手）。

## 验收（本轮实跑）

`pnpm verify` ALL PASS；`pnpm test` 277 全绿；`deliverables-check` 违规 0（观察项 3 条历史撞车）；
`authorship-audit` 一致 70 / 署名不实 0 / 版本过期 0。
