# 2026-10-25 · backlog → notes 交接契约：用户是队列，notes 是裁决后的住所

状态：已交付（2026-10-25；用户批准修复计划并按推荐拍板；`pnpm verify` ALL PASS；语义走查与门禁红绿见验证节）

## 问题

本仓 2026-10-09 从借源仓整体借入 `_backlog` 时，连 `issue-to-note` 方法一起借入；方法假设 `notes/proposed/` 是“待用户点头的取舍”的停车场。但本地 D32（2026-09-28）已经把 `proposed/` 定为“已批 RFC”，未批准的思考留在 `_backlog/issues`。方法借来时，它假设的下游语义已经不存在。

结果是三处文本互相打架：

- [_backlog/README.md](../../_backlog/README.md):5 说 notes “接收申请后决定是否形成 Note”，第 12 行又说“默认向用户提出；notes 入口是接收规则，不是收件箱”。
- [_backlog/methods/issue-to-note.md](../../_backlog/methods/issue-to-note.md) 说 “receiving process decides whether a Note is needed”，把“用户授权”和“notes owner 按判据决定 Note”混成一个决定；方法全文没有出现 RFC / `proposed`，而本仓“做”的第一落点通常是 RFC。
- 关闭条件里的“所需确认”没有区分“结论确认”和“申请受理”：[2026-10-09 协作卡](../../_backlog/_archive/settled_issues/2026-10-09-collaboration-safety-acceptance.md) 在“申请 1 待用户授权”时于 06:35 归档，bfa893e 08:21 才实施，10-12 才补记；[2026-10-11 human-exits 卡](../../_backlog/_archive/settled_issues/2026-10-11-human-exits-expression.md) 却写“未获批保留活跃卡，等 RFC 再离场”。

记录层也不一致：[settled_issues/README.md](../../_backlog/_archive/settled_issues/README.md):3 说“结论与去向写在卡片状态行”，但 [10-24 卡](../../_backlog/_archive/settled_issues/2026-10-24-run-bundle-clean-base.md) 的 status line 没有去向，[10-23 卡](../../_backlog/_archive/settled_issues/2026-10-23-cultivation-context.md):1088 仍写 `notes/proposed/`；真正承载去向的是卡顶块、正文和 [_archive/README.md](../../_backlog/_archive/README.md) 行。

## 决定

- **用户是队列；notes 是裁决后的 artifact home。** 任务源 = 用户点名 + `notes/proposed` 的已批 RFC（D32）；backlog 卡不是任务队列，notes 不是收件箱。
- **三段式交接**：结论确认（用户）→ 下游裁决（用户）→ 落点（agent）。`request` 类型 = `rfc | note | implementation | pending | none`；`destination` = 仓库路径或 `用户（YYYY-MM-DD）`。
- **关闭条件 = 结论确认，不含下游受理。** 结论未确认 → 卡留 `等人拍板`；结论已确认但下游未受理 → 记 `去向=用户（日期）`，可关闭；受理后 → `notes/proposed` RFC 或同轮 `notes/implemented` Note。
- **两个决定、两个 owner**：授权 = 用户；Note 必要性/形态 = notes owner 按 [notes/README](../README.md) §二。方法不再说 “receiver decides”。
- **记录家 = 卡顶 `> **结论/去向**` 块**；status line 只做状态镜像；`_archive/README` 行只做历史摘要；current owner = Note/RFC。
- **`proposed/` 保持名字，语义写清**：本地 = 已批待实施，不是借源仓的待点头停车场；未批准的“做”留在 `等人拍板`。
- **`消化`** = 关闭表的“结论已在别处”，不是 Note 的“已消化”；agent 指认并引用，不确定是否足够时先问人。
- **`以后做`** 的重议条件归归档卡；`triggers.md` 只收重复错误触发，不收延后项；有决定 Note 时抄一份。

## 输掉的方案

- **把 notes 当收件箱 / 新建 pending 队列**：否——D32 已退役中心队列；会造第二任务源，且与“用户是队列”冲突。需要跨上下文续接时另立卡。
- **让 `proposed/` 收未批提案**：否——会削弱 `proposal-scheduled` 的批准门；本地 D32 的批准门是任务源完整性的前提。
- **状态行作为唯一去向家**：否——状态行是镜像；实践已把结论/去向写在卡顶块/正文；archive 行是历史摘要。强制状态行会逼出重复与漂移。
- **先加门禁再改契约**：否——会把“未批准”的歧义固化；先文本自洽，再门禁。
- **改名 `proposed/` → `approved/`**：延后——牵动 gates/links，另立卡；先写清本地语义。

## 后果

- 五份核心文档对齐：`_backlog/README.md`、`_backlog/methods/issue-to-note.md`、`_backlog/methods/README.md`、`_backlog/AGENTS.md`、`docs/guides/dev-loop.md` §0.5。
- 记录落点统一：`_backlog/issues/README.md` 模板、`_backlog/_archive/settled_issues/README.md`、`notes/README.md`、`notes/proposed/README.md`、`docs/index.md`、D47。
- 归档卡不动；10-09/10-23/10-24 作为历史层的歧义样本保留。
- Phase 5 门禁：归档 `毕业：做` 卡（opened ≥ 2026-10-25）必须首 12 行有 `去向`；老卡祖父豁免。反证 = 真树植入 `2026-10-25-zz-red-handoff.md` → 红；还原 → 绿；spec 的 no-destination/with-destination/old 三夹具。
- 未验/残留：语义走查的“第二读者”仍可能对 `pending` 的 owner 有不同理解；已用 fresh-context 走查覆盖，但不证明任意读者。

## 验证

- `set -o pipefail; pnpm verify`：ALL PASS（2026-10-25）；`backlog-liveness` 输出含“归档做卡去向”；`bare-path ×956`、`notes-liveness ×64`、`ledger-routing ×45`。
- `pnpm exec vitest run tests/harness/backlog-liveness.spec.ts`：25/25（新增 1 例）。
- `pnpm test`：85 文件 / 829 用例通过（2026-10-25 02:10，全量 keyless）。
- 真树红证：在 `_backlog/_archive/settled_issues/` 植入一张文件名带 `zz-` 的 2026-10-25 卡（`opened: 2026-10-25`、`毕业：做`、无 `去向`）+ 归档索引链接 → `node checks/run-gates.mjs` exit 1，原话：
  ```
  FAIL backlog-liveness: _backlog/_archive/settled_issues/2026-10-25-zz-red-handoff.md:1 归档「毕业：做」卡缺去向...
  ```
  删除卡 + 还原索引 → `verify: ALL PASS`（green exit 0）。
- 语义走查（fresh-context 只读子代理，四轮）：
  - 第一轮五张卡四问：卡 1/3/5 可单答；卡 2 硬冲突（关闭 vs 留 `等人拍板`）、`pending` 类型缺失、`以后做` owner / `消化` 判定人未命名。
  - 第二轮：A1/A2/A3/A4/A7 消解；新增 C1（triggers 绝对句）、C2（`等人拍板` 离场权）、GAP-1（下游申请判定人）、GAP-2（谁写 RFC）。
  - 第三轮：C1/C2/GAP-1/GAP-2 消解；新增 R1–R5（触发索引措辞、离场路径、`需` 判据、标题/指代、Note 双 owner）。
  - 第四轮：R1–R5 全 PASS；NEW-1..NEW-4（`implementation` 判据、`none` 是否算去向、note 判否回退、carrier 术语）由最终措辞收口，未再跑第五轮（如实记为走查边界）。

## 适配与来源

- 借源 = 外部仓 ai_dsh_assitant 的 `_backlog`（2026-10-09，机器本地，按惯例不链接）；本地适配 = D32（`proposed/` 已批语义）+ 本 Note。
- 方法名保留 `issue-to-note`（文件名/链接稳定），H1 改为 `Request downstream handling (RFC / Note)`。
- D47 = 本 Note（`docs/decisions.md` 的 D46 已由同日另一决定占用）；决定正文住这里，程序住方法，权限/关闭住章程，Note/RFC 判据住 notes/README。
