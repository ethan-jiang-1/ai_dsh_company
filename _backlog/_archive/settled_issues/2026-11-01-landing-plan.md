---
status: 已结
opened: 2026-11-01
---

# 推敲：落地顺序——把 research 与 issues 串成一条可执行的产品化路线

> 立卡：2026-11-01 ｜ 状态：已结 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：是
>
> **结论/去向**：已结（2026-11-01）。P0–P6 按序执行；P3/P4/P5 的 v1 边界（Web onboarding、Windows/registry、
> 完整威胁注入、旧 design 文档逐篇改写）明确不阻塞关闭。证据 = [v2 manifest Note](../../../notes/implemented/2026-11-01-plugin-as-product-v2-manifest.md)
> + `release --verify` 全绿 + 本卡「实施回执」。
>
> **2026-11-01 用户授权**：按伞卡 Q1–Q7 推荐推进；setup goal；静默自主执行；不询问；补测试计划。
> 执行顺序 = 本卡 P0–P6；测试计划 = 本卡「## 测试计划（落地尾巴）」。本卡不是实施授权之外的
> 第二套顺序；落地内容仍归各切片卡。

## 问题与期望结果

**问题**：research 已经有四份（机制/生命周期/信任/发布），issues 已经有四张
（伞卡/生命周期/workspace & 数据安全/发布与文档）。但它们现在是“并列的面”，不是“按顺序能落地
的路线”：先做什么、什么必须等决策、什么可以并行、每步的出场条件是什么、哪一步失败就停，
没有一张纸说清。没有这张纸，实施会变成“想到哪做到哪”，或者一次改太多无法归因。

**期望结果**：一张**有依赖、有出场条件、有回退点**的落地顺序：
1. 决策先于代码：伞卡 Q1–Q7 未答不动实现；
2. 先做一条**端到端垂直切片**（product entry），再做数据核心（bundle v2/workspace），再做
   生命周期/安全，最后发布/文档；每步都能独立验收；
3. 每阶段有“可开始条件 / 交付 / 出场门 / 失败就停”的四段；
4. 明确哪些可以并行（文档草案、测试先行、安全清单），哪些必须串行（决策、schema、发布）；
5. 明确回退点：每阶段结束可停、可回退；不把“半产品”发出去；
6. 与 research 的技术底稿、issues 的验收标准一一对应，不另造第二套。

**本轮判断完成的标志**：用户确认这条顺序与决策门槛；各卡的前置/验收一致；本卡转为
RFC/实施申请。**本卡不是实施授权，也不是任务队列。**

## 输入（四份 research + 四张卡）

| 面 | research | issue 卡 | 现在最不确定的 |
|---|---|---|---|
| 形状/机制/数据归属 | [主稿](../research/plugin-as-product/2026-11-01-plugin-as-product.md) | [伞卡](2026-11-01-plugin-as-product.md) Q1–Q7 | 一安装一 workspace？生产状态含方法/账本？专用盘还是已有项目？ |
| 生命周期/失败模式 | [生命周期](../research/plugin-as-product/2026-11-01-product-lifecycle.md) | [产品生命周期](2026-11-01-product-lifecycle.md) | doctor/repair 范围、备份点、降级深度 |
| 信任/数据安全 | [信任/数据](../research/plugin-as-product/2026-11-01-trust-and-data.md) | [workspace 与数据安全](2026-11-01-workspace-and-data-safety.md) | `bundle.json` 可写边界、methods/ledger 是否全搬、不可信项目声明 |
| 发布/文档/验证 | [发布/验证](../research/plugin-as-product/2026-11-01-release-and-verification.md) | [发布与文档](./2026-11-01-release-and-docs.md) | doc-budget 处置、registry/Windows 声明、CI 范围 |

## 未知怎么关（先分事实/决策，别混）

| 未知 | 类型 | 怎么关 | 卡在哪 |
|---|---|---|---|
| 浏览器自动选中/自动 CEO 会话 | 事实 | **已 T 关**（§4.1b） | — |
| `bin` 安装形态 | 事实 | **已 T 关**（小包） | — |
| 独立 host row/readiness | 事实 | **已 T 关**（registrar probe） | — |
| `COMPANY.md` 候选注入 | 事实 | C 已读；P1 加 keyless/真注入 smoke | P1/P2 |
| v1→v2 `bundle.json` 迁移 | 设计 | P2 单测 + `lifecycle-smoke` 迁移段 | P2 |
| seed consent/只补缺 | 设计 | P1 keyless + `company-entry-smoke` | P1 |
| 一安装一 workspace vs 多 | **偏好/产品** | P0 Q2 人答 | P0 |
| 方法/账本留 host vs 搬 | **偏好/安全** | P0 Q3 人答 | P0 |
| 专用盘 vs 已有项目 | **偏好/产品** | P0 Q1 人答 | P0 |
| 终端询问 vs Web onboarding | **偏好/UX** | P0 Q4/Q6 人答 | P0 |
| doc-budget 搬/压/提额 | 事实+规则 | P5 按 docs/AGENTS 决定并记录 | P5 |
| Windows/共享盘/registry | 未验证/未启用 | 明确不承诺；不阻塞 | 范围外 |

结论：**P0 只剩“人答”的偏好题；P1–P5 的未知都能用测试/原型关**。没有“等灵感”的未知。

## 已有关键 T 证据（2026-11-01，直接支撑 P1/P2）

| 证据 | 结果 | 对哪一步 |
|---|---|---|
| `--profile company --from-default-profile web --dump-default-config` | 建出 `profiles/company`，bundles = base + web-app | P1 profile 建 |
| `plugin --profile company add <tgz>` + 外部 `DSH_COMPANY_HOME` | bundles 追加 pack，boot 出 banner、骨架落盘 | P1 安装/首启 |
| 小包 `bin` 经 `dsh plugin add` | `profiles/company/node_modules/.bin/<name>` 被链出且可执行 | P1 启动器包装 |
| registrar probe（subpath export + `inject` + async apply） | `[probe] registered` 在 `dsh web:` 之前；`storages/workspace.json` 含 path | P1 boot 登记 |
| registrar probe + company pack + 浏览器 | `session/list` 0→1；页面无 `Choose workspace`；cwd = workspace；`agentPreset = ceo` | P1 UX 验收 |

**未覆盖**：registrar 尚未集成进本包；seed/consent、`bundle.json` v2、真实模型调用、刷新复用、
多 workspace、Windows。P1/P2 仍要把这些补成真 smoke。

## 落地原则（先定，避免实施漂移）

1. **决策先于代码**：伞卡 Q1–Q7 未答，不写实现；最多写探针/测试/文档草案（不改变产品形状）。
2. **先垂直、后水平**：先让“安装 → 启动 → 目标 workspace → CEO 会话”一条链真跑通，再扩
   生命周期/安全/文档；不要先铺十个半成品。
3. **每阶段可停**：每阶段结束是一个可交付、可回退的状态；不把半升级/半迁移/半文档交给用户。
4. **证据先行**：每阶段先写“失败长什么样”的判据（红），再写实现；不能只报告 ALL PASS。
5. **文档同 diff**：合同/README/手册随实现同 diff；不能“先发再补文档”。
6. **发布字节 = 冒烟字节**：`_dist` 产物必须就是认证档验过的那份；不另打包。
7. **一阶段一归因**：不把 pin 升级、产品形状、文档重写混在一个不可拆的 diff；每阶段有
   独立提交/证据。

## 阶段顺序（P0–P6）

### P0 · 决策与基线（无代码）

- **可开始**：本轮。
- **交付**：伞卡 Q1–Q7 的答案；选定目标形状（一安装一 workspace？专用盘/已有项目？方法/账本
  留 host？手册碰撞？0.5.0 迁移？启动器？seed consent？）；把答案写回伞卡；必要时写 RFC。
- **出场门**：七个问题都有明确答案（可以是“按建议”）；没有“以后再说”的关键项。
- **失败就停**：任一关键项未答，不进入 P1；最多做探针/测试/文档草案。
- **回退**：无代码，无回退成本。

### P1 · 产品入口垂直切片（S1）

- **可开始**：P0 出场；Q2/Q5/Q6/Q7 已定。
- **交付**：`company` profile 建/验、启动器（repo/bin）、workspace 解析/询问/拒绝、boot 登记
  row、seed consent、无 workspace 停写；`company-entry-smoke` + `release-smoke` 新断言。
- **出场门**：干净 home + 干净 workspace：装 pack → 启动 → 无 `Choose workspace` →
  自动 CEO 会话（cwd=workspace）；二启稳定；无参/坏路径/未 consent 各有明确失败。
  本阶段允许 legacy `<home>/bundle.json` 仍在（P2 才搬 v2）；P2 出场门才要求“无 home bundle”。
- **证据**：T 探针（已有 registrar/浏览器）+ 新 smoke；每道新判据红→绿。
- **失败就停**：启动器 profile 安全/登记/自动会话任一不成立，回 P0/P1 修，不进入 P2。
- **回退**：保留旧 `web` profile 路径；启动器可停用，用户仍可 `DSH_COMPANY_HOME` 直启。

### P2 · run bundle v2、workspace 身份与手册（S2/S3）

- **可开始**：P1 出场；Q1/Q3/Q4/Q5 已定。
- **交付**：`bundle.json` v2 到 workspace、v1 迁移、rebind 退役、一安装一 workspace 约束、
  身份备份；手册碰撞（AGENTS/COMPANY）、presets 候选、manifest 实际目标；日志/导出布局。
- **出场门**：`release-smoke`（v2/无 home bundle/二启稳定）、`lifecycle-smoke`（v1→v2/
  升级保数据）、`handbook-target` spec；旧盘显式 `--workspace` 可用；rebind 只告警。
- **失败就停**：迁移丢 id/哈希、旧盘不可用、手册不注入，回 P2 修，不进入 P3。
- **回退**：保留旧 home manifest/旧 tarball；v1 迁移可重跑；不删旧文件。

### P3 · 生命周期与恢复（生命周期卡）

- **可开始**：P1/P2 出场；生命周期卡「未决问题」已答。
- **交付**：升级/降级/中断/搬 home/搬 workspace/备份/恢复/卸载/doctor 的合同 + smoke 扩展 +
  失败注入；手册生命周期章节。
- **出场门**：`lifecycle-smoke` 扩展、`external-workspace-smoke`、`workspace-move-smoke`
  （计划）、`doctor` 检查；每条失败面有明确出口；红→绿。
- **失败就停**：降级写坏更高 schema、搬移不可恢复、卸载误删，回 P3 修，不进入 P4。
- **回退**：旧 tarball + 旧数据；备份点；不承诺运行中升级。

### P4 · 信任/数据安全（安全卡）

- **可开始**：P2 出场（身份/导出布局已定）；Q3 已定；可与 P3 并行（测试先行）。
- **交付**：信任边界/数据卡更新、`bundle.json` 可写策略、方法/账本导出、秘密/日志、symlink/
  consent 篡改/不可信项目声明；安全测试与红证。
- **出场门**：manifest 篡改/consent 伪造/symlink/秘密扫描有红→绿；`danger-full-access` 降级
  声明在场；数据卡逐项 owner/authority/backup/delete；导出不是第二权威。
- **失败就停**：任何“产品承诺了防篡改/防注入”但没有机制，回 P4 改文案/机制，不进入 P5。
- **回退**：安全声明可收紧；导出可停；不影响 P1/P2 主链。

### P5 · 发布与文档真相（发布与文档卡）

- **可开始**：P1–P4 的事实已定；可与 P3/P4 同步起草，最后收口。
- **交付**：`_dist` 手册/模板/关键句、根 README、pack README、workspace README、docs 合同/
  guides/CHANGELOG、stale sweep、doc-budget 处置、验证矩阵。
- **出场门**：`export-dist` 新手册/sha/清单；`dist-manual`/`doc-budget`/`md-links`/`bare-path`
  绿；README/手册无旧主路径；文档预算有处置记录。
- **失败就停**：手册教旧路径、文档预算爆、tarball 缺条目，回 P5 修，不发布。
- **回退**：保留上一版 `_dist`；手册可重生成；不手改。

### P6 · 全量验证与 0.5.0 发布（S5）

- **可开始**：P1–P5 全绿；所有卡验收满足。
- **交付**：`pnpm verify` / `pnpm test` / release/lifecycle/company-entry/client-load/
  multi-install/isolation/external 全绿；每道新判据红→绿收据；`0.5.0` + `_dist` 重导 +
  CHANGELOG；实现 Note/RFC；旧 Note 取代 banner。
- **出场门**：认证档全绿；tarball = 冒烟字节；无 P0 未决；文档/合同/手册一致。
- **失败就停**：任一认证档红，不发布；回到对应阶段。
- **回退**：上一版 tarball/manual；workspace/home 不动；发布可撤回（内部交付）。

## 并行与依赖（关键路径）

```text
P0 决策
  └─ P1 入口 ── P2 bundle/workspace/手册 ── P3 生命周期
                     │                         │
                     ├─ P4 信任/数据（可与 P3 并行，测试先行）
                     └─ P5 文档/发布（可提前起草，P3/P4 后收口）
                                                   └─ P6 全量验证/0.5.0
```

- **必须串行**：P0 → P1 → P2；P2 → P3（生命周期依赖 v2/迁移）；P5 收口在 P3/P4 后；P6 最后。
- **可并行**：P4 安全测试与 P3 生命周期测试可先写（TDD）；P5 文档草案可与 P2/P3 同步；
  P1 的 registrar/启动器探针已 T，可先集成。
- **不可并行**：不要把 pin 升级、产品形状、文档重写塞进同一 diff；不要 P1 未稳就做 P2 迁移。

## 决策敏感点（答案会改顺序/范围）

| 决策 | 若选 A | 若选 B | 对顺序的影响 |
|---|---|---|---|
| Q2 一安装一 workspace vs 多 | v1 一安装一 workspace（推荐） | 多 workspace | B 需在 P2 前加“per-workspace 治理 + Client 切换器”研究/卡，P3/P4 顺延 |
| Q3 方法/账本留 host vs 搬 | 留 host + 导出（推荐） | 全搬 | B 需在 P4 前加安全设计卡，P4 变重，P2/P3 不变 |
| Q1 专用盘 vs 已有项目 | 专用盘主验收 + 已有项目支持（推荐） | 只支持专用盘 / 只支持已有项目 | 影响 P2 手册碰撞、P5 README/手册、P1 seed 策略 |
| Q4 手册碰撞 vs 全量改名 | 碰撞感知（推荐） | 全量改名 | B 增加 P2 的 preset/骨架/gates churn，P5 文档更多 |
| Q5 0.5.0 迁移 vs 新装 only | 0.5.0 + v1 迁移（推荐） | 只支持新装 | B 砍掉 P2 迁移/ P3 降级，但旧用户断崖 |

## 停止点 / 回退点（写给实施者）

- **P0 未答**：不写产品代码；只允许探针/测试/文档草案。
- **P1 未过**：不碰 `bundle.json` v2/迁移（避免“入口没通就改数据”）。
- **P2 未过**：不做生命周期发布/卸载承诺（避免“数据没稳就发”）。
- **P3/P4 未过**：不写“可升级/可恢复/防篡改”文档（避免撒谎）。
- **P5 未过**：不导出/不发布 0.5.0。
- **P6 红**：不发布；回对应阶段。

## 验收标准（计划本身）

1. 四份 research、四张 issue 卡、本计划卡互相链接，无第二套顺序。
2. 每阶段有“可开始 / 交付 / 出场门 / 失败就停 / 回退”。
3. 决策敏感点表覆盖 Q1–Q5；用户能据此选 A/B 并看到顺序影响。
4. 与主稿 §10.8 测试矩阵、生命周期稿失败注入、发布稿验证矩阵一致。
5. 用户确认顺序；未确认前不进入实施。

## 测试计划（落地尾巴）

> 目标：每个阶段都有“先红后绿”的可执行证据；认证档只跑真实入口；不把 `verify` 绿当安装可用，
> 不把 `release-smoke` 当浏览器 UX，不把 keyless 当模型/跨平台。计划中的新脚本以“计划新增”
> 标注，落地时进 `checks/` 并登记索引。

### 1. 分层与职责

| 层 | 资产 | 证什么 | 何时跑 |
|---|---|---|---|
| 结构 | `pnpm verify` | 形状/链接/预算/门禁接线 | 每次改动 |
| keyless | `pnpm test` | 纯逻辑/静态渲染/规格 | 每次改动 |
| 安装 | `release-smoke` | 真 tarball 装进干净 profile、roster、boot、首启/二启 | P1/P2/P6 |
| 入口 | 计划新增 `company-entry-smoke` | 启动器建 profile/装 pack/workspace/无参/seed | P1/P6 |
| 生命周期 | `lifecycle-smoke` | 升级/降级/卸载/搬 home/business 恢复 | P2/P3/P6 |
| 搬移 | `external-workspace-smoke` | 外部盘/搬 home；计划新增 workspace-move 段 | P2/P3 |
| 隔离 | `multi-install-smoke` / `isolation-matrix-smoke` | 多 home/profile/外部盘/无 workspace 停写 | P2/P3/P6 |
| 并发 | `concurrent-home-smoke` | 同 home 两进程可解析/不写坏 | P3 |
| 浏览器 | `client-load-smoke` | 真页面零挂载失败/品牌/自动 workspace/CEO 会话 | P1/P6 |
| 真模型 | `preset-smoke` / `handbook-smoke` / `delegation-smoke` | 真挂载/注入/汇报线 | 内容改动/发布前 |
| 分发 | `tools/export-dist.mjs` + `dist-manual` | 手册/sha/清单/版本 | P5/P6 |

### 2. 分阶段测试清单

**P0（决策/计划）**
- `pnpm verify` 的 `backlog-liveness`/`md-links`/`bare-path` 绿；本卡/伞卡/研究互链无死链。
- 不跑实现测试；不伪造“已实现”。

**P1（入口）**
- keyless：`launcher.spec`（只建缺失/已有不 reset/无参/无 TTY/设置写入）、
  `workspace-resolution.spec`（优先级/坏路径/canonical）、`seed-consent.spec`（无 consent 零写/
  匹配/已初始化/pack 版本变/`DSH_COMPANY_BOOTSTRAP=off`）、`register-workspace.spec`（无 env/
  坏路径/幂等/不抛/stub registry）。
- 真入口：计划新增 `company-entry-smoke`：干净 HOME+DSH_HOME → `pnpm company --workspace <tmp>
  --yes --no-open` → profile 建/装 pack/banner/workspace 登记/无 `Choose workspace`/CEO 会话；
  无参/坏路径/未 consent 非零。
- 浏览器：`client-load-smoke` 扩展：打开 token URL，当前 cwd=target、品牌/公司 UI、零 error。
- 红证：去掉 registrar 的 `inject`/async wait → 登记晚于 banner 或首屏要选 workspace；去掉
  consent 检查 → 未确认也写盘；启动器对已有 profile 调 `--from-default-profile` → 测试红。

**P2（bundle v2/手册/一 workspace）**
- keyless：`bundle-manifest-v2.spec`（路径/形状/损坏/更高版本/v1 迁移/handbookTarget/备份）、
  `handbook-target.spec`（AGENTS 优先/碰名 COMPANY/两者并存/pack 升 v3 映射）、
  `one-workspace.spec`（第二 workspace 拒绝/提示新 home）。
- 真入口：`release-smoke` 断言无 home bundle、workspace v2、二启字节稳定、workspace 列表；
  `lifecycle-smoke` 断言 v1→v2 迁移、id/createdAt 保留、旧盘 `--workspace` 可用、rebind 只告警。
- 红证：v1 迁移写 home 路径 → 无 workspace v2 即红；rebind 仍改写 → 断言只告警即红；
  手册目标映射错 → keyless 红。

**P3（生命周期）**
- 真入口：`lifecycle-smoke` 扩展（升级/降级/中断/卸载/搬 home/business 恢复）；
  `external-workspace-smoke` + 计划新增 workspace-move 段（搬 workspace/改名/stale 登记）；
  `concurrent-home-smoke`（第二 writer 停写）。
- keyless：`doctor.spec`（坏 manifest/缺 workspace/stale lock/半安装的检查与下一步）；
  `migration.spec`（更高 schema 不静默降级）。
- 红证：降级时强写更高 schema → 断言 fail loud/保留原文件；搬 workspace 自动改 DSH 存储 →
  断言“只提示/重登记”红。

**P4（信任/数据）**
- keyless：manifest 篡改/删除/更高版本；consent 伪造只补缺；symlink 穿出拒绝/keep；秘密扫描/
  日志脱敏；methods/ledger 导出派生、不反向。
- 真入口：`present-catalog-smoke` 扩展（present 后导出在场；adopt 后导出更新；权威仍在 home）。
- 红证：把导出当权威读 → 断言 authority 仍在 home 红；把 `bundle.json` 当防篡改 → 文档/测试
  红（应写“host 备份 + fail loud”）。

**P5（发布/文档）**
- 门禁：`export-dist` 新手册/sha/清单；`dist-manual` 新关键句（`company`/`--workspace`/
  `.dsh-company`/`AGENTS.md`/`COMPANY.md`/`exports`/home 治理/卸载/回退/pnpm 11/12/DSH）；
  `doc-budget`/`md-links`/`bare-path`/`pack-files`/`pack-exports`。
- stale sweep：`rg 'company-workspace|bundle\.json|DSH_COMPANY_REBIND|--profile web|
  一个 home 一个 bundle|侧栏.*工作区'` 逐条判“现行改/历史 banner/归档不动”。
- 红证：手册删 `--workspace`/`.dsh-company` → `dist-manual` 红；README 留旧主路径 →
  `bare-path`/人工审红；doc-budget 超 → 红。

**P6（0.5.0）**
- 全量：`pnpm verify`、`pnpm test`、`release-smoke`、`lifecycle-smoke`、`company-entry-smoke`、
  `client-load-smoke`、`multi-install-smoke`、`external-workspace-smoke`、
  `isolation-matrix-smoke`；按改动面跑 `preset-smoke`/`handbook-smoke`/`delegation-smoke`。
- 分发：`node tools/export-dist.mjs`；sha 与手册一致；tarball 含 bin/register/workspace；
  `dist-manual`/`dist-freshness` 绿。
- 收据：每条新判据红→还原→绿原话；认证档结果；未跑项/环境限制如实写 Note。

### 3. 失败注入（至少这些）

| 注入 | 期望 |
|---|---|
| 安装/升级中途杀进程 | 重跑幂等或明确诊断；不半成功 |
| 坏/更高 `bundle.json` | fail loud、保留原文件、恢复备份 |
| 无 consent/伪造 consent | 零写；只补缺，不覆盖 |
| 已有 `AGENTS.md` | 写 `COMPANY.md`，不覆盖 |
| 搬 home/workspace | 点名 stale；新登记；旧会话不可续 |
| 符号链接指向 home/凭据 | 拒绝/keep；不穿出 |
| 第二 writer/第二 workspace | 停写/拒绝；不串盘 |
| 磁盘满/无权限 | 明确失败；不写半截 |
| 卸载后重装 | workspace 数据仍在；身份不丢 |

### 4. 证据纪律

- 只报告实际跑过的；红证必须是“造红→还原→绿”的原话，不能只写“已验证”。
- 真模型/浏览器不进 `pnpm test`；认证档不进 CI 默认（除 fresh clone/keyless）。
- 每个阶段结束更新对应卡的状态/证据；不把“计划绿”当“实现绿”。

## 实施回执（2026-11-01，静默自主执行）

| 阶段 | 状态 | 证据 / 剩余 |
|---|---|---|
| P0 决策 | ✅ | 用户 2026-11-01 授权按推荐；伞卡 Q1–Q7 已落 |
| P1 产品入口 | ✅ | 启动器 `bin/dsh-company.mjs` + `pnpm company`；`company-entry-smoke` / `release-smoke` / 浏览器自动 CEO 会话（T） |
| P2 v2/手册/一 workspace | ✅ | `bundle-manifest.spec` v2/迁移/升级/符号链接；`seed-handbook.spec`；`release-smoke` 无 home bundle、v2、二启稳定；启动器拒同 home 第二盘 |
| P3 生命周期 | ✅ | `lifecycle-smoke`、`upgrade-while-running-smoke`、`interrupted-install-smoke`、`external`/`isolation`/`multi`、`doctor`、真实旧 home v1 迁移、workspace 搬迁；Web onboarding 明确 v1 外 |
| P4 信任/数据 | ✅ | 方法/账本留 home + `governance-export`；`bundle.json` 身份备份；`register-workspace` 不建目录/不授权；`untrusted-project.spec` 覆盖恶意 AGENTS/symlink/伪造 consent/危险落点；完整 prompt injection 明确 v1 边界 |
| P5 发布/文档 | ✅（核心卡已归档） | 根 README、pack/workspace README、profile/runtime-map/data-model/release/project-map/decisions/external-research/demo/bootstrap/environments/orient、CHANGELOG、`_dist` 手册；[发布与文档卡已结归档](./2026-11-01-release-and-docs.md)；旧 design 文档只做关键指针清扫（v1 边界） |
| P6 验证/发布 | ✅ | `pnpm verify` / `pnpm test` / `release --verify` 全绿；`_dist` 0.5.0 已重导；`release` manifest 已更新 |

**v1 明确边界（不阻塞关闭）**
- Web 内 onboarding 选 workspace 不做（v1 终端启动器询问/`--workspace`）。
- Windows / 容器 / npm registry 不验证/不启用。
- 不可信项目不承诺消除 prompt injection/恶意脚本；边界/形状测试已加。
- 旧 design 文档（role-content-plan/ui-demo 等）保留历史语境，未逐篇改成产品叙事。

## 关闭条件

- 用户确认 P0–P6 顺序与决策门槛；各卡前置/验收一致。
- 下游 RFC/实施申请已提交并记录去向（`rfc` / `implementation` / `用户（日期）`）。
- 满足后写 `可关闭：是`、卡顶补 `> **结论/去向**`，`git mv` 到
  [_archive/settled_issues](./README.md)，更新两边清单。

## 关联

- 伞卡：[插件即产品](2026-11-01-plugin-as-product.md)
- 落地卡：[产品生命周期](2026-11-01-product-lifecycle.md)、
  [workspace 与数据安全](2026-11-01-workspace-and-data-safety.md)、
  [发布与文档](./2026-11-01-release-and-docs.md)
- 研究：[主稿](../research/plugin-as-product/2026-11-01-plugin-as-product.md)、
  [生命周期](../research/plugin-as-product/2026-11-01-product-lifecycle.md)、
  [信任/数据](../research/plugin-as-product/2026-11-01-trust-and-data.md)、
  [发布/验证](../research/plugin-as-product/2026-11-01-release-and-verification.md)
