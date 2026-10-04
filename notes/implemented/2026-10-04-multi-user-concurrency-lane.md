# 2026-10-04 · 多用户并发交互 UX 立项：场景规格 + 分期判据（lane Note）

状态：implemented（Phase 1+2 交付，2026-10-04 同日）。批准 = 用户 2026-10-04「觉得需要立项」
（承接同日对话：用户指认「多用户并发交互 UX 零测试资产」+ 诊断「口头担忧多次提起、最后都没啥
东西——所以必须搞 TDD/BDD 一样的东西」）。

## 为什么立：担忧蒸发问题的本仓解法

多用户并发交互被提起 ≥3 次（09-26 multi-human 合同、E1/E2 实测轮、宪法 §5 登记），每次留下
*文档*，从未留下*可执行物*。立项把话题转成**场景规格**（Given/When/Then + 判据点名 + 预算），
并同 diff 升格纪律（宪法 §3.8 红/场景先行 + dev-loop 四问④）：**口头担忧第二次提起 → 立卡或
明确否决，不留复发性话题**。

## 场景规格（S1–S6；本表是 lane 的验收规格，逐条兑现时其可执行形态进脚本头注）

| # | Given / When / Then（判据） | judge 落点 | 状态 |
|---|---|---|---|
| S1 同 slug 撞车 | 共享盘已有 <slug> 产物；另一场动议同 slug present ⇒ `slug-collision` 观察项命中 | `deliverables.spec:336`（keyless 已钉）+ `deliverables-check` 真跑（09-30 renewal-y 实证） | ✅ 闭合 |
| S3 占位抢注 | 空 draft 双写者同时占位 ⇒ 进程内恰一胜一拒（fs-local FIFO 锁，vendor 自有 test 承担）；盘上语义 = 首行一字不差「占位=认领，非出稿」⇒ 观察项 `placeholder-claims` 只登记不判红 | `deliverables.spec:271`（含一字不差反例）+ 真盘实证（renewal-u：命中→替换→清零） | ✅ 闭合 |
| S4 双门同时等人 | CEO 门与 CFO 门各挂一张 `request_signoff` 卡；两个浏览器各答各的 ⇒ 互不串线：allowed-once 各自一次性、注意力两行共存销一留一、两会话各自收口 | **`attention-e2e-smoke --dual-gate`（2026-10-04 交付，首跑 10/10 全绿）**；read-model 半 = `mergeAttention` 两源共存（attention.spec） | ✅ 闭合 |
| S2 跨进程同文件写 | 两进程各持同版本同时写 ⇒ 期望 = 后者被拒或原子接管；**现状 = 20/20 互踩（E2）** | 演示资产在（`cross-process-fs-probe`）；目标行为判据 ⏸ 等产品决策（`dsh-atomic-write` 采纳与否） | ⏸ 等决策 |
| S5 双 home 审计拼图 | 双 home 动议收口 ⇒ 两家各跑 check/audit，并集 = 完整归属图（单一 home 不存在完整归属图——972b2d4 实证） | runbook 面（budget-and-ops 症状表；首次双 home 真场时实跑一行） | Phase 3 |
| S6 双客户端观察一致 | 两个浏览器会话同开在场板/看板 ⇒ 渲染一致、无跨会话状态泄漏 | cdp-probe 双客户端腿（重） | Phase 3（多人开门常态化触发） |

## 分期

- **Phase 1（本轮交付）**：本 Note（场景规格）+ 纪律升格（宪法 §3.8、dev-loop 四问④）。
- **Phase 2（2026-10-04 交付）**：`attention-e2e-smoke --dual-gate`——两会话（cfo + coo，触发文本
  用 budget-signoff-probe 已验证的报价线 prompt）各挂一张卡 ⇒ 注意力中心**跨会话聚合两行** →
  应答 A（allowed-once + 同轮收口）→ **独立性断言：B 日志无 decided、注意力销一留一仍挂 B** →
  切 B 应答独立收口。**首跑 10/10 全绿**（一次过；预算帽 $6 实际 ≈$2；三张证据截图 =
  `snapshots/attention-e2e/2026-10-04-dual/`）。诚实边界：双门用的是 cfo+coo 两个 preset（机制
  等价于 CEO门/CFO门——判据是「两会话各自独立」，角色只是叙事面）；单门路径经同构重构未复跑
  （共享 helper 全部被双门腿实跑覆盖，下次按面触发自然复验）。同 diff 附带：`script-triggers`
  门禁扩 `-eval`（宪法 §1.1 词表核查发现的逃逸；反证红→还原→绿 ×26）。
- **Phase 3（触发制）**：S5 runbook 行（首次双 home 真场）、S6 双客户端腿（多人开门常态化）。
- **等待**：S2 目标行为判据（产品决策）。

## 输掉的方案

- **keyless 复制 vendor fs-local/approval 内部语义测试**：升 pin 程序本就跑 vendor 自有全套
  test（sync-dsh 候选段），复制 = 双记账；本仓资产只钉自己面的判据（占位谓词/三态/读模型）。
- **先写 S4 双门驱动不跑**：完成定义 = 最小真检查通过（D15）——写盲代码 = 半交付，宁可不写。
- **场景规格写成 _backlog 推敲卡**：用户已立项（判断成熟），卡层是判断成熟前的家；直接进
  Note 不违章程——四门的第四门（用户拍板）已过。

## 验证（实际跑过的）

- S1/S3 keyless 判据已在网：`pnpm test` 30 文件 283 用例全绿（本 Note 无新代码——keyless 层
  经对账确认已满覆盖，见同日 testing-constitution Note 盘点轮）。
- `pnpm verify` ALL PASS（宪法 60→61 行：新增 §3.8，预算同 diff 升格）。
- **Phase 2 实跑**：`--dual-gate` 首跑 exit 0，10/10 全绿（聚合两行 / 两摘要可区分 / A 收口 /
  B 无 decided / 销一留一 / B 收口）；证据截图 ×3 入 `snapshots/attention-e2e/2026-10-04-dual/`。
