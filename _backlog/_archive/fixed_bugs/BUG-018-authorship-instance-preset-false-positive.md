---
status: 已修
severity: P2
opened: 2026-10-16
---

# BUG-018：署名审计把同角色的多实例 preset 判成「署名不实」（假阳性 10 条）

> 严重级别：P2（次要——不阻断任何验收，但让该仪器常年带伤红，真信号被噪音淹没）｜发现：2026-10-16｜状态：已修（2026-10-16 同日修复）
> **修复**：候选 A 落地——`tools/lib/authorship.mjs` 新增 `baseRoleOf`（只抹 `<角色>-<数字>` 实例后缀）并用于判档，原始 preset 另存 `writerRaw` 保留诊断信息；真盘 `authorship-audit` 由「署名不实 10 + exit 1」变「署名不实 0 + ALL PASS」。收据 = [implemented/2026-10-16-authorship-instance-preset.md](../../../notes/implemented/2026-10-16-authorship-instance-preset.md)（红→绿原文、守卫用例、输掉的方案在内）。候选 B（修 `sessionId → 成员名` 映射构建路径）留作后续。

## 症状

`checks/audit/authorship-audit.mjs` 在真盘（`company-workspace/`）上 exit 1，摘要行：

```
authorship-audit: 一致 150｜已收回 0｜无署名(观察) 27｜写入者不可考(观察) 8｜**署名不实 10**｜版本引用 158（✗过期 0｜？无版号 39）
FAIL（署名不实 10｜版本引用过期 0）
```

10 条明细全在同一模式上（原文）：

```
✗ 2026-10-10-ai-sprint-2026/coo.md        ｜署名=coo      ｜**实际写入=coo-2**（无更正行——声明了作者却对不上）
✗ 2026-10-10-ai-sprint-2026/coo-prep.md   ｜署名=coo      ｜**实际写入=coo-2**
✗ 2026-10-10-ai-sprint-2026/coo-acceptance.md ｜署名=coo  ｜**实际写入=coo-2**
✗ 2026-10-10-ai-sprint-2026/vp-eng.md     ｜署名=vp-eng   ｜**实际写入=vp-eng-3**
✗ 2026-10-10-ai-sprint-2026/vp-eng-prep.md｜署名=vp-eng   ｜**实际写入=vp-eng-3**
✗ 2026-10-10-ai-sprint-2026/vp-eng-review-sprint.md｜署名=vp-eng｜**实际写入=vp-eng-2**
✗ 2026-10-10-ai-sprint-2026/vp-sales.md   ｜署名=vp-sales ｜**实际写入=vp-sales-2**
✗ 2026-10-10-ai-transformation-2026/coo.md       ｜署名=coo     ｜**实际写入=coo-2**
✗ 2026-10-10-ai-transformation-2026/vp-eng.md    ｜署名=vp-eng  ｜**实际写入=vp-eng-2**
✗ 2026-10-10-ai-transformation-2026/vp-sales-v2.md｜署名=vp-sales｜**实际写入=vp-sales-2**
```

**每一条的「实际写入」都是署名角色本身的多实例 id**（`<role>-<n>`），没有一条是跨角色冒名。角色名部分逐条相同。

## 根因（假设）

1. `checks/audit/authorship-audit.mjs:136` 的写入者归属是两级回落：
   `memberBySession.get(writerEntry.session) ?? writerEntry.preset`
   ——先从 `team/member` 事件建 `sessionId → 成员名` 映射，**映射缺失时回落到该会话 `agentPreset` 原文**。
2. 团队插件给同角色的第 2、3 个成员发的 preset id 带实例后缀（`coo-2` / `vp-eng-3`）；这些 id **不在** `packages/company-pack/presets/` 里（该目录只有 `ceo / cfo / coo / vp-eng / vp-sales`）⇒ 是运行时生成的同角色实例。
3. `tools/lib/authorship.mjs:80` 判「一致」用的是**精确字符串相等**：`claimed === writerPreset`。
4. ⇒ `coo` vs `coo-2` 被判 `fail`（署名不实）。这是**同一角色的两个实例**，语义上不是冒名。

**为什么映射会缺失**：这 10 条都来自 2026-10-10 两场动议。待查方向——① 队友会话是否走了不产生 `team/member` 事件的路径（例如直接 `session/create`）；② 该会话日志是否已被轮换/清理（`写入者不可考` 那 8 条是另一档）。两者都不影响本缺陷的定性：**映射缺失时的回落值本身就带着实例后缀，精确比较必然误判**。

## 暴露的失败类

「审计仪器的判别面没跟上被观测系统的命名演进」——与 [BUG-003](../../_archive/fixed_bugs/BUG-003-present-no-role-gate.md) 同族（当时是「非 Lead 的 present 语义变了，判据没跟上」）。**是否需要横切排查**：是，但范围限于「把 preset id 当作者身份」的三处——`authorship.mjs` 的比较面、`authorship-audit.mjs` 的回落面、以及任何按 preset 名做归属的判据（建议顺手 grep 一遍）。

**为什么不是 P1**：它不阻断任何验收（`authorship-audit` 不进 `pnpm verify`、不进 `pnpm test`），且真跨角色冒名仍会被抓到（`vp-eng-2` 写 `coo` 稿依然判红）——**判别力没丢，丢的是精度**。但它是「真信号被噪音淹没」的典型：一条常红仪器会被读成"background noise"而失去作用。

## 复现

```sh
source run/env.sh && node checks/audit/authorship-audit.mjs        # exit 1，摘要是「署名不实 10」
source run/env.sh && node checks/audit/authorship-audit.mjs | grep '✗'   # 10 条明细，全是 <role> vs <role>-N
```

判据侧最小复现（keyless，不依赖真盘）：

```sh
node --input-type=module -e "
const { classifyAuthorship } = await import('./tools/lib/authorship.mjs')
console.log(classifyAuthorship('出稿：coo｜版本 v1', 'coo.md', 'coo-2'))
// 现输出 { level: 'fail', claimed: 'coo', writer: 'coo-2' } —— 期望 match（同角色实例）
console.log(classifyAuthorship('出稿：coo｜版本 v1', 'coo.md', 'vp-eng-2'))
// 必须仍为 fail（真跨角色冒名）
"
```

## 修复关联

**待定（本卡只记发现与判据，未修）**。候选方向（实施前需先补 keyless 红测，见 [测试宪法 §3.7](../../../docs/testing.md)）：

- **A（推荐）**：在作者归属处把 `<role>-<n>` 规范化为 `<role>` 再比较——规范化只作用在**角色名**这一维，比较仍要求角色相等 ⇒ 跨角色冒名照旧判红（上节最小复现的第二条即是它的守卫）。
- **B**：修 `memberBySession` 映射的构建路径（让队友写盘能解析出成员名）——治根，但依赖会话日志在场，老动议的假阳性不会消失。
- **C**：把带实例后缀的写入者降为**观察档**——最保守，但会让真冒名也降档（不推荐）。

建议 A + B 同做（A 消存量假阳性、B 防新增），并给 A 补一条 keyless 断言钉住「规范化不吞跨角色差异」。
