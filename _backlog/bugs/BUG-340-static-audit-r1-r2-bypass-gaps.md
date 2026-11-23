---
status: 调查中
severity: P2
opened: 2026-11-23
---

# BUG-340：`company-static-audit`（R1/R2）存在 6 条可被代码直接绕过的静态检查漏洞

> 严重级别：P2（质量防线本身存在可绕过缝隙，导致同族回归仍可 0 违规滑过 `pnpm lint`）｜发现：2026-11-23｜状态：调查中
>
> **留痕**：（待修复时裁决；触及 `checks/lib/company-static-audit.mjs` 静态审计判据与负控测试）

## 症状

对 [`checks/lib/company-static-audit.mjs`](../../checks/lib/company-static-audit.mjs) 构造虚拟 TS 程序实测，以下 6 种明显违反 R1（边界消费）与 R2（双语字面量）规则的写法全部返回 `0 violations`：

1. **R1 `??`/`||` 左枝漏查**：`const { entries } = parseCatalog() ?? fallback` → `0 violations`；
2. **R1 `Promise.all` / 数组解构漏查**：`const [a] = await Promise.all([readWorkspace()]); return a.ok ? a.text : ''` → `0 violations`；
3. **R1 多边界字段只消其一即放行**：`const { rows, headerOk } = readLedger()` 丢弃 `badRows` → `0 violations`；
4. **R1 新边界类型未纳管**：`PendingAcrossSessions`（`asksCapped`/`failed`/`window`）、`HistoryCandidates`（`capped`）、`ContextSourceResult`（`skipped`/`capped`）、`CultivationPanelData` 丢弃边界字段均 `0 violations`；
5. **R2 `src/host/**` 完全跳过**：`src/host/commands/*` 内任何硬编码中文均 `0 violations`；
6. **R2 `cultivation-actions.ts` 整文件豁免**：该文件下半段约 250 行非字典业务函数里写硬编码中文或 `.join('、')` 均 `0 violations`。

## 运行面

- **面 = checks / tooling**：[`checks/lib/company-static-audit.mjs`](../../checks/lib/company-static-audit.mjs)、[`tests/tools/company-static-audit.spec.ts`](../../tests/tools/company-static-audit.spec.ts)。

## 复现

```sh
pnpm exec tsx -e "
import { resolve } from 'node:path';
import { createVirtualProgram, runStaticAudit } from './checks/lib/company-static-audit.mjs';
const ROOT = process.cwd();
const V = resolve(ROOT, 'packages/company-pack/src/client/virtual-types.ts');
const DEFS = 'export interface DeliverablesCatalog { schema: 1; entries: string[]; skipped: number }\nexport function parseCatalog(): DeliverablesCatalog | null { return null }';
const BAD = resolve(ROOT, 'packages/company-pack/src/client/bypass.ts');
const p = createVirtualProgram({ [V]: DEFS, [BAD]: 'import { parseCatalog } from \"./virtual-types.js\"; export const bad = () => (parseCatalog() ?? { schema: 1 as const, entries: [], skipped: 0 }).entries' });
console.log('violations:', runStaticAudit(ROOT, { programs: [p] }).violations.length);
"
```

实际输出：`violations: 0`（其余 5 条绕过同理均返回 `0`）。

## 根因与证据

1. [`unwrapBoundaryWrapper`](../../checks/lib/company-static-audit.mjs#L291) 只在 `p.right === valueExpr` 时解包 `??`/`||`，忽略了更常见的左枝默认兜底 `call() ?? fallback`。
2. [`checkCallBoundaryUse`](../../checks/lib/company-static-audit.mjs#L373) 在 `varDecl.name` 不是 `Identifier` 时直接 `return`，未追踪 `ArrayBindingPattern` / `Promise.all([...])` 元素绑定。
3. [`BOUNDARY_SPECS`](../../checks/lib/company-static-audit.mjs#L46-L73) 仅列 5 种类型，且 [`L359,377`](../../checks/lib/company-static-audit.mjs#L359) 用 `boundaryProps.some(...)` 允许 `MotionLedger` 丢弃 `badRows`。
4. [`checkCjkInFile`](../../checks/lib/company-static-audit.mjs#L401-L403) 只扫 `client/` 与 `lib/`，不扫 `host/`；[`CLIENT_DICT_FILES`](../../checks/lib/company-static-audit.mjs#L21-L25) 整文件豁免混合了逻辑代码的 `cultivation-actions.ts`。

## 失败类与同类排查

- **失败类**：`tooling` / 门禁空洞（与 [`BUG-296`](../_archive/fixed_bugs/BUG-296-real-page-lanes-stale-client-bundle.md) 同属检查器本身漏网）。
- **同类排查**：对照 `tests/tools/company-static-audit.spec.ts` 现有 9 条用例，全集中于右枝/`useMemo`/顶层变量/`client`+`lib`；需补 6 条负例与正向零误报验证。

## 修复方案与范围

- **根因修法**：
  1. `unwrapBoundaryWrapper` 同时解包 `??`/`||` 的左枝（`p.left === valueExpr`）；
  2. 支持 `Promise.all([...])` 与数组解构按位置追踪；
  3. 支持 `allBoundaryProps` 选项（对 `MotionLedger` 要求 `badRows` 与 `headerOk` 不得单丢其一），并纳管 `PendingAcrossSessions` / `HistoryCandidates` / `ContextSourceResult`；
  4. 将 `cultivation-actions.ts` 的纯字典拆出或仅对 `CULTIVATION_COPY_ZH` 常量声明豁免（逻辑区恢复 R2 严格检查）；
  5. 为 `src/host/**` 先上线只读计数基线 / 按文件棘轮（确认零误报后再决定阻断）。
- **注意**：需先清理或登记仓库现有存量，保证改动后实仓 `pnpm lint` 保持 0 误报且这 6 条负例全红。

## 已修判定

- 上述 6 条绕过构造场景在 `tests/tools/company-static-audit.spec.ts` 均触发 `FAIL [R1:must-use-boundary]` 或 `FAIL [R2:no-literal-cjk-or-punct]`；
- 修复存量违例/建立清晰基线后，实仓 `pnpm lint` 与 `pnpm test` 全绿。
