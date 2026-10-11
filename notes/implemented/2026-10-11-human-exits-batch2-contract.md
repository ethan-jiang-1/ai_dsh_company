# Human Exits 批 2：表达合同切片

状态：已交付（2026-10-11；规则文本 + 阻塞/非阻塞/表达三类行为证据齐）
来源：[Human Exits RFC](2026-10-11-human-exits.md)；[批 2 issue](../../_backlog/_archive/settled_issues/2026-10-11-human-exits-expression.md)

## 决定

在 CEO preset 的现有 owner 落表达合同，不新增 widget 或 Chat renderer：

- 阻塞型选择使用 `ask_user_question`，选项写动作和关键后果。
- 非阻塞缺口写明默认假设继续，并在轮末列待确认。
- 多选项共同维度权衡默认短 GFM 表格；简单二选或窄屏不适合时用列表。
- 关键结论/复核数字提供文件行锚；重复和背景数字不逐项加锚。
- drafts、任务书和成员消息保持内部协作密度。

## 输掉的方案

- 新增第二套人话 widget 或渲染器：否决。当前切片只需补充模型可见规则，既有 DSH 呈现能力已足够。
- 把所有数字都强制加锚：否决。会制造取证链接噪声；规则只覆盖关键数字。
- 把所有比较强制成表：否决。简单二选和窄屏场景用列表更清楚。

## 实现

- `packages/company-pack/presets/ceo/agent.cordis.yml`：补充阻塞/非阻塞处理规则。
- `packages/company-pack/presets/ceo/skills/chairing-staff-meeting/SKILL.md`：补充三件套、条件表格/列表、关键数字锚点和内部协作密度规则。
- `tests/presets/presets.spec.ts`：增加文本合同断言。

## 验证

### 红

`pnpm exec vitest run tests/presets/presets.spec.ts -t 'CEO 人话出口规则'` 在实现前失败：`CEO prefix 必须说明阻塞选择用 ask_user_question`，说明旧规则只有泛化的用户拍板要求，缺少阻塞/非阻塞合同。

### 绿与挂载

- 同一测试实现后通过：`1 passed`。
- `pnpm test tests/presets`：`14 passed`。
- `source run/env.sh && node checks/smoke/preset-smoke.mjs`：`preset-smoke: ALL PASS（5 个 preset 全部可挂载）`。
- `git diff --check`：通过。
- `pnpm verify`：`verify: ALL PASS`。

## 行为证据边界

已运行既有认证档：`source run/env.sh && node checks/smoke/human-loop-e2e-smoke.mjs`，结果 `human-loop-e2e: ALL PASS（12/12）`；该轮的问询卡与收口截图存 `snapshots/probes/human-loop-e2e/2026-10-11/{question-card,after-answer}.png`，本 Note 就是它们的消费入口。

该认证档提供了两类可复用证据：

- 非阻塞建议继续产出，并且没有 approval/ask 闸门事件；建议被当作输入消化。
- 规矩缺口触发真实 `ask_user_question`，浏览器问询卡在场，用户回答后裁决回流 journal 并完成下一轮收口。

这证明了非阻塞继续和真实问询回路的运行能力，但不等同于 Human Exits 全部行为验收。

另新增并运行 `probes/session-context/human-exits-probe.mjs`：真实 CEO 会话中，阻塞拍板场景记录到 `ask_user_question`，首条 assistant 消息同时包含“结论”“下一步”和“拍板/决定/选择”。结果：`human-exits-probe: PASS（阻塞 ask + 三件套）`。该探针是认证档，不进入 `pnpm test`。
⚠ 复核轮（2026-10-11）把断言收紧到**首段**（正文前 400 字）并加了机制黑话负判据——此前用全文 grep，「三件套齐但埋在长散文尾部」这个 RFC 点名的反例照样绿，属于探针弱于其声称。

## 表达行为证据

已新增并运行 `probes/session-context/human-exits-expression-probe.mjs`：真实 CEO 会话要求三个方案按共同维度比较，并为关键数字提供一次文件行锚。结果：`human-exits-expression-probe: PASS（短表 + 关键数字行锚）`。

批 2 当前三类行为证据均已在场：

- `probes/session-context/human-exits-probe.mjs`：阻塞拍板的 `ask_user_question` 与首段三件套。
- `checks/smoke/human-loop-e2e-smoke.mjs`：非阻塞建议继续且无问询闸门；规矩缺口真实问询回流。
- `probes/session-context/human-exits-expression-probe.mjs`：共同维度比较使用短 GFM 表格，关键数字使用文件行锚。

## 非阻塞支的持久日志证据

`source run/env.sh && node probes/session-context/human-exits-nonblocking-probe.mjs '<token-url>'`：真实 CEO 会话里给一个非阻塞缺口（会议时长未给、且不涉预算/对外承诺/授权），跑完一轮并把会话事件落盘到 `runtime/human-exits-evidence/<sessionId>.json`。结果 `human-exits-nonblocking-probe: PASS`，落盘事实为 `ended: true`、`asked: false`（没有 `ask_user_question` 阻停）、`assumption: true`（「默认口径：60 分钟…会议时长未给 → 按此假设，可改」）、`confirmation: true`（轮末「待你拍板：会议时长…」）、`draft: true`（三个议题照常出齐）。这是 RFC「非阻塞缺口带显式假设继续 + 轮末列待确认」的直接会话日志证据，不是规则文本推定。
复核轮（2026-10-11）把两条断言**分开落位**：假设必须出现在正文**前 400 字**、待确认项必须出现在**末 500 字**；此前全文 grep 会把「埋在尾部」和「写在开头」混为一谈。收紧后重跑仍 `PASS`（三次独立会话：`session-6bfc0f7e`、`session-8ab59af8`、`session-73c905ce`）。

## 未验与缺口

- **代表场景未固化为 replay**：RFC 批 2 写的是「代表场景先固化为 replay/会话断言」。现状 = 真模型认证档 + **会话日志断言**（探针读 `session/page` 事件判据，落盘可复核），但**没有** `snapshots/replay/` 场景；keyless 层只有规则文本在场断言（`tests/presets/presets.spec.ts`），它证不了模型行为。要补 replay 需一次带 key 的录制，属独立一轮。

- 简单二选和窄屏退化为列表尚未单独做真实模型场景；规则文本已明确该例外，后续若出现反例再单独补探针。
- 尚未完成长期语料评估；这仍按 RFC 暂缓。
- 批 2 的有限行为验收已完成；批 3 见[批 3 Note](2026-10-11-human-exits-batch3-ui.md)（LedgerTab、compact 显示模式与 open-in-app 现场均已取证）。

## 收口后补记（2026-10-11，第三轮）

- 阻塞支探针升级为**尽力用真 UI 答题收口**（产品路径：浏览器认领卡片 → 点选项 + Enter）；本机 fresh profile 里页面没有排练场工作区入口，按标题搜不到会话 ⇒ 这一步目前只打印失败、不改判据。探针同时加了「模型/传输错误识别 + 有界重试一次 + 退出码 2」，并把判定与事件落盘。
- 实测记录：ask 是前景等待，**没人作答整轮不收口、会话日志不封盘**（`session.vN.jsonl.zstd` 只解出 header）；RPC `userQuestions/answer` 形状为 `{agentId, callId, answer}`，但对未认领的问询返回 `false`，整轮仍不收口。
- 因此「把阻塞支固化成 replay 场景」不是探针小改，需要先决定**答题人放哪一侧**：已立卡 [_backlog/issues/2026-10-11-human-exits-replay-scene.md](../../_backlog/issues/2026-10-11-human-exits-replay-scene.md)，含 enable 材料与三条互斥方案。
