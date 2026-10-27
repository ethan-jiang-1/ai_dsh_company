# BUG-018 修复（2026-10-16）：署名审计的写入者归属补「基础角色」规范化

状态：implemented（授权 = 用户 2026-10-16「就setup goal 后逐一落地吧, 记得要走研发流程」；缺陷卡 = [_backlog/_archive/fixed_bugs/BUG-018](../../_backlog/_archive/fixed_bugs/BUG-018-authorship-instance-preset-false-positive.md)；commit = 见本 Note 同轮）

## 决定

`tools/lib/authorship.mjs` 新增 `baseRoleOf(preset)`：**只抹掉团队实例后缀**（`<角色>-<数字>` → `<角色>`）。`classifyAuthorship` 的写入者归属改用它，判档与显示都用基础角色；原始 preset 另存 `writerRaw` 保留实例信息。

- **为什么是规范化而不是降档**：`coo-2` 与 `coo` 是**同一角色的两个实例**（团队插件给第 2、3 个成员发的 preset 带实例后缀，不在 `packages/company-pack/presets/` 的五个 id 里）。署名行写的是角色名，写成 `coo` 是**对的**——判红是把对的判成错的。BUG-018 卡里列的候选 C（带后缀一律降观察档）会连真冒名一起降，**输掉**。
- **为什么不在 audit 侧修**：`classifyAuthorship` 是判据的单一来源（[tools/lib/authorship.mjs](../../tools/lib/authorship.mjs) 头注），档位语义属它；audit 只管 IO 与显示。在 audit 侧规范化会让「判据」在两处各写一遍。
- **为什么保留 `writerRaw`**：规范化只该作用在**比较**这一维，不该把「哪个实例写的」这个事实抹掉。审计的显示面因此改成 `写入=coo(coo-2)`——同角色多实例时看得出是哪个成员，跨角色时零变化。

## 输掉的方案

- **候选 C：带实例后缀的写入者降为观察档**：败于判别力——`vp-eng-2` 写 `coo` 稿会被一起降档，真冒名从此不进退出码。
- **在 `authorship-audit.mjs` 侧规范化**（改 `writerPreset` 再传给判据）：败于判据单一来源——档位判定是 lib 的合同，audit 只是 IO；在 audit 侧修会让同一个规范化逻辑将来在第二个消费者那里再写一遍。
- **`baseRoleOf` 用宽松正则**（如 `/-\d+$/` 直接剥后缀）：败于误伤——任何以 `-数字` 结尾的非角色 preset（例如将来某个版本化的插件 id）都会被改写成非预期角色。实现改成**先逐角色精确匹配 `^<角色>-\d+$`**，不在五个角色内的字符串原样返回（有用例钉住 `warping-9` 原样）。
- **只改比较、不加 `writerRaw`**：败于诊断价值——BUG-018 之所以能一眼看出「全是同角色多实例」，靠的就是诊断里的实例后缀；抹掉它，下次同类问题的现场就没了。

## 后果

- `authorship-audit` 在真盘从 **FAIL（署名不实 10）** 变 **ALL PASS（署名不实 0）**——该仪器恢复成可信信号，不再常年带伤红。
- 判据的判别力**有守卫**：`vp-eng-2` 写 `coo` 稿仍判 `fail`（用例「规范化只抹实例后缀，不吞跨角色差异」）；且 `unsigned-mismatch` 这一档也改用规范化值比较，语义与 `fail` 保持一致。
- 显示面信息**不减少**：`写入=coo(coo-2)`。
- 未做：卡里候选 B（修 `sessionId → 成员名` 映射的构建路径）**留作后续**——它治新增，A 已消存量；映射为何缺失（队友会话不产生 `team/member` 事件？日志轮换？）本轮未查证，属另一条线。

## 验证

- **红（先跑，TDD）**：新用例「同角色的多实例写入者（`coo-2` / `vp-eng-3`）⇒ match」在实现前实跑
  → `× … expected 'fail' to be 'match'`（`Tests 1 failed | 17 passed`）——**这就是真盘 10 条假阳性的最小化**。
- **守卫用例同轮已在场且当时即绿**：「规范化只抹实例后缀，不吞跨角色差异：`vp-eng-2` 写 `coo` 稿仍判 fail」——它证明修复方向没有放宽判别力（改前改后都绿，是**不变量**而非新行为）。
- **绿**：`pnpm exec vitest run tests/harness/authorship.spec.ts` → `18 passed (18)`（原 16 条 + 新增 2 条）。
- **真消费面（决定性）**：`source run/env.sh && node checks/audit/authorship-audit.mjs` → 摘要 `一致 160｜已收回 0｜无署名(观察) 27｜写入者不可考(观察) 8｜**署名不实 0**｜版本引用 158（✗过期 0｜？无版号 39）`，`ALL PASS`，exit 0（改前 `署名不实 10` + exit 1）。`一致` 从 150 → 160，正好是那 10 条归位。
- **显示面**：`✗ …` 十条变 `✓ …｜写入=coo(coo-2)` 等（实例后缀保留在括号里）。
- **全量**：`pnpm verify` ALL PASS；`pnpm test` 61 文件 / 561 用例全绿（559 + 新增 2）。
