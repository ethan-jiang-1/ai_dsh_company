# Human Exits 批 1：摘要与台账来源治理

状态：已交付（2026-10-11；Human Exits RFC 的批 1，批 2/3 见同目录两份 Note）
来源：[Human Exits RFC](2026-10-11-human-exits.md)；[语言层 issue](../../_backlog/_archive/settled_issues/2026-10-11-plain-language-human-exits.md)；[表达层 issue](../../_backlog/_archive/settled_issues/2026-10-11-human-exits-expression.md)

## 决定

- meta 的「一句话结论」写准确的业务结论，不设机械字数上限、不截断；机制名、门禁号和内部判据不作为常驻结论主体，完整事实/假设细节留在 `final.md`。
- 新增或修正的台账结论逐字取自对应 meta；历史台账行按原记录保留。
- 只修 V4 活跃 meta，并补齐 V4 台账行；不批量改其他历史行或 archive。

## 输掉的方案

- **固定字符上限或 UI 截断**：否决。用户已决定不设 meta 硬上限；截断会损失结论，不能修复来源问题。
- **只改台账、不改 meta 来源规矩**：否决。会留下两个可编辑的结论来源，后续仍会漂移。
- **批量重写历史台账**：否决。本批只处理 V4 活跃反例，历史内容保留其记录语境。

## 实现

- `company-workspace/templates/meta.md`：补充业务结论、无硬长度限制和逐层承载规则。
- `company-workspace/kb/motion-ledger.md`：补充 meta 逐字引用规矩，并新增 V4 台账行。
- `company-workspace/deliverables/2026-10-10-ai-transformation-2026-v4/meta.md`：将 835 字内部复盘段改为业务结论，保留 V4 达标、反事实未达标原因和真实缺陷已修复三项核心事实。
- `tests/company/ledger.spec.ts`：增加生产 V4 meta 与台账逐字同源、V4 必须登记的确定性断言。

## 验证

### 红

命令：`pnpm exec vitest run tests/company/ledger.spec.ts -t 'V4 活跃 meta'`

结果：失败（1 failed，5 skipped），断言 `V4 活跃交付物必须在台账登记: expected undefined to be defined`。这证明旧状态确实缺少 V4 台账行。

### 绿与回归

- `pnpm exec vitest run tests/company/ledger.spec.ts -t 'V4 活跃 meta'`：通过（1 passed）。
- `pnpm exec vitest run tests/company/ledger.spec.ts`：通过（6 passed）。
- `git diff --check`：通过。
- `pnpm verify`：`verify: ALL PASS`；包含 `proposal-scheduled ×1`、`backlog-liveness` 和全部现有结构门禁。
- 语义审查的实际 diff 仅包含本批模板、V4 meta、台账和测试文件；未发现其他历史台账行或 archive 被修改。

批 2（preset/模型行为）见[批 2 Note](2026-10-11-human-exits-batch2-contract.md)；批 3（LedgerTab/compact/open-in-app）见[批 3 Note](2026-10-11-human-exits-batch3-ui.md)（open-in-app 现场验收仍是环境阻断）。
