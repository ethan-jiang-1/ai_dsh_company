---
name: gate-change-definition
description: Use when adding or changing a gate in checks/gates/ (one gate per module, assembled by run-gates.mjs), to run the definition of done for that change — put the rule in its single owning gate, record why it exists next to the check, and drive it red by breaking the real thing before trusting it, since a gate you never saw fail is not evidence.
---

# 加/改门禁的完成定义

适用：`checks/gates/` 门禁模块里新增或修改任何门禁（装配入口 = `checks/run-gates.mjs`）。纪律权威 = 根 [AGENTS.md](../../../AGENTS.md) 纪律表
（「机械不变量进执行门禁 + 每门带反证」→ vendor `AGENTS.md` Conventions）；本 skill 只管次序与判据。

## 为什么这一步不能跳

**门禁从没红过 = 不知道它会不会红。** 本仓两次实地教训（都与本条同源）：

- `ledger-routing` 首版带一个**永假分支**：只查「解析到的行数 ≥ 20」，而数据行正则与表头无关——
  删掉表头照样解析出 34 行、门禁全绿。**没跑红就上线了。**
- `doc-budget` 直接 `readFileSync`：受管文件缺失时**抛异常中断整个 run-gates**，后面所有门禁一行都不打印。

所以：**先造红，再相信绿。** 而且红要**破坏真东西**（真实文件、真实形状），不是构造一个喂给门禁的假输入。

## 步骤

1. **先确认该不该建（总量封顶，先并后加）。** 无复发证据不建门禁；能用现成载体就不自造；可机械判断的才进 gate（[policy.md §P2](../../../docs/policy.md)）。`checks/gates/` 文件总数受只降不升棘轮约束——新规则优先并入既有 owner 门禁，确需新建必须先合并/退役重叠旧门禁。
2. **定位唯一家 + 严禁手搓裸解析。** 一条规则只住一道门禁；规则正文（为什么存在）写在门禁注释头。**严禁在门禁或 `tools/lib/` 手写裸 Markdown 节切分（`/^##\s+/`）、裸 YAML frontmatter 正则或裸 `.dsh-company` 路径拼接**——一律消费共享解析原语（`vendor/dsh` `mdast` + `js-yaml` / `markdown-shape-core` / `company-root`），防门禁自身沦为第二事实源 bug 工厂。
3. **写检查**，并让失败信息**点名具体位置**（文件:行、行号、文件名的清单）——
   否则实施者拿到"红了"却不知道改哪。
4. **加形状锚。** 若门禁依赖某种文档/表格形状，锚住**表头或结构性标记**，
   而不是"行数够不够"这类**可以被无关内容满足**的弱条件（`ledger-routing` 就栽在这里）。
5. **造红——破坏真东西**，逐条实跑：
   - 删掉被检查的文件 → 红（且**不能崩**，要报「缺失」）。
   - 把规则要禁的形状真写出来 → 红并点名。
   - 若门禁分档（硬/观察、生效日前/后），**两个方向都跑**：该红的红，该豁免的仍绿
     （只验一个方向 = 不知道豁免是真的还是碰巧没扫到）。
6. **还原即绿**，然后把红的原话写进门禁注释的「负例留证」行（带日期）。
7. **同 diff 带 Note**（非平凡变更同 diff 义务），并在 Note 验证表里记下红/绿的原话。

## 完成判据

- [ ] 见过这道门禁**真的红**，且红来自破坏真东西。
- [ ] 失败信息点名具体文件/行号，实施者不看对话能复现。
- [ ] 若分档：**两个方向都跑过**（该红的红 + 该豁免的绿）。
- [ ] 若依赖文档形状：锚在表头/结构标记上，不是弱计数条件。
- [ ] 被检查文件缺失时报「缺失」而非抛异常中断整个 run。
- [ ] 总量封顶已守住（并入既有 owner 门禁或同 diff 合并旧门禁），且未手写裸 Markdown/YAML/路径解析正则。
- [ ] 核心/高风险门禁的新增拒绝分支与静默跳过分支（如 shallow-clone）已补 `tests/checks/` conformance 及 `gate-mutation.test.mjs` 定向变异必漏断言（`pnpm test:checks` 绿）。
- [ ] 「负例留证 <日期>：<怎么破的> → 红」写进门禁块注释头。
- [ ] 同 diff Note 记录了红的原话；`pnpm verify` 全绿。

## 指针（别复述）

门禁清单唯一源 = [checks/gates/](../../../checks/gates/) 目录（每门禁一文件；本 skill 不复述门禁清单）；
负例留证口径与两次实地教训 = [ledger-routing Note](../../../notes/archived/2026-10-09-ledger-routing-table.md)、
[docs-tier-taxonomy Note](../../../notes/archived/2026-10-09-docs-tier-taxonomy.md)；
测试分层与证据纪律 = [testing.md](../../../docs/testing.md)。
