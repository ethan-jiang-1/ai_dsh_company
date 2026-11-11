# Changelog

本文件只记用户/收件人可见的变化；维护者过程证据在 `notes/implemented/` 与 `_dist/release-manifest.json`。

## 0.11.3 — 2026-11-11

### Changed

- 干净 clone 首跑新增 `pnpm setup`：vendor host/client/native/web 与 pack 构建一条命令；`pnpm company` 缺 vendor CLI 时直接指向它。
- 包 README 的《安装手册》指针改为仓库绝对 URL；tarball 与手册仍是同目录两件套，避免从 registry 安装时相对路径不可达。
- `release-manifest.json` 记录 vendor HEAD、CLI sha256 与 mtime；`release --check` 对不上即红。
- fresh-clone 的 global DSH 通道钉回 rc.5，并在导出前补 vendor 类型面。
- `link-debt` 基线从 32 降到 20（归档层实测已下降）。

## 0.11.2 — 2026-11-11

### Fixed

- host config 现在拒绝未知键（如 `cultivationroot` 拼写错误），不再静默回到默认；值类型/空值校验保持。
- `release --check` 在 `market-index.staged.json` 与根 index 同时在场时默认拒绝 READY；
  确认不托管时需显式 `--allow-pre-publish-index`。

### Changed

- `release --check` 明示 READY 的适用面 = 当前工作树（暖 `lib/` + `_dist/`）；干净 clone 只承诺
  fresh-clone CI 的 `install + bundle:init + verify`。
- `tracked-file-size` 只扫索引面（tracked + staged）；本地未提交大件不再让 verify 误红，
  安全/portability 仍扫 working-tree。

## 0.11.1 — 2026-11-11

### Fixed

- 非法 `cultivationRoot` / `handbookSkipPresets` 现在在 host `apply` 前 fail-loud，不再静默带入
  migration 或 preset 构造；包 README 的 Config 说明同步。
- 新增 `pnpm market:hosted`：`market-index.staged.json` 在场时拒绝托管未发布版本；`release --check`
  的 READY 行后同时打印 pre-publish 警告。

### Changed

- 仓库内容门禁改扫 working-tree（tracked + untracked 非 ignored），避免 `git add` 前 verify 假绿；
  owner 文档相对路径测试扩到 `src/**/*.md` + pack README，并排除生成物 `lib/`。

## 0.11.0 — 2026-11-11

### Added

- 交付模式第二轴：`productized`（默认）/ `project-services` / `managed-service`；新增
  `content/delivery-modes/` 包（SOW/UAT/RACI、SLA/Runbook/月报/续费模板与规则）。
- 新增 `/delivery check <slug>`：按 `meta.md` 的交付模式检查交付文档与 requiredSections；
  未知模式报错，`productized` 出现 SOW/SLA 只提醒。
- 新增 `business-software` 产品类型、动议级路由与 `hardware-software/capabilities.md`
  硬件能力前置清单（缺能力先报缺，不进入报价/承诺）。
- CFO/COO/VP-Sales 各新增 `managed-service-*` 方法；经营工作流按产品类型 + 交付模式加载。

### Fixed

- `/req`、`/prd` 的只读检查改用会话 cwd，并修复 slug 越界读与停写回执的真实原因（BUG-057/058/060）。
- 质量环 verifier 的原文索引在 R2 新会话不再假红；裁决头 `body-sha256` 只由 pack 工具回填（BUG-056/059）。
- 团队任务书署名锚与 `kb` 旁路按 seed 派生，避免成员写入被误记（BUG-054/055）。

## 0.10.0 — 2026-11-10

### Added

- 新增 worker family 三档：`worker`（执行手）、`worker-researcher`（只读调研）、`worker-orchestrator`
  （可带 leaf 的小工头）；不占公司编制、不注入公司手册。
- 新增质量环两档：`quality-loop-producer`（做）与 `quality-loop-verifier`（只读验）；配套 VP-Eng
  的 `quality_loop_produce` / `quality_loop_verify` 两条命名委托，严格串行、方法由任务书点名。
- 新增共享 `quality-loop` skill：产出 → 独立验证 → 三选一处置 → 复验的流程契约。

### Fixed

- 发布物与源码重新对齐：`_dist` tarball 现在包含 `dsh.bundle.patch` 声明的全部 11 个 preset；
  `dist-freshness` 与 `release-smoke` 增加 source→artifact 校验，防止 tarball 少 preset 仍假绿。
- 清理“五角色/六角色/六个 preset”旧口径，统一为“6 公司角色 + 5 support preset”；修复 preset 注释里
  指向已不存在的 `docs/design/*` 的指针。

## 0.9.0 — 2026-11-05

### Added

- 新增第六个公司角色 **CMO**（市场机会 / 产品定义 / MRD）；与 VP-Sales 分工：新市场/新产品归 CMO，
  现有客户/销售/定价归 VP-Sales。
- **VP-Eng 增加 PRD 主笔能力**：MRD → PRD 需求账本（REQ/AC/slice、DoR/DoD），一 REQ 一任务。
- **共享 product-definition 能力**（CMO 与 VP-Eng 共用）：产品定义脊柱 + 品类 playbook
  （项目制/系统集成、硬软一体）。
- 新增 `/prd check <目录名>` 命令：机械校验 MRD/PRD 的编号、来源追溯、验收、依赖与状态。
- CEO 组队升级：按问题选最少角色；产品定义动议默认 CMO + VP-Eng，不默认全员。

## 0.8.8 — 2026-11-05

### Changed

- 无用户可见行为变化：基座升 pin `dsh-v0.2.1-rc.5`（兼容台账加列，`release-smoke` 全链重验）；
  README 兼容段改为 rc.5 为当前基线、rc.2 转历史。证据见
  `notes/archived/2026-11-05-pin-upgrade-0.2.1-rc.5.md`。

## 0.8.7 — 2026-11-03

### Changed

- 无用户可见行为变化：host `api-session/*` 事件类型与 client `agentTeam` 投影类型改为显式 type import；
  `tests/client` / `tests/company` 进 `pnpm typecheck`（测试面不随包）。证据见
  `notes/implemented/2026-11-03-client-test-typecheck.md` / `...-company-test-typecheck.md`。

## 0.8.6 — 2026-11-03

### Changed

- 无用户可见行为变化：`/deliverables audit` 命令抽为 `host/deliverables-command.ts`（解析/注册可直测），
  行为与 0.8.5 相同。维护者证据见 `notes/implemented/2026-11-03-d2-deliverables-command.md`。

## 0.8.5 — 2026-11-03

### Changed

- 无用户可见行为变化：host 成品目录拆分（`catalog-state` / `presented-ledger` / `catalog`），
  client 入口接线抽为 `context-wiring` / `member-navigation` / `title-state`；均为内部结构，
  行为与 0.8.4 相同。维护者过程证据见 `notes/implemented/2026-11-03-d2-*` 与 `...-coverage-thresholds.md`。

## 0.8.4 — 2026-11-03

### Fixed

- 客户端错误留痕：`/company-diagnostics client-error` 现在能正确处理命令名后的前导空白
  （vendor `parseCommand` 的真实形状）。此前页面错误进错误环但写不进
  `$DSH_HOME/logs/company-client-errors.log`；现在无需手动命令即可留痕（token 仍脱敏）。

## 0.8.3 — 2026-11-03

### Changed

- 无用户可见行为变化：删除不可达的 CompanyView 与两个测试；安装手册的“包内内容”表纠正为
  `lib/**` / `presets/**` / `content/**` 等实际 `files`。维护者过程证据见
  `notes/implemented/2026-11-03-d2-companyview-removal.md` 与 `2026-11-03-d1-dev-loop-and-manual.md`。

## 0.8.2 — 2026-11-03

### Changed

- 无用户可见变化（维护者过程见 `notes/implemented/2026-11-03-release-0.8.2.md`）。

## 0.8.1 — 2026-11-03

### Fixed

- **交付审计的 slug 写入**：v3 路径下 `setPresentedAudit` 用 `split('/')[1]` 取到字面 `deliverables`，
  presented=true 的 slug 永远写错，归档后按 slug 延续的 catalog 命中会失效。改为取 `final.md` 父目录
  并剥日期前缀。

### Changed

- 背景选择面板在成品目录不可读时显示错误，不再静默空态。

## 0.8.0 — 2026-11-03

### Breaking

- 根入口不再 re-export `lib/presence` / `lib/doors`：公开面收窄为 loader 需要的 `apply` / `inject`。
  包未提供 `./lib/*` 子路径导出；若曾从包根 import 这两个读模型，需自行复制或从源码取。

### Changed

- `peerDependencies` 删除 3 个无引用项（`session-persistence-jsonl` / `tool-workflow` / `workflow-ptc`），
  50 → 47；preset 行/import/patch 三源核对，`preset-row-deps` 与 `release-smoke` 复验。
- README 写清：只支持 web 组合（`workspaceRegistry` 由 web-app 提供，base-only/headless 不加载本包）；
  品牌只占 `sidebar.brand.name`，保留官方 mark/hero（与 `ui-brand-official` 共存的最小侵入）。

## 0.7.2 — 2026-11-03

### Changed

- **客户端错误留痕**：`/company-diagnostics` 不再因公司盘停写（`dataBlocked`）而拒绝写入；错误环
  镜像 `sessionStorage`，页面刷新后仍能读到；落盘失败在页面提示一次。日志仍写
  `$DSH_HOME/logs/company-client-errors.log`（256 KiB 轮转，token 脱敏）。
- **发布 readiness 指路**：入口命令表与发布清单补 `pnpm release --check`；`verify` 的
  `dist-freshness` / `release-ready` 输出标明可发布性由 `release --check` 判定（`verify` 绿 ≠ 可发布）。
- **兼容性表述**：`0.2.1-rc.5` 的验证范围写清为“生命周期实验的 host 面”，与
  `checks/gates/lib/compat-tags.json` 的认证 tag 台账区分（台账仍只列 rc.2）。

## 0.7.1 — 2026-11-02

### Changed

- **FAQ 26 Harness 发行版对齐**：读者面统一为 Harness 发行版 / 交付形态 / 公司状态（company state）/
  run trace；清掉 current docs 的「插件即产品 / 产品形状 / 产品入口」旧说法与 v2 残留；代码/持久名保留
  legacy，不再把 `run bundle` 当 DSH bundle。
- **发布证据链**：`release-smoke` 装 `_dist` 同一份 tarball（`--tarball/--expect-sha`）；`release --check/--stamp`
  加 `sourceFingerprint`，源变而产物未重打即拒绝；`publish-handoff` 改为 `npm publish <tgz>`。
- **安装前置与 README**：Desktop 自带 Node/pnpm、npm CLI / `dsh web` 需 pnpm 在 PATH，分开写；
  包 README 补 `description`/`kind`、升级/排障；browser 两包标 optional；应用内安装接受 `restart-required`。
- **文档事实**：`run/README` 重写 v3；外部研究 26 目录改 `26_harness-release`；profile 初始化统一官方
  `--from-default-profile web`，删除已不存在的 `patchReload`；手写 roster/seed-consent 的旧引导删除。

## 0.7.0 — 2026-11-02

### Changed

- **默认应用内安装修复**：会话全文检索改由 `company-session-search`（insert + isolate 组）提供，
  不再替换 host 的 `session-query-sqlite`。Plugins 页 / `plugin_manager` 安装不再报
  `file-upload: Agent resolver is already registered`；六个 preset 的 `tool-session-query` 行收敛到组内。
  角色 `session_search` 工具不变；DSH 侧栏内容搜索保持出厂行为（`openAt: never`）。
- **发布身份**：`license: MIT` + `LICENSE`、`author`/`homepage`/`bugs`/`keywords`/`publishConfig.access`；
  移除 `private`。npm 发布与 market index 走发布 handoff（发布字节 = `pnpm release --check` 的 tarball）。
- **升级/卸载说明修正**：外部插件没有 Update 按钮，升级 = 卸载再装 + 重启；卸载不再建议删整个
  `DSH_HOME`，改为 run bundle / `company/` / ledger storage 的精确删除面。
- **验收面**：`release-smoke` 增加应用内安装 `application: applied` 断言；README 补 Verify /
  Compatibility，手册补市场开关与精确卸载面。

## 0.6.0 — 2026-11-01

### Changed

- **DSH-native 产品入口**：删除 package bin / 产品启动器。安装默认 DSH **Plugins** 页（web/Desktop
  同一句）；CLI `dsh plugin --profile company add <tgz>` 仅 `dsh web` 自动化。启动 = `dsh --profile company`。
- **workspace 是启动输入**：`DSH_COMPANY_HOME` → 启动 cwd → 保存的最近选择 → DSH Workspace picker；
  Host boot 不等用户；无 `--workspace` flag、无 TTY 询问。一个安装 = 一个公司，可顺序服务多个 workspace。
- **插件内容与 run bundle 分家**：手册/模板/默认章程/状态默认值住 pack `content/`，不复制到 workspace；
  run bundle 全部收进 `<workspace>/.dsh-company/`（`kb/`、`deliverables/`、`cultivation/`、`logs/`、
  `exports/`、`overrides/`、`bundle.json` v3）；workspace 根不再出现产品文件。
- **presented 账本按 workspace 分区**：新 domain `company_run_bundle_ledger` v1（或
  `<DSH_HOME>/company/ledger/<hash>.json`）；方法层/账本仍留 home（D25/M2）。
- **0.5.0 布局不自动迁移**：旧根目录骨架/旧 manifest/旧账本原样保留；新 workspace 重新开始，或按
  安装手册手工搬 `.dsh-company/`。版本 0.6.0 是破坏性改版。

## 0.5.0 — 2026-11-01

### Changed

- **插件即产品：workspace 自持公司身份与产物**。`bundle.json` 从 `<DSH_HOME>/` 搬到
  `<workspace>/.dsh-company/bundle.json`（v2：身份跟盘走，去掉 `workspace` 字段，新增 `handbookTarget`）；
  骨架、业务产物与升级日志跟 workspace，`home` 只留 DSH 运行时与 host 治理（sessions / 凭据 /
  workspace 登记 / lease / 方法层 / 审计账本）以及一份身份备份。
- **workspace 必须显式**：`DSH_COMPANY_HOME` 由启动器给出；取消默认 `<DSH_HOME>/company-workspace`。
  没有 workspace、manifest 损坏或 lease 冲突时停写公司数据并点名原因（DSH 会话仍可用）。
- **`DSH_COMPANY_REBIND` 退役**：设了只告警，不再执行旧改盘逻辑。
- **新 workspace 需 seed 同意**：只有 `.dsh-company/.seed-consent` 匹配（workspace + pack 版本）或盘上
  已有公司标记时才补骨架；直接启动无同意只告警、不写身份。`DSH_COMPANY_BOOTSTRAP=if-missing` 可显式放行。
- **手册种子碰撞感知**：`AGENTS.md` 优先；已有项目里 `AGENTS.md` 被占用时写 `COMPANY.md`，角色
  `agent-instructions` 候选同步为 `AGENTS.md` / `COMPANY.md` / `CLAUDE.md`。

### Added

- **`dsh-company` 启动器 + `pnpm company`**：解析/询问 workspace → 建/验 `company` profile（只在缺失时
  `--from-default-profile web`，已存在只验证不 reset）→ 装/修 pack → 写 seed consent → 设
  `DSH_HOME`/`DSH_COMPANY_HOME` → 起 web。`--print` 只打印解析结果，`--reset` 只删带 `.company-home`
  标记的 home（不删 workspace）。repo 形态入口 = `pnpm company`。
- **boot 自动登记 workspace**：独立 host row（`inject: workspaceRegistry` + async apply）在 Web readiness
  前把 `DSH_COMPANY_HOME` 登记进 DSH Workspace，浏览器打开即选中目标 workspace（压掉首用 Documents 默认盘）。
  只登记，不建目录、不 seed、不授权；失败只告警。
- **`dsh-company --doctor`**：只读检查 home/profile/pack/workspace/seed consent/manifest/身份备份/
  settings/lease；全绿 0，否则 1。
- **治理导出**：workspace `.dsh-company/exports/` 只读快照（methods / presented ledger），权威仍在 home；
  `bundle.json` 升级时同步 home 身份备份。

### Known

- Web 内 onboarding 选 workspace 未做（v1 用终端启动器询问/`--workspace`）。
- Windows / 容器 / npm registry 发布未验证/未启用；不冒充支持。
- 不可信项目不承诺消除 prompt injection；只做边界/形状测试。

## 0.4.6 — 2026-10-29

### Added

- **培养左右分界可调整宽度**：拖动中间分界改变左板/培养对话宽度；键盘 ←/→ 调 16px，Home 复位，双击分界复位；宽度按浏览器持久化。
- 右栏最小 280px、最大 720px，并保证左板至少 380px；窄屏仍走 45% 上限。

## 0.4.5 — 2026-10-28


### Added

- **培养对话 attach**：右栏可选择左侧培养记录作为上下文；prompt 带 `【附加记录】` 引用，界面只显示用户原话。
- **流式/工具行**：assistant transient text-delta 显示「生成中」；tool/call、tool/result 以紧凑行显示，失败带原因。
- 范围前缀 + `【用户问题】` 标记，渲染时剥离；审批仍走平台审批面（面板只显示工具状态，不伪造审批卡）。

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
