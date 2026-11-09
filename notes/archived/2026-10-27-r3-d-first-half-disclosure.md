---
状态：implemented（2026-10-27，R3 批次 D 前半：索引瘦身、预算双向、lib 修环、探针默认值）
---

# R3-D 前半：索引回到索引、预算变成双向、barrel 修环、探针不再猜历史会话

> 上游 = [第三轮六维度打扫卡](../../_backlog/_archive/settled_issues/2026-10-27-repo-hygiene-round3.md)（R3-17/20/22/25）。
> 后半（政策层 + dev-loop 拆分、三个巨型函数）另篇。

## 决定

1. **`checks/README.md` 193 → 78 行**：逐脚本说明与成本/触发全部回到脚本头注（本来就是唯一家），
   索引只留「快速选择」14 行 + 按目录分区的链接清单（一行多条）+ 共享实现/目录取舍 + 待触发复查指针。
   `script-index` 仍覆盖全部 106 个公开入口（门禁只认 `](target)` 链接）。
2. **行预算成为双向棘轮**：`doc-budget` 新增 `SLACK_FLOOR = 0.2`——上限比内容高 20% 以上即红
   （处置是下调上限，不是写内容凑数；确需预留 → Note 论证后下调到 content+5%）。
   同时补上入口链与最大合同的预算：`checks/README.md`（78→上限 85）、`tests/README.md`、`project-map`、
   `runtime-map`、`release`、`bootstrap`、`delegation`、`data-model`、`profile`；存量空置最大的
   `web-rpc` 47 → 30。
3. **修 lib 三元环**（R3-22）：`CULTIVATION_ROLES` 的定义从 barrel `lib/cultivation.ts` 搬到词汇层
   `lib/presence-status.ts`（仍是 `PRESET_KEYS` 的别名，只有一份事实）；barrel 改为纯再导出；
   `cultivation-context.ts` 直接依赖词汇层。环 `cultivation → record → context → cultivation` 消失。
4. **面板探针不再写死历史会话标题**：5 个探针（attention / presence / tasks / budget / deliverables-catalog）
   的默认 `动议观察 · 23684`（盘上早已不存在）改为**必须 `--title`**，缺失时 exit 2 并给一句可操作说明；
   头注同步。**尝试过但否掉**：空查询自动取搜索树第一条——实测空搜索不产出 `Search results` 树（浏览器车道红证）。

## 输掉的方案

- **保留逐脚本说明、只删重复段**：C 类信息（成本/触发）本来就在头注，索引复述即双写；
  且 `script-index` 只要求链接，没有「必须有说明」的约束。
- **空置只报警不判红**：本仓立场是 gates over prose；「顶格即饱和」一旦长期失效，
  下一次加内容的人会以为还有空间（web-rpc 空了 21 行就是这个形态）。
- **删掉 `CULTIVATION_ROLES` 让所有调用方改 import**：跨 8 个文件、收益只是少一个别名；
  把定义搬进词汇层、barrel 再导出，环同样消失且公开 import 面不变。
- **为空查询改 `openSessionBySearch` 取第一条**：实跑红（无结果树）；要真自动，得先做「会话标题提取器」，
  属于新仪器，不在本轮。

## 后果

- 索引从「手册」变成「路由」：78 行、一屏可扫；逐脚本事实只有头注一份。
- 预算门禁从此能看见「上限悬空」；入口链四跳里的三份未受管文档（project-map / tests/README / checks/README）
  进入棘轮。
- `lib` 图可拓扑排序（不再有环）；`CULTIVATION_ROLES` 的公开 import 面不变。
- 5 个面板探针在没有标题时**快速失败并说明要什么**，不再吐 Playwright 栈。

## 验证（真跑）

```text
wc -l checks/README.md                    → 78（原 193）
PASS script-index ×106（公开入口全部在 checks/README）

# 反向棘轮红→绿（破坏真文件）
docs/project-map.md 上限临时 99→200
  → FAIL doc-budget: docs/project-map.md 94 行只占上限 200 的 47%（空置 >20%：按现行内容 +5% 下调上限，或 Note 论证保留）
还原 → ALL PASS

# 探针默认值
node probes/browser-visual/attention-panel-probe.mjs
  → exit 2 + "本探针需要 --title <会话标题>（在观察窗侧栏看）；不再用写死的历史标题猜会话"

# 回归
node checks/run-gates.mjs   → ALL PASS；2 门无对象（replay-fixture-freshness / replay-ui-freshness）
npx vitest run              → 104 files / 947 tests passed
pnpm typecheck              → exit 0
```

未验：`openSessionBySearch('')` 的空查询分支已回滚，不再存在于代码里；其余 4 个探针只做了语法检查
（要真跑需各带一个 `--title` + 真浏览器，本轮只验了 attention 的失败路径）。

## 本批没做的（留后半）

- **D1 政策层 + dev-loop 拆分**：`docs/AGENTS.md` 增「政策」档、新建政策文档、把 dev-loop §0.5 规则 /
  §9 门禁升格 / §10 自动化上限 / §11 越界写入 / §13 自主协议迁出，目标 ≤150 行。牵动多份文档与 D 号引用。
- **D4 三个巨型函数**：`CultivationBoard` 482 / `apply` 425 / `cultivationCommandHandler` 340——
  按已存在的注释/导出缝拆，需 DOM 与 host 两组回归网（已有）护航。
