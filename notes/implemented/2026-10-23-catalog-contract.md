# 成品目录契约：生成器与页签 parser 共钉一份夹具

状态：implemented（2026-10-23；架构评审候选 2；用户令「P1→P9 全做」）

## 决定

1. **提交一份契约夹具** `tests/fixtures/catalog.contract.json`：由生成器对固定输入产出，含两根、台账内外、
   `presented` 三态、7 个结果词 + 1 个未知词、缺字段行、无 final 行（被排除）。
2. **两侧共钉**（`tests/client/catalog-contract.spec.ts`）：
   - 生成器侧：同一输入必须产出与夹具逐字段相等的结果；
   - 页签侧：`parseCatalog` 必须把夹具解析回同一批 entries。
   加字段会同时打破两个断言——不会像此前那样只在浏览器探针里才被发现。
3. **counts 不再解析**：`DeliverablesCatalog` 去掉 `counts`；视图从 entries 现算（此前解析出的 counts
   在仓库里唯一的读者是契约测试本身）。
4. **结果词表收成一张表**：`RESULT_TONES` 覆盖 `META_RESULTS` 的 7 个值；契约测试逐值断言
   `resultTone` 不落 `outline`——新增结果值不会静默变灰。

## 输掉的方案

- **保留 counts 在解析类型里**：没有生产消费者，却让「同一份计数」有三个来源（生成器/解析/视图现算）。
- **测试里现算夹具**（`build` 再 `parse` 同一份内存对象）：循环自证，抓不到「生成器改形状而 parser 没跟」。
  提交的 JSON 才是那个可被两侧分别钉住的工件。
- **客户端直接 import `tools/lib/deliverables.mjs` 的 `META_RESULTS`**：跨运行时（node .mjs → browser bundle）
  会拖进不必要依赖；用测试覆盖代替运行时共享。

## 后果

- 生成器与 parser 的形状变更必须同 diff 改夹具；parser 的 `counts` 分支消失。
- `resultTone` 从 if 链变成表；未知值仍落 `outline`（行为不变）。

## 验证（真跑）

```text
npx vitest run tests/client/catalog-contract.spec.ts tests/client/deliverables-catalog.spec.ts
#   13 passed（契约 4 + 既有目录 9）
pnpm test     # 750 passed
pnpm verify   # ALL PASS
```

## 未验

- 没跑浏览器档（`deliverables-catalog-probe`）——本轮只动解析与色调表，渲染面未变；probe 的触发条件是
  「页签渲染/数据链改动」，下次动这两处时应复跑。
- `pnpm build` 未跑（typecheck 不在 keyless 层）：`DeliverablesCatalog` 去掉 `counts` 后，仓内其他引用已 grep 确认
  只剩本文件与既有 spec。
