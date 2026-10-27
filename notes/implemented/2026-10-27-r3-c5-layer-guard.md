---
状态：implemented（2026-10-27，R3 批次 C5：分层守卫 + 类型面命令）
---

# R3-C5：给 host/lib/client 的方向加一道默认门禁，并把类型检查变成一条可跑命令

> 上游 = [第三轮六维度打扫卡](../../_backlog/issues/2026-10-27-repo-hygiene-round3.md)（R3-01）；
> 同轮前序 = [批次 A](./2026-10-27-r3-batch-a-truth.md)。

## 决定

1. **新增门禁 `src-layering`**（第 48 门）：扫 `packages/company-pack/src/**/*.{ts,tsx}` 的相对引用，
   只按**目标层**判方向——`root → {root,host,lib}`、`host → {host,lib}`、`client → {client,lib}`、
   `lib → lib`；`client ↔ host`、`lib → host/client`、`root → client` 一律红；另查 `lib`/`client` 不许
   `node:` 内建（会编进浏览器叶，TS2591 同类）。越出 `src/` 的相对引用也红。
   判据主体 = [tools/lib/src-layering.mjs](../../tools/lib/src-layering.mjs)（纯逻辑 + spec），门禁只做遍历。
2. **`pnpm typecheck`**（根 `package.json`）= `tsc -b packages/company-pack` 两面。定位是**按需命令**，
   不进 `verify`、不进 pre-push：fresh clone 上 pack 的 client 面依赖 vendor client 的 `.d.ts`，
   没按 bootstrap 构建过就会假红——门禁必须在无构建的树上可跑（这是 src-layering 用路径判据、不用 tsc 的原因）。
3. 入口文档登记：根 `AGENTS.md` 命令表、`dev-loop §9.1` 预算表、`tests/README.md` 改动面表各一行。

## 输掉的方案

- **把 `tsc -b` 放进 `pnpm verify`**：verify 现在是"任何 fresh clone 都能跑"的结构门禁；tsc 会要求
  vendor client 类型先构建，把门禁变成"先 bootstrap 才能验"——顺序反了。
- **把 typecheck 放进 pre-push**：push 延迟随包面增长，而类型面改动是低频；按需命令 + 改动面表足够。
- **用 tsc 的 TS6307 当唯一守卫**：它只在构建时说话，而构建是手工三步（bootstrap），默认回路里没人跑。
- **把 pin 常量搬进 `tools/lib` 让 spec import**：见批次 A 的取舍（牵动 sync-dsh 与历史 Note 落点）。

## 后果

- 门禁数 47 → 48；`gate-wiring` 自动接管接线一致性。
- 分层从"tsconfig 保证"变成"默认回路保证"；真正的类型错误仍由 `pnpm typecheck` / 构建暴露。
- 新增纯逻辑模块 `tools/lib/src-layering.mjs` 与其 spec（5 例）。

## 验证（真跑）

```text
# 红（破坏真文件，不是构造夹具）
packages/company-pack/src/client/Brand.tsx 顶部插入 `import '../host/catalog.ts'`
  → FAIL src-layering packages/company-pack/src/client/Brand.tsx:1 → client → host 不在允许方向（client 允许：client / lib）
还原 → PASS src-layering ×58 文件 / 144 条相对引用（反向零）

npx vitest run tests/harness/src-layering.spec.ts   → 5 passed
pnpm typecheck                                      → exit 0（增量 0 错）
node checks/run-gates.mjs                           → verify: ALL PASS（含 gate-wiring ×48）
```

未验：`pnpm typecheck` 在**全新 clone**（未构建 vendor client 类型）上的行为未实测；按 bootstrap 的说明它需要先跑
vendor client 构建，入口文档已写明这一前置。
