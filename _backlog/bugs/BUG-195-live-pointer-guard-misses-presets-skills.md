---
status: 修复就绪
severity: P2
opened: 2026-11-16
---

# BUG-195：live 指针守卫不扫 presets / skills，随包分发的 SKILL 里旧 spec 路径仍绿

> 严重级别：P2（次要）｜发现：2026-11-16｜状态：修复就绪
>
> **关联**：[探索卡 Round 93](../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)；BUG-187/188/189 的守卫（`tests/repo/docs/live-pointer-paths.spec.ts`）。
> **留痕**：Note（本批共用；落地同 diff 写 `notes/implemented/2026-11-16-guard-surfaces-not-samples.md`）。

## 症状

`live-pointer-paths.spec.ts` 的扫描面只有三处：`packages/company-pack/src/**`（`.ts/.tsx`）、`notes/implemented/**`、`checks/audit/**`。`packages/company-pack/presets/**` 的 SKILL/persona 与 `.agents/skills/**` 是**随包分发、模型可读**的活指令，但不在面内。向一个 preset SKILL 与一个 `.agents` SKILL 各注入一条不存在的 `tests/*.spec.ts`，spec 仍 6 passed。

## 运行面

tooling / 活指针守卫；载体是 shipped presets 与 host skills，不是运行时行为（但会被模型照着读）。

## 复现

```sh
f=packages/company-pack/presets/vp-eng/skills/eng-workflow/SKILL.md
cp "$f" /tmp/preset-skill.bak
printf '\n<!-- stale pointer probe: tests/host/cultivation-legacy.spec.ts -->\n' >> "$f"
pnpm test tests/repo/docs/live-pointer-paths.spec.ts   # 期望红，实际 6 passed
cp /tmp/preset-skill.bak "$f"

g=.agents/skills/close-out-definition/SKILL.md
cp "$g" /tmp/skill.bak
printf '\n<!-- stale pointer probe: tests/lib/ledger-legacy.spec.ts -->\n' >> "$g"
pnpm test tests/repo/docs/live-pointer-paths.spec.ts   # 同样 6 passed
cp /tmp/skill.bak "$g"
```

实跑日志 = `runtime/tmp/c11/mut-live-preset.log`、`mut-live-skill.log`（两次 spec exit 0）。两处还原后 `git diff` 为空。

## 根因与证据

- **根因**：BUG-187..190 的修复只覆盖了当时实证的三类载体；presets/skills 是后续一批搬移（`5c2c0796`/`57d34a34`）新暴露的同族载体，没有进判据。
- **确认**：两个注入点各自绿；还原后绿。
- **为什么不是纯理论**：skills/presets 里已经有 `tools/*`、`tests/*` 路径（如 quality-loop skill 的 parity spec 注释），它们是同一种「照着跑」的指针。

## 失败类与同类排查

**失败类 = 文档指针**（守卫的载体集合不完备）。

同类：`.agents/skills` 的 tools/release.mjs 旧路径曾是 BUG-186 修复前的事故；`command-refs` 现在扫 `.agents` 但只认 `pnpm`/`node` 命令，不认裸 `tests/*.spec.ts`。`presets` 仍完全不在任何路径门禁里。

## 修复方案与范围

- `live-pointer-paths.spec.ts` 加两个面：`packages/company-pack/presets/**`（`.md/.yml`）与 `.agents/skills/**`（`.md`）；负例 = 两个注入点各自红。
- 若担心 skill 里的历史引用，按 `zz-`/`nonexistent` 约定过滤；其余按 live 处理。
- 明确不改：不改 presets/skills 内容（只加守卫）。

## 已修判定

向 preset SKILL 注入 tests/host/cultivation-legacy.spec.ts、向 `.agents` SKILL 注入 tests/lib/ledger-legacy.spec.ts → `pnpm test tests/repo/docs/live-pointer-paths.spec.ts` 各红；还原 → 6 passed。`node runtime/tmp/c11/live-pointer-check.mjs` 现有 6 条仍 exit 0。
