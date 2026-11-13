---
status: 已结
opened: 2026-11-12
---

# 推敲：启动策略（界面批）与 wiki 知识地图（配置批）落地后的回归 + 探索性验证

> 立卡：2026-11-12 ｜ 状态：已结 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：是 ｜ 审查：agent — A1–A5 / B1–B8 已跑（未证面列明）；10 张 BUG-080..089；pnpm verify / test 绿；不改产品代码
>
> **结论/去向**：none — 只产 BUG-080..089 十张缺陷卡 + Round 1 证据；无下游 Note（测试/证据卡）。
>
> **授权边界**：A 批（0 模型 / 真页面 / 真挂载）可自主跑；B 批 live 需用户明确批准入口、charter、轮数/墙钟/child/输出预算、权限模式与证据落点。立卡不等于 live 授权，也不改产品代码。

**批次识别：** 本卡按最近两个落地提交识别两批——**界面批** = `91d21852`（2026-11-12 19:24），**配置批** = `bb140dad`（19:50）。若你说的「界面 / 配置」是更早的 i18n 两批（UI 呈现层双语 + content 英文），先停：范围要换，不能套本卡。

**问题与期望结果：** 两个批次刚落地，现有证据主要是「测试绿 + 单点真会话」：界面批的真页面证到按钮 / 页签在场，未证设值 / reset 交互，配置批的真会话只证到「外部 wiki 读得到、写不进」。本轮要回答三件事：① **regression 有吗**——9→10 页签、composer 槽 +1、新 systemPrompt section、六 preset 各多一个 `customSkillDirs`、`shipped-links` 多一块排除面、`preset-smoke` 多一个共享根，是否把旧 UI、旧注入、旧 skill 隔离、旧安装形状改坏？② **新东西靠谱吗**——按钮/面板是否说真话（当前值、失效原因、可写/只读、reset）；`startup.json`、派生选项、面板、`/company-settings show`、`company:startup-settings`、模型行为六面是否一致；wiki 三档是否按位置生效；共享 skill 是否真能在六个角色里加载；模板是否真能被安装用户拷走并用起来？③ **哪些绿是假绿**——现有 spec/门禁/金样没覆盖或只在固定夹具上成立的断言（读上限、模板链接、en 第 10 页签、tarball 形状），先让它红再信。目标不是再跑一遍既有测试，而是保留独立 oracle（合同 / 归档验收原文 / 内容文件，不是实现自身）、来源坐标、可复判证据与停止边界；找真缺陷开 BUG 卡，不把「没找到」写成「没有 bug」。

**当前情况（2026-11-12 落地后）：**

- **界面批** `91d21852`：composer「策略」按钮（`conversation.input.left`，order 10）+ 右栏「策略」页签（`company-strategy`，order 20）+ workspace 级 `.dsh-company/startup.json` + 派生的 `startup-options.json` + `/company-settings` + `company:startup-settings`（order 501，活读、全自动空串、support preset 跳过）。落地证据 = [Note](../../../notes/implemented/2026-11-12-startup-settings.md)、[归档卡](./2026-11-12-startup-settings-landing.md)：typecheck / 231 files·1704 tests / verify / `ui-scene-smoke --isolated --golden` 10 页签 / `client-load-smoke` / lint 全绿。**未跑**：en 第 10 页签、`release-smoke`、面板设值→reset→重开的真实交互、真实角色会话里的 section 出现（A6 只由 `startup-prompt.spec` 的纯文本判据覆盖）。
- **配置批** `bb140dad`：`content/wiki-template/`（AK 三层 + OKF 最小 frontmatter）、六个角色共享的 `consulting-the-knowledge-map` skill、`wikiCheck` 三档校验、注入按 wiki 位置分档（内可写 / 外只读 / 失效警示）、`shipped-links` 排除模板、`preset-smoke` 登记共享根。落地证据 = [Note](../../../notes/implemented/2026-11-12-wiki-knowledge-map-landing.md)、[归档卡](./2026-11-12-wiki-knowledge-map-landing.md)：typecheck / 233 files·1723 tests / verify / `preset-smoke` 11 preset / 外部只读真会话（读 `index.md` 成功、写被拒且原文件未变）。**未跑**：skill 正文的真实加载、默认态截图、`release-smoke`、失效指针的 live 行为、模板从安装包拷贝的可用性。
- 本卡立卡时复核（2026-11-12 20:04）：`HEAD = bb140dad`，工作树干净；`pnpm test tests/lib/startup-settings.spec.ts tests/host/startup tests/host/commands/settings-command.spec.ts tests/client/startup tests/content/wiki-template.spec.ts tests/presets/wiki-skill.spec.ts` → **7 files / 56 tests passed**。这是基线，不是新证据。
- **已知残余（来自 Note / 卡，不是本卡结论）**：软强制（`/req check`、`/delivery check` 不读 `startup.json`）；`wikiCheck` 与选项只在 boot 与写设置后重算；skill 正文未真调用；模板首用手工 `cp -R`；面板 `wikiCheck` 在目录搬走后会短暂显示旧结论。
- **待判的验收差异（先记 oracle 冲突，不先判缺陷）**：
  - 归档卡 A4 写「临时新增类型目录后重开面板即出现」，Note 写「换内容包后需重启 host 才进下拉」；代码只在 boot / 写设置后 `refreshStartupOptions`（`src/host/startup/startup-store.ts:150`、`src/index.ts:190`），面板 mount 不重算。
  - 归档卡 A2 写「tooltip 列出生效值」，`StrategyButton` 的 `title` 是固定句、不含值（`src/client/startup/StrategyButton.tsx:50-52`）。
  - 归档卡 A8 写「所有新增用户可见文案 zh + en 均在 typed 字典内」，但 `/company-settings` 的 `description`、`SETTINGS_USAGE` 和 `set` 解析错误是中文硬编码，en 会话仍中文（`src/host/commands/settings-command.ts:29,94,107`）。
- **现存资产**：`pnpm verify` / `pnpm test` / `pnpm typecheck` / `pnpm lint` / `pnpm dup`；`preset-smoke`（11 preset + skill 隔离）；`ui-scene-smoke --isolated [--golden|--refresh-golden|--lang en|--steps]`；`client-load-smoke`；`cdp-probe --steps/--evidence/--texts/--body-out`；`release-smoke`；`tools/explore-evidence.mjs`；`checks/audit/surface-matrix-audit.mjs`；`company-entry-smoke` / `external-workspace-smoke`。测试面 = `tests/lib/startup-settings.spec.ts`、`tests/host/startup/`、`tests/host/commands/settings-command.spec.ts`、`tests/client/startup/`、`tests/content/wiki-template.spec.ts`、`tests/presets/wiki-skill.spec.ts`、`tests/client/i18n/`、`tests/ui/company-tab-catalog.spec.ts`。
- **本卡要补的未覆盖面**：面板交互真值（reset 后的输入框、失效标签、busy/error、浮动/重开、长值）；en 第 10 页签与命令回执；六面一致（磁盘 / 按钮 / 面板 / 命令 / 注入 / 模型）；workspace 错位（会话 cwd ≠ host workspace）、boot 无 workspace 后补选；wiki 相对路径 / symlink / `~` / 空格 / `index.md` 是目录；选项读上限在内容变多时的假绿；section 在 root / child / teammate / workflow / cold resume / support 的矩阵；共享 skill 的真加载与 tarball 路径；模板拷贝路径与模板内链接；`shipped-links` 排除面的盲区。

**未决问题：**

- **真值面**：同一场景下，`startup.json` / 按钮 / 面板 / `/company-settings show` / 注入段 / 模型实际行为是否一致？谁最容易撒谎：stale `wikiCheck`、reset 后未受控的 input、读失败折成「自动」、workspace 错位、shared store 跨会话残留？
- **reset 语义**：文件清空、面板清空、输入框清空、blur 不再回写——四件事是否同时成立？「恢复自动」之后用户再点一下别处，旧值会不会被重新保存？
- **入口矩阵**：named child / teammate / workflow 分支 / cold resume / 未知 preset / 五个 support preset，各自拿不拿 section？support 的跳过是靠 `composedPresetOf` 还是靠 persona 自觉？
- **wiki 边界**：相对路径以谁的 cwd 为基准？symlink 在 workspace 内指向外（或反之）算可写还是只读？`~`、多空格、尾斜杠、`index.md` 是目录，分别落在哪一档？
- **选项规模**：`STARTUP_OPTIONS_READ_LIMIT = 64` 的「最坏形状」spec 只用了当前 2 个产品类型 + 3 个交付模式（`tests/lib/startup-settings.spec.ts:143-150`）；内容变多时会不会截断 JSON、面板静默空下拉？
- **安装形状**：tarball 里有没有 `content/wiki-template/` 与 `presets/_shared/wiki/skills/`？安装 profile 里六个角色 `skills/list` 都看得见吗？模板里的 `cp -R packages/company-pack/...` 对安装用户是否存在？
- **语言**：en 第 10 页签、命令中心描述/用法、wiki 失效原因，是否还有中文硬编码？A8 的「typed 字典」边界到底覆盖到哪一层？
- **回归**：9 页签金样 → 10 页签后，旧金样、旧 en 九页签、`client-load`、preset skill 隔离是否仍成立？

**下一步：** 先跑 A 批（0 模型，可自主）→ 结果回填 §A 与「执行记录」；B 批的入口/预算/权限先请用户明确批准；发现真缺陷先开 `_backlog/bugs/` 卡，再继续下一 charter；不改产品代码；不把单场结论写成「稳定」。

## 范围与排除项

**范围：**

- 两个提交触及的面：`src/client/startup/*`、`src/client/tabs/*`、`src/client/locales.ts`、`src/client/ui/styles.ts`、`src/host/startup/*`、`src/host/commands/settings-command.ts`、`src/lib/startup-settings.ts`、`src/lib/run-bundle-paths.ts`、`content/wiki-template/**`、`presets/_shared/wiki/skills/**`、六个角色 `agent.cordis.yml` 的 `customSkillDirs`、`checks/gates/shipped-links.mjs` 的排除面、`checks/lanes/preset.entry.mjs` 的共享根、`docs/contracts/profile.md` 与 `content/README.md` 的合同文字。
- 真实入口：`pnpm verify` / `pnpm test` / `pnpm typecheck` / `pnpm lint` / `pnpm dup`；隔离 profile 的真页面（zh / en / steps）；真挂载的 `preset-smoke` / `client-load-smoke` / `release-smoke`；真实公司会话的注入与模型行为（B 批）。
- 回归面：旧 9 页签金样、旧 en 九页签、旧 composer 槽、旧 section（handbook / delegation / workflow）、旧 skill 隔离、旧 `bundle.json` / run-bundle 形状、旧 home settings 与 workspace settings 的边界。
- 测试资产：可复用现有 probe/spec；不足时允许补**测试资产**（`probes/`、`checks/`、步骤 JSON、临时 fixture），不允许改产品代码 / presets / content / vendor。

**排除（本卡不做）：**

- 修产品代码、改样式/文案/合同、改 preset/content/vendor；发现缺陷只开卡或记录，不在本卡修。
- 硬强制（`/req check`、`/delivery check` 读 `startup.json`）；新增启动字段；URL wiki；wiki lint 自动化 / schedule / FTS；wiki init 命令；wiki 引擎；把模板放进 `manifest.json`。
- 重跑已归档的委派能力矩阵（team / workflow / retry / `workflow_runs` 的旧面）；只在 section 与 preset 跳过的交叉点上取必要样本。
- 全仓 i18n 审计（I2/I3 已明确不做）；只查新增/改动字符串与新增面。
- 产品决策拍板：support root 是否可组队、面板是否应显示中文显示名、外部 wiki 是否应可写——观察并标 owner，不在本卡裁决。
- 发布声明、`pnpm release`、公有 registry；`release-smoke` 只作安装形状证据。
- 把「跑绿」当「没问题」；不把单场 live 写成稳定结论。

## 探索方向（假设先行）

**五个轴，按价值排序：**

1. **六面一致**：磁盘 → 按钮 → 面板 → `show` → 注入 → 模型。同一场景六处读数先写期望，再逐处实测；不一致处就是缺陷或合同漂移。
2. **三档边界**：wiki 在 workspace 内 / 外 / 失效，加上相对路径、symlink、`~`、空格、`index.md` 是目录等边界；每档同时看 UI 标签、命令回执、注入文本、模型动作。
3. **生命周期**：设值 → 下一轮 → reset → 冷恢复 → host 重启 → 内容包变化 → 换 workspace。观察 section 是否重装、选项是否重算、面板是否撒谎。
4. **假绿反证**：对每条关键断言做一次最小破坏（改链接、加内容目录、换 cwd、搬 wiki、截断文件），看现有门禁/spec 是否真会红；没红过的绿不算证据。
5. **回归面**：旧 9 页签 / 旧 en / 旧 section / 旧 skill 隔离 / 旧安装形状；只跑与两个提交相交的窄面，不重跑旧探索矩阵。

**假设表（先写死，跑后逐条判 confirmed / refuted / unverified + 证据）：**

| ID | 批 | 假设 | oracle（独立于实现） |
|---|---|---|---|
| H1 | A2/B8 | 「恢复自动」/清空后 wiki 输入框仍显示旧路径；用户点别处触发 blur 时，旧值会被重新写回文件（`defaultValue` 不受控，`StrategyPanel.tsx:84-95,187`） | 归档卡 A5「清空对应字段」+ reset 语义；磁盘 / 面板 / 输入框三处 |
| H2 | A2 | composer 按钮 tooltip 不列生效值；多字段时 label 只按顺序拼值、长 wiki 路径被 ellipsis 截掉，用户分不清哪个值是哪个字段（`StrategyButton.tsx:41-52`） | 归档卡 A2「tooltip 列出生效值」+ Note 的按钮示例 |
| H3 | A2/B8 | wiki 目录搬走/改名后，面板的 `wikiCheck` 不再重算，仍显示「可用 / 可写」；`show` 与注入已说失效——与「面板与 `show` 都点名失效原因」矛盾；面板无刷新控件 | `docs/contracts/profile.md` 的 startup 段 + Note 的「短暂显示旧结论」 |
| H4 | A2 | 面板没有 loading / unknown 态：首次 mount 读盘未回时按空设置渲染成「自动」，shared store 在切会话时还会短暂显示上一会话的值；按钮有 `loaded` 守卫，面板没有（`StrategyPanel.tsx:160`） | 「不冒充实值」原则（按钮注释）+ A2/A3 |
| H5 | A2/A3 | en 第 10 页签 / `/company-settings` 的命令中心描述、用法、`set` 解析错误仍有中文；A8 的「typed 字典」没有覆盖 host 命令面 | 归档卡 A8 + `tests/client/i18n/locales.spec.ts` 的边界 |
| H6 | A3/B7 | 会话 cwd ≠ host workspace 时，面板经 session 读 A，命令经 `options.workspace` 写 B（`command-workspace.ts:21-25`）；面板看起来保存失败或永远显示 auto | `profile.md`「workspace 级」+ `makeWorkspaceTextReader` 的 Lead 寻址 |
| H7 | A3/A4/B7 | host boot 时无 workspace、之后在侧栏选一个：命令回退到会话 cwd 能写，回执说「下一轮生效」，但 `registerStartupSettings` 未注册，section 直到重启都不出现；选项文件只在写设置时由命令补派生，boot 后首次开面板可能空 | A6 + BUG-060 的 workspace 补选路径 + 回执原文 |
| H8 | A4/B6 | section 矩阵有洞或泄漏：某些 named child / teammate / workflow 分支 / cold resume 缺 section；support preset 因 `composedPresetOf` 取不到而误装；未知 preset 被当角色装 | `NON_ROLE_PRESETS` + A6 + 归档卡的期望表 |
| H9 | A3/B3 | wiki 路径语义不一致：相对路径按 workspace 解析给人看、但注入只给原始相对路径（子代理 cwd 不同则解析到别处）；symlink 内→外被 `relative()` 判成 inside（`startup-store.ts:114-117`）；`~` 不展开；多空格被命令解析折叠 | `profile.md` 三档 + 沙箱「只限写、不限读」 |
| H10 | A3 | `STARTUP_OPTIONS_READ_LIMIT = 64` 的「最坏形状」只用当前 2+3 内容；内容目录增多后派生文件超限 → JSON 截断 → `parseStartupOptions` 折成空集合 → 面板静默「没有选项」 | 动态枚举的承诺 + 2026-11-12 实修的同款教训（13→19 行时截断） |
| H11 | A5/B2/B6 | 共享 skill 只证了发现面（`preset-smoke` 的 `skills/list`），正文没在真会话里加载；tarball 安装后 `customSkillDirs` 的 `node_modules/dsh-company-pack/...` 路径可能不可用 | A2 的 skill 真调用 + `release-smoke` 的安装形状 |
| H12 | A5 | 模板的 `cp -R packages/company-pack/content/wiki-template ...`（`content/wiki-template/README.md:9`）与面板提示 `content/wiki-template` 是仓库路径，安装用户找不到；模板内 `AGENTS.md` / `README.md` 的链接不在 `shipped-links` 扫描面，spec 只守 `index.md` 的链接目标 | `release-smoke` 的安装视图 + 安装手册 + `wiki-template.spec` 的覆盖 |
| H13 | A5 | `shipped-links` 把整个 `wiki-template/` 排除（`checks/gates/shipped-links.mjs:74-81`），往 `AGENTS.md` / `README.md` 塞坏链接后 `pnpm verify` 仍绿——这是测试资产盲区，不是产品缺陷 | 门禁定义 + 红→绿反证 |
| H14 | B1–B6 | 模型行为与三档/合同不一致：先读 index 再钻页、外部不写、失效不说「不存在」、auto 不假装有绑定、设了值仍再问/猜（软强制的真实边界） | 注入段 + skill 正文 + 模板 `AGENTS.md`；模型观察，不拿实现当 oracle |
| H15 | A1/A2/A5 | 旧面回归：9→10 页签金样、旧 en 九页签、旧 composer 槽、旧 section、旧 skill 隔离、旧安装形状被两个批次改坏 | 改动前基线（`91d21852^` / 旧金样）+ 现有 smoke |

## A 批 · 回归与契约面（0 模型，可自主）

> 0 模型 = 不建真模型会话、不花 API；真页面、真挂载、真文件、真命令面都算。「跑绿」只作基线，不能当本批结论。

### A1 门禁、回归基线、安装形状

| 检查 | 命令 / 入口 | oracle | 记录 |
|---|---|---|---|
| 结构门禁 | `pnpm verify` | 全绿；红即 regression | 退出码 + 首条红 |
| keyless 回归 | `pnpm test` | 全绿；红即 regression（先记基线，不在本卡修） | files/tests、失败名 |
| 类型 / 风格 | `pnpm typecheck`、`pnpm lint`、`pnpm dup` | 全绿 | 退出码 |
| 11 preset 真挂载 | `node checks/lanes/preset.entry.mjs` | 6 角色 + 5 support 全部挂上；六角色 `skills/list` 含 `consulting-the-knowledge-map`；support 不含（有 `skills/` 目录的 support 由本 smoke 覆盖，无目录的另用 `skills/list` 或静态面补） | ALL PASS + 逐 preset 读数 |
| client 真挂载 | `node checks/lanes/client-load.entry.mjs` | 新槽 / 新页签零挂载失败 | ALL PASS |
| 真页面 zh | `node checks/lanes/ui-scene.entry.mjs --isolated --golden` | 10 页签金样一致；无浏览器错误 | ALL PASS + 金样 diff |
| 真页面 en | `node checks/lanes/ui-scene.entry.mjs --isolated --lang en` | 10 页签无中文残留（重点第 10 个「策略」） | 每页签文本 / 失败片段 |
| 安装形状 | `node checks/lanes/release.entry.mjs` + 检查 tarball 清单 | 干净 profile 装包后 11 preset 可挂载；`content/wiki-template/**` 与 `presets/_shared/wiki/skills/**` 在包里；六角色 skill 可见 | ALL PASS + `tar -tzf` 关键行 |
| run-bundle 形状 | `ensureRunBundle` / 现有 rehearsal 盘（`pnpm bundle:init` 只作 dev 盘现状基线，不碰真盘） | `startup.json` / `startup-options.json` 路径不破坏既有 `bundle.json` / 二次启动零变更 | 文件清单 + 二次启动 diff |

### A2 真页面：UI 真值矩阵（zh / en / steps）

**做法：** 用 `ui-scene-smoke --isolated --steps <file>` 或 `cdp-probe --steps` 驱动真实页面；每次记录：截图、`document.body.innerText`、面板 `[data-company-tab-title="策略"]` 文本、composer 按钮文本/title、磁盘文件原文、`/company-settings show` 回执。**期望表先写死，再跑。**

| 场景 | 期望（oracle） | 重点观察 |
|---|---|---|
| 全自动 | 按钮「策略：自动」；面板三行「自动」；无「不设限」误导；无 wiki 标签 | H2/H4；tooltip 是否含值 |
| 只设产品类型 | 按钮显示该值（或「已设 N 项」）；面板回选；重开不丢；磁盘 `productType` 一致 | A2/A5 |
| 三字段 + 长 wiki 路径（workspace 内） | 按钮不溢出（ellipsis 可接受，但 tooltip 应能补全值）；面板 wiki 行标「可写」；磁盘三字段一致 | H2；截断后信息是否可恢复 |
| wiki 在 workspace 外（有效） | 面板标「只读」；`show` 标 `read-only`；注入段是「只读、不要尝试写入」 | A3/A4；位置判定 |
| wiki 失效（缺目录 / 非目录 / 缺 index） | 面板点名三种原因之一；`show` 同名；注入段是失效警示、不含「先读 index 再钻页」 | H3/H9；三因分别造 |
| reset / 清空 wiki | 文件三项 null；面板行回到「自动」；输入框清空；blur 不再回写 | H1；最关键的交互 |
| 面板打开时外部改设置（命令 / 另一窗口） | 面板应在下一次刷新/重开时显示新值，且明确「未刷新」不冒充实时 | H3；记录是否无刷新入口 |
| 内容包里没有的旧值 | 面板标失效 + 给可用值；不静默沿用；选择后写回 | A7；按钮显示旧值是否可辨 |
| en | 新增按钮 / 面板 / 页签 / 失效原因 / reset / busy / error 全部 en；无中文 | H5；命令中心不在本页时归 A3 |
| 浮动 / 关闭 / 重开 / 窄宽 | 设置仍在；布局不破；长值不溢出对话区；页签可重开 | A3 |
| 失败路径 | 命令失败、读取失败、选项为空、写盘失败时，面板给可读错误，不静默 auto | H4；可注入失败（只读目录 / 坏 JSON） |

### A3 配置 / 命令 / 文件契约（host 面 + 真命令）

**做法：** 先用 `pnpm test tests/host/startup tests/host/commands/settings-command.spec.ts tests/lib/startup-settings.spec.ts` 作基线；再用真实文件 / 真实命令 / 临时 workspace 做**对抗夹具**。纯逻辑可新增 spec 或夹具，但只测不修。

- **作用域与路径**：只写 `<workspace>/.dsh-company/startup.json` / `startup-options.json`；`<DSH_HOME>/company/settings.json` 不被触碰；目录不存在时创建；原子写不留 `.tmp`；坏 JSON / 缺文件折「全自动」且不抛。
- **命令解析**：`show` / `set <field> <value|auto>` / `reset`；未知字段、未知值、缺值、多余参数、空输入；wiki 带空格 / 多空格 / 尾斜杠；`auto` 与空串；`set wiki <placeholder>` 被清洗成 null 时回执是否说真话。
- **wiki 检查矩阵**（每格同时读 `checkWikiPointer`、派生文件、`show`、面板）：缺目录 / 路径是文件 / 目录缺 `index.md` / `index.md` 是目录 / 有效内 / 有效外 / 相对路径 / 绝对路径 / `~` / `..` 逃出 / symlink 内→外 / symlink 外→内 / 大小写 / 不可读目录。
- **选项枚举**：`productized` 恒在最前；目录名排序；内容目录缺失 → 空产品类型 + 仅 `productized`；临时加很多产品类型/交付模式 → 序列化行数 vs `STARTUP_OPTIONS_READ_LIMIT`；坏派生文件 → 空集合；`wikiCheck` 与 `settings.wiki` 不同步时面板不谎报（已有 spec，复核真文件）。
- **workspace 错位**：`session/create` 用与 host 不同的 cwd；面板读 / 命令写 / `show` 读 / 注入读分别是哪份文件；记录用户可见症状（保存成功但回显 auto？）。
- **boot 无 workspace 后补选**：host 启动时 workspace 为空；在侧栏选 workspace、开会话、`/company-settings set productType …`；下一轮是否真有 section / 选项（H7）。
- **写入与回执**：`set productType` 未知值 fail-closed 并列可用项；`set wiki` 失效时回执点名三因；`reset` 三项全清 + `updatedAt`；失败时错误原话回到面板。
- **双语**：`show` / `set` / `reset` / 错误 / 命令中心描述在 zh 与 en 下各跑一次；en 不应出现中文（H5）。
- **run-bundle**：新路径在 `bundle.json` / `ensureRunBundle` / 二次启动 / 清理路径中的位置；不破坏旧 workspace 的 `bundle:init`。

### A4 section 与挂载矩阵（真挂载；不冒充 live）

**先写期望表，再跑。**

| 入口 | preset | section 期望 | 备注 |
|---|---|---|---|
| 6 角色 root | ceo / vp-eng / vp-sales / coo / cfo / cmo | 注册有；有设置时文本含已设项；全自动文本为空串（vendor 是否渲染空 section 记录实测） | order 501，紧跟 handbook 500；无重复 |
| 5 support root | worker / worker-researcher / worker-orchestrator / quality-loop-producer / quality-loop-verifier | 无 | `NON_ROLE_PRESETS`；不因 root 是 Lead 而误装 |
| 命名 child | CEO→vp_eng / vp-eng→vp_cmo / vp-eng→quality_loop_produce/verify / vp-eng→generic worker | 角色 child 有；support child 无 | 按 child 自己的 preset 判 |
| teammate | CEO team / vp-eng team | 角色 teammate 有 | 与 `composedPresetOf` 的取值面 |
| workflow 分支 | vp-eng workflow | 有 | section 与 `company:workflow-contract` 共存 |
| 冷恢复 | root / named child / teammate | 有且不重复 | host 重启后 resume |
| 未知 / 缺省 preset | 无 preset 的会话 | 按 `NON_ROLE_PRESETS` 的 false 面判，记录实际 | 不替组合猜 |

**证据方式：** 优先真挂载 `session/create` + 会话日志（`system/message` 里有就读，没有就标「未证」，不猜）；注册面用真 Cordis `Context` 的 host spec（同 `inject-reentrancy.spec` 手法）；`workflow_runs` / 工具面不在本卡重测。**A4 只证「注册面 / 跳过面 / 真实会话可见面」；「模型是否遵守」归 B。**

**成本：** 记录每个座位的 `system/message` 总字节与 section 字节；确认新增段没有异常挤占（预期很小，量级即可）。

### A5 skill、模板、安装形状与假绿

- **skill 发现面**：`preset-smoke` 六角色看得见；support 的隔离面按「有没有 skills 目录」分——`quality-loop-*` 由 smoke 覆盖，`worker` / `worker-orchestrator` 等无 skills 目录的 support 要另用 `skills/list` 或静态面补，别把 smoke 的覆盖面说大。`tests/presets/wiki-skill.spec.ts` 的四条仍成立（一处内容、无副本）。
- **skill 正文**：A 批只做静态合同（frontmatter `name`/`description`、body 含 index/查询/ingest/lint/只读边界、与模板协议不矛盾）；**真加载归 B2/B6**，不在 A 冒充。
- **模板拷贝**：把 `content/wiki-template/` 拷到临时目录（workspace 内 / 外各一份），从**安装视角**检查：`README.md` 的 `cp -R` 路径是否存在；`index.md` / `AGENTS.md` / `README.md` 的所有相对链接在拷贝后是否成立；有无仓库绝对路径 / home 路径；`sources/` 与示例页的形状。
- **三档一致性**：模板 `AGENTS.md` 说「你是维护者、你写」，模板 `README.md` 说位置决定模式，skill 与注入段说外部只读「不要尝试写入」——三份文字逐句对。外部 wiki 上模型若先读模板协议，会不会被「你是维护者」诱导去写？有矛盾先记观察（owner = `content/wiki-template` / skill / 注入文本），不在本卡改。
- **假绿反证**：
  - 往 `wiki-template/AGENTS.md` 或 `README.md` 塞一个坏链接 → `pnpm verify` 是否仍绿？spec 是否仍绿？（记录 H13 的红/绿）
  - 把 `index.md` 的链接改成不存在 → `wiki-template.spec` 应红（已知）；还原。
  - 临时加很多内容目录 → 选项行数超限 → 面板是否静默空集合（H10）。
  - 把 `startup.json` 改成坏 JSON / 截断 → 面板与 `show` 是否折 auto / 空集合且不报错（H4）。
- **tarball 内容**：`tar -tzf _dist/dsh-company-pack-<version>.tgz` 找 `content/wiki-template/`、`presets/_shared/wiki/skills/consulting-the-knowledge-map/SKILL.md`、六个 preset 的 `customSkillDirs`；安装 profile 里 `skills/list` 逐角色对；模板路径对安装用户是否可达（H12）。
- **文档合同**：`docs/contracts/profile.md` / `content/README.md` / 两个归档卡的验收原文与实际行为逐条对；发现矛盾先记观察，标 owner（docs / 卡 / 实现），不在本卡改。

## B 批 · 探索（live，待授权）

> **授权门**：入口、charter、轮数/墙钟/child/输出预算、权限模式与证据落点需用户明确批准；未批准不启动。A 批结果和本卡定性不等于 live 授权。

| ID | charter | 形状 | oracle | 样本 |
|---|---|---|---|---|
| B1 | 约束是否被遵守 | 设 productType + deliveryMode；让模型做一件本来会问「什么类型 / 怎么交付」的事 | 不重复问、不按特征猜；输出与所设类型/模式一致；软强制的边界如实记（`/req check` 仍不读设置） | 2 场 |
| B2 | wiki 内（可写档） | 把模板拷进 workspace 的测试 wiki；设 wiki；问一个必须查页的问题；再让它「把答案归档」 | 先读 `index.md` 再钻页；引用页；允许写时按协议写页 + index + log；不写 workspace 外 | 1–2 场 |
| B3 | wiki 外（只读档） | 外部目录（workspace 外、可读不可写）；设 wiki；问一个必须查页的问题；再让它「补一页」 | 读得到、写不进；模型提议而不是写；文件哈希/修改时间不变 | 1 场 |
| B4 | wiki 失效 | 缺目录 / 非目录 / 缺 `index.md` 各一次；设指针后问一个 wiki 问题 | 明说失效 + 原因；不 read 空气目录；不凭记忆编；不输出正常查页指引 | 1–2 场（三因可合并） |
| B5 | 全自动 | 不设任何字段；问「这个项目做什么 / 怎么交付」；观察是否加载 wiki skill | 不假装有绑定；按手册问一句或按特征给出可复判的判断；无 section 也能解释 | 1 场 |
| B6 | skill 正文 | 明确要求「按参考资料 wiki 的协议查一个页」/ 触发 wiki 查询 | `skill` 工具真加载 `consulting-the-knowledge-map`（不是只看 catalog）；正文规则与注入分档一致 | 1 场（可并入 B2/B3） |
| B7 | 生命周期 | 设值 → 结束本轮 → 冷恢复 / host 重启 → 再问；reset → 再问 | section 不丢不重；值仍生效；reset 后模型不再按旧值约束；面板/`show` 一致 | 1–2 场 |
| B8 | UI ↔ 模型往返 | 面板设值 → 下一轮问；命令设值 → 开面板；reset → 下一轮 | 六面一致；无「保存成功但模型没收到」；无「模型收到但面板说 auto」 | 1–2 场 |

**B 的判据纪律：** 每场记录 session id、preset/depth、prompt 原文、`system/message` 里 section 的有无/文本、工具调用序列（重点 read/grep/skill/write/edit/bash）、turn 边界、文件哈希；**单场只写观察，不写稳定**；模型不配合/拒答/凭据失败如实记「未证」。

## Round 1（2026-11-12）结果

**总览：** A1–A5 已跑（个别格子未证）；B1–B8 已跑。共开 **10 张缺陷卡**（BUG-080..089），其中 2 张 P1、8 张 P2；无产品代码改动。

### A1 门禁 / 基线 / 安装形状

| 检查 | 实跑结果 | 判定 |
|---|---|---|
| `pnpm verify` | ALL PASS（加完 9 张 BUG 卡与索引后复跑仍 ALL PASS） | PASS |
| `pnpm test` | **233 files / 1723 tests passed** | PASS |
| `pnpm typecheck` / `pnpm lint` / `pnpm dup` | 全绿 / 0 warnings / 0 clones | PASS |
| `preset-smoke` | **ALL PASS（6 角色 + 5 support 全部可挂载）**；六角色 `skills/list` 含 wiki skill；support 无 skills 目录者不在本 smoke 的 skill 断言面 | PASS（support 面有覆盖差） |
| `client-load-smoke` | ALL PASS（真浏览器加载，client 面健康） | PASS |
| `ui-scene-smoke --isolated --golden`（zh） | 金样一致（10 页签）+ 浏览器错误环零命中 | PASS |
| `ui-scene-smoke --isolated --lang en` | **FAIL**：`仅 9/10 开`、`guide 缺失：策略`、catalog 末项仍是「策略」；产品 en 页面本身有 `Strategy`（body.txt） | FAIL → [BUG-080](../fixed_bugs/BUG-080-en-tab-title-map-missing-strategy.md) |
| `release-smoke` | ALL PASS（tarball 真安装 + 首启/幂等/卸载重装） | PASS |
| 当前源码 `npm pack` | `content/wiki-template/*` 与 `presets/_shared/wiki/skills/consulting-the-knowledge-map/SKILL.md` 都在包里 | PASS |

### A2 真页面 UI 真值

- **reset / 清空**：seed `wiki=/tmp/explore-wiki` 后打开「策略」，输入框显示 `/tmp/explore-wiki`；点「恢复自动」后输入框变为空、文件三项 null；再点其他 tab 未把旧值写回。**H1 refuted**（`defaultValue` 在 store 更新后确实被 React 刷新，不是陈旧值）。
- **stale wikiCheck**：删掉 wiki 目录后重开面板仍显示「在 workspace 外：角色只读」；同刻 `/company-settings show` 已说「⚠ 失效：目录不存在」。→ [BUG-082](../fixed_bugs/BUG-082-strategy-panel-stale-wiki-check.md)
- **tooltip**：seed `productType=business-software` 后按钮 `title` 仍是「点开调整这个项目的套路（下一轮生效）」，无值；label 被 ellipsis 截断时无法补全。→ [BUG-086](../fixed_bugs/BUG-086-strategy-button-tooltip-no-values.md)
- **en 面板**：`--lang en` 下用 steps 打开 `Strategy`，面板显示 `Project strategy` / `What we build` / `How we deliver` / `Reference wiki`；**产品 en 面板通过**，失败只在检查器的标题映射（BUG-080）。
- **长值 / 浮动 / 重开 / 窄宽**：未逐项截图；长值截断已由 BUG-086 覆盖，浮动/重开未证。

### A3 配置 / 命令 / 文件对抗夹具

- **workspace 错位**：会话 `cwd=/tmp/explore-other-ws`，其 `startup.json` = `hardware-software`；同会话执行 `set deliveryMode project-services` 后 **host** `company-workspace/.dsh-company/startup.json` 被改成 `project-services`，会话盘文件未变；`show` 读 host、`workspaceFiles/read` 读会话盘，三处不一致。→ [BUG-081](../fixed_bugs/BUG-081-strategy-panel-reads-session-workspace-command-writes-host.md)
- **wiki 路径语义**：symlink 内→外被标 `location:'inside'`（真实目标在外、沙箱写不进）；symlink 外→内被标 `outside`；`index.md` 是目录仍 `ok:true`；`~/wiki` 被当相对路径判 missing；`set wiki /a  b` 折叠成 `/a b`。→ [BUG-084](../fixed_bugs/BUG-084-wiki-pointer-lexical-path-permission.md)
- **选项规模**：60 产品类型 + 10 交付模式 → 派生文件 **85 行** > `STARTUP_OPTIONS_READ_LIMIT=64`；截断后 `parseStartupOptions` 折成空集合，面板会静默「没有选项」。→ [BUG-085](../fixed_bugs/BUG-085-startup-options-read-limit-fixed-fixture.md)
- **命令语言**：en 实例里 `show` / `set` 成功回执是英文，但 `set nope x`、`set` 用法、`commands/list` 的 `description` 仍是中文。→ [BUG-083](../fixed_bugs/BUG-083-company-settings-host-command-strings-mixed-language.md)
- **原子写 / home settings 边界 / 坏 JSON**：未逐项造失败；`settings` 最坏 8 行 < 16 上限已复核，其余保持未证。

### A4 section 挂载矩阵

用真实挂载 + 一次 model-error turn 读 `system/message`（keyless；无 API key 也会先组装 system prompt）：

| 入口 | 读数 | 判定 |
|---|---|---|
| 6 角色 root（ceo/vp-eng/vp-sales/coo/cfo/cmo） | 全部含 `本项目的启动策略` + `产品类型：business-software` + `交付模式：project-services` | PASS |
| 5 support root（worker / worker-researcher / worker-orchestrator / quality-loop-producer / quality-loop-verifier） | 全部不含 startup 段 | PASS |
| 下一轮生效 | 同一 CEO 会话：auto turn 无段（20,685 字符）→ set turn 有段（20,880）→ reset turn 无段（20,685） | PASS |
| named child（CEO→vp_eng） | PASS：child `system/message` 22,484 字符，含 startup + product/delivery；child 先 bash 失败（环境）后 glob/send_message，最终正确回答 | 未证：teammate / workflow 分支 |
| 未知 / 缺省 preset | 未跑 | 未证 |

**成本：** set 段约 +195 字符（CEO 系统消息 20,685 → 20,880），量级正常；未观察 compaction 异常。

### A5 skill / 模板 / 安装形状 / 假绿

- **skill 发现面**：`preset-smoke` 六角色可见 `consulting-the-knowledge-map`；`worker` / `worker-orchestrator` 等无 `skills/` 目录的 support 不在 smoke 的 skill 断言面（**结论面比卡原写法窄**，已记）。
- **skill 正文**：B2/B3 真会话里 `skill {name:'consulting-the-knowledge-map'}` 被调用，正文规则被读；B6 PASS（发现面之外拿到正文）。
- **模板拷贝**：README 的 `cp -R packages/company-pack/content/wiki-template` 是仓库路径；安装后模板在 `<profile>/node_modules/dsh-company-pack/content/wiki-template`，面板提示也只写 `content/wiki-template`。→ [BUG-087](../fixed_bugs/BUG-087-wiki-template-copy-path-repo-only.md)
- **假绿反证**：往 `wiki-template/AGENTS.md` 塞坏链接 → `pnpm verify` 仍 ALL PASS、`wiki-template.spec` 仍 6 passed；还原后绿。→ [BUG-088](../fixed_bugs/BUG-088-shipped-links-excludes-wiki-template.md)
- **tarball**：模板与共享 skill 在包里；安装 profile 的六角色 `skills/list` 未逐角色重验（`preset-smoke` 是 dev link 面）。
- **三档一致性**：B3 外部只读时模型读了模板 `AGENTS.md`，仍选择不写、改交付建议页；模板「你是维护者」句没有把它诱导成写。观察通过，但模板文本仍可更明确。

### B 批 live（2026-11-12）

| ID | 场次 / 结果 | 判定 |
|---|---|---|
| B1 约束遵守 | `cfo` CEO 之外的短问：set 后答「产品类型按 hardware-software，交付模式按 project-services」；无工具、无反问 | PASS |
| B5 全自动 | set 前答「日期模式默认 productized，产品类型沿用 company.md 默认；具体值我未读文件、无法确认」；没有假装有绑定 | PASS（偏推断，不是空转） |
| B2 wiki 内可写 | 读 `index.md` → `concepts/zebra.md`；写页面、`index.md`、`log.md`；只动 wiki | PASS（写入面）；**注意**：本轮 workspace 嵌在 `runtime/tmp` 下，模型 grep 到了探针脚本/结果（测试隔离缺陷，不是产品缺陷） |
| B3 wiki 外只读 | 读外部 index + 页；**外部文件哈希前后一致**；把建议页写进 workspace `deliverables/` 并 present，不写外部 | PASS |
| B4 wiki 失效 | 先 `grep` 了一次缺失目录（拿到 no such file），随后明确说指针失效、不猜、要求重设；未编造 ZEBRA-404 | 部分：结果正确，但有 1 次「先试再报」；观察，不判产品 BUG |
| B6 skill 正文 | B2/B3 均调 `skill consulting-the-knowledge-map` | PASS |
| B7 冷恢复 / host 重启 | 同一 CEO 会话 set 后 kill web → 重启同 home/workspace → 同一 session 再 prompt：section 仍在（system message 含 product/delivery），模型答 hardware-software/project-services | PASS |
| B8 UI ↔ 模型 | keyless 的「同一会话 auto→set→reset」已证 section 下一轮出现/消失；live 的 set 后短问已证模型读到 | PASS |

**BUG-089**：boot 无 workspace 后补选设的策略不注入（H7）→ [BUG-089](../fixed_bugs/BUG-089-boot-without-workspace-settings-not-injected.md)。

**额外 named child（B9，非原 B1–B8）**：CEO → `vp_eng` child 的 system message 含 startup + product/delivery（22,484 字符）；child 先 bash（环境失败）再 glob/send_message，最终答「hardware-software / project-services」。section 继承 PASS。

**B 环境限制（不是产品缺陷）：** 首次 live 尝试里 `bash` 的 `workspace-write` 报 `sandbox-exec: sandbox_apply: Operation not permitted`（宿主在本 agent 的 workspace-write 沙箱内再套 sandbox-exec）；模型随后请求升 `danger-full-access`，审批无人应答，turn 挂起。第二次 B 只使用 read/write/skill，不再触发 bash，全部短 turn 完成。结论：**本轮不证 bash 面**；不要把「bash 不可用」记成产品 BUG。

### H 判决

| H | 判决 | 证据 / BUG |
|---|---|---|
| H1 reset 后输入框陈旧 / blur 回写 | **refuted** | 输入框 reset 后为空、文件 null、后续 tab 未回写 |
| H2 tooltip 不列值 | **confirmed** | [BUG-086](../fixed_bugs/BUG-086-strategy-button-tooltip-no-values.md) |
| H3 面板 stale wikiCheck | **confirmed** | [BUG-082](../fixed_bugs/BUG-082-strategy-panel-stale-wiki-check.md) |
| H4 面板无 loading/unknown | **refuted（按设计）** | Note 明写「坏 JSON / 缺文件折全自动，不抛」；面板首帧/读失败显示自动是同一设计，未观察到长时间错误态。残余：没有 loading 文案 |
| H5 en 第 10 页签 / 命令面 | **部分 confirmed** | 产品 en 面板 PASS；检查器 [BUG-080](../fixed_bugs/BUG-080-en-tab-title-map-missing-strategy.md)；host 命令 [BUG-083](../fixed_bugs/BUG-083-company-settings-host-command-strings-mixed-language.md) |
| H6 会话盘 vs host 盘 | **confirmed** | [BUG-081](../fixed_bugs/BUG-081-strategy-panel-reads-session-workspace-command-writes-host.md) |
| H7 boot 无 workspace 后补选 | **confirmed** | [BUG-089](../fixed_bugs/BUG-089-boot-without-workspace-settings-not-injected.md)：命令回执说下一轮，真 system/message 无段（20,685 vs 有段 20,880） |
| H8 section 矩阵洞/泄漏 | **部分 pass** | 6 root 有、5 support 无、下一轮生效、named child 有；teammate/workflow 未证 |
| H9 symlink / index 目录 / ~ / 空格 | **confirmed** | [BUG-084](../fixed_bugs/BUG-084-wiki-pointer-lexical-path-permission.md) |
| H10 选项读上限固定夹具 | **confirmed** | [BUG-085](../fixed_bugs/BUG-085-startup-options-read-limit-fixed-fixture.md) |
| H11 skill 正文 / tarball 路径 | **pass（部分）** | B2/B3 真加载；tarball 含模板+skill；安装 profile 六角色未逐项 |
| H12 模板拷贝路径 / 模板链接 | **confirmed** | [BUG-087](../fixed_bugs/BUG-087-wiki-template-copy-path-repo-only.md) + [BUG-088](../fixed_bugs/BUG-088-shipped-links-excludes-wiki-template.md) |
| H13 shipped-links 盲区 | **confirmed** | [BUG-088](../fixed_bugs/BUG-088-shipped-links-excludes-wiki-template.md) |
| H14 模型行为 vs 三档 | **pass（小样本）** | B1/B2/B3/B5/B6 PASS；B4 有一次先 grep 再报失效（观察） |
| H15 旧面回归 | **部分 pass** | test/typecheck/lint/dup/preset/client-load/zh golden/release PASS；en 检查 FAIL（BUG-080） |

### 本轮遗留（未证 / 下轮）

- H8 teammate / workflow 分支（named child 已跑并 PASS）。
- A2 长值/浮动/重开/窄宽截图；A3 原子写、home settings 边界、坏 JSON 的失败路径；A5 安装 profile 六角色 `skills/list`。
- **测试隔离缺陷**：B2 写入轮的 workspace 嵌在 `runtime/tmp` 下，模型能 grep 到探针脚本/结果；下轮把 fixture 移到 repo 外的临时根（或 `session` 工作区外）。
- **环境限制**：`workspace-write` bash 在嵌套沙箱下不可用；不据此判产品。

**本轮结论：** 两批新面主路径可用：section 对 6 角色/5 support 的注入矩阵、下一轮生效、冷恢复、reset、wiki 内写/外只读、invalid 不编造、skill 正文加载均 PASS；但「六面一致」在 workspace、派生 check、选项规模、en 检查、命令 i18n、模板安装路径上出了 10 个真缺陷。按卡内处置：全部开 BUG 卡，不改产品代码；遗留项留待 Round 2。

## 证据、判据与处置

- **证据落点**：卡内「执行记录」+ 必要的文件/截图；真实会话用 `tools/explore-evidence.mjs --session <id> --json-out ... --md-out ...`；真页面用 `runtime/harness-home/diagnosis/...`（或 `ui-scene-smoke --keep` 的 scene 回执）；文件面记路径 + 大小 + 哈希 + mtime；命令面记原文回执。runtime 产物不进 git，卡里点名路径与时间。
- **oracle 纪律**：先写期望（合同 / 归档验收原文 / 模板协议 / 内容文件），再看实现；**不拿实现当 oracle**，不因为 spec 绿就判 PASS。spec 只回答「测试有没有覆盖到」。
- **判定粒度**：每格 PASS / FAIL / 未证（缺入口 / 需 live / 环境不满足），未证必须写原因与 owner；不把「没跑到」折成 PASS。
- **处置**：
  - 真缺陷（材料性）→ `_backlog/bugs/` 卡：severity、复现步骤、红→绿证据、影响面、与哪个 oracle 冲突；不在本卡修。
  - 非材料性缺陷 → 记录 + 请示（是否当场修 / 开卡）；不静默改产品代码。
  - 合同 / 归档验收 / 文档漂移 → 观察 + 指 owner（`docs/contracts/profile.md`、归档卡/Note、locale 字典、模板 README），不当 BUG。
  - 测试资产缺口 → 记「资产缺口 + 建议的门 / 探针」；可在本卡范围内补**测试资产**，不碰产品代码。
- **不写「没有 bug」**：只写「已跑面未见」「未跑面保留」。单场 live 不写稳定。

## 预算与停止（建议，待批）

- **A 批**：0 模型；墙钟 ≤ 60 分钟；`release-smoke` 可占大头；不联网（除包管理/本地构建）；证据 ≤ 8 MiB；不改产品代码。
- **B 批（需用户批准）**：全局 90–120 分钟；parent prompt ≤ 12；真会话 ≤ 6；单 turn ≤ 300s；wiki 写入仅限 workspace 内测试 wiki，≤ 2 次；外部 wiki 只读校验（哈希/mtime）；不写 `company-workspace/` 真盘，不碰用户 home；证据 ≤ 8 MiB。
- **停止**：预算耗尽 → 停新 charter，保留现有证据并列出未跑面；发现越界写 / 密钥 / 真盘污染 → 立即停并报告；单个 charter 失败不阻塞其余；真缺陷先开卡再继续（不因一个 bug 停整轮，除非安全/预算）。

## 验收标准

> 本卡的「交付」是证据与判定，不是产品改动；每条都要有实跑记录或明确的未跑原因。

1. **A1–A5 全跑**，或逐项写「未跑 + 原因 + owner」；每张表每格有期望 vs 实测；真页面 zh / en 各有一组截图/文本；tarball 清单有关键行。
2. **H1–H15 全部判决**：confirmed / refuted / unverified（原因）；confirmed 的每条都有 BUG 卡或观察记录；refuted 的写清反证；不许留「没看」。
3. **B1–B8** 在批准预算内跑完，或逐项写未跑原因；每场有 session id、工具调用、turn 边界、oracle 对照；live 结论不写成稳定。
4. **所有 finding 已分诊**：BUG 卡 / 观察 + owner / 测试资产缺口；不写「没有 bug」；不改产品代码。
5. `pnpm verify` + `pnpm test` 绿（本卡只新增文档/测试资产）；证据落点可复读；卡与索引同步。
6. 收口时状态行写 `审查：agent｜用户｜跳过 — 理由`；按产出改 `去向`（预期 `none — 只产证据 / BUG 卡`，若产生 RFC/Note 则按实际改）。

## 关闭条件

- A1–A5 全跑，或逐项写「未跑 + 原因」；每格有期望 vs 实测；真页面、真挂载、真命令、tarball 各有证据。
- H1–H15 全部判决；B1–B8 在批准预算内跑完或逐项写未跑原因；所有 finding 已分诊。
- 不写「没有 bug」；未覆盖面保留并标 owner；单场结论不写成稳定。
- 证据落点、session id、命令与红/绿形态留在卡或研究/Note；`pnpm verify` + `pnpm test` 绿；审查记录写好后归档。

## 执行记录（跑后追加，不覆盖旧结论）

- 每轮写：日期 ｜ 批次（A1–A5 / B1–B8 / H 表）｜ 命令或 session id ｜ 期望 vs 实测 ｜ 证据坐标 ｜ 判定（PASS / FAIL / 未证）。
- 真缺陷链接放这里；未跑面逐条保留，不折成 PASS。
