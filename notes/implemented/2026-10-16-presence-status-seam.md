# presence 内部接缝（2026-10-16）：状态与显示名词汇独立成模块＋facade 保外观

状态：implemented（授权 = 用户 2026-10-16 对来源卡 Item 2 令「继续」；来源卡 = [_archive/settled_issues](../../_backlog/_archive/settled_issues/2026-10-16-code-structure-round3.md) 的 Item 2（该卡按自身条件已结档，本 Note 是它的实施收据）；commit `b1af109` 实施 + `a2ed20b` 收尾）

## 决定

`packages/company-pack/src/lib/presence.ts` 396 行 → **360 行（折算面）＋新建 `presence-status.ts` 76 行（词汇面）**；`presence.ts` 再导出词汇 = facade ⇒ **对外取用面零变化**。

- **迁出（闭表 + 纯映射）**：`PresenceStatus`、`STATUS_LABEL`、`presenceStatusFromPhase`、`statusLabelFor`、`PRESET_DISPLAY_NAMES`、`displayNameFor`（含私有 `PRESET_KEYS` / `PresetRoleId` / `isPresetRole`）。
- **留守（折算）**：板与事件的形状类型（`PresenceRow` / `ActivityEntry` / `PresenceBoardModel` / `TeamViewLike` / `TeamEventLike` / `TeamStreamFrame`）与函数（`rowsFromTeamView` / `diffActivity` / `presenceFromEvents` / `activityFromEvents` / `memberNames`）。
- **依赖方向**：`presence-status.ts` 零 import（叶子）；`presence.ts` → 它单向。原链 `dag → board → presence` 扩为 `dag → board → presence → presence-status`，**仍无环**。
- **为什么 `PRESET_KEYS` 留在 pack 内**：pack 发布面自包含（`files` = `lib/**` / `presets/**` / `workspace/**` / `cordis.patch.yml`），不许反向依赖维护工具层——同名决定见 [2026-10-14 六项重构](./2026-10-14-code-restructure.md)「输掉的方案」。

**实读复核修正了来源卡 Item 2 的三处不实之处**（卡已结档，记录在此）：

| 卡上说法 | 实测 | 处置 |
|---|---|---|
| 「8 个 client importer 不动」 | client 侧实为 **6 个文件**：4 个 type-only（`company-panels.tsx` 取 `ActivityEntry`+`PresenceRow`、`company-tabs.tsx` 取 `PresenceRow`、`company-tab-registration.ts` 与 `company-session-adapters.ts` 各取 `TeamStreamFrame`）＋ `TasksPanel.tsx`（取词汇值 `presenceStatusFromPhase`/`statusLabelFor` ＋类型 `TeamViewLike`）＋ `use-company-data.ts`（取留守值 `activityFromEvents`/`memberNames`/`rowsFromTeamView`） | 记正（facade 结论不变，基数与符号面记准） |
| （未提） | 卡**漏了 `board.ts`** —— 它是 lib→lib 消费者，取 `displayNameFor` | 本段**不动它**（facade 下行为与依赖方向均不变）；是否让它直连词汇模块，以「同域散居第 3 次」为触发线再议 |
| `presenceStatusFromPhase` 列入「状态/显示名词汇」，同段又称 `presence.ts`「保留折算」 | 二者张力：该函数是 phase → status 的映射 | 定案 = **产出 `PresenceStatus` 的映射与定义该类型的表同住**（它就是词汇的对外入口）；`presence.ts` 用它折算 ⇒ 方向 `presence → presence-status` 单向成立 |

## 输掉的方案

- **不做 facade、把 importer 全改指新家**（来源卡自己列的输项）：败于 churn 无收益——`presence.ts` 与 `presence-status.ts` 是同一领域的两个半边，让 `TasksPanel.tsx` 与 `board.ts` 各记两个路径只会增加跳转；且 facade 使「对外零变化」成为**可机械验证**的主张（见验证节的导出并集）。
- **让 `board.ts` 直连 `presence-status.ts`**：败于与本轮目标无关的额外改动——`board.ts` 的消费面（`TeamViewLike` 来自 presence、`displayNameFor` 来自词汇）本就跨两处，直连不减少任何 import 行数，只多一处需要同步的知识。
- **词汇再拆两份（状态表 / 显示名表）**（来源卡输项，本段复核同意）：败于 76 行模块碎片化——两张表共享同一个「preset 名册」概念（`STATUS_LABEL` 键 = 状态、`PRESET_DISPLAY_NAMES` 键 = 角色），拆开会让「未知值落未知」这条纪律与它的姊妹表分家。
- **把 `presenceStatusFromPhase` 留在 `presence.ts`**（照卡的字面清单）：败于它产出 `PresenceStatus`——留折算侧会让词汇模块只有表没有入口，`TasksPanel.tsx` 得同时 import 两个文件才能显示一行状态。
- **引 `tools/lib/company-roles.mjs` 消掉 `PRESET_KEYS` 重复**：败于 pack 发布面自包含——见上「为什么留在 pack 内」。

## 后果

- 改文案/显示名只动 `presence-status.ts`（76 行、单一主题），不必翻 360 行的折算读模型；词汇有独立可搜的家。
- `presence.ts` 单一主题 = 折事件/快照成板；它对词汇的依赖是显式 import 列表（facade 的对外半边）。
- 消费方零改动：`src/index.ts` 的 `export * from './lib/presence.ts'`、4 个 client 文件、3 个测试文件、`board.ts` 全部原样。
- 新模块自动进两个构建面（`tsconfig.client.json` 的 `include: ["src/client", "src/lib"]` 是目录制、tsdown 入口仍是 `lib/types/index.js`）——**零配置改动**。
- 未做（范围外）：「同域散居」触发线（`board.ts` 是否直连词汇）、词汇文案的独立 spec。

## 验证

全部实跑；基线与红证存 `runtime/e2e/round3b-baseline/`、`runtime/e2e/round3b-receipts/`（gitignored）。

- **导出面守恒（零漂移的机械判据）**：拆前 `presence.ts` 17 个导出；拆后 `presence.ts` + `presence-status.ts` 并集**恰好 17**，`丢失: 无 | 新增: 无`；**11 个留守符号实现体逐字未改**、**6 个迁移符号定义逐字未改**（脚本按 brace 配平切片比对，非肉眼）。
- **对外取用面**：`src/index.ts` 的 `export *` 不动；**6 个 client 文件 + `board.ts` + 4 个测试文件**（`tests/company/presence-board.spec.ts`、`tests/company/board.spec.ts`、`tests/client/board-panel.spec.ts`、`tests/client/board-drift-fixture.spec.ts`）的 import 路径与符号**全未改**（`git status` 只列 `presence.ts` / `presence-status.ts` / `src/README.md` 三个文件）。
- **回归**：`pnpm test` → `61 passed (61)` / `559 passed (559)`；`pnpm verify` → `verify: ALL PASS`。
- **两面构建（卡验收）**：`pnpm exec tsc -b packages/company-pack` exit 0；`(cd packages/company-pack && pnpm exec tsdown)` → host `Build complete`（`lib/index.js` 54.06 kB）、client `Build complete`（`lib/client.js` 196.98 kB）。产物体积较拆前各小 0.09 kB（再导出摊平了重复引用），sourcemap 略大（多一个模块），属结构变化的预期形状。
- **built 入口契约**：`await import('packages/company-pack/lib/index.js')` 断言词汇面 5 个**运行值**全在（`PresenceStatus` 是 type-only，按 `.d.ts` 验）；抽查 `statusLabelFor('bogus') === '未知'`、`displayNameFor('lead','lead') === '梦之队 CEO'`。类型面：`lib/types/lib/presence-status.d.ts` 定义 6 个符号，`presence.d.ts` 以 `export {…}` / `export type {…}` 再导出它们。
- **client 真挂载（卡验收）**：`source run/env.sh && node checks/smoke/client-load-smoke.mjs` → `ALL PASS`（真浏览器：零挂载失败 + 零 loader 错误 + 品牌槽在场）。
- **重放真消费面（卡验收）**：`node checks/smoke/replay-smoke.mjs --scenario r2-motion` → `ALL PASS`（在场板 5 行与录制同形，presence 判据走 built 再导出链）。
- **词汇钉子（卡要求的红证）**：卡写「若现无未知值断言，同 diff 先补」——实测**已在场**（`tests/company/presence-board.spec.ts:164` 的「未知 status 值 → 「未知」，不抛」），无需新补。红证：把 `statusLabelFor` 的兜底从 `?? STATUS_LABEL.unknown` 改成直显裸值 → `× 未知 status 值 → 「未知」，不抛 → expected 'warping' to be '未知'`（exit 1）→ 还原 → `16 passed (16)`。
- **文档同 diff（卡义务）**：`packages/company-pack/src/README.md` 源码图 lib 清单 10→11 模块 + 依赖链补 `presence → presence-status`。
- **同轮修掉一处我亲手引入的腐化指针**（语义审 finding）：新模块头注与 `PRESET_DISPLAY_NAMES` 的 JSDoc 照抄旧文「与 `presets/<role>/preset.yml` 的 `name` 同源」，而该文件 0.1.7 起已并入 `agent.cordis.yml`（`preset.yml` 全仓不存在）——真实事实家 = 各 `presets/<role>/agent.cordis.yml` 的 `config.name`（防漂移断言钉的就是它，见 `tests/company/presence-board.spec.ts:225-233`）。三处指针已改指真实家：**新模块正是「改文案的人」唯一入口，指错文件的代价最高**。
- **语义审（独立子代理盲审，§13 四输入）**：见下方「语义审回执」。

## 语义审回执

（独立子代理盲审；四输入 = 授权/验收原文、该面合同文档、证据选层、本 Note。审查者不接受本 Note 自述，自写脚本读 diff 与实跑。）

**审查者结论**：① 导出面守恒 **成立**（TS compiler API 切片：旧 17 = 新 11 ∪ 6，`LOST none / ADDED none / DUP none`，17/17 声明文本逐字相同；全文件行多重集 diff 里唯一消失的行是旧顶部 JSDoc ⇒ **0 代码行被改**）② facade 够用 **成立**（client face 495 文件 diagnostics 0；消费方取用的 17 个名字全部经 barrel 解析到位、值/类型语义正确；host/client `tsc -b` 各 exit 0；旧/新 host barrel 运行时键集各 13 键完全相同）③ 方向与环 **成立**（`presence-status.ts` import 计数 0；`CYCLES: none`）④ 测试面 **成立**（22 文件 / 116 用例 passed，含 `tests/client` 与补跑的 `tests/company/board.spec.ts` 15/15）。**blocker 无。**

**findings 与处置**：

| # | finding | 处置 |
|---|---|---|
| 1 | 新模块两处（`presence-status.ts:7`、`:61`）照抄旧文「与 `presets/<role>/preset.yml` 的 `name` 同源」，但该文件 0.1.7 起已并入 `agent.cordis.yml`，全仓无 `preset.yml`——**新模块正是改文案者的唯一入口，指错文件代价最高** | 收：**三处**指针（含我复查发现的第 3 处 `:50`）全改指真实事实家 `presets/<role>/agent.cordis.yml` 的 `config.name`；已复查新模块内 `preset.yml` 计数 = 0 |
| 2 | 消费方基数记述不准：「零改动」结论成立但枚举错——client 侧实为 6 个文件（4 type-only + `TasksPanel.tsx` 取值 + `use-company-data.ts` 取 3 个留守值），测试侧 4 个（我漏了 `tests/company/board.spec.ts`） | 收：本 Note 的基数与符号面已按实测改准（本条与上表第一行的「实读复核」同处） |
| 3 | 观察（非本 diff 引入）：`lib/types/lib/presence.d.ts` 新增相对导入 `'./presence-status.ts'`；同目录既有 `.d.ts` 也是 `.ts` 说明符风格 ⇒ 非回归 | 记（不改）：发布 types 的解析前提与既有同形 |

**未验证（审查者按窄口指示未跑，本轮自查跑过并记于验证节）**：`client-load-smoke` 与 `replay-smoke` 真浏览器/真重放路径；client barrel 的运行时键集（node 直挂 client 因 CSS module 失败，新旧同败 = 环境限制，该面由 `tests/client` + client face `tsc` 覆盖）；`tests/` 的独立 tsc 面（仓库无 tsconfig/gate 覆盖 tests/）；`pnpm verify` 各门禁（本轮收尾已跑，ALL PASS）。
