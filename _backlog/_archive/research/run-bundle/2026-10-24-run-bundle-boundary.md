---
topic: 运行态
intent: "为「run bundle = 安装单元 / 干净底座」问题卡提供现状、边界与历史决定依据。"
---

# Run bundle 与干净底座：现状排摸

> 服务卡：[run bundle 作为安装单元](../../settled_issues/2026-10-24-run-bundle-clean-base.md)。
> 读法：先读问题卡的「原始意图」，再读本稿；§2–§6 是事实，§7–§8 是方案比较（不是决定）。
> 性质：研究证据，不是决定；拍板项住卡。实测日期 2026-10-24，环境 = 本仓工作树 + 临时 `DSH_HOME`。

## 0. 结论（先看六条）

1. **产品安装的“骨架”已经是干净的**：全新 `DSH_HOME` 里一条 `plugin add` 会自动建 profile；首次 boot 只落 **31 项出厂骨架**（16 文件 + 15 目录），没有 journal、台账行、交付物、会话。
2. **但仓库本身不是干净的**：`company-workspace/` 有 **146 件本部署数据在 git 索引里**（1.2MB）；磁盘上 166MB（drafts 已 ignored）；开发 home 704MB（sessions 160MB / profiles 513MB）。仓库同时是“产品源码”和“一个正在运行的部署”。
3. **“run bundle”现在只是逻辑视图**（一次运行 = 四件套，引用不复制），没有物理身份、没有 manifest、没有安装单元边界。2026-10-05/07 否决过“把一次运行复制成目录”，但那条否决针对的是**复制证据**，不是**部署单元**。
4. **隔离缺口是真实的**：同一个 DSH home 复用给第二个 CEO，会共享 sessions、凭据、profile 里的角色方法层（`<home>/profiles/<p>/company-cultivation/<role>/`）与 `storages/workspace.json` 的绝对路径登记——这正是“扩张能力应由用户在安装后培养”的反面。
5. **分发件已漂**：`_dist/安装手册.md` + tarball 是 2026-10-05 的（139 条目、**0 个 `workspace/`**、基线 0.2.0-rc.2）；当前 pack 会打出 256 条目、23 个 `workspace/`、pin 0.2.1-rc.2。`dist-manual` 门禁只比版本号，版本没 bump 就抓不到。
6. **底座与扩张在角色上本来就分层**（D17/D25/D43）：pack 的 persona/skills/手册/章程是基部；方法层、journal、培养记录、交付物、台账、会话是用户装完之后长出来的。问题是后者现在有一部分住在本仓 git 里。

## 1. 三个 “bundle” 先分清

| 词 | 现在指什么 | 家 |
|---|---|---|
| DSH bundle | profile 的组合层（base / web-app / company-pack），`dsh.bundle.patch` 装配 | vendor + pack [`cordis.patch.yml`](../../../../packages/company-pack/cordis.patch.yml) |
| run bundle | **逻辑**：一次运行的四件套视图（代码与组合 / DSH 运行状态 / 会话 cwd / 证据），`pnpm orient` / `--scenario` | [运行态地图](../../../../docs/runtime-map.md)、[run/README](../../../../run/README.md)、[快照规则](../../../../snapshots/README.md) |
| bundle patch | pack 的 loader 补丁数组 | [`package.json`](../../../../packages/company-pack/package.json) |

本卡建议把 **run bundle 定义为物理安装单元**：

> `bundle = manifest + 一个 DSH home + 一个公司 workspace`

四件套保留为 **run trace（运行追溯视图）**：它引用 bundle 里的 live 状态，不复制。这样“引用不复制、防第二权威”仍然成立——bundle 是 live 权威，不是副本。

## 2. 一次安装实际发生什么（实测）

用当前工作树 `npm pack`（668KB）装进临时 home，再 boot 一次：

```sh
W=$(mktemp -d)
cd packages/company-pack && npm pack --pack-destination "$W" --cache "$W/npm-cache"
DSH_HOME="$W/home" node vendor/dsh/apps/cli/lib/bin.js plugin --profile web add "file:$W/dsh-company-pack-0.2.0.tgz"
DSH_HOME="$W/home" node vendor/dsh/apps/cli/lib/bin.js web -- --port 0 --no-open
```

实测结果：

| 步骤 | 结果 |
|---|---|
| `plugin add`（空 home） | 自建 `profiles/web`（输出 `initialized profile web at …`），装入 1 个包，exit 0 |
| 首次 boot | 建出 `<home>/company-workspace`：**31 项**（16 文件 + 15 目录；`.gitkeep` 不算文件） |
| 首次 boot 的额外产物 | **无 manifest、无 workspace 登记、无 sessions、无方法层、无培养记录** |
| 二次 boot | 幂等（release-smoke ⑥ 已钉“零变更”） |

**结论**：干净是“骨架干净”，不是“安装单元干净”。安装单元没有名字、没有版本、没有“这是一次新安装”的判据；只要复用 home，历史就会跟着走。

## 3. 历史负担（量化）

### 3.1 git 里的本部署数据

`git ls-tree -r -l HEAD -- company-workspace`：**146 件 / 1,299,338 B（1.2MB）**。

| 类别 | 件数 | 体量 | 性质 |
|---|---:|---:|---|
| `deliverables-archive/**` 的 final/meta | 94 | 937KB | 本部署业务历史 |
| `deliverables/**` 的 final/meta | 12 | 96KB | 本部署业务历史 |
| `kb/<role>/journal/**` | 28 | 约 212KB | 本部署角色记忆 |
| `kb/motion-ledger.md` | 1 | 30KB | 本部署经营台账（47 行量级） |
| `kb/deliverables-index.json` | 1 | 34KB | 盘上生成索引 |
| `kb/owners.md` | 1 | 4.6KB | 人侧归属（本部署填写） |
| `cultivation/records/*.md` | 1 | 2.7KB | 培养记录（已拒） |
| 制度件符号链接（AGENTS/templates/org/CHARTER×5） | 8 | 0 | 指回 pack，非数据 |

### 3.2 盘上但不在 git

| 面 | 体量 | 说明 |
|---|---:|---|
| `company-workspace/` 整树 | 166MB | `deliverables*/drafts/**` 与 `sources/` 是主体（2026-10-13 起 ignored） |
| `runtime/harness-home/` | 704MB | sessions 160MB、profiles 513MB（profile 的 `node_modules` + 方法层）、storages 25MB |
| `snapshots/` | 62MB | 冻结证据（测试资产，不是 live 盘） |
| `.git/` | 596MB | 历史里仍含已 `rm --cached` 的 drafts/sources |

### 3.3 开发 home 里的“已长出来的能力”

- 方法层目录：`runtime/harness-home/profiles/web/company-cultivation/{ceo,cfo}/`——**目录在、`SKILL.md` 为 0**（尚未采纳过方法）。
- 培养记录：`company-workspace/cultivation/records/` **1 件**，状态 `rejected`。
- 工作区登记：`storages/workspace.json` 记了 **4 个** workspace，全部是**绝对路径**（含 `/Users/bowhead/ai_dsh_company/company-workspace`）。
- 会话日志：按 cwd slug 分目录，`sessions/--Users-bowhead-ai_dsh_company-company-workspace--/…`——cwd 路径是日志目录名的一部分。

## 4. 角色能力分层：基部 vs 扩张

用户口径（2026-10-24）：“不仅仅是 CEO，其他角色都一样；我们可以养基部的能力，但扩张能力需要安装后，让用户去培养。”
映射到现有机制：

| 层 | 内容 | 谁维护 | 现在住哪 | 进 git | 随包 | 升级 |
|---|---|---|---|---|---|---|
| 基部·方法 | persona + `skills/`（通用方法论） | 维护者（改 pack） | `packages/company-pack/presets/<role>/` | ✅ | ✅ | 随 pack 版本 |
| 基部·制度 | 手册、CHARTER、org、模板、起动件 | 维护者 | `packages/company-pack/workspace/` | ✅ | ✅ | 落盘后“只补缺” |
| 扩张·方法层 | 本人采纳的 `SKILL.md` | 用户（`/cultivation adopt`） | `<home>/profiles/<p>/company-cultivation/<role>/` | ❌ | ❌ | pack 升级不擦 |
| 扩张·记忆 | journal、培养记录 | 角色写、人收敛 | `workspace/kb/<role>/journal/`、`cultivation/records/` | 现在 ✅（journal/记录） | ❌ | 用户自有 |
| 扩张·经营事实 | deliverables、台账、owners、索引 | 公司角色 | `workspace/` | 现在 ✅（成品/台账/owners） | ❌ | 用户自有 |
| 扩张·会话 | transcripts | DSH | `<home>/sessions/` | ❌ | ❌ | 用户自有 |

**错位点**：基部在 pack 里是对的；扩张层的方法层在 home 里（不进 git）也是对的；但扩张层的记忆与经营事实有一部分在**本仓 git** 里。这与“装完清爽、用户自己长”的方向相反。

**对全部五角色成立**：方法层按 `profile × role` 隔离（`src/host/cultivation.ts` 头注）；CEO 没有特权——CEO 的“仅建议权”是采纳权限，不是能力分层例外。

## 5. 泄漏与失效模式

| # | 模式 | 证据/后果 |
|---|---|---|
| 1 | **同 home 二次安装** | sessions、`.credentials.yaml`、profile 方法层、workspace 登记全部复用；第二个 CEO 会看到第一个的名字与历史 |
| 2 | **同 profile 多公司盘** | 方法层按 profile×role 共享（合同明写“v1 单公司现实”）⇒ 换盘不换方法层 |
| 3 | **只补缺** | 已落盘的制度件**永不升级**；“装完的基部”会停在安装那一版 |
| 4 | **仓库 clone = 带历史** | 146 件本部署数据随 clone 落地；docs/tools 默认路径指向它 |
| 5 | **分发件漂移** | `_dist` 的 0.2.0 tarball 无 `workspace/`；手册仍写 139 条目、基线 0.2.0-rc.2 |
| 6 | **凭据/日志** | 凭据在 `<home>/.credentials.yaml`；观察窗日志含 token（`runtime/web-logs/` 已 ignored） |
| 7 | **绝对路径** | workspace 登记与 session cwd slug 都带绝对路径；搬 bundle/换机器会断 |

## 6. 迁移面（消费者盘点）

`git grep` 的活跃引用（不含交付物/证据内部的自引用）：

| 面 | 文件数 | 典型消费 |
|---|---:|---|
| `docs/` + 根 README/AGENTS | 14 | 入口地图、demo、runtime-map、presets、release |
| `tests/` | 16 | 多数是夹具里的路径字面量；少数读真盘（`ledger.spec.ts` 读真台账、`templates.spec.ts` 读真模板） |
| `checks/` | 19 | 门禁 `company-skeleton` / `handbook-budget` / `ledger-participation` / `drafts-untracked` / `bare-path`；审计 `deliverables-check` / `journal-audit` / `authorship-audit` |
| `tools/` | 12 | orient、converge、deliverables-index、rehearsal、markdown-links |
| `probes/` | 9 | 真盘培养/交付物/DAG 探针 |
| `notes/` | 35 | 历史记录（冻结面，不改写） |

关键耦合：

- **`company-skeleton` 门禁**要求运行盘 8 处符号链接指回 pack——它把“dev 盘在仓库里”钉成了结构。
- **`handbook-budget` / `bare-path` / `md-links`** 直接读 `company-workspace/AGENTS.md` 或把它纳入扫描面。
- **`drafts-untracked`** 用 `git ls-files company-workspace` 判过程物料，前提是“公司盘在 git”。
- **`orient` / `deliverables-check` / `journal-audit`** 默认 `company-workspace` 路径。
- **`release-smoke` ⑥** 已证明“首启落盘 / 二次零变更”，但用的是临时 `DSH_COMPANY_HOME`，不证明“每次安装一个 bundle”。

## 7. 方案比较

| 方案 | 做法 | 干净 | 隔离 | 升级 | 迁移成本 | 风险 |
|---|---|---|---|---|---|---|
| **A. 逻辑不变 + ignore 数据** | 只把 company-workspace 整树 ignore，路径不动，补 manifest | 仓库变干净 | 靠“一个 home 一个 CEO”口头约定 | 仍只补缺 | 小 | 概念没变，第二个 CEO 仍可能复用 home |
| **B. 产品单根 bundle + dev 双根 manifest**（推荐起点） | bundle = 一个 DSH home + manifest；dev 的 workspace 仍在仓库根（manifest 声明外部根）；整盘去 tracked | ✅ | ✅ 新 home = 新 bundle | 记录 skeleton 版本，先只补缺 | 中 | dev 与产品布局不完全同形 |
| **C. 统一单根 bundle**（目标形态） | dev 也搬进 `runtime/bundle/{home,workspace}`，根 `company-workspace` 只留兼容链接 | ✅ | ✅ | 同上 | 大（session cwd/登记/文档） | 迁移期断链 |
| **D. 产品 / 部署双仓** | 数据仓单独 clone/备份，产品仓只留源码 | ✅ | ✅ | 同上 | 最大 | converge/audit 跨仓；单人维护者负担 |

**推荐 B → C 分阶段**，理由：

- B 的契约已经是长期正确的：`manifest + home + workspace`，根可同址可分离；产品默认同址（`<home>/company-workspace`），dev 先分离（home = `runtime/harness-home`，workspace = 仓库根），**不搬 704MB home、不改 593 处路径**即可先拿到“干净仓库 + 安装单元身份”。
- C 是布局目标，不是契约前提；等 B 的 manifest/工具/门禁稳定后再搬，避免一次动到 session slug、workspace 登记与全部消费者。
- A 不够：它只解决 git 脏，不解决“第二个 CEO 拿到第一个的历史”。
- D 现在过度：单人维护者、跨仓审计成本高，等数据再涨 10× 再回看（与 2026-10-13 瘦身轮的判断一致）。

## 8. 推荐路线（只到“方案”层，不是实施授权）

**阶段 0 · 冻结与备份（必须先做）**
- 把当前 `company-workspace`（含 ignored drafts）与 `runtime/harness-home/sessions` 做一次全量导出（tar.zst + 校验和），落在 git 外。
- 记录迁移前基线：146 tracked / 1.2MB、166MB 盘、704MB home、workspace 登记 4 条。

**阶段 1 · 安装单元契约 + 分发件修复**
- 定义 `bundle.yml`：`version / id / createdAt / pack{name,version} / dsh{tag,sha} / skeleton{version} / workspace{path}`。
- host 首启写 manifest；workspace 文件集 = 骨架集（多一件即报）；二次 boot 零变更。
- `_dist` 重导：版本 bump（0.3.0 级别）、手册写清“一次安装 = 一个 bundle”、`dist-manual` 门禁从“只比版本”扩到“workspace 在场 + 条目集 + pin”。
- 安装冒烟补：新 home → 31 项骨架、无 journal/记录/会话、manifest 在场、二次零变更。

**阶段 2 · dev 去 tracked**
- 整盘 `git rm --cached`（保留工作树），`.gitignore` 改 `company-workspace/` 整树；export 一次归档。
- dev manifest 声明双根；`company-skeleton` 门禁改为“pack 骨架单源 + dev 盘存在时才查链接”；`drafts-untracked` / `handbook-budget` / `bare-path` / `md-links` 改读 pack 骨架或 manifest 解析出的 workspace。
- 14 篇 docs 改成“指向 pack 制度件 / 用 `DSH_COMPANY_HOME` 表述路径”。

**阶段 3 · 升级与备份**
- 骨架升级：manifest 记 `skeleton.version` + 每文件哈希；未改的基部文件随 pack 替换，改过的保留并写报告（不再“永不升级”）。
- `bundle export`：排除 `.credentials.yaml`、`sessions/`、`web-logs/`（可选 `--with-sessions`）；校验和 + 恢复说明。
- 明确“证据（snapshots）≠ bundle”：证据继续冻结在仓里，不随 bundle 走。

**阶段 4 · 多 bundle 体验**
- `bundle init/list/status`（或文档级步骤）；workspace 自动登记（当前仍未做）；浏览器 origin/端口与 localStorage 的边界写清。

## 9. 未决（交给卡）

1. 是否采纳“run bundle = 物理安装单元”，四件套改称 run trace？
2. dev 去 tracked 的范围：只去 journal/台账/记录，还是整盘（含 finals/archive/owners/索引）？推荐整盘。
3. 产品 bundle 的默认落点：一个 DSH home = 一个 bundle；第二个 CEO 新开 home——接受吗？
4. 升级策略：只补缺（现状）vs 哈希判定（未改就换、改了保留并报告）vs 手工 merge？推荐哈希。
5. 迁移前的全量导出与之后 `bundle export` 的备份义务：是否本轮就做？
6. 分发版本：是否 bump 到 0.3.0 并同 diff 重导 `_dist`（含 workspace 与 bundle 步骤）？

## 10. 证据命令（可复跑）

```sh
git ls-tree -r -l HEAD -- company-workspace | awk '{s+=$4; n++} END {print n, s}'
du -sh company-workspace runtime/harness-home .git snapshots
git grep -l company-workspace -- docs README.md AGENTS.md | wc -l
tar -tzf _dist/dsh-company-pack-0.2.0.tgz | wc -l
# 当前工作树打包后对照：256 条目，其中 workspace/ 23
```

未做/未验：没有在第二台机器上跑安装；没有真模型会话验证 bundle 隔离；没有逐文件映射 593 处引用（只按面计数）。这些不写绿。
