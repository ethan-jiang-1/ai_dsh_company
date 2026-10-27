# converge 第二刀：`steps()` 让 dry-run 就是计划

状态：implemented（2026-10-23；用户令「B → A 都要做」；上一刀 = [assess](./2026-10-23-converge-assess.md)）

## 决定

1. **`steps(state)` 住 [converge-rules.mjs](../../tools/lib/converge-rules.mjs)，返回有序动作数据。**
   每步 `{ kind, label?, ... }`：有 `label` = 进 dry-run 清单；`rewrite-refs` 无 label（历史行为：
   引用重指不进取景清单），但执行器仍按序消费它。序列 =
   证据副本 → 引用重指（静默）→ 归档搬移 → 清 journal（每篇一步）→ 台账 → 索引 → backfill 指引。
2. **dry-run 的清单由 steps 渲染，执行器按同一份 steps 逐条执行。**
   `executeStep(step, ctx)` 是副作用唯一入口，`default: throw` 兜未知步骤；
   搬移步带 `from/to/gitArgs`（与 `archiveMovePlan` 同源），执行时仍按 `git ls-files` 判断 tracked。
3. **输出逐字不变**：活盘计划输出与改动前 `diff` 为空；`--slug <未闭合>` 仍是同一条拒绝文案 + 退出码 1。

## 输掉的方案

- **steps 里直接做 IO**：那就又变成不可测的脚本逻辑；steps 是数据，执行留在驱动层。
- **dry-run 也走执行器**（加 `if (DRY) return` 在每步里）：一旦漏一处就是真动盘，风险不对称。
- **把 rewrite-refs 打成 label 一起打印**：会改变 dry-run 输出，且它不是“人要看”的动作，是路径维护的副作用；
  本刀只做同源，不改呈现。
- **让 CLI 直接调用 steps 的 kind 字符串做 switch 外的映射表**：多一层间接，收益为零。

## 后果

- 「计划打印一套、执行另一套」在结构上不可能再发生——新增动作 = 改 lib 一处 + `executeStep` 一个 case。
- 副作用顺序被测试锁死（`converge-rules.spec.ts` 的 kind 序列与 label 全列表）。
- 副作用本身一行未改（copyEvidence / rewriteRefs / rename+git add / clearLiveJournal / appendLedger / rebuildCatalogIndex 原样）。

## 验证（真跑）

```text
# 红（实现前）
npx vitest run tests/harness/converge-rules.spec.ts
#   5 failed（steps is not a function）+ 47 passed

# 绿
npx vitest run tests/harness/converge-rules.spec.ts     # 52 passed
pnpm test                                                # 744 passed
pnpm verify                                              # ALL PASS

# 行为
node tools/converge.mjs > /tmp/converge-after2.txt
diff /tmp/converge-baseline.txt /tmp/converge-after2.txt  # 空
node tools/converge.mjs --slug 2026-10-12-ai-coding-security-2026-light
#   ✗ …: 不可收敛——无 final / 现场：final=false closed=2026-10-20 结论=有 ; exit=1
```

## 未验

- **执行循环没有端到端跑过**：活盘唯一的活跃 slug 未闭合，没有可安全收敛的对象；
  要端到端得造一个 ready 的夹具工作区（会写 live 公司盘，本轮不做）。
  `executeStep` 的六个 case 目前只有「结构上与原内联代码一一对应」这一层保证。
- resume 仍走自己的路径（不消费 steps）——它复用 `clearLiveJournal`/`appendLedger`/`rebuildCatalogIndex`，
  但顺序不同（不搬移），本刀不动。
