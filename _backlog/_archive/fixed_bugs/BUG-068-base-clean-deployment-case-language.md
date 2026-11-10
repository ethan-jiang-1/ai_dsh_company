---
status: 已修
severity: P2
opened: 2026-11-11
---

# BUG-068：base-clean 漏掉部署个案语言——默认章程仍带“公司财务 agent 案 / 日期待核”

> 严重级别：P2（次要）｜发现：2026-11-11｜状态：已修
>
> **留痕**：Note — [声明↔载体门禁](../../../notes/implemented/2026-11-11-declaration-carrier-gates.md)
>
> **审查**：agent — 已修判定逐条对照 + `pnpm verify` / `pnpm test` / `pnpm typecheck` / `preset-smoke` 实跑；证据见「修复与验证」
>
> **研究**：[两产品结构审计](../research/two-product-structure-audit/README.md) · 证据 E9

## 症状

默认章程（随包分发的 `content/charters/`）仍带本部署的个案语言：

- [cfo.md](../../../packages/company-pack/content/charters/cfo.md)（第 6 行）：
  “SoD 纪律…（**公司财务 agent 案**的闸门口径）”
- [cfo.md](../../../packages/company-pack/content/charters/cfo.md)（第 9 行）：
  “服务类附赠…**常设口径**（同类第 2 次出现时回流立法，**日期待核**；此后不再重复问）”
- [vp-sales.md](../../../packages/company-pack/content/charters/vp-sales.md)（第 8 行）：
  “（**公司内部「财务 agent workflow」动议**即源于此）”

而每份章程底部都写着“**出厂版本不含任何部署历史**”。`base-clean` 对当前内容判 **OK**；
在临时副本里再往 charter 加一句“客户 X 的财务 agent 案：日期待核”，仍然 **OK**。

## 根因（假设）

`base-clean` 对 charter 的判据只有两条正则：`^- \d{4}-\d{2}-\d{2} · `（历史条目）与
`snapshots/archive|deliverables-archive`（归档引用）。它没有“部署个案语言”的判据，
所以“公司…案”“日期待核”“内部…动议”这类不带日期前缀的个案叙述可以穿过门禁。

## 暴露的失败类

**门禁判据窄于教义**：教义说“出厂内容零部署历史”，门禁只查“日期前缀 + 归档引用”两种形状。
同型检查：其他“零部署历史/零公司事实”的判据是否也只查了一两种语法形状，而漏掉散文个案。

## 复现

```sh
node _backlog/_archive/research/two-product-structure-audit/experiments/e9-base-clean-blindspot.mjs
```

- 当前副本：`OK base-clean 只读内容零部署历史（CHARTER ×6 + 手册/模板/状态）`。
- 加个案句的副本：仍然 `OK`。
- 原始输出：[raw/e9.txt](../research/two-product-structure-audit/experiments/raw/e9.txt)

## 修复方向（未授权）

- **挪走个案**：把 CFO 的“服务类附赠”常设政策移进 `content/company/policy-lines.md`（或部署覆盖），
  章程只留指针；删掉“公司财务 agent 案 / 日期待核 / 内部动议”的叙述。
- **加判据**：`base-clean` 增加部署个案语言 denylist（至少覆盖 `公司.*案`、`日期待核`、`内部.*动议`、
  `本部署` 等），并保留“新 charter 用中性写法”的负例测试。
- 注意别误伤通用词（“案例”在方法 skill 里可能是合法的）；先做 charter 面的窄规则。

## 修复关联

未修。修复面 = `content/charters/{cfo,vp-sales}.md`、`content/company/policy-lines.md`、
`checks/gates/base-clean.mjs` 与对应测试。

## 已修判定

修成什么算修好（2026-11-11 修复就绪时定）：

1. 默认章程正文（`## 历史纪要` 之前）不再出现 `公司 / 客户…agent…案`、`内部…动议`、`日期待核`。
2. CFO 的“服务类附赠 / 服务信用”整块移入 `policy-lines.md`；10% 有唯一家；charter 只留指针。
3. `base-clean` 加 charter 窄 denylist；反证：往 charter 正文加个案句 → 红；中性章程 → 绿。
4. `pnpm verify` 绿。

## 修复与验证

- CFO 章程的服务类附赠块（含 10%）移入 `content/company/policy-lines.md`；`cfo.md` 只留指针；
  `finance-compliance` / `vp-sales.md` 的个案措辞删除。
- `base-clean` 加 charter 正文 denylist（公司/客户…agent…案、内部…动议、日期待核）；
  页脚“本部署的动议纪要…”与 CMO 的“本部署以 KB 事实为准”是合法通用语，不列入。
- 红→绿：往 CFO 章程正文加“客户 X 的财务 agent 案：日期待核；公司内部动议” → 红（三条）；
  还原 → `PASS base-clean`。
- `pnpm verify` ALL PASS；`content-single-home` 的 10% 只剩 policy-lines 一处。
- 证据 = [Note](../../../notes/implemented/2026-11-11-declaration-carrier-gates.md)「验证」节。
