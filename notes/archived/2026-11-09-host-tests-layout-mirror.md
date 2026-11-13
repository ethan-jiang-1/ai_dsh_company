# 2026-11-09 · host 八组 + tests 镜像 + kb-setup 装配清单：把「找得到」变成结构

状态：implemented（2026-11-09；verify/test/typecheck 全绿）
上游 = [三层分离卡](../../_backlog/_archive/settled_issues/2026-11-09-company-specificity-externalization.md)
（决定正文 = [三层 Note](../implemented/2026-11-09-generic-specific-separation.md)）

## 决定

**1. `src/host/` 从 31 个平铺文件拆成 8 组**（按关切，不按技术层）：

```
run-bundle/  workspace/  cultivation/  ledger/  delegation/  commands/  prompt/  logging/
```

组地图 = [host/README](../../packages/company-pack/src/host/README.md)；新文件先归组，跨组 import 走
`../<group>/<file>.ts`。公开入口仍是 `src/index.ts`，构建产物形状不变（bundle 单文件）。

**2. `tests/` 镜像 `src/`**：

```
tests/host/<group>/…   ← 对应 src/host 八组（+ tests/host/index/ 组合面）
tests/lib/…            ← 对应 src/lib 每个模块
tests/content/…        ← 对应 content/ 形状与合同（无 src 对应物，单列一区）
tests/client|presets|harness|support|fixtures   ← 不变
```

旧 company 测试目录删除；`tsconfig.test-company.json` 的 include/exclude 同步为 `tests/host` + `tests/lib` +
`tests/content`。测试断言零改动，只改 import 深度与文档指针。

**3. kb 装配从代码常量改为静态清单**：

- `content/kb-setup/seed.json`：source → target 的唯一映射（含 6 份 charter、身份/编制/政策/复核/编号合同/
  guide/run-bundle）。
- `content/kb-setup/guide.md`：人写说明书，seed 成 `.dsh-company/kb/AGENTS.md`——**用 AGENTS.md 而不是
  README**，因为 DSH 的 agent-instructions 在「成功 read/write/edit 进入更深目录」后会自动加载该目录的
  instruction 文件；agent 一碰 kb 就能看到地图，不需要注入。
- `bootstrap.ts` 退化成读清单的通用循环；**缺源 fail-loud**（不再 `if (!existsSync) continue` 静默跳过）。
- 新门禁 `seed-integrity`：源在场、target 唯一且不越界、guide 按文件名点名每个 kb 目标。

## 输掉的方案

- **保持平铺 + 只加 README 地图**：零 churn，但 31 个文件仍无视觉接缝；人还是找不到。
- **tests 保持 company 测试区平铺（旧名，已删）**：与 `src/host` 分组对不上，找测试还要猜。
- **把所有 seed 源搬进 `kb-setup/`**：层名消失、19 处引用改道、agent 会以为该目录可写——源/实例混淆。
- **guide 叫 `kb/README.md`**：DSH 不自动读 README；对 agent 等于死文件。
- **代码生成 kb 说明**：知识重新藏回 `bootstrap.ts`（原 `RUN_BUNDLE_README` 模板串就是这样）。
- **单文件 roster / JSON import**：需要改 `resolveJsonModule`/构建链；先用 `roster-consistency` 一致性门。

## 验证（真跑的）

- `pnpm verify` → **ALL PASS**（含 `seed-integrity`、`content-manifest`、`generic-clean`、`roster-consistency`、
  `tests-literals`、`src-layering`）。
- `pnpm test` → **166 files / 1320 tests passed**。
- `pnpm typecheck` → exit 0（pack 两面 + `tests/client` + `tests/host` + `tests/lib` + `tests/content` + `tests/harness`）。
- 红→绿：
  - `seed-integrity`：把 seed 的 `org.md` target 改名 → `FAIL guide 未点名 kb 目标`；还原 → 绿。
  - `bootstrap.spec`：删 `state/owners.md`（seed 源）→ `plan.error` 含 `kb 装配缺源`；还原 → 绿。
  - host/tests 搬家用 `pnpm test` 前后同数（1320）兜底：只改路径，无断言变化。

## 未验 / 边界

- agent-instructions 的嵌套加载是读 vendor README 得出的，**真会话未跑**；落地后应观察“碰 kb 后地图出现”。
- `tests/` 仍按关切分组（repo/tools/session/evidence/ui），不镜像 src——它测的是仓库面，没有 src 对应物。
- archived notes 里的历史路径不回写（冻结）；活跃 docs 与源码注释已同步。
- `packages/company-pack/lib/types/**` 是构建产物，路径随下次 `tsc -b` 更新。

## 后果

- 找 host 行为：先看 [host/README](../../packages/company-pack/src/host/README.md)，再进组。
- 找测试：`src/host/ledger/catalog.ts` ↔ `tests/host/ledger/catalog.spec.ts`；`src/lib/signoff.ts` ↔ `tests/lib/signoff.spec.ts`。
- 加 kb 文件：改 `seed.json` + `guide.md`，`seed-integrity` 会核对；缺源在启动/门禁都响。
