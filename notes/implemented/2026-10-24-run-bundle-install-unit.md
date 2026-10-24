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
