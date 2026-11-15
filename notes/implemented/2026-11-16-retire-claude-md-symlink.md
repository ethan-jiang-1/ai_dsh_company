# 2026-11-16 · 退役 `CLAUDE.md` symlink 与其专属门禁

状态：implemented（2026-11-16 落地；任务源 = 用户点名「有必要吗」→「没必要就把它删了」）

> 上游 = 用户 2026-11-16：`CLAUDE.md -> AGENTS.md` 这个 symlink 还有没有必要留。用户同时指出「CC 号称已经可以使用 AGENTS.md」——读者确认了前提。

## 决定

1. **删掉 `CLAUDE.md`。** 它是 2026-09-28 立的 `AGENTS.md` symlink，唯一职能是兼容只读 `CLAUDE.md` 的旧版 Claude Code / 其他工具。Claude Code 现已原生读 `AGENTS.md`（`CLAUDE.local.md` / `AGENTS.local.md` 叠加机制仍在），这个兼容面的实际收益已经归零，而它需要单独的 symlink 形态门禁去守，是唯一一个「为一个 9 字节文件挂一道常驻门禁」的例外。
2. **删掉 `claude-symlink` 门禁模块。** 该门禁的唯一职责是「`CLAUDE.md` 存在、是 symlink、target 恰好是 `AGENTS.md`」。目标物不存在了，门禁就是死规则——`gate-wiring` 门禁（`checks/gates/` 目录 ↔ `run-gates.mjs` 接线一致）会立刻抓到「模块在盘上但没接线」或反之。
3. **`layout-block` 的 `KNOWN_TOP` 去掉 `CLAUDE\.md|` 分支。** 该正则的用途是「布局块里哪些行是以已知顶层路径开头的、值得做存在性检查」；`CLAUDE.md` 这一项已经没有对应实体，留着会让它继续把别的 `CLAUDE.md` 行当路径断言。**核过无连带面**：`KNOWN_TOP` 是 `layout-block.mjs` 内的局部 const（24/33 两处），不被任何其他文件 import。
4. **入口链不再提 CC 兼容。** `AGENTS.md` 布局块删掉那一行——本仓的指令真身从来只有 `AGENTS.md` 一份，symlink 只是出口。

## 输掉的方案

- **留着**（我第一轮的倾向）：理由是「删除要连带动门禁 + 文档 + Note，收益只是少一个 symlink，成本高于收益」。被用户以「必要性」为准绳否掉——判据应该是「它现在还提供什么」，不是「移除它要动多少处」。零维护成本不构成留存理由。
- **留文件、只删门禁**：失去门禁后，`CLAUDE.md` 迟早会被误写成普通文件（2026-09-27 实际发生过，正是立这道门禁的原因），两份指令开始漂移——比没有这个文件更坏。既然不需要兼容面，整体退役是唯一自洽的形态。
- **改成 `CLAUDE.md` 里写一行「见 AGENTS.md」的普通文件**：多一份需要人工同步的指针，且 reader（旧 CC）拿到的指令强度不如 symlink 直通；相比直接删掉，只多出维护面。

## 状态事实与载体

- **事实**：指令真身 = 仓库根的 `AGENTS.md` 一份；不存在 `CLAUDE.md`，也不存在任何以它为目标的存在性/形态门禁。
- **唯一入口**：新 agent 读指令 = [AGENTS.md](../../AGENTS.md)。
- **读载体**：agent 注入的 `project_instructions`、`AGENTS.md` 布局块。
- **写载体**：无（这是一个纯退役，没有新写面）。门禁清单 = [checks/gates/](../../checks/gates/) 目录本身，由 `gate-wiring` 守接线。
- **环境坏法**：有人在根目录重新建一个手写的 `CLAUDE.md` 并当成第二权威——现在没有门禁会红。**这是有意接受的代价**：本仓已无读 `CLAUDE.md` 的 agent，重建它属于新增需求，应先立决定再立门禁，而不是靠一道空转门禁替未来买单。

## 未覆盖轴

- [covered] 全仓零残留引用（`claude-symlink` / `claudeSymlink` 均 grep 为空）→ [run-gates.mjs](../../checks/run-gates.mjs)
- [covered] 该门禁模块已从 `checks/gates/` 删除，`run-gates.mjs` 的 import 与调用两行同步移除 → [run-gates.mjs](../../checks/run-gates.mjs)
- [covered] `gate-wiring` 复核接线一致，74 门（原 75）→ [checks/run-gates.mjs](../../checks/run-gates.mjs)
- [covered] `KNOWN_TOP` 改动无跨界消费者（局部 const，零 import）→ [layout-block.mjs](../../checks/gates/layout-block.mjs)
- [policy] 生成索引按目录刷新（75 → 74 门）→ [checks/INDEX.generated.md](../../checks/INDEX.generated.md)
- [unprovable] 仓库外可能仍有脚本/书签假定根目录有 `CLAUDE.md`，本仓观测不到 → [AGENTS.md](../../AGENTS.md)

## 验证

| 判据 | 命令 | 原话 |
|---|---|---|
| 结构门禁（删文件 + 去接线后首跑） | `pnpm verify` | `FAIL script-index: checks/INDEX.generated.md 与目录不一致（126 个公开入口 / 74 门）` |
| 生成索引刷新 | `node tools/repo/checks-index.mjs --write` | `已生成 checks/INDEX.generated.md（142 行）`；diff = `75 个模块` → `74 个模块` |
| 结构门禁（复跑） | `pnpm verify` | `verify: ALL PASS；2 门无对象（replay-fixture-freshness / replay-ui-freshness）` |
| 接线一致性 | `pnpm verify` 内 `gate-wiring` | `PASS gate-wiring ×74（gates/ 目录与 run-gates.mjs 接线一致，零静默哑弹）` |
