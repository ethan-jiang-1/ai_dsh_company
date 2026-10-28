# Changelog

本文件只记用户/收件人可见的变化；维护者过程证据在 `notes/implemented/` 与 `_dist/release-manifest.json`。

## 0.4.4 — 2026-10-28

### Added

- **培养对话绑定独立培养会话**：右侧面板用 `sessions.create` / `retain` 建独立 session，从 `binding.eventSource` 读历史、用 `binding.session.prompt` 发送；主 Chat / 轨迹不受影响。
- 每次 prompt 带「只谈培养」范围前缀，渲染时剥掉；真页面已跑通一问一答（CEO 只答培养范围）。
- 同一主会话按 localStorage 复用培养会话；缺 cwd/角色时显示等待，不静默建错。

### Known

- 工具/审批的完整渲染、attach 记录/方法与写回仍待后续切片；当前只展示 user/assistant 文本与 running 状态。

## 0.4.3 — 2026-10-28


### Added

- **培养主视图**：主区第三个 `conversation.view` 从“公司整页”改为「培养」；左侧复用培养领域板（纠正/方法/journal/赞踩/怎么养），右侧是培养专属面板（自有 composer，隐藏 shell 全局 composer）。公司总览（看板/依赖/在场/交付）改为无对话右栏入口。
- 右栏第一切片先接 `/cultivation ...` 命令面，结果只回培养面板；自由培养对话需等独立培养会话接入，**不伪造模型回复**。

## 0.4.2 — 2026-10-28


### Fixed

- **方法层迁移的 check-then-copy 竞态**：旧 `<profile>/company-cultivation/` → 公司级迁移改用 `COPYFILE_EXCL` 发布；目标已存在则比较内容，冲突备份同样 EXCL，不再可能覆盖并发写入的新方法/既有备份。marker `wx` 不变。

## 0.4.1 — 2026-10-28


### Changed

- **模型发起的写走 `ctx.fs`**：`cultivation_propose` 在 `ctx.fs` 可用时用 `resolve + writeText({createIfAbsent})`（并传会话 sandbox policy），既有文件零覆盖；服务缺席才回退 `node:fs` link wx。真 fs-local 测试覆盖 createIfAbsent/`FS_NOT_OBSERVED`。
- **索引读信任明示**：成品页签脚注明确「本索引是 host 生成的派生显示，presented 以 domain 审计账本为准」；静态渲染测试钉住。
- **会话全文索引落 K cache**：`<DSH_HOME>/cache/company/session-search-<profile>.db`（仍 per-profile 单进程 owner）；`preset-smoke` 用真 `session/search` 断言新路径、旧 profile 路径不出现。
- **升级日志有界**：`logs/company-pack-upgrade.log` 与 client-errors 共用 256 KiB 轮转 `.1`。
- **client inject peers 补齐**：`dsh.client.inject` 的 8 个包全部进 `peerDependencies`（受控 lock 不变）。

## 0.4.0 — 2026-10-28

### Changed

- **审计账本迁宿主状态**：`presented` 从公司盘 W 迁 `ctx.storageDomain`（domain `company_deliverables`，`<DSH_HOME>/storages/company_deliverables.json`）；旧 W 账本一次性迁移、只读留一版；`/deliverables audit` 写 domain，模型不再能改审计权威；索引仍是派生显示。
- **方法层归公司级**：`<DSH_HOME>/company/methods/<role>/<slug>/SKILL.md`；旧 `<profile>/company-cultivation/` 启动迁移、只读留一版，冲突落 `.legacy/`；同 home 多 profile 共享方法。
- **数据卡 v2**：写者/通道、可见性、硬软边界、六版本、标识符 API、威胁模型进 `docs/data-model.md`；README Data 改 6+2，`Backup` 独立成节。
- **client-errors 迁宿主日志**：`<DSH_HOME>/logs/company-client-errors.log`；256 KiB 轮转 `.1`；旧 `cultivation/client-errors.log` 只读留一版。
- **records schema 1**：新记录写 `schema: 1`，旧记录缺字段按 1 读。
- **依赖声明**：`@deepseek-ai/dsh-storage-domain` 与 `zod` 进 peer + dev；受控 lock 只加 importer 两行（未引入 rc.4 漂移）。

### Fixed

- `preset-smoke` 在 adopt 过方法的 home 上假红（期望集 = 包内 + 本角色方法层；用临时方法 fixture 真红→绿）。
- T4 措辞：catalog 是“未注入指令面”，不是“模型不可见”（workspace 文件仍可被 fs 读）。
- 方法层探针 cwd 对齐公司盘根（原 rehearsal cwd 会被公司根守卫拒绝）。

## 0.3.15 — 2026-10-28

### Added

- **真实页面自检车道**：`node checks/smoke/ui-scene-smoke.mjs` 一条命令起隔离实例 → 断言全部公司页签 + 浏览器错误环 → 成功/失败都落证据目录（维护者与交付验收用）。
- **浏览器错误环**：页面内捕获 `error` / `unhandledrejection` / `console.error`，随真页面探针进入 verdict 与证据（不写会话日志——边界见模块头注）。
- `pnpm typecheck`（pack 两面 `tsc -b`）与 `dist-freshness` 门禁（交付产物与版本记录自洽）。

### Changed

- 收尾次序与六行回执收进 `close-out-definition` skill（唯一家）；缺陷卡自授权边界只住 `_backlog` 章程。
- 文档入口瘦身：AGENTS 顶部「开工最小路径」（三样就够）；政策层 `docs/policy.md` 独立；dev-loop 349→155 行；checks/README 193→78 行。
- 门禁「零对象」改为 SKIP（不再把没有回放场景/金样印成 PASS）；`pnpm diagnose` 认中断轮并支持 `--strict`。
- 分层方向由 `src-layering` 门禁在默认回路守护（client↔host 互不可见、lib/client 禁 `node:` 内建）。

### Fixed

- `cdp-probe` 把未登录/未配凭据判成渲染失败 → 现在 exit 2（环境未就绪）并说明。
- 声明与资产脱钩：r2/r3 场景、UI 金样、判据语料的失效引用从活文档清理；入口探针 Q4 改绑 AGENTS 簿记 pin。
- 交付面：0.3.14 期间 `_dist` 三处版本不一致（tarball 0.3.14 / manifest 0.3.10）→ 本版重建并加门禁防复发。

## 0.3.14 — 2026-10-27

### Fixed

- **BUG-033**：revoke 恢复不再用 `revokedAt:` 猜目标态——从旧全文 + revokedAt 推导目标全文；恢复只认 old/target，第三态 conflict 不覆盖；用户后改正文不再被回滚。
- **摘要不再冒充全文**：非 open 记录只读摘要时，面板明确“正文只加载了摘要”；全文读失败计入未展开，不再静默。

### Changed

- **presented 重建证据升级**：present-catalog-smoke 改用 vendor `sessionQuery` 服务（live session）回扫真实事件，不再用手写 fake query。
- **revoke 恢复真启动证据**：新增 revoke-recovery-smoke，在真 home/公司盘/方法层注入两态，启动真 host 验证回滚/补完。
- **business 恢复覆盖方法层**：lifecycle-smoke 恢复 fixture 增加 `company-cultivation/`，恢复后断方法文件仍在。
- **保留/清理**：`/cultivation purge <天数>` 清旧 records-archive；`bundle.json.bak-*` 只保留最新 5 份；升级日志保持追加（人工清理）。
- **交付审计入口**：`/deliverables audit <final.md> true|false` 写 presented 账本并重生成索引，不再要求手改 JSON。
- **迁移演练夹具**：`tests/fixtures/bundle-manifest-v1.json` + v2 unsupported 边界；真实 v2 schema 出现前不猜。
- **敏感背景提示**：培养背景命中密钥/令牌样式时创作面明示警告（只提示、不自动脱敏）。
- **浏览器真场景**：`multi-window-banner-smoke` 同源两页面横幅；`cultivation-gui-probe --summary` 真浏览器 records 未展开/坏记录。

## 0.3.13 — 2026-10-27

### Changed

- **records 面板不再全量读**：先读全部记录头部摘要，open 全部读全文、非 open 只读最近 120 条；面板显示“还有 N 条旧记录只读了摘要”，不藏旧 open。
- **同 home writer lease**：`<DSH_HOME>/company-pack.lock` 让第二个进程停写公司数据并点名 holder（DSH 会话仍可用）；崩溃后 stale PID 可接管，不再静默互写。
- **revoke 崩溃恢复**：revoke 前写 `cultivation/.pending-revoke.json`；启动时按“方法还在 ⇒ 回滚记录；方法已不在 ⇒ 补完 revokedAt”恢复，外部改动报 conflict 不覆盖。
- **`/cultivation check`**：只报告 adopted 记录缺方法 / 方法无记录，不自动删改。
- **manifest 首建 hard link 回退**：网络盘/特殊 FS 不支持 hard link 时退回 `wx` 单写并告警，仍不覆盖。
- **presented 重建真证据**：present-catalog-smoke 增删 index/ledger 后从会话事件恢复 true、false 审计保留；concurrent-home-smoke 增 writer lease/stale 接管断言。

## 0.3.12 — 2026-10-27

### Changed

- **培养记录写入加 CAS**：`/cultivation adopt|reject|verify` 与 `revoke` 在读取后若记录被外部改动，拒绝覆盖并提示重试；revoke 先改记录、后删方法，删除失败时回滚记录（同步失败路径；跨 store 崩溃窗口仍不是事务）。
- **records 归档与坏记录可见**：新增 `/cultivation archive <天数>`，只把已处理（非 open）且早于天数的记录移到 `cultivation/records-archive/`；坏记录在培养面板点名，不再静默消失。
- **同 home 多 profile 点名**：启动时列出装了本包的 profile，并明确提示方法层按 profile 隔离、一公司请固定一个 web profile。
- **公司盘落点安全**：`DSH_COMPANY_HOME` 等于/包含 `DSH_HOME` 或 OS home、或指向普通文件时，停写公司数据并告警（默认 `<DSH_HOME>/company-workspace` 不受影响）。
- **浏览器本地键版本化**：浮窗几何改为 `dsh-company-pack/float/v1/`（旧键只读迁移），实例心跳改为 `dsh-company-pack/instances/v1`。
- **降级 smoke**：lifecycle-smoke 增加 v2→v1 降级，验证改过的基部保留、未改的回到旧版、扩张面不动。

## 0.3.11 — 2026-10-27

### Changed

- **公司数据作用域收口**：培养记录/成品目录/方法层命令只认 `bundle.json` 解析出的公司盘根；session `header.cwd` 在盘子目录或盘外时明确拒绝公司数据写入（不再只告警），避免一个公司盘长出多份账本。
- **显式换盘**：新增 `DSH_COMPANY_REBIND=1` 一次性换盘；旧盘必须已搬走，先备份 `bundle.json` 再改写 workspace，并写升级日志。默认硬阻断不变；只迁 pack 数据，不迁 DSH session 的绝对 `header.cwd`。
- **`presented` 拆成审计账本 + 派生索引**：新增 `kb/deliverables-presented.json`（`true` 来自会话事件，`false` 是操作员审计）；索引只做派生视图。账本缺失时从旧索引迁移，`true` 可从会话事件回扫；账本损坏/更高 schema 保留原文件并 fail loud。
- **版本与原子写**：`bundle.json` 校验 `v`/必填字段，更高版本保留原文件并告警；catalog/账本 schema 更高时告警；首建 manifest 与基部升级改临时文件 + rename/link，升级中断不再留下半截基部文件。
- **备份合同拆分**：安装手册把备份分为 `business`（公司盘 + `bundle.json` + 方法层，不含 sessions/密钥/搜索索引）与 `full`（整 home，加密限权），并补恢复与换盘步骤。
- **事实级数据卡**：新增 `docs/data-model.md`；README Data 与 FAQ 26 登记同步。

## 0.3.10 — 2026-10-26

### Fixed

- **真实 npm 发布版 DSH 上五角色可用**：`@deepseek-ai/dsh` meta package 不含 browser 两包，旧 presets 会把五个角色全部标 broken、`session/create` 直接失败。browser 组改为条件启用：profile 可解析两包即自动开；缺包时整组禁用，五角色照常可用；`DSH_COMPANY_BROWSER=on/off` 可强制（dev 的 `run/env.sh` 设 on）。
- **`DSH_COMPANY_HOME` 归一**：`~` 展开、相对路径按启动 cwd 绝对化、空白视为未设置；不再把不可复现的字符串写进 `bundle.json`。
- **换盘不再静默分裂**：已有 `bundle.json` 时改 `DSH_COMPANY_HOME`，启动输出明确警告并拒绝在新路径建第二份公司盘。
- **`export-dist` 先 build**：`lib/` 是 gitignored 的构建目录，直接 `npm pack` 会打出旧代码；导出前跑 `tsc -b` + `tsdown`。
- **发布面包瘦身**：`files` 只留 `lib/index.js`、`lib/client.js`、`lib/types/**/*.d.ts`；tsc 中间 `.js`/`.map`/`.tsbuildinfo` 不再进包。
- **搬家后 workspace 登记体检**：启动点名 `storages/workspace.json` 里已不存在的绝对旧路径（只告警，不自动改 DSH 存储）。

### Added

- `channel-matrix-smoke`：vendor built CLI + 真实全局 `dsh` 的五角色 roster/会话；`--with-browser` 验可选 browser 包自动启用。
- `isolation-matrix-smoke`：改 `DSH_COMPANY_HOME` 的告警/不建新盘 + 相对/`~` 落点归一。
- 安装手册补 pnpm 11/12、npm 发布版 `0.2.1-rc.3`、可选 browser、换盘/搬家与备份敏感面。

## 0.3.9 — 2026-10-26

### Changed

- 明确 profile 合同：公司包要求含 `@deepseek-ai/dsh-web-app` 的 web profile；base-only 自定义 profile 的 preset 行会 pending。
- 明确一个 `DSH_HOME` = 一个 run bundle：同 home 多 profile 共享 bundle/sessions/workspace，不是隔离；第二个公司用第二个 home。
- 新增 `multi-install-smoke`：双 home 真装隔离、非空 home 后装、同 home 多 profile 反例、自定义 profile 补 web-app、空 bundle 共存、重复安装幂等。

## 0.3.8 — 2026-10-26

### Changed

- 安装前置补 **pnpm 11 / `corepack enable pnpm`**：第二机模拟证实，只有 Node+DSH 时 `plugin add` 会报 `pnpm was not found`；手册与 README 都写明，`dist-manual` 门禁检查。
- 手册安装步骤加 `command -v pnpm` 预检，避免装到一半才失败。

## 0.3.7 — 2026-10-26

### Changed

- 发布可复现护栏：同版本 tgz 已存在时 `--prepare` 拒绝重打（npm pack 带 mtime，重打会让 sha 漂移）；确要重打用 `--force`。
- 0.3.6 因 test-only commit 后误重打包导致同版本字节漂移，不再作为 handoff；0.3.7 为重新导出的交付字节。

## 0.3.6 — 2026-10-26

### Changed

- 成品目录：真 vendor `present` 工具 → session `deliverables/presented` → host catalog 的端到端 smoke；修 macOS `/var`→`/private/var` symlink 导致事件路径永远匹配不上 catalog 的 bug。
- 盘守卫：host 在 `api-session/added` 比较会话 cwd 与 `bundle.json.workspace`，不一致记警告；新增 keyless 正/负测试。
- 生命周期负例：单字节篡改 tarball 拒绝安装；standalone 缺 pnpm 时拒绝且不创建 home。
- 测试矩阵：catalog 不进模型指令面（T4 无新 replay 场景）、`engines.dsh` 窗口语义（T6 真实多版本矩阵仍待环境）、发布 runbook 补供应链 checklist。

## 0.3.5 — 2026-10-26

### Changed

- 数据边界：README Data 补 D 平面与 session cwd 不一致的提示；catalog 的 `presented=false` 只按精确 path 保留，同 slug 新件不继承旧结论。
- 发布复现：`release --check` 要求 manifest dirty=false 且 verify/test/所有 smoke 全 pass；新增 `release --stamp` 把 manifest 钉到发布 commit；`--verify` 拒绝验旧 HEAD 的产物。
- 手册日期改为 Asia/Shanghai，与 CHANGELOG 一致（0.3.4 手册误写 10-25）。
- 测试资产：移除 catalog wiring 的 mock；补空态、tarball locale/icon、两侧 metaProblems 一致性、persona 公司名断言。

## 0.3.4 — 2026-10-26

### Changed

- preset 定义层去掉公司事实（梦之队/业务/编制），改为引用 `kb/company.md` 与 `kb/org.md`；不同公司不再需要改包源码。
- 包 README 增加 Install / What it contributes / Configuration / Data / Compatibility / Uninstall；Data 节写明包目录只读与 workspace/home/session 边界。
- 增加 `locale/en.json`、`locale/zh.json` 与原创 `icon.svg`，Plugin Manager 可显示真实标题/描述/图标。
- `dsh.compatibility` 从 package manifest 移除；已认证 tag 台账迁到仓库内 `checks/gates/lib/compat-tags.json`，运行时只认 `engines.dsh`。
- 发布内化：`CHANGELOG.md`、`tools/release.mjs`（bump/prepare/verify/check）、`_dist/release-manifest.json`、`release-ready` 门禁与发布 runbook。

## 0.3.3 — 2026-10-25

### Changed

- 分发契约：`engines.dsh` / Node 窗口、tarball sha256、卸载/回退手册。
- 出厂内容自足：去掉安装后指向仓库的路径；成品目录由 host 首启生成。
- 独立启动：`pnpm standalone` 的隔离 home/profile、copy 骨架、relink、reset。
- 审查加固：bundle.json 原子写/损坏诊断、升级日志、catalog metaProblem、standalone 接管安全。

## 0.3.2 — 2026-10-25

### Changed

- 分发契约（engines/license/repository/sha256）与安装生命周期证据。
- 成品目录 host 生成与 present 投影。
- 目录独立启动入口。
