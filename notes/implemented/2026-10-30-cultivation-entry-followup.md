# 2026-10-30 · 培养入口与证据可读性收口

状态：已交付（用户 2026-10-30「好的, 听你的建议」）
上游 = [_backlog/_archive/settled_issues/2026-10-30-cultivation-entry-followup.md](../../_backlog/_archive/settled_issues/2026-10-30-cultivation-entry-followup.md)
前决定：[培养主线与证据](./2026-10-30-cultivation-work-improvement-traceability.md)、[培养主视图](./2026-10-28-cultivation-main-view.md)、[GUI 行动面](./2026-10-17-cultivation-gui-actions.md)。这些决定继续有效；本 Note 只收口入口后的误发/误导/可读性。

## 决定

1. **跨角色建议不预选目标角色。** 打开“给别的角色提建议”时 `targetRole` 为空，角色 pills 无 active；未选时“记下来”禁用并提示“先选一个目标角色；未选不会提交”。选定后才发 `/cultivation suggest <role> …`。不把第一个非本角色当默认值。
2. **入口文案对齐实际控件。** “怎么养”改为“点上面「开始记录一项工作」→「给你的角色留一条方法/给别的角色提建议」”，不再把选择器里的按钮说成直接可见。
3. **自纠正状态说人话。** 提出者与目标同角色的 open 纠正显示“待我决定”（不是“待对方处理”）；“我提交的 · 我已处理”说明自己的纠正在“需要我处理”里决定、跨角色建议等对方处理；拒绝回执按 `kind` 说“纠正/建议”。采纳/拒绝 Tag 用“目标角色语境下的人”，不简写成“目标角色的人”。
4. **验证历史逐条可读。** 每条观察独立成行：有用/没起作用 Tag + 依据 + 人话时间；原始 ISO 只放 `title` 供核对。超过 3 条给“查看全部 N 条观察”，展开后给“只看最近 3 条”。
5. **主视图标题回到用户目标。** `培养 · 方法工作台` → `让角色今后的工作更好`；副标题不再列“纠正/方法/journal”。
6. **培养对话失败不丢输入。** `prompt` 失败/抛错时恢复草稿并显示原因；流式 `liveText` 变化也触发滚动到底。

## 输掉的方案

- **保留默认目标角色**：败于建议会静默发错人；目标角色是治理对象，不是可猜的默认值。
- **把自纠正从“我提交的”过滤掉**：牵动列表语义（已采纳/已拒绝的回执仍要在“我提交的”里），本卡只改状态语言；是否合并列表留主任务 IA 决定。
- **验证历史用表格**：窄右栏/浮窗会横向挤压；用堆叠观察行更稳。
- **主任务自然语言入口 + 候选预览**：需要重做第一步交互与目标确认，超出本卡 P1/P2；另开卡。

## 验证（实跑）

- 红：① 修复前诊断——`suggest` 不选角色直接提交，实际命令为 `/cultivation suggest vp-eng …`（临时诊断 spec 精确断言，删除后不留树）；② 临时回退 `CultivationCompose` 的默认目标 → “给别的角色提建议”测试在“未选时提交应禁用”断言红；③ 临时回退验证历史旧渲染 → `.wk-cultivation-observation` 断言红。两次回退后均恢复，定向 62 绿。
- 绿：`pnpm exec vitest run tests/client/cultivation-board-actions.spec.ts tests/client/cultivation-board.spec.ts tests/client/cultivation-chat-panel.spec.ts tests/client/cultivation-view.spec.ts`：4 files / 62 tests PASS。
- `pnpm test`：118 files / 1018 tests PASS。
- `pnpm typecheck`：exit 0。
- `pnpm verify`：ALL PASS；2 门无对象 SKIP。
- 真浏览器 `node probes/browser-visual/cultivation-gui-probe.mjs --isolated`（先 `tsc -b` + `tsdown`，mtime 守卫拒旧 lib）：ALL PASS。⑤b 显式选 CFO 前提交禁用 + 提示在场，选后记录 `targetRole: cfo`；⑤e 验证无依据不发、有用/失败两条历史、失败不撤回；其余采纳/日志/角色闸/背景/零挂载全绿。
- 诚实边界：主任务仍是“一个入口 → 选纠正/建议 → 旧表单”，不是原型的自然语言案例工坊；自纠正仍同时出现在两个列表，只是状态语言不再矛盾；真人新手走查仍未执行。

## 边界

数据模型、`/cultivation` 命令语法、角色闸、AI 起草边界均未改。验证历史仍是有界 `verificationHistory`；`method` 卡的历史呈现变了，记录格式不变。培养对话的失败/流式是客户端行为；真浏览器主视图/对话仍没有专门探针，只有 keyless + 运行态截图。
