---
状态：implemented（2026-10-28，第四轮批 A：真实性/安全边界）
---

# 批 A：把“全绿”背后的授权、回放与指针口径收成一套

> 上游 = [第四轮六维打扫卡](../../_backlog/_archive/settled_issues/2026-10-28-repo-hygiene-round4.md)；审计 = [第四轮报告](../../_backlog/_archive/research/repo-hygiene/2026-10-28-six-dimension-audit-round4.md)。

## 决定

1. **注入门牌只留指针，不再复述排除项**：`_backlog/AGENTS.md` 与 `_backlog/bugs/README.md` 的“修复就绪”授权改成“限 P1/P2；排除项见章程「缺陷的通道」”。章程仍是唯一家（含“常设指令”），门牌不再有截断风险。
2. **Plan Mode 进入开工首屏**：根 `AGENTS.md` 的“开工最小路径”加一句“feature 任务先 Plan Mode，规则 = policy P1”；`dev-loop.md` 的“唯一见 §0.5”改成“任务入口见 §0.5；Plan Mode 见 policy §P1”，不再指向桩。
3. **回放口径统一到“合成管线场景”**：`tests/README.md` 的“语料回放 = 升 pin 第一道”改为“本仓只有不加载 pack 的合成回放，只证管线可跑，不是第一道”；同 diff 清掉 `replay-smoke` 头注里已停用的 `--ui` 说明、`testing.md` 的 candidate-scan 可用性、`project-map.md` 的“语料有独立标注”与 r3 full 残留。
4. **导航指针只指现行家**：决策台账从 `index.md` 迁到 `decisions.md` 的事实同步到根 AGENTS、docs/AGENTS、project-map、architecture；外部研究材料统一指 `external-research.md`；architecture 的伪 preset YAML 删掉，改成“最小形状以 `presets/ceo/agent.cordis.yml` 为准”，设计层不再复制实现。
5. **计数与路径去漂**：`checks/README.md` 48→50；两处 UI 金样路径改 `snapshots/visual/company-shell/ui.golden.json`；包 README 的“关注”改“待办”；D45/D46 按号排序；data-model 的“摘要全扫 + open/最近 120 全文”只留一处。
6. **预算补完整性、措辞对齐门禁**：`budget-and-ops` / `cdp-probe` 补行数上限；`docs/AGENTS.md` 不再声称“留 ≥5% 头寸”（门禁实际只守 >20% 空置），改为如实描述反向棘轮。
7. **完成定义单一化**：根 AGENTS 的 preset-smoke 注释改为“真挂载检查，完整完成定义 = preset-change-definition skill”，不再把单脚本说成完成定义；dev-loop §1 的“实施→选证据”改成“证据先行：先写红测/立场景，再实施”。

## 输掉的方案

- **保留门牌的排除项摘要**：拒绝。摘要已经截断过一次（丢了“常设指令”），再加注记仍会漂；指针成本最低。
- **改 0.3.15 CHANGELOG 说“部分清理”**：拒绝。更好的修法是把活引用真正清掉，让原句基本成立；历史 Note 保留旧命令不算“活文档”。
- **强制 ≥5% 头寸**：拒绝。当前 11/32 文档 <5%，强制会逼一轮内容迁移；先把措辞对齐门禁的 >20% 反向棘轮，头寸作为“顶格 = 饱和信号”保留。
- **把 architecture 的 YAML 更新成新形状**：拒绝。设计层应回答“为什么”，不是复制可挂载配方；指向真实 preset 更稳。
- **把 preset 完成定义收进根 AGENTS 的完整清单**：拒绝。会把完成定义从领域 skill 复制到常驻层；根 AGENTS 只留指针。

## 后果

- 授权门牌不再可能因摘要漏项把“改常设指令”的修复误判为自授权；Plan Mode 在首屏可见。
- 升 pin 的人不会再按 tests/README 找不存在的语料；真页面车道与合成回放的分工写清。
- 入口链少了两类陈旧指针（ledger/external-research）；design 层不再给不可挂载的配方。
- 文档预算覆盖 30/30 docs（新增两篇指南）；`docs/AGENTS.md` 的长度政策与门禁实际行为一致。

## 验证

- `pnpm verify` → **ALL PASS**（50 门 + 2 门 SKIP：`replay-fixture-freshness` / `replay-ui-freshness` 无对象）。
- `pnpm test` → **106 files / 954 tests passed**（7.50s）。
- `git grep -nE "snapshots/ui|48 个模块|语料回放全绿|replay-smoke --ui|index §外部研究材料|index 决策台账" -- docs checks tests packages AGENTS.md README.md notes` → 仅剩明确标“历史”的 `docs/delegation.md` 与 `notes/{archived,implemented}` 的旧记录；活文档/头注零命中。
- `doc-budget` 新增 `budget-and-ops` / `cdp-probe` 后仍 PASS；`docs/design/architecture.md` 删伪配方后仍在反向棘轮区间。

## 未验

- 真模型认证档（entry-probe / delegation-smoke / probe --full）未跑：批 A 无行为面改动，且需成本授权。
- 未做 notes/archived 的逐篇清理：历史记录保留旧命令，符合“归档不改写”的边界。
