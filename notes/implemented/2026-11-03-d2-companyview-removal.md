# 2026-11-03 · D2：删除死视图 CompanyView（184 行 + 155 行测试）

状态：implemented（2026-11-03；七维复评 Phase 2）

> 上游 = [第五轮打扫卡](../../_backlog/issues/2026-11-03-repo-hygiene-round5.md) 的 fresh 复评（D2）。
> 关联 = [Phase 1 语义腐化](./2026-11-03-d4-semantic-drift.md)。

## 决定

- **删 CompanyView.tsx（原 `src/client` 死视图，184 行）**：`createCompanyView` 在 src 内 0 import
  （只有注释提到），整页视图自 2026-11-02 起不再挂 tab；唯一消费者是两个 spec。源码与测试一起删。
- **删两个 spec（company-view / company-identity）**：它们覆盖的是
  不可达路径；`CompanyIdentity` / `companyNameFrom` 也只有这两个 spec 用。
- **保留品牌断言**：`DreamTeamBrandName` 仍是 `client/index.ts` 的 `sidebar.brand.name` 注册面，
  新建 `tests/client/ui/brand.spec.ts` 一条静态渲染守卫（原断言住在已删的 identity spec 里）。
- **保留 CompanyView 的历史引用**：两篇 `_backlog/_archive` 卡的代码链接改指本条（原文件已删；
  链接目标是“删除决定”而不是死文件）。
- **附带收口**：`pack-exports.spec.ts` 补 client 入口集合断言 `['apply','inject']`（host 已有）；
  4 个只测 `tools/lib` / pack 结构的 spec 从 `tests/company` 移到 `tests/harness`；
  新增 `tests/company/workspace-resolution.spec.ts` 12 例（env/cwd/saved/none + 危险落点）。

## 输掉的方案

- **给 CompanyView 重新挂一个 tab。** 它和右栏页签/培养页重复，重新挂会把 2026-11-02 的收口反做；
  产品上也不需要第三个总览壳。
- **只删测试、保留源码。** 死代码会继续被注释/文档引用（本次就是这么漂的），下次审计还会捞出来。
- **把 workspace-resolution 归到 runtime-guard.spec 里。** 两者证明边界不同（落点解析 vs 数据停写），
  合在一起会让失败定位变差。

## 验证（实跑，2026-11-03 09:0x +08）

```text
rg -n "CompanyView|createCompanyView" packages/company-pack/src tests   # 0 命中
npx vitest run tests/company/workspace-resolution.spec.ts tests/client/ui/brand.spec.ts tests/harness/repo/pack-exports.spec.ts
# 15 passed（12 + 1 + 2）
pnpm test                                                               # 见本轮提交后的读数
pnpm verify                                                             # 删文件后 archived 链接 4 处红 → 改指本条 → 绿
```

## 事实落点

- 原 `CompanyView.tsx` 的整页视图与 `CompanyIdentity` 条不再存在；公司面 = 右栏九页签 + 培养页。
- 历史卡（`2026-10-19-ledger-ux-deep-dive`、`2026-10-23-cultivation-context`）的 CompanyView 链接
  指向本条，不再指向已删文件。

## 未做：tests 进 tsc（2026-11-03 试过，527 errors）

单项目 `tsconfig.test.json`（extends vendor base + `paths:{}` + DOM）实测 **527 个 error**：
react/react-dom 缺 `@types` 解析、`tools/lib/*.mjs` 无声明、`@deepseek-ai/*/types` 子路径缺、
host/client 双 `Context` 增强冲突。不是加一行 `include` 能解决的；下一步 = 按 host/client 两面各建
一个 test project（或先给 `tools/lib` 生成 `.d.ts`），在独立轮做，别把半红配置接进 `pnpm typecheck`。
