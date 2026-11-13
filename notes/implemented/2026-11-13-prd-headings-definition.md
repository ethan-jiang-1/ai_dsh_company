# 2026-11-13 · PRD 定义点从 JSON 账本改为 headings

状态：implemented（2026-11-13 落地）

上游 = 用户 2026-11-13「PRD 里搞一个很大的 JSON…这很荒唐」+ 批准方案 A（根治）；证据现场 =
`.../c5-ui-team-HZo6Rt/.dsh-company/deliverables/2026-11-13-sgcc-portable-leakage-monitor/drafts/prd.md`
（74.5KB = 52.6KB JSON / 960 行 + 21.9KB 正文副本；32 条 REQ、62 条 AC，正文的 32 个需求小节里只有 1 个带 userStory）。
同一份文件用 pack 校验器跑出 **33 条红**（`nonFunctional`、`demonstration/analysis/inspection`、`changeLog at/by/change`
不被旧枚举接受；另查出 REQ-031↔032 依赖环、REQ-044 悬空依赖）——既不可读、也不过自己的门。

## 决定

1. **PRD 的 `definition` = `headings`**（与 StRS / SyRS / IRS 一致）。每个 `### REQ-###` 小节是唯一定义点；
   字段行 = `userStory` / `acceptance`（AC 子项含 `given`/`when`/`then`）/ `source` / `traces` / `slice` /
   `type` / `priority` / `status` / `verification` / `dependsOn` / `openQuestions` / `changeLog`。
   Slices 用表格列**显式 REQ id**（禁区间）；模板不再有 JSON 账本，正文不再复制一份需求。
2. **旧 `json-ledger` PRD 只读兼容**：`prd-check.ts` 按 PRD 头的 `definition` 分派；旧文档走旧 schema（`test|demo|review`
   等旧枚举），新文档走 headings。`requirements-check` 的 `LAYER_FORMS.PRD` = headings，同时接受旧 json-ledger
   （`LEGACY_LAYER_FORMS`，只读）；旧动议的编号检查不因迁移转红。
3. **`/prd check` 成为交付闸门**：host 在 tools 的 `pre-execute` 事件拦 `present`；动议声明了 `numbering: identity` 且
   `drafts/{mrd,prd}.md` 都在时跑同一套 `validateProductDocs`，红 → `deny`（错误列表 + 修复命令），绿 → 放行。
   旧动议（meta 无 `numbering:`）/ 文件缺失 / 闸门内部异常一律放行——闸门不能把正常交付卡死。
4. **枚举按工程语言放宽（新形状）**：`type` 归一化后接受 `functional | non-functional | constraint`
   （`nonFunctional` / 大小写不判红）；`verification` ∈ `test | demonstration | analysis | inspection`（ISO 29148；
   旧形状仍接受 `demo|review`）。`AC-###-#` 子项进入 `/req check` 的索引（父号边、计数）。
5. **`/req check` 顺带补上 headings PRD 的 AC 识别**：REQ 小节内 `  - AC-###-#` 视为 AC 定义，父号边由号形派生；
   迁移前 headings 里的 AC 不会被发现（计数 0），迁移后与 JSON 账本同口径。

## 输掉的方案

- **只改渲染**（把 JSON 折叠/表格化）：文件仍是 52KB 机器块，原文仍是「JSON + 正文副本」；且 `ui-scene` 的
  文档预览是 vendor 面，pack 改不动。
- **账本移到同级 `prd.ledger.json`**：小步，但仍保留软件味 schema + 两个产物；且交付物约定（`drafts/prd.md` 单文件）
  与审计面都要跟着改，收益不如直接删掉机器块。
- **限制 REQ 数量/提示词写短**：硬件动议真实需要 20–32 条需求；治标不治本。
- **只做交付前提示（advisory）**：失败模式就是「没人跑 `/prd check`」；提示重复同一个失败模式。选 deny 才是闸门。

## 状态事实与载体

- 事实：新 PRD 的定义点 = `### REQ-###` 小节 + 行首字段；JSON 账本只有旧动议可读，不再新写。
- 唯一入口：模板 [prd.md](../../packages/company-pack/content/templates/prd.md)；解析/校验
  [prd-check.ts](../../packages/company-pack/src/lib/prd-check.ts)；层↔形态合同
  [requirements-model.md](../../packages/company-pack/content/product-types/hardware-software/requirements-model.md)
  （business-software 同改）；闸门 [prd-gate.ts](../../packages/company-pack/src/host/commands/prd-gate.ts)，注册在
  [index.ts](../../packages/company-pack/src/index.ts)。
- 读载体：[product-definition 指南](../../docs/guides/product-definition.md)、VP-Eng `prd-playbook`、
  共享 `product-definition` 技能、[D61](../../docs/reference/decisions.md)。
- 写载体：模板（模型写 PRD 时注入）、`/prd check` 命令、`present` 闸门。
- 测试：[prd-check.spec](../../tests/lib/prd-check.spec.ts)、
  [prd-gate.spec](../../tests/host/commands/prd-gate.spec.ts)、
  [requirements-check.spec](../../tests/lib/requirements-check.spec.ts)、
  [requirements-templates.spec](../../tests/content/requirements-templates.spec.ts)、
  prd/req/scenario 命令 spec、[presets.spec](../../tests/presets/presets.spec.ts)。

## 验证（实跑原话，2026-11-13）

| 层 | 命令 | 红 / 绿形态 |
|---|---|---|
| 修前红（真现场） | 用 pack 校验器跑现场那对 MRD/PRD | `ok=false`、**33 条错**；旧 PRD `reqCount=18/32`、`acCount=35/62` |
| 新模板自洽 | `validateProductDocs(content/templates/{mrd,prd}.md)` | `ok=true`、0 错、1 需求 / 1 AC |
| keyless 新形状 | `npx vitest run tests/lib/prd-check.spec.ts` | 15 passed（缺 userStory / 非法 type / 缺 then / 重号 / 无 changeLog / 悬空 / 环 / 区间 / 缺表 均红；legacy 兼容绿） |
| keyless 闸门 | `npx vitest run tests/host/commands/prd-gate.spec.ts` | 5 passed（present 坏 PRD → deny；旧动议 / 缺文件 / 内部异常 → 放行） |
| 旧形状兼容 | legacy PRD 样例 + 现场 PRD 重跑 | 旧样例绿；现场仍 33 条（只读兼容，不静默改判） |
| 全量回归 | `pnpm test` | 247 files / 2034 tests passed |
| 类型/静态 | `pnpm typecheck`；`pnpm lint`；`pnpm dup` | 全绿；0 clones |
| 结构 | `pnpm verify` | ALL PASS（product-definition 58/62；decisions 67/67） |
| 覆盖率 | `node checks/audit/coverage-ratchet.mjs` | PASS（192 文件；`prd-check.ts` 82.56/68.38 ↑） |
| 真实例 | `pnpm company` 重启 → `cdp-probe` + `client-load` | 新 URL 起服务、10/10 页签、`clientErrors=[]`；client-load ALL PASS |
| 真实规模迁移演练 | 把现场 JSON 账本机械转成 headings（只写 `/tmp`，不动交付物）再跑同一校验器 | **74.5KB → 40.8KB**；32/32 REQ、62/62 AC 全部可解析；33 红 → **2 红**（MRD `confidence: medium-low` 取值非法、REQ-031↔032 真实依赖环）——旧枚举/级联噪声消失，剩下的才是真内容缺陷 |

## 未覆盖轴

- **真实模型 `present` 被 deny 的端到端**未跑（需要真模型 turn）；闸门行为由 keyless spec 的 `pre-execute` 注入面钉住，宿主客体的接线只证了「实例能起、无注册错误」。
- **旧 PRD 的批量迁移**未做：37–117KB 的 legacy 账本保持只读兼容，不自动转写；只做了一次只读演练（见上表），
  现场那份 32 条需求转换后仍有 2 条真红（MRD 取值、依赖环），需 owner 修内容而不是改形状。
- **business-software 的真实 PRD**未跑（与 hardware-software 共用同一 parser/template；类型差异只在
  requirements-model 的五层表）。
- **`/req check` 的 headings AC 计数**在真实硬件 PRD 上未重跑（只用 keyless fixture 与命令 spec 证父号/计数）。
