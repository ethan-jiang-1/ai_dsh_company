---
状态：implemented（2026-10-28，第四轮批 E1：结构收家与门禁补盲）
---

# 批 E1：把重复小工具收家，把 src-layering 的 require/注释盲区补上

> 上游 = [第四轮六维打扫卡](../../../_backlog/_archive/settled_issues/2026-10-28-repo-hygiene-round4.md)；审计 = [第四轮报告（R4-16 / R4-17）](../../../_backlog/_archive/research/repo-hygiene/2026-10-28-six-dimension-audit-round4.md)。

## 决定

1. **`parseCatalog` 从页签组件搬出**：新建 `packages/company-pack/src/client/deliverables-index.ts`，收 `DeliverablesCatalogEntry` / `DeliverablesCatalog` / `CatalogFilter` / `parseCatalog` / `filterCatalog`。`DeliverablesTab` 与 `cultivation-context-data` 都从这里取；数据模块不再 import `.tsx` 组件。
2. **`isRecord` 收家**：`host/bundle-manifest.ts`、`host/catalog.ts`、`client/cultivation-context-data.ts` 三份逐字定义删除，统一 import `lib/guards.ts`（host/lib/client 双编译面都可用的纯叶）。
3. **`clip` / `clipExcerpt` 收家**：`presence.ts` 的 `clip(text,max)`、`cultivation-inbox.ts` 的固定长度 `clip`、`cultivation-context.ts` 的头尾 `clipExcerpt` 全搬 `lib/text.ts`；`cultivation-context.ts` 保留 re-export，外部取用面不变。
4. **`src-layering` 补盲**：
   - `importSpecifiers` 先 `stripComments`（保留字符位置/行号），注释里的示例 import 不再假阳；
   - 新增 `require('...')` / `import x = require('...')` 识别，kind = `require`；
   - 纯逻辑 spec 覆盖注释、require、行号保持；真树红证：client 放一个真实 `require('../host/catalog.ts')` 源文件 → gate 红；删 → 绿。
5. **门禁注释头补负例原话**（2026-10-28，×65 文件 / 166 引用）。

## 输掉的方案

- **把 parser 放进 `lib/deliverables-catalog.ts`**：拒绝。那份是 host 侧从盘 build 目录的生成器；client 解析 JSON 是另一层读模型，混进去会把 host 语义带进 client。
- **用正则直接删注释**：拒绝。会误伤字符串里的 `//`（URL）与模板；用保持位置的状态机，行号仍可点。
- **对所有 `import(变量)` 一律判红**：拒绝。计算式动态导入可能是合法的外部包加载，静态门禁无法解析目标；本次只补 require 与字面动态 import，计算式留给 tsc/人工。

## 后果

- `cultivation-context-data` 不再依赖 UI 组件；`DeliverablesTab` 只留视图与文案。
- `isRecord`/`clip`/`clipExcerpt` 各一处实现；改边界语义只改一个文件。
- `src-layering` 能抓住 `require` 绕行，注释不再制造假红；真树读数从 161 → 166 条相对引用（新增文件自身合法边）。
- 未动四个巨人函数（`CultivationBoard` / `cultivationCommandHandler` / host `apply` / client `apply`）——下一批 E2/E3。

## 验证

- `pnpm test tests/harness/src-layering.spec.ts` → 6 passed（新增注释/require/行号用例）。
- 真树红证：`packages/company-pack/src/client/zz-layering-red.ts` 内容 `require('../host/catalog.ts')` →
  `FAIL src-layering: … zz-layering-red.ts:1 → client → host 不在允许方向`；删文件 → `PASS src-layering ×65 文件 / 166 条相对引用`。
- `pnpm test` → **110 files / 974 tests passed**；`pnpm verify` → ALL PASS；`pnpm typecheck` → exit 0。

## 未验 / 下一步

- 计算式 `import(expr)` 仍不可判（静态门禁边界，已在上面的「输掉的方案」写明）。
- 四个巨人函数的拆分未做；E2 先拆 `cultivationCommandHandler`，E3 拆 `CultivationBoard`。
