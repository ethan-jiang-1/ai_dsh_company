---
topic: 测试树与源码树的对应关系（镜像轴 vs owner 轴）
intent: 用盘上实测回答「tests 子目录能不能、该不该跟 src 子目录一一对应」，并给出可执行的分轴方案与红证
---

# 测试树 ↔ 源码树：对应关系实测

## 0. 一句话

**能对应源码的区已经对应了（而且是靠同构的平铺，不是靠目录）；不能对应的区有 62 个 spec，占全树四分之一——它们缺的不是目录，是一根被写出来的轴。** 强行全树镜像，会把「谁的事实」压成「谁的文件」，把一个已经成立的导航收益换成一个假的对称。

## 1. 方法与口径

- 清点：`find`/`wc` 数盘（spec 数、行数、每区规模）。
- 反查：扫 244 个 spec 的 import，把「spec → 被测源码模块」做成矩阵（本文件 §3 的表全部来自这一步）。
- 运行时面：读 `apply(ctx)` 的注册面（`ctx.tools.register` / `ctx.commands.register` / `systemPrompt.section` / `ctx.on`），并用 live `cordis_inspect_query` 的 Service 目录对照。
- 复核：两个**独立、只读、无历史上下文**的子代理分别走源码面与测试面（结论摘在 §6，与本文冲突处已标）。

口径提醒：数量全部是 2026-11-15 干净树 `77e29553` 的数；`pnpm test` 的 tests 阶段是秒级，`tests/repo` 实测 35 files / 170 tests / 7.05s。

## 2. 谁在读这些代码（决定了「对应」对谁有意义）

这个仓不是库，是 DSH 插件。它有三张脸，加一个读者：

| 消费者 | 它碰的 interface | 实测面 |
|---|---|---|
| 模型 | tool schema、每步注入的 prompt section、命令输出 | 3 个工具（`workspace_doors` / `request_signoff` / `cultivation_propose`）、≈7 段 section、6 个事件里有一部分改它的行为（`tools` 的 `pre-execute` 闸门会把 present 挡下） |
| harness | `apply(ctx)`、`inject`、事件 | `inject = ['tools','approval','commands','workspaceRegistry']`；8 处 `ctx.commands.register`（7 个命令名）；监听 `agent/created|disposed`、`api-session/added|removed|status` |
| 人 | `/命令`、页签、UI 文案 | 7 个命令名：req · prd · delivery · deliverables · cultivation · company-settings · company-diagnostics；client 六个组 |
| **维护 agent** | **目录名 → 证据** | 244 个 spec、75 道门禁、18 个 spec 覆盖 63 个 tools/lib 模块 |

前三张脸的「interface」大多不是函数签名：是**给模型看的一段文本**（description、section、拒绝理由）。它们钉不住在 keyless 层，只有真挂载（preset-smoke / delegation-smoke）能证。

第四张脸才是这次要动的那层：**镜像的收益 = 维护者的检索反射**（「改了 X → 去 tests/X 找证据」）。它对前三张脸没有直接价值，所以它值不值得做，只看维护成本。

## 3. 盘面事实

### 3.1 树的形状

- tests：**244 个 `*.spec.ts` / 29,797 行**；14 个目录（11 个有 spec；fixtures / support 非 spec）；另有 10 个 `*.test.mjs`（测门禁本身）与 6 个非 spec 的 `.ts` 支撑文件。
- 分区规模：client 62 · host 60 · repo 35 · tools 18 · lib 15 · content 14 · presets 13 · session 11 · evidence 8 · contract 5 · ui 3 · checks 10（.test.mjs）。**harness 已不是区**：2026-11-13 拆六面，残留的空目录在 2026-11-15 clean-clone 收口时删掉（`51a1c61b`）。
- src：host 11 个目录 / 52 个 ts；client 6 个目录 + 3 个根文件 / 49；lib 33 个文件平铺 / 5,327 行。
- 工件侧：tools/lib 63 平铺 · checks/gates 75 平铺 · checks/lanes 33 · probes 4 域 60 文件。

### 3.2 spec 的「宽度」

按每个 spec import 的**不同 src 模块数**分桶：

| 宽度 | spec 数 | 说明 |
|---|---|---|
| 0 个 src 模块 | **100（41%）** | 钉的是 docs / package.json / gates / 产物 / 夹具——**没有源码单位可镜像** |
| 1 个 | 69 | 单位证据，镜像的天然对象 |
| 2 个 | 40 | 一对耦合模块 |
| 3–5 个 | 32 | 集成证据戴着 unit 的名字 |
| 6+ 个 | 3 | 最宽 `company-tab-registration.spec.ts` 12 个、`company-root-safety.spec.ts` 11 个 |

**41% 的树没有可镜像的对象**——这是「全树镜像」这个目标本身的判据，不是执行难度问题。

### 3.3 镜像对账

| 源 | 盘上 | 测试 | 交集 | 差 |
|---|---|---|---|---|
| src/host | 11 目录 | tests/host 11 目录 | **9** | 源独有 `fs/` `logging/`；测试独有 `contract/` `index/` |
| src/client | 6 目录 + 3 根 | tests/client 7 目录 + 1 根 spec | **6** | 测试独有 `i18n/`（属性区）；根组合 spec ↔ `src/client/index.ts` |
| src/lib | 33 平铺 | tests/lib 15 平铺 | 平铺 ↔ 平铺 | **镜像成立**；缺口在覆盖不在目录 |

`src/lib` 的覆盖账（按「有没有 spec 直接 import 它」）：**5 个零覆盖**（`cultivation-feedback`、`cultivation-inbox`、`guards`、`tool-card`、`markdown-shape-core`）、9 个只有 1 个、19 个 ≥2。

注意 `cultivation-feedback` / `cultivation-inbox` 经 `cultivation.ts` 的 `export *` 立面被覆盖，属**正确的 internal seam**，不该单独立 spec（子代理复核，把握度 2）。真正要复查的是 `tool-card`——它只有间接路径。

### 3.4 镜像的「四个 owner，三种说法」

同一个事实（组有几组），四份文档 + 一个盘：

| 说法 | 位置 | 盘上 |
|---|---|---|
| host「9 组」，列了 8 个名字（缺 `fs` `language` `startup`） | `packages/company-pack/src/README.md:10` | 11 |
| host「9 组」表 9 行（缺 `fs` `startup`） | `packages/company-pack/src/host/README.md:1` | 11 |
| client「五组」（缺 `startup`） | `packages/company-pack/src/README.md:24` | 6 |
| host 镜像「九组」，列了 8 个名字（缺 `logging` `fs` `startup`） | `tests/README.md:16` | 11 |
| commands「五个 /命令」 | `packages/company-pack/src/README.md:12` | 7 个命令名 |

根因不是懒：**没有任何门禁比对「表 ↔ 盘」**。唯一管计数声称的 `checks/gates/nav-count-claims.mjs:24` 只正则「页签」，`九组|五组` 不进它的扫描面——漂了 2 处没人发现，正是这个盲区。

## 4. 为什么 tests/repo 不能按源码分

35 个 spec / 2,183 行 / 零子目录。读它们的头注与断言面，钉的是**载体的字节**：

- 布局与分层：`repository-layout`、`runtime-layout`、`layering`、`src-layering`、`keyless-imports`
- 包形状：`pack-metadata`、`pack-engines`、`pack-guard`、`pack-exports`
- 发布与安装：`release-foundation`、`dev-install`、`uninstall-parity`、`setup-invocation`、`install-manual`、`hooks-wiring`
- 文档与指针：`foundation-links`、`foundation-safety`、`navigation-assets`、`src-readme-pointers`、`shipped-yaml-docs-pointers`、`checks-index`、`role-count-claims`
- 资产与预算：`asset-lanes`、`test-census`、`bug-coverage`、`skip-budget`、`snapshots-budget`、`snapshot-index`、`fixture-provenance`、`market-index`
- 安全：`tracked-secrets`、`tracked-token`
- 其它：`default-locale`、`prune-policy`、`pack-source`

它们读的是 `docs/`、`package.json`、`tsconfig*`、`checks/`、`runtime/`、`snapshots/`——**没有一个 src 模块**。所以「按源码子目录归」在这里不是难，是无对象。

一个必须反驳的诱惑：**这 35 个里有 21 个 import 了 `tools/lib/*.mjs`**（`repository-layout`、`markdown-links`、`snapshot-index`…），看起来该搬去 tests/tools。但这 21 个的**主体**是 docs/包/运行区，`tools/lib` 只是读文件的工具。按「谁的事实」而不是「用了谁的函数」分，它们留在 repo——否则 tests/tools 会变成一个按工具函数名聚类的杂货铺。这条已写进卡的「排除项」。

## 5. 三个被混用的轴

测试树同时用了四根轴，其中三根在目录名上互相打架：

1. **源码组**：tests/host/*、tests/client/*（且只覆盖 9/11、6/6）。
2. **证据类型/消费者**：tests/session（日志怎么读）、tests/evidence（协作判据）、tests/ui（金样工件）、tests/contract（vendor 引擎真值表）、tests/checks（门禁本身）。
3. **仓库工件 owner**：tests/repo（本文件 §4）、tests/tools（tools/lib 纯逻辑）、tests/presets、tests/content。
4. **属性**（没有名字的那根）：tests/client/i18n、tests/presets 的 `persona-english`/`delegation-model`、tests/content 的 `template-english`——一次扫全部角色/模板。

打架的具体位置：

- `tests/host/contract`（跨载体不变量）与 `tests/host/index`（根组合）嵌在镜像区里，名字不指向任何源组。
- `tests/client/i18n` 与 `tests/client/tabs` 有**同名 spec**（`attention-tab.spec.ts` 两份，证据不同：静态渲染 vs happy-dom 挂载）——按「文件名 = 证据类型」应可区分，实际不可。
- `tests/ui`（金样工件）与 `tests/client/ui`（源组）同词异指。
- 子代理实测：**26/60** 个 host spec、**48/61** 个 client spec 在其镜像组内找不到同名源文件——文件名早就是「主题短语」，不是 module 名。

## 6. 独立复核（两条线，冲突处已标）

**测试面**（只读子代理，把握度 3）：镜像声明有三个 owner 三种说法；`fs/` 与 `logging/` 各自唯一 importer 都是别人目录里的 spec（`file-shape-agreement.spec.ts` / `write-gate.spec.ts`）——locality 反例；36 个 spec 同时测 ≥3 个模块；`cultivation_propose` 的拒绝路径在两处重复；3 份 spec 头注还指着 2026-11-11 分组重排前的扁平路径（import 改了、注释没改）。

**源码面**（只读子代理，把握度 3）：`host/run-bundle/company-root.ts` 17 个导出里有 6 对「双坐标系」函数（`ensureCompanyRoot` / `…At` 等），路径安全判据有 **5 份实现**、两套 `problem` 判据；`host/run-bundle/paths.ts` 装错组（5 个消费者无一是 bundle 布局）；frontmatter 解析 **5 份且已漂**（`layer` 为空时两 checker 结论不同，而 `prd-gate` 同时 import 两族）；`lib/doors.ts` 为测试而抽、`cwd` 在 interface 里但从不读——真判据住在 `workspace-doors.ts`。

**游标分歧**：测试面建议「先加一个 set-equality spec」；源码面建议「先收 `company-root.ts` 的双坐标系 interface」。两者不冲突但不同层：**本轮只做前者**，后者是独立缺陷面，不进这张卡（见排除项）。

## 7. 方案比较

| 方案 | 做什么 | 判据 | 结论 |
|---|---|---|---|
| **A 只加断言** | 一个 spec 断言 `src/<half>/*` ↔ `tests/<half>/*` 集合相等 + 例外表 | 不搬任何文件；立刻把 4 处漂移变红 | 必要，不充分（repo 仍 35 平铺） |
| **B 只拆 repo** | 35 → 6 个 owner 目录 | 目录变清楚，但镜像轴仍无人守 | 半张 |
| **C = A + B** | 先让镜像变不变量，再给无源区一根显式的轴，最后删掉文档里的组数枚举 | 两条轴各自可验证、各自在 README 写清 | **推荐** |
| 全树镜像 | 每区都对齐 src | repo/contract/session/evidence/ui 无对象 | 否——41% 的树没有可镜像对象 |
| 把 repo 21 个搬 tests/tools | 按 import 的工具函数归类 | 会把「谁的事实」压成「用了谁的函数」 | 否——见 §4 |
| 按「产品面 / meta 面」二分 | 2026-11-13 已否决 | 「多一层无信息量的分类，且 meta 仍是桶」 | 否——已有决定 |

## 8. 结论

1. **镜像只对「有一个源组」的区成立**：host（9/11）、client（6/6）、presets 与 content（只能对一半，另一半是属性测试）。
2. **镜像现在是散文，不是不变量**：四个 owner、三种说法、零门禁，已经漂了 5 处。
3. **repo 不能按源码分**：换 owner 轴（structure / pack / release / docs / budget / security），并在 README 明说「本区不是镜像区」。
4. **lib 的镜像 = 都平铺**：不造 33 个目录；缺口补在覆盖上（3 个模型可见模块）。
5. **属性轴要显式**：i18n / presets / content 里一次扫全量的 spec，加前缀或 README 一句话，否则永远像「放错了」。

## 9. 未覆盖 / 未验证

- `tool-card` 的 `cardStateOf` 分支是否真的被间接断言——未验证。
- 源码面的 5 条发现只做了静态读，没有红证；「路径安全 5 份实现」是否会造成真实 bug，未验证。
- `tests/ui` 与 `tests/client/ui` 的改名成本没算（涉及金样路径与 `ui-expected` 工具）。
- 真浏览器/真模型面完全没碰：本文件不证明任何模型可见文本的行为。
