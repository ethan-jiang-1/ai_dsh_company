---
status: 已修
severity: P2
opened: 2026-11-11
---

# BUG-069：T1/T2 标注与 10% 政策线都能穿过 content 门禁

> 严重级别：P2（次要）｜发现：2026-11-11｜状态：已修
>
> **留痕**：Note — [声明↔载体门禁](../../../notes/implemented/2026-11-11-declaration-carrier-gates.md)
>
> **审查**：agent — 已修判定逐条对照 + `pnpm verify` / `pnpm test` / `pnpm typecheck` / `preset-smoke` 实跑；证据见「修复与验证」
>
> **研究**：[两产品结构审计](../research/two-product-structure-audit/README.md) · 证据 E10

## 症状

**一、T1/T2 标注与 manifest 不一致，门禁不查：**

- `content/product-types/hardware-software/overview.md` 与 `business-software/overview.md` 头部都写
  “层：产品类型 · **加载：T1 摘要（≤2KB）**”。
- `content/manifest.json` 把这两份都登记在 **t2**（`content-manifest` 输出：T1 2 / T2 22）。
- `content-manifest` 判 **OK**：它只查“文件在场 / 每份 md 被登记 / 预算”，不解析文件头的 tier 声明。
- 后果：读者/agent 按头部以为是 T1 常驻摘要，按 manifest 又是 T2 按需；到底什么时候读，两份事实。

**二、10% 政策线不在 policy-lines，单家门禁不查：**

- [cfo.md](../../../packages/company-pack/content/charters/cfo.md)（第 16 行）：
  “服务信用（违约补偿、只抵扣不下现金、**≤ 当年维护费 10%**）…**服务信用的 10% 上限**不得当赠品 / 附赠额度”。
- `content/company/policy-lines.md` 对 `10%` 的命中是 **0**。
- `content-single-home` 判 **OK**：它只检查四条核心政策线（毛利 30% / 折扣 9 折 / 固定支出 $500 / 并行 8 个），
  不覆盖 10% 这类其他阈值。

## 根因（假设）

两个门禁都只查“形状”不查“声明”：
- `content-manifest` 的 tier 事实只存在于 `manifest.json`，文件头的“加载：T1/T2”是自由文本，没人对账。
- `content-single-home` 的判据是四条硬编码正则，不是“policy-lines 是唯一政策数字家”的通用规则；
  新增阈值（10%）可以合法地住在 charter 里。

## 暴露的失败类

**门禁覆盖窄于教义**：教义说“三层加载 / 一处事实一个家”，门禁只覆盖了部分文件与四条数字。
同型检查：其他“层/档位/政策数字”的声明是否也只是自由文本，没有对账。

## 复现

```sh
node _backlog/_archive/research/two-product-structure-audit/experiments/e10-tier-policy-coverage.mjs
```

输出要点：

- 两个 overview：`tier=t2`，`header=加载：T1 摘要`。
- `charters/cfo.md` 10% 命中 1；`company/policy-lines.md` 10% 命中 0。
- `content-manifest` OK；`content-single-home` OK。
- 原始输出：[raw/e10.txt](../research/two-product-structure-audit/experiments/raw/e10.txt)

## 修复方向（未授权）

- **T1/T2**：要么把两份 overview 移到 manifest 的 t1（并核 T1 预算），要么把头部改成 T2；
  更稳的是让 `content-manifest` 解析头部的 `加载：T1/T2` 并与 manifest 对账，不一致即红。
- **10%**：把“服务信用 10% 上限”移进 `policy-lines.md`（它本来就是政策数字），charter 只留指针；
  或明确把它归为“个案口径”并移出出厂章程（与 BUG-068 同源）。
- **通用化**：`content-single-home` 从“四条硬编码”升级为“policy-lines 声明一份政策词表，其他文件出现
  词表里的数字即红”；避免每加一条政策就漏一次。

## 修复关联

未修。修复面 = `content/product-types/*/overview.md`、`content/manifest.json`、`content/charters/cfo.md`、
`content/company/policy-lines.md`、`checks/gates/content-manifest.mjs`、`checks/gates/content-single-home.mjs`。

## 已修判定

修成什么算修好（2026-11-11 修复就绪时定）：

1. T1/T2 标注与 manifest 一致（`content-manifest` 解析 `加载：` 对账）；两份 overview 头改成 T2。
2. 10% 服务信用移入 `policy-lines.md`；`content-single-home` 从 policy-lines 派生政策数字词表
   （%、$、个、折、区间），新增阈值不用改门禁。
3. 其他政策数字复述（vp-eng `$200` / org `$2,000` / cfo `10%` / text.ts `30%` 注释）清零。
4. 反证：tier 改回 T1 → 红；写回 `30%` → 红；删核心政策线 → 正向红；还原 → 绿。
5. `pnpm verify` 绿。

## 修复与验证

- `content-manifest` 增 `declaredTier`：解析文件头 `加载：`（读到 `；`/`。`），与 manifest tier 比对；
  两份 overview 头改成 `按需（T2）`（T1 总预算 4096B 装不下，T2 才是真实档）。
- `content-single-home` 重写为“从 policy-lines 派生 token”：9 个政策数字（30% / 9折 / 15-20% /
  $500 / $2000 / $200 / 8个 / 2-3个 / 10%），扫描 content + presets + src；10% 服务信用搬进
  policy-lines；vp-eng $200 / org $2,000 / cfo 10% / text.ts 30% 注释改成指针或中性措辞。
- 红→绿：overview 头写回 T1（manifest t2）→ 红（`tier 声明不一致`）；把 `毛利底线 30%` 写回
  vp-eng → 红（`复述政策数字「30%」`）；删 `并行交付上限` → 红（`缺政策线`）；还原 → PASS。
- `pnpm verify` ALL PASS；`content-single-home（policy-lines 9 个政策数字；49 份 Markdown + 代码面零复述）`。
- 证据 = [Note](../../../notes/implemented/2026-11-11-declaration-carrier-gates.md)「验证」节。
