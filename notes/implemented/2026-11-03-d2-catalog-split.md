# 2026-11-03 · D2：catalog 三分（state / presented-ledger / generate）

状态：implemented（2026-11-03；七维复评 Phase 2）

> 上游 = 2026-11-03 fresh 复评 D2「`host/catalog.ts` 474 行、账本 I/O / 会话回扫 / 目录生成三种职责同文件」。

## 决定

- `host/catalog-state.ts`（57 行）：只读/校验 `deliverables-index.json`——`CATALOG_REL` / `catalogPath` /
  `CatalogReadState` / `readCatalogState` / `readCatalog`。
- `host/presented-ledger.ts`（335 行）：审计账本 I/O、legacy 迁移、`ensure/merge/record/audit/setPresentedAudit`、
  会话/事件观测（`presentedFromSessions/Event`）、`PRESENTED_LEDGER_REL`。
- `host/catalog.ts`（104 行）：只剩扫描两个交付物根 + 幂等生成索引；对旧导入面保留 re-export
  （`readCatalog` / `presentedFromEvent` 等），避免测试与 `index.ts` 同刀大改。
- 拆顺序解决了一个真环：`ensurePresentedLedger` 需要读旧索引；若 ledger 反向 import catalog 会成环。
  把读取面独立成叶后，依赖方向是 `catalog → {catalog-state, presented-ledger}`、
  `presented-ledger → catalog-state`，无环。

## 输掉的方案

- **ledger 直接 import catalog。** ESM 环可能能跑，但 `src-layering` 的 0 环守卫会红，且初始化顺序脆弱。
- **把 `ensurePresentedLedger` 留在 catalog。** 账本生命周期被劈成两半，调用方要同时知道两个模块。
- **一次改掉所有测试 import。** 旧导入面用 re-export 兜住；测试改家可以独立轮做，不混进结构刀。

## 验证（实跑，2026-11-03 11:3x +08）

```text
node ./node_modules/typescript/bin/tsc -b packages/company-pack   # exit 0
pnpm test                                                         # 138 files / 1101 tests
pnpm verify                                                       # ALL PASS（src-layering 0 环）
```

## 事实落点

- `host/catalog.ts` 不再拥有账本 I/O；账本事实家 = `host/presented-ledger.ts`，目录读取 = `host/catalog-state.ts`。
- `presented-domain.ts` / `governance-export.ts` 已改为直接从 ledger import；`src/index.ts` 暂借 catalog 的
  re-export（下一刀可改直连，纯 import 改动）。
