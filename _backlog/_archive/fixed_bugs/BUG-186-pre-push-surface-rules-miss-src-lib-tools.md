---
status: 已修
severity: P2
opened: 2026-11-15
---

# BUG-186：pre-push 的面规则只覆盖 client/presets/content，搬移面触发不到真入口

> 严重级别：P2（次要）｜发现：2026-11-15｜状态：已修｜修复：2026-11-16｜审查：agent（独立盲审）— 2 blocker（typecheck 规则类型互斥；归档后 bug-coverage 缺具名守卫）已修复；建议 S1–S8 全部处置（根配置覆盖、tools coveredBy 补 coverage-ratchet、tests/README 同 diff、阈值判据口径、负例过滤、词表全量核对、计数校正、删「未接 N」数字）
>
> **关联**：[探索卡 Round 92](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)；C11 子面 M4（静默弱化）；与 [BUG-185](BUG-185-replay-lane-stale-built-presence-import.md) 同族（后者就是这条规则漏掉的真实后果）。
> **留痕**：Note [2026-11-16-move-side-effects-and-live-pointers.md](../../../notes/implemented/2026-11-16-move-side-effects-and-live-pointers.md)（本批共用）。

## 症状

`.githooks/pre-push` 调用 [pre-push-surfaces.mjs](../../../checks/pre-push-surfaces.mjs)，按 [asset-lanes.mjs](../../../tools/lib/core/asset-lanes.mjs) 的 `SURFACE_RULES` 选真入口检查。规则只有三条：

- `packages/company-pack/src/client/**` → `client-load`
- `packages/company-pack/presets/**` → `preset`
- `packages/company-pack/content/**` → `replay`

`src/lib/**`、`src/host/**`、`tools/**`、`tests/**`、`checks/**` 都不在规则里。三批搬移的 changed files 用 `selectSurfaces` 实跑：

```text
29ae8c94 tests 分轴: changed=80 assets=[] matches=0
1eb14f46 src↔tests 对齐: changed=251 assets=[client-load, preset] matches=35
57d34a34 tools 四组（原 5c2c0796）: changed=127 assets=[] matches=0
```

`1eb14f46` 的两条是它顺手改了 client/preset 面，不是 `src/lib` 搬移被映射；同一提交把 `src/lib/presence.ts` 搬进子目录，`replay` 没有被选中——于是 [BUG-185](BUG-185-replay-lane-stale-built-presence-import.md) 的旧 built 路径一直活到手工跑 replay 才暴露。

## 运行面

tooling / 验证面（`.githooks/pre-push` + `checks/pre-push-surfaces.mjs` + `tools/lib/core/asset-lanes.mjs`）。不是产品运行时；影响「改到哪个面就必须跑哪条真入口」的机械保证。

## 复现

```sh
node checks/pre-push-surfaces.mjs --dry-run --paths packages/company-pack/src/lib/presence/presence.ts
```

修复前：规则表无命中，打印「未触发面级检查」（`--paths` 是本次为单点复现补的直给入口）。修复后：打印 `→ replay`。批次回归 = `node runtime/tmp/c11/pre-push-surface-check.mjs`。

## 根因与证据

- **根因**：`SURFACE_RULES` 是按「产品内容面」建立的，建立时（2026-11-13）只收了 client/presets/content 三条；随后 host/lib 分组与 tools 四组两次搬移没有扩表。规则表本身没有「新目录必须登记」的检查——`asset-lanes` 只校验登记资产的文件存在，不校验**路径覆盖面**；`selectSurfaces` 对未命中**静默返回空集**，于是「有意不跑额外检查」与「忘了登记」同形。
- **证据**：三批提交的 `git diff --name-only` + `selectSurfaces` 实跑（上表）；`replay` 的 broken import 在同一窗口存活（BUG-185）。
- **已知边界**：pre-push 仍跑 `verify` / `typecheck` / `lint` / `dup` / `smoke:fast` / `test:checks` / `coverage-ratchet`；缺口是**真入口 lane**（replay / company-entry / release / preset / client-load），不是「push 完全没检查」。

## 失败类与同类排查

**失败类 = 配置组合**（面规则注册表未随目录搬移扩面，选择器对未命中静默返回空）。

同类扫描：`SURFACE_RULES` 三条 glob 逐条对盘（都命中真实文件）；`asset-lanes` 的 30 资产 + 59 探针路径全查（都真实存在）；缺口只在「哪些改动面应映射到哪些资产」这一层，不在资产文件本身。

**修法取舍（被否的方案留下）**：卡面原建议把 `src/host` / `tools` 映射到 `company-entry`/`preset`。查实后否掉 `company-entry`：它要 `_dist` tarball（缺则 exit 2）、成本 ~1–2 min，且 lane 登记在 weekly；塞进 push 会同时违背 `.githooks/pre-push` 的成本边界与「缺 tarball 的开发树」可用性。`tools/** → preset` 语义不成立（preset 不加载工具面）。采用的修法 = **真入口照挂 + 无额外 lane 的面显式申报由哪条无条件步骤覆盖**，让豁免也成为登记项。

## 修复方案与范围

- `SURFACE_RULES` 增 `src/lib/**` → `replay`（replay 直接 import lib 的构建产物；这是 BUG-185 的实际缺失面）。
- 增 `src/index.ts` / `cordis.patch.yml` → `preset`（包入口与组合行 → 真挂载）。
- 其余面用 `coveredBy`（词表 = `UNCONDITIONAL_STEPS`，spec 读 `.githooks/pre-push` 原文核对）：`src/host/**` → smoke:fast + coverage-ratchet + typecheck + verify；`tools/**`、`checks/**` → test:checks + coverage-ratchet + verify；`tests/**` → coverage-ratchet；文档/技能/运行配置/探针/快照 → verify；根配置/CI/hook/vendor 指针 → verify + typecheck。
- `selectSurfaces` 返回 `covered` / `unseen`；`pre-push-surfaces.mjs` 逐条打印显式豁免，并把既无规则也无申报的路径打印为「未分类」，不再静默。
- 防复发：`tests/repo/budget/asset-lanes.spec.ts` 断言每个改动面都有证据、src 分组与仓库顶层目录都登记、`coveredBy` 只引用 hook 真跑的步骤；负控 = 删掉 `src/lib` 规则 → `--dry-run --paths` 不再打印 replay 且 spec 红。
- 明确不改：不把 weekly 慢档（company-entry / release）塞进 pre-push；不改已经登记的资产本身。

## 已修判定

`node checks/pre-push-surfaces.mjs --dry-run --paths packages/company-pack/src/lib/presence/presence.ts` 打印 `→ replay`；`node checks/pre-push-surfaces.mjs --dry-run --paths tools/dev/company.mjs` 打印「无额外 lane；证据 = 无条件 test:checks + coverage-ratchet + verify」；三批提交用 `selectSurfaces` 复跑都非空且 `unseen=0`（runtime 脚本实跑）；`pnpm test tests/repo/budget/asset-lanes.spec.ts` 退出 0。负控 = 删掉 `src/lib` 规则 → 同一 `--dry-run` 命令退回「未分类」且 spec 红；还原 → 绿。

## 修复证据

- 改动面：`tools/lib/core/asset-lanes.mjs`、`checks/pre-push-surfaces.mjs`、`tests/repo/budget/asset-lanes.spec.ts`
- 红：`pnpm test tests/repo/budget/asset-lanes.spec.ts`（3 例红：src/lib 不触发 replay、多数改动面无证据、顶层目录未登记）
- 绿：`pnpm test tests/repo/budget/asset-lanes.spec.ts`（13 passed；三批提交复跑 unseen=0，dry-run 对 src/lib 打印 replay）
- 提交：commit 713acc60
