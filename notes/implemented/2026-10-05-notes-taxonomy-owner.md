# 2026-10-05 · notes/ 分类 owner 文件与 notes-liveness 门禁（D35）

状态：implemented（2026-10-05 用户令原话归纳：「（ai_dsh_assitant/notes/README 的）精神应该抄袭到 notes/ 这里，否则 proposed 到 implemented 这个过程、或者说这里头的 SDLC 质量把控不了、规矩没有」；先审计后吸收——审计结论见下节）

## 决定

- **[notes/README.md](../README.md) 立**：本目录分类 owner（职责由一个具名文件拥有，不由惯例拥有）——
  状态轴速读表、义务范围/记录判据、取代检查、备选必载、毕业=正文改写、真证据、内容策展；与
  [proposed/README](../proposed/README.md)（RFC 合同 + TDD 红绿环）、dev-loop §12（收尾动作清单）、
  rejected/archived/postmortem 各 README 分工不重叠。
- **细则迁移**：Note 生命周期细则从 dev-loop §12 迁出为 notes/README §二（唯一家）；指针随迁
  （AGENTS ×2、index sdlc 行、proposed/README 环第 5 步、rfc-tdd-loop 落点行）；dev-loop 391 → 约 370 行（预算减压）。
- **notes-liveness 门禁立**：implemented/ 文件名日期 ≥ 2026-10-05 的 Note 前 6 行须有「状态：」行且以
  生命周期词（implemented/已交付/已消化）开头；存量祖父豁免；词表唯一家 = notes/README §一。
- **验收可执行标准吸收**：proposed/README 验收节加「哪条命令、断言什么、红长什么样——实施者不看对话
  就能复现；写不出 = 提案未成熟，回 _backlog/plans 推敲，不进实施」。
- **外部借源登记**：index §外部研究材料登记加第六处（`/Users/bowhead/ai_dsh_assitant/notes`）+ D35
  台账行（index 预算 147→148，本 Note 同 diff）。

## 审计结论（用户问「我们现在有还是没有」）

规矩大半已有但散居：生命周期细则全在 dev-loop §12、RFC 合同在 proposed/README、状态行规矩「存量不
回扫」但无门禁、状态词事实上两套并存（近期 16 篇用「已交付」、若干用「implemented」）。缺的是：分类
owner 文件（读 notes/ 目录第一眼看不到契约）、状态词机械门禁、「验收可执行 / implemented 只收真证据」
两条硬表述。本 Note 四项全补。

## 输掉的方案

- **借「文件名日期 == 状态行日期」门禁**：本仓时间轴 = 文件名日期 + git log（D34 已裁），状态行不重复载日期。
- **借 postmortem 并入 implemented**：本仓 _backlog 章程与 AGENTS 纪律表已立「事故复盘 ≠ 设计推敲」，0001–0004 在档。
- **借 {lifecycle}/{class} 两级路径**：同借源仓偏离 DSH 的理由——生命周期轴已够用，class 正交。
- **门禁查「真证据」文本**：只挡缺席不挡空壳（仪式性合规）；升级触发登记在 notes/README §三（复发 → 升门禁 + 负例夹具同 diff）。
- **TDD 红绿环搬进 notes/README**：环是 RFC 执行合同，住 proposed/README（同日先立，见
  [rfc-tdd-loop](./2026-10-05-rfc-tdd-loop.md)）；两文件分工不重叠。

## 验证记录

- 门禁反证三步（prove-it-red，2026-10-05 实跑，隔离跑在其余文件落盘前——红绿只归因于门禁本身）：
  **第一轮红证先抓到门禁自身 bug**：正则缺 `m` 标志（`^` 只锚字符串开头）→ 五篇合规 Note 全被误报；
  修正为 `/^状态：\s*\**\s*(implemented|已交付|已消化)/m` 后重跑——
  ① 红：双 fixture（`2099-01-01-fixture-no-status.md` 无状态行 / `2099-01-02-fixture-wrong-word.md`
  状态词错位 proposed）→ `pnpm verify` exit 1，notes-liveness **只**报两个 fixture；
  ② 还原：删 fixture；③ 绿：exit 0，`PASS notes-liveness ×5（implemented/ 新写 Note 状态行；生效日前存量豁免）`，`verify: ALL PASS`。
- 既有 2026-10-05 五篇 Note 全部合规（implemented ×3 + 已交付 ×2），零回改。
- 最终全量落盘后：`pnpm verify` ALL PASS + `pnpm test` 298/298（收据见本轮对话与 commit）。
