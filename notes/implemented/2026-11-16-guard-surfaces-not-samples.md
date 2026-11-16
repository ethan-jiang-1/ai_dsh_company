# 2026-11-16 · 守卫的判据面：从「上次出事的样本」到载体全集

状态：implemented（2026-11-16 落地）

上游 = 用户 2026-11-16「_backlog/bugs 这里头又有不少当借助 exploratory test 发现的 bug，你系统性地看一看，考虑考虑怎么修复……目标是修复所有的 bug」；
来源 = 探索卡 [Round 93](../../_backlog/issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C11 二轮：修复后的守卫面）；批次记录与逐卡判定 = [_backlog/bugs/README.md「2026-11-16 修复交接（根因组 A–E）」](../../_backlog/bugs/README.md)；归档 = [_archive/fixed_bugs](../../_backlog/_archive/fixed_bugs/README.md)。

## 决定

上一轮的守卫修的是「旧搬移残留」，但每条判据的**面**都是按当时出事的样本/后缀/文件清单写的；Round 93 用同样的注入/变异手法证明它们仍是样本级判据。本批把五类判据的面各自推到载体全集：

1. **面规则完备性**（192/199/201）。`asset-lanes.spec` 的完备性只查 20 条样本 + 顶层目录，19 条 tracked 路径既无 asset 也无 `coveredBy` 仍绿；选择器对 `unseen` 只打印不阻断；`--paths` 不归一 `./`。新增结构门禁
   `checks/gates/surface-coverage.mjs`：`git ls-files -z` 全集逐条过 `selectSurfaces`，`unseen` 非空即红（修复提交 1924 条，零写入）。19 条路径按语义登记：`locale/** → client-load`（用户可见文案）、包 `package.json`/`tsconfig*`/`tsdown.config.ts`/`scripts/**` → 全量 test + 类型面 + verify、
   `LICENSE`/`icon.svg` → verify、根 dotfile / `_dist` 手册 / market 暂存 / runtime 白名单 → lint + dup + verify。`pre-push-surfaces.mjs` 对 `unseen` 一律退出非零（含 `--dry-run`），`--paths` 先做反斜杠/`./`/`a//b` 归一。
2. **「命中」必须是普通文件**（193）。阈值键、活指针、构建产物三处判据都从 `existsSync` 换成 `statSync().isFile()`——目录键在 vitest 里同样静默失效，目录名伪装成 spec 文件也不是可跑的 spec。
3. **活指针的载体面**（194/195）。源码面补 `.js/.mjs`（`markdown-shape-core.js` 是产品源码）；新增 `packages/company-pack/presets/**` 与 `.agents/skills/**` 两个面（随包分发、模型可读的 SKILL 是活指令）；`FACES` 成为单一表，面内一起判。
4. **文档与构建字面量的面**（196/197/198）。计数面补 `checks/README.md`、`run/README.md`、`runtime/README.md`、`.agents/skills/**`；构建产物字面量面从「checks/tools/probes 的 .mjs」扩到 live 文本（`.md/.ts/.tsx/.mjs/.js/.sh/.yml`，根/包 README + 包 src/presets/content + `.agents`）；源码候选补 `.js/.mjs`（合法 `.js` 产物不再假红）。`_backlog/`、`notes/`、`snapshots/`、`vendor/` 显式不扫：推敲卡与决策记忆会故意引用旧字面量做负例。
5. **证据标签必须可执行**（200）。`UNCONDITIONAL_STEPS` 的 `coverage-ratchet` 改成与 pnpm script 同名的 `coverage:ratchet`；spec 断言每条标签都在 `package.json.scripts` 里——pre-push 打印的「证据」逐个能直接复跑。

共同不变量：**判据的面 = 载体的全集，不是上次出事的样本；选择器对「未分类」必须 fail-closed，豁免也必须可执行。**

## 输掉的方案

- **只补 19 条 glob、不加全 tracked 门禁**：下一次新增目录仍会漏；样本判据的病根在判据面，不在清单长度。
- **让 spec 直接 `git ls-files`**：`tests/` 的 layering 守卫禁 `node:child_process`；repo 级全集不变量归 `checks/gates/`（那里可以 spawn git）。
- **把 `unseen` 自动当 covered / 只在 spec 红**：两者都让「这个面不需要 lane」与「忘了登记」继续同形；pre-push 必须阻断。
- **扫描面写成整仓**（含 `_backlog`/`notes`）：推敲卡与 decision Note 里的负例/历史引用会假红；按 live 载体面枚举并写清排除理由。
- **证据标签用人读描述 + 打印 node 路径**：标签不可直接复跑；改成与 pnpm script 同名，spec 判可执行。
- **阈值 spec 解析 `coverage.include` 全集**：目前 threshold 只给 pack 源码（`tools/lib` 无阈值档）；判据写明 pack 面并在注释里留「加 tools/lib 阈值时同 diff 放宽」。

## 状态事实与载体

| 项 | 内容 |
|---|---|
| 事实 | 面规则对全 tracked 路径完备；未分类改动面 fail-closed；守卫的「命中」= 普通文件；活指针/构建字面量/计数面 = live 载体全集；证据标签 = 可直接复跑的 pnpm 脚本 |
| 唯一入口 | `checks/gates/surface-coverage.mjs`（全 tracked 完备性）、`tools/lib/asset-lanes.mjs`（`SURFACE_RULES` / `UNCONDITIONAL_STEPS`）、`checks/pre-push-surfaces.mjs`（阻断 + 归一）、四个守卫 spec |
| 读载体 | `pnpm verify`（新门禁）、`.githooks/pre-push`（unseen 阻断）、`pnpm test`（守卫 spec） |
| 契约测试 | `tests/repo/budget/asset-lanes.spec.ts`、`tests/repo/budget/vitest-coverage-thresholds.spec.ts`、`tests/repo/docs/live-pointer-paths.spec.ts`、`tests/repo/docs/typecheck-coverage-claim.spec.ts`、`tests/repo/structure/built-path-literals.spec.ts`、`tests/checks/pre-push-surfaces.test.mjs` |

## 验证

| 层 | 失败类 | 负控（见过红） |
|---|---|---|
| 结构门禁 `surface-coverage` | 配置组合 | 登记前 19 条 unseen → `FAIL surface-coverage`；登记后 ×1900+ PASS；删 `locale/**` 规则 → 红（点名 3 条 locale 路径）→ 还原 → 绿 |
| keyless unit（6 份守卫 spec） | 配置组合 / 文档指针 / 导出形态 | 目录阈值键 → 阈值 spec 红；`.js` 注释注入 → 活指针 spec 红；preset/skill 注入 → 红；checks 的 README 写旧分数 → 计数 spec 红；`docs/testing.md` 注入 ghost 字面量 → 构建字面量 spec 红；合法 `.js` 产物字面量 → 修复前假红、补后缀后绿；`coverage-ratchet` 标签 → 可执行性断言红 |
| 选择器自测 `pnpm test:checks` | 配置组合 | `--paths zz-unregistered/file.txt` 修复前 exit 0、修复后 exit 1；`./` 路径修复前未分类、修复后 `→ replay`（反斜杠同判） |
| 全量 `pnpm test` | — | 253 files / 2153 tests 全绿；`pnpm verify` ALL PASS；`pnpm typecheck` exit 0；`pnpm lint` / `pnpm dup` / `pnpm smoke:fast` / `pnpm test:checks` 全绿；`pnpm coverage:ratchet` PASS（asset-lanes 100/98.33、backlog-liveness 98.29/93.89，均高于基线） |

## 未覆盖轴

- [unprovable] 「所有守卫的判据面都已到全集」没有穷举 oracle；本批只证五类载体 → `_backlog/issues/2026-11-12-deep-surface-continuous-bug-hunt.md`
- [environment-gap] Windows 实机 / clean clone 未跑（`--paths` 的反斜杠归一只有单测）→ `_backlog/triggers.md`
- [covered] 面规则完备性与选择器边界 → `tests/repo/budget/asset-lanes.spec.ts`
- [policy] 未分类改动面 fail-closed 的逃生门（`--no-verify`）与成本边界 → `docs/testing.md`
