# 2026-11-10 · team 任务书：角色包给路径，署名行只抄真实文件

状态：implemented（2026-11-10 落地；上游 = [BUG-055](../../_backlog/_archive/fixed_bugs/BUG-055-team-role-packet-missing-taskbook.md)；
授权 = 用户 2026-11-10「我有两个bug，你看一看，按照我们的流程把它修了吧」）

## 问题

team 角色包告诉成员角色 / CHARTER / skill / KB / 产出 / 边界，却没有「任务书」字段；`work-handoff`
的署名行合同把 `任务书 = .../drafts/ceo.md` 写死。CEO 只发 spawn prompt、没有落任务书文件时，
成员只能套默认路径——署名行的 provenance 指针悬空（BUG-055 探针现场：署名行指向的
`drafts/ceo.md` 不存在）。这不是某个模型不听话，而是角色包与署名合同的字段缺口：合同要求一个
可回溯锚，流程却没有产出这个锚。

## 决定

1. **任务书是 spawn 前置**：CEO 在 `spawn_teammate` 之前把任务书写到
   `.dsh-company/deliverables/<slug>/drafts/ceo.md`——目标/约束/验收、在屋名单与通道、每个成员的
   角色包、机器可读派活行都在里面。盘上没有这份文件就不 spawn。
2. **角色包带任务书路径**：`assembling-the-team` 的角色包模板加
   `任务书：.dsh-company/deliverables/<slug>/drafts/ceo.md`；`generic/collaboration.md` 的 team
   角色包清单同步这一字段。
3. **署名行只抄不编**：`generic/work-handoff.md` 的模板从固定路径改成 `<角色包给的任务书路径>`，
   并给出 `任务书 = 角色包（无文件）` 的显式 fallback——路径必须来自任务书/角色包，不得按默认
   模板编造。
4. **可机械核对**：presets spec 钉住角色包字段、spawn 前置句与署名行契约；新增
   `probes/session-context/team-taskbook-probe.mjs` 用真模型验证「任务书先落盘、成员署名行指向它」。

## 输掉的方案

- **只放宽署名行（写 `任务书 = spawn prompt`）**：诚实但没有可回溯文件，操作员仍无法按署名行核对；
  provenance 的锚从「文件」降成「会话」，收口时只能靠日志考古。
- **让成员自己写任务书**：署名行指向成员自述而非 CEO 的派活，provenance 方向反了；CEO 的验收
  标准也无处落，合稿时无法按同一份书面判据核对。
- **新增 host 工具/机制自动写任务书**：为一个可由 `write` 完成的文件发明机制，违反「优先现成载体」；
  任务书内容需要 CEO 判断，工具只能代劳落盘，反而多一层不可审计的自动生成。
- **只改 skill 不改署名行合同**：模型仍会按旧合同写死默认路径；BUG-055 的探针已经实证。

## 后果

- team spawn 多一步 `write`（任务书），换成员产出可回溯；同一动议的多个成员共用一个任务书文件。
- 署名行路径不再是模板常量；操作员收口必须按真实文件核对，无文件时显式标注而不是猜。
- 角色包与署名行合同的字段缺口由 keyless spec + 真模型探针兜底。模型仍可能不遵守 skill，
  探针会红；真模型不进 `pnpm test`，所以它是验收证据而非门禁。

## 验证

- 红：`pnpm exec vitest run tests/presets/presets.spec.ts` → 1 failed（新断言「角色包必须带
  任务书路径字段」；修前角色包只有角色/CHARTER/skill/KB/产出/边界）。
- 绿：同一命令 → 43 passed。
- 真模型：`node probes/session-context/team-taskbook-probe.mjs --wall 300` → **ALL PASS（294s）**：
  `drafts/ceo.md` 存在；`drafts/coo.md` 首行
  `出稿：COO｜版本 v1｜任务书 = .dsh-company/deliverables/2026-11-10-taskbook-probe/drafts/ceo.md`，
  该路径指向盘上真实文件。
- `pnpm verify` → **ALL PASS**（2 门无对象：replay-fixture-freshness / replay-ui-freshness）。
- `pnpm test` → **171 files / 1415 tests passed**。
- `pnpm typecheck` → 绿（无输出）。
- `preset-smoke` → **ALL PASS**（6 个角色 + 5 个非角色 preset 全部可挂载）。
