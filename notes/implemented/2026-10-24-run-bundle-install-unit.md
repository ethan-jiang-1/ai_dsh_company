# run bundle 作为安装单元（干净底座 + 基部/扩张分层）

状态：已交付（2026-10-24；用户令「那就 setup goal 来都弄好吧」，按 [问题卡](../../_backlog/_archive/settled_issues/2026-10-24-run-bundle-clean-base.md) 的建议推进；RFC 正文已并入本篇）。

> 来源：问题卡（已归档）+ [研究稿](../../_backlog/_archive/research/run-bundle/2026-10-24-run-bundle-boundary.md)。
> 一句话：把“产品源码”和“一个正在运行的部署”拆开——产品仓只留基部；每次安装产生一个独立、
> 可识别、默认干净的 run bundle；用户在自己的 bundle 里培养扩张能力。

## 决定

1. **run bundle = 物理安装单元**：`bundle.json` + 一个 DSH home + 一个 company workspace。
   一次安装一个 bundle；第二个 CEO **新开 `DSH_HOME`**。原来“一次运行 = 四件套”改称 **run trace**
   （引用不复制），不再与安装单元撞名。
2. **dev 也走 bundle**：home = `runtime/harness-home`，workspace = 仓库根 `company-workspace`
   （整树 gitignored；manifest 记绝对根）。产品默认同址：`<DSH_HOME>/company-workspace`（记相对根）。
3. **整盘去 tracked**：`company-workspace/` 146 件 `git rm --cached`（工作树不动）+ `.gitignore`
   整树规则；迁移前已做全量导出（workspace 45M gz + sessions 160M gz + tracked 清单，
   住 `runtime/backups/`，gitignored）。
4. **基部 / 扩张分层（五角色同等）**：pack 的 `presets/<role>/` + `workspace/` 是基部；
   方法层（`<home>/profiles/<p>/company-cultivation/<role>/`）、journal、培养记录、交付物、台账、
   sessions 是扩张，只住 bundle、不进产品仓。提升到基部 = 显式改 pack + Note，不自动回流。
5. **manifest + 哈希升级**：首启写 `<DSH_HOME>/bundle.json`（v1：id / createdAt / pack 版本 /
   workspace 根 / 基部逐文件 sha256）。升级逐文件判定：缺失 ⇒ 补建；用户改过（当前哈希 ≠ 上次基部
   哈希）⇒ 保留并记日志；没改过 ⇒ 替换；扩张面一个字节不动。manifest 只创建、绝不覆盖。
6. **分发件 0.3.1**：`_dist` 重导（260 条目，含 23 个 `workspace/`）；手册写清 run bundle /
   独立 home / 干净判据 / 升级 / 备份；`dist-manual` 门禁从“只比版本”扩到“版本 + run bundle 关键句 + pin”。
7. **备份口径**：整个 `DSH_HOME` = bundle；归档排除 `.credentials.yaml` 与含 token 的日志；
   本轮未做自动 `bundle export` 工具（列为后续）。

## 输掉的方案

| 方案 | 为什么不选 |
|---|---|
| 只 ignore 数据、不定义安装单元 | 仓库变干净，但复用 home 的第二个 CEO 仍会拿到 sessions / 凭据 / 方法层；不满足“每次安装一个 bundle” |
| 全量物化 run trace（复制每次运行） | 违反“引用不复制、防第二权威”（2026-10-05/07 否决的是这个，不是部署单元） |
| 基部制度件做成指回 pack 的符号链接（产品侧） | 第三方安装路径不可控、pnpm store 更新会断；只有 dev 的自管盘用链接 |
| 一上来把 dev home/workspace 搬进统一目录 | 改动 session cwd slug、workspace 登记与全部消费者；先拿契约，布局统一留后续 |
| 产品/部署拆双仓 | 单人维护、跨仓审计成本高；数据再涨 10× 再评估 |
| 升级仍“只补缺” | 已安装的基部永远停在安装版本；哈希判定能在不覆盖用户编辑的前提下升级 |

## 实现与落点

- **manifest / 升级逻辑**：[`src/host/bundle-manifest.ts`](../../packages/company-pack/src/host/bundle-manifest.ts)
  （`planBundleManifest` / `writeBundleManifest` / `readBundleManifest` / `planSkeletonUpgrade` /
  `applySkeletonUpgrade` / `writeUpgradedManifest`）；host 接线 = [`src/index.ts`](../../packages/company-pack/src/index.ts)
  apply 末尾（与 bootstrap 开关解耦：dev 也写身份）。
- **判据**：[`tests/company/bundle-manifest.spec.ts`](../../tests/company/bundle-manifest.spec.ts)
  （6 条：首启创建 / 不覆盖 / 外部根 / 无盘不冒充 / 指纹跳过 dotfile+symlink / 升级保留用户编辑）。
- **门禁**：新增 [`checks/gates/run-bundle-clean.mjs`](../../checks/gates/run-bundle-clean.mjs)（替代
  `drafts-untracked`）；`company-skeleton` 改为“pack 单源恒查 + dev 盘在场才查符号链接”；
  `handbook-budget` / `doc-budget` / `bare-path` 改读 pack 骨架；`ledger-participation` 在无 dev bundle 时
  如实跳过；`security-scan` 扫描面改 pack 出厂骨架；`dist-manual` 扩内容断言。
- **dev 入口**：[`tools/bundle-init.mjs`](../../tools/bundle-init.mjs)（`pnpm bundle:init`；已有盘一个字节不动；
  制度件 8 处符号链接指回 pack）；[`run/env.sh`](../../run/env.sh) 导出 `DSH_COMPANY_HOME` 并在缺盘时提示。
- **分发**：[`tools/export-dist.mjs`](../../tools/export-dist.mjs) 手册重写 + 清单加
  `workspace/AGENTS.md`/`kb/org.md`/`kb/owners.md` 与禁项（不允许 `company-workspace|sessions|deliverables|cultivation|profiles|credentials`）。
- **安装冒烟**：[`checks/smoke/release-smoke.mjs`](../../checks/smoke/release-smoke.mjs) ⑥ 新增
  bundle.json / 干净底座 / 二次启动 manifest 字节不变；并修掉“release-smoke 直接用 dev home → 把临时
  workspace 记成 dev bundle 身份”的隔离 bug（现在 `DSH_HOME` 用 `runtime/harness-home/tmp/release-smoke-home`）。
- **文档**：[运行态地图 §二·五](../../docs/runtime-map.md)（定义 + base/grown 表）、[项目地图](../../docs/project-map.md)、
  [release](../../docs/release.md)、[demo](../../docs/demo.md)、[bootstrap](../../docs/guides/bootstrap.md)、
  [orient](../../docs/orient.md)、[run/README](../../run/README.md)、[runtime/README](../../runtime/README.md)、
  [pack README](../../packages/company-pack/README.md)、[workspace README](../../packages/company-pack/workspace/README.md)；
  决策台账 D45。

## 二修（2026-10-24，验证发现第一版只做对一半）

**发现**：按“干净安装”实测，装出来的 5 份 CHARTER 仍带我们 305 行动议历史（客户/价格/结论/归档路径）——
workspace 数据层干净了，但 **pack 的基部内容本身漏历史**。这直接违反“给不同 CEO 装 = 干净底座”。

**修法**：
- dev 的 5 份 CHARTER 改为**真实文件**（grown；保留全量历史），不再是 pack 的符号链接。
- pack 的 5 份 CHARTER 只留“角色方法与边界 + 空历史节”；内联的日期/归档引用一并清掉；
  `templates/meta.md` 与 `kb/org.md` 去部署日期/事故计数。
- `company-skeleton` 不再要求 CHARTER 符号链接；新增 `base-clean` 门禁（CHARTER 历史条目/归档引用 +
  journal/交付物/培养记录实际内容）。
- `bundle:init` 只链接 AGENTS/templates/org；CHARTER 以基部副本落盘。
- dev 的 2026-09 历史（99 条）移到 `runtime/backups/charter-history-pre-2026-10/`（gitignored），
  live 只留 2026-10。

**证据**：
- 新 home 装 0.3.1 后，全 workspace 搜
  `agentic-coworker|renewal-x|token-factory|ai-transformation|snapshots/archive|^- 2026-09-|（2026-`
  ⇒ **0 命中**（修前 CEO 一份就有 70 行日期、5 份共 305 条）。
- `base-clean` 造红：往 pack CEO CHARTER 追加 `- 2026-09-22 · leak-test` ⇒ FAIL；删回 ⇒ PASS。
- release-smoke 仍 ALL PASS（骨架 30 件 / bundle.json / 二次零变更）。
- 装出的 CHARTER 行数：ceo 19 / cfo 26 / coo 24 / vp-eng 18 / vp-sales 22（修前 79–87）。

## 验证（真跑过的命令与红/绿形态）

| 检查 | 结果 |
|---|---|
| `node checks/run-gates.mjs` | **ALL PASS**（39 道；含新 `run-bundle-clean`、扩内容 `dist-manual`） |
| `npx vitest run` | **85 files / 829 tests 绿**（含新 `bundle-manifest.spec.ts` 6 条） |
| `node checks/smoke/release-smoke.mjs` | **ALL PASS**：安装副本带 `workspace/`；首启 30 件骨架；`bundle.json`（id / workspace=`tmp/release-company-workspace` / files=16）；干净底座 0 件扩张数据；二次 boot 零变更 + manifest 字节不变 |
| `node tools/export-dist.mjs` | **ALL PASS**：`dsh-company-pack-0.3.1.tgz` 260 条目、presets ×20、workspace 在场 |
| `pnpm bundle:init`（先移走真盘，再建，再还原） | 建出 10 个普通文件 + 8 个符号链接（AGENTS/templates/org/CHARTER×5）；还原后 1880 件工作树文件 |
| `git ls-files company-workspace` | **0**（迁移前 146 件 / 1.2MB，`git rm --cached` 保留工作树） |
| 空 home 真装（临时 `DSH_HOME`，0.3.0 tarball） | `plugin add` 自建 profile；首启落 16 文件 + 15 目录；`bundle.json` 写入；无 sessions |
| 两 bundle 并行（临时 `DSH_HOME` ×2，同一 tarball） | id 不同、各自 `company-workspace`、各自 `sessions/` 为空——安装单元隔离成立（keyless） |
| 旧分发件对照 | `_dist` 0.2.0 = **139 条目 / 0 个 workspace**；当前 0.3.1 = **260 / 23** |

**红证（造红 → 还原 → 绿；都实跑）**
- `run-bundle-clean`：`git add -f company-workspace/AGENTS.md` ⇒
  `FAIL run-bundle-clean: index 里有 1 件 bundle 数据…：company-workspace/AGENTS.md`；`git rm --cached` ⇒ PASS。
- `dist-manual`：把手册里的 `bundle.json` 改成 `bundle.removed` ⇒
  `FAIL dist-manual: 手册缺安装形状关键句：bundle.json…`；还原 ⇒ PASS。
- manifest 不覆盖：去掉 `writeFileSync(..., { flag: 'wx' })` ⇒ 6 条中 1 条红
  （`× 首启创建 manifest…二次调用不覆盖`）；还原 ⇒ 6 绿。
- 升级保留用户编辑：把升级分支改成“有差异就 update” ⇒
  `× 未改的基部替换、改过的保留…`（`expected '# 手册 v2' to be '# 用户改过'`）；还原 ⇒ 6 绿。
- `bundle:init` 的“已有盘不动”由脚本首行 `existsSync` 分支保证；本轮实跑“先移走 → 建 → 还原”，
  未在已有盘上跑（避免覆盖真数据）。


## 独立验证（2026-10-25，goal = 只验证、不再堆功能）

### 结论

- **可靠（有可复跑证据）**：新装即干净（0 条部署历史）；基部/扩张分层成立；两 bundle 文件级隔离成立；
  基部升级只动“没改过的基部”，扩张面与用户编辑不动；关键门禁逐一造红→还原；
  **fresh clone 没有 `company-workspace` 也能过 `pnpm verify` + `pnpm test`**（827 过 / 3 跳）。
- **半可靠 / 未自动化**：**同一个 `DSH_HOME` 复用给第二个 CEO 仍只是政策约束**，机制上无法分辨
  “同一 CEO 续用”与“换人复用”；两 bundle 只做了 keyless 文件级隔离，没有真模型会话隔离；
  安装级“双 bundle / 升级”没有进自动回归（只有单测 + 手工实验）。
- **验证本身抓出两处“只做对一半”**：① CHARTER 历史随包分发（305 行，已修成 base/历史分层）；
  ② fresh clone 无盘时 `md-utf8` 因悬空符号链接中断 runner、且 5 个测试依赖活盘（已修为读 pack 基部）。

### 主张 → 证据矩阵

| # | 主张 | 证据（实跑） | 结果 |
|---|---|---|---|
| C1 | 分发件只含基部，不含本部署历史 | tarball 260 条目 / 23 个 `workspace/`；`base-clean` 扫 CHARTER/模板/org；`export-dist` 禁项 | ✅ |
| C2 | 新装公司盘只有骨架 | 新 home 装 0.3.1：16 文件 + 15 目录；CHARTER 19/26/24/18/22 行；全盘 sentinel 0 命中 | ✅ |
| C3 | 每次安装有独立身份 | `bundle.json` id / workspace / 16 个基部 sha256；二次启动字节不变 | ✅ |
| C4 | 两个 bundle 不共享 | 两 home 各装 0.3.1：id 不同；A 注入 journal/台账/owners/凭据标记/方法层，B 全无 A 的 sentinel；sessions 各自 0 | ✅（文件级；无真模型） |
| C5 | 基部升级不擦用户/扩张 | 临时 0.3.2：`org.md` 被替换（未改），`AGENTS.md` 保留 USER-EDIT（改过），`new-032.md` 补建；journal/台账/owners/凭据标记/方法层全在；manifest id/createdAt 不变，版本 0.3.2 | ✅ |
| C6 | 仓库本身干净 | `git ls-files company-workspace` = 0；fresh worktree 无 `company-workspace`；无盘 `verify` ALL PASS、`test` 827/3；`bundle:init` 后同样绿 | ✅ |
| C7 | 测试资产能拦回归 | `run-bundle-clean` / `base-clean` / `dist-manual` / `company-skeleton` / `handbook-budget` 逐一造红还原；`wx` 与“升级强覆盖”单测红证 | ✅ |
| C8 | 分发件 = 验过的安装形状 | `dist-manual`（版本 + run bundle 关键句 + pin）；`release-smoke` ALL PASS（骨架 / bundle.json / 干净底座 / CHARTER 无历史 / 二次零变更） | ✅ |

### 实验记录（可复跑）

**E1 · fresh install 干净扫描**
```sh
W=$(mktemp -d); DSH_HOME=$W/home node vendor/dsh/apps/cli/lib/bin.js plugin --profile web add file:$PWD/_dist/dsh-company-pack-0.3.1.tgz
DSH_HOME=$W/home node vendor/dsh/apps/cli/lib/bin.js web -- --port 0 --no-open   # 看到 banner 后 kill
grep -rE 'agentic-coworker|renewal-x-2026|token-factory|ai-transformation-2026|snapshots/archive|^- 2026-09-|（2026-' $W/home/company-workspace
```
实测：**0 命中**；`bundle.json` = 0.3.1 / `company-workspace` / 16 个文件哈希；CHARTER 行数 19/26/24/18/22。
（修前同一命令：CEO 一份 70 行日期、5 份共 305 条历史——见「二修」。）

**E2 · 两 bundle 隔离（注入 sentinel）**
两 home 各装 0.3.1，A 注入 `kb/ceo/journal/SENTINEL-A.md`、台账行、owners 行、凭据标记、方法层
`profiles/web/company-cultivation/ceo/SENTINEL-A/SKILL.md`；B 同路径检查全无 A 的 sentinel；
id 不同（`bundle-9fb…` vs `bundle-22be…`），sessions 各自 0。B 自己的 `.credentials.yaml` 是
DSH 首次 boot 生成的 browser-session grant，**不含 A 的标记**（不是泄漏）。

**E3 · 基部升级（临时 0.3.2）**
复制 pack → 改 `workspace/kb/org.md`（追加 PACK-032-ORG）、`workspace/AGENTS.md`（追加 PACK-032-HANDBOOK）、
新增 `templates/new-032.md`、版本 0.3.2 → `npm pack` → 装进 A 的 home → boot。
实测：`org.md` 含 PACK-032-ORG=1；`AGENTS.md` 含 USER-EDIT=1、PACK-032-HANDBOOK=0；
`new-032.md` 新建；journal/台账/owners/凭据标记/方法层全在；manifest id/createdAt 不变、pack/skeleton=0.3.2。

**E4 · 门禁变异（造红 → 还原 → 绿）**
- `company-skeleton`：把 `company-workspace/AGENTS.md` 换成实文件 ⇒ FAIL「不是符号链接」。
- `run-bundle-clean`：`git add -f company-workspace/AGENTS.md` ⇒ FAIL「index 里有 1 件 bundle 数据」。
- `dist-manual`：手册删 `bundle.json` ⇒ FAIL「缺安装形状关键句」。
- `base-clean`：pack CEO CHARTER 追加 `- 2026-09-22 · leak-test` ⇒ FAIL「含历史条目」。
- `handbook-budget`：pack AGENTS 追加 15KB ⇒ FAIL「32937B + 1024B > maxBytes 32768」。
每次还原后 `verify: ALL PASS`。

**E5 · fresh clone（无 `company-workspace`）**
`git worktree add /tmp/fresh-verify HEAD`：`git ls-files company-workspace` = 0，目录不存在。
在主树把 `company-workspace` 移走后：`node checks/run-gates.mjs` **ALL PASS**；
`npx vitest run` **827 passed | 3 skipped（830）**——3 个 skip 是 live 台账测试（按设计只在 bundle 在场时跑）。
`pnpm bundle:init` 后同样绿（clean 盘：3 个符号链接 + 5 份真实 CHARTER，sentinel 0）。
提交后从 **HEAD** 新建 worktree（无 `company-workspace`）复跑：`verify` ALL PASS；`bundle:init` 后再次 ALL PASS（CI 等价）。
> 修前：无盘 `verify` 在 `md-utf8` 因 `runtime/rehearsal-workspace/AGENTS.md` 悬空链接 **中断 runner**；
> 5 个测试读活盘 CHARTER/手册。已修：md-utf8 跳过符号链接/缺失；测试改读 pack 基部。

**E6 · 分发件**
`node tools/export-dist.mjs` ALL PASS：0.3.1 tarball 260 条目 / 23 个 workspace；手册表头 0.3.1、
含 run bundle/bundle.json/company-workspace、pin `dsh-v0.2.1-rc.2`；`dist-manual` 绿。
`release-smoke` ALL PASS：骨架 30 件、bundle.json（16 哈希）、干净底座 0 件扩张、CHARTER 0 条历史、二次零变更。

### 测试资产审计（谁在守、哪里是空的）

| 不变量 | 自动资产 | 红证 | 缺口 |
|---|---|---|---|
| bundle 不进 git | `run-bundle-clean` | ✅ | — |
| 基部零历史 | `base-clean`（CHARTER/模板/org/空目录） | ✅ | 不扫 tarball 内容；由 release-smoke 安装后断言补 |
| 新装干净 | `release-smoke`（无 journal/交付物/记录 + CHARTER 0 历史） | 逻辑覆盖（未逐条造红） | 未自动扫描任意 sentinel（只钉结构） |
| 安装身份 | `release-smoke` + `bundle-manifest.spec` | ✅（wx 造红） | — |
| 两 bundle 隔离 | `bundle-manifest.spec`（id/路径不同） | — | **安装级双 home 未自动回归**（手工 E2） |
| 升级不擦扩张 | `bundle-manifest.spec`（升级算法） | ✅（强覆盖造红） | **安装级升级未自动回归**（手工 E3） |
| 分发形状 | `dist-manual` + `export-dist` + `release-smoke` | ✅ | — |
| fresh clone | CI 只跑 `verify`；pre-push 跑 `verify+test` | — | 无专门 fresh-clone lane；靠“无盘也能跑”与 CI |

### 剩余风险（明确不假装覆盖）

1. **同一 `DSH_HOME` 复用给第二个 CEO**：机制无法区分“同人续用/换人复用”；目前只有手册的
   “一个 home 一个 CEO”政策。要机制强制，需要安装命令拒绝非空 home（或 `bundle init` 才能新建），
   本 RFC 未做——这是“干净底座”最大的剩余缺口。
2. **默认虚构公司画像**（org 50 人、9 家客户）仍在基部：它是 starter，不是本部署历史；新 CEO 必须自己改，
   否则会带着一个不属于他的默认公司开工。
3. 没有真模型下两个 bundle 的会话隔离；没有第二台机器安装；没有自动 `bundle export`；
   GUI 仍要人手登记 workspace。

## 后果与边界

- **fresh clone 没有 `company-workspace/`**：先 `pnpm bundle:init`；不建就没有会话 cwd。`pnpm verify` /
  `pnpm test` 在无盘时仍应绿（本轮已把门禁与测试改成 pack 单源或如实跳过）。
- **dev 盘不再进 git**：本部署的成品/台账/journal/交付物/培养记录只住 bundle；git 历史里仍有旧副本，
  但未来变更不再入库。备份 = `runtime/backups/`（一次性）+ 用户自己的 home 拷贝。
- **基部升级会改盘**：未改过的手册/章程/模板会被新版替换；改过的保留并在插件日志点名。没有合并 UI；
  用户要保留自己的改法就继续改（哈希会一直判定 modified）。
- **一个 home 只装一个 CEO**：这是策略不是机制强制；复用 home 会共享 sessions / 凭据 / 方法层 / workspace 登记。
- **`ledger-participation` 在无盘时跳过**：它是 live 数据审计，不是产品门禁；盘在场时才咬人。
- **`security-scan` 改扫 pack 骨架**：live 盘的凭据面由维护者本机通道负责，不再由 `pnpm verify` 冒充。

## 未做 / 未验

- 没有第二台机器安装；没有真模型下两个 bundle 的会话隔离活体（keyless 已证不同 home / manifest id /
  workspace / 空 sessions；真模型验收未跑）。
- 没有实现自动 `bundle export` / `import` 工具；备份仍是“拷整个 home + 手工排除凭据/logs”。
- 没有做 GUI 自动登记 workspace（仍人手点一次）；没有搬 dev 的 home/workspace 到统一 bundle 根
  （方案 C，留后续）。
- `release-smoke` 的 vendor 产物新鲜度仍不证明（原有限制）。
