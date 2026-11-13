# 2026-11-12 · Wiki 知识地图（M1）：模板 + 协议 skill + 指针校验 + 注入分档

状态：implemented（2026-11-12 落地；验证见下）

> 部分取代：模板链接门禁（`shipped-links` 不再整目录排除、按模板根验内部链接）与安装路径见
> [启动策略 + wiki 缺陷横扫 Note](./2026-11-12-startup-strategy-wiki-bug-sweep.md)。

上游 = 用户 2026-11-12 点名研究并要求落地（「wiki 可能不在 workspace 里面，agent 只读也可以」→「把它落地吧」）；
研究 = [wiki-knowledge-map 研究题](../../_backlog/research/wiki-knowledge-map/README.md)（AK 一手 / OKF 规范 / 搜索阶梯 / 载体盘点 / 只读边界实测）；
前置 = [项目启动策略 Note](2026-11-12-startup-settings.md)（`startup.json` 的 `wiki` 指针与注入段）；
卡 = [2026-11-12 Wiki 知识地图落地（M1）](../../_backlog/_archive/settled_issues/2026-11-12-wiki-knowledge-map-landing.md)。

## 问题

`content/` 与 workspace `kb/` 是「随包发布的只读产品内容」和「公司自身状态」两层，装不下团队真正要查的外部领域知识，
而且永远加不完。启动策略卡已经把「依赖哪份 wiki」的指针落地，但**指针指向的东西不存在**：没有目录形状、没有维护协议、
没有失效校验——模型拿到一个路径也不知道怎么用；路径腐化（改名/搬家/换机器）时还会被指向空气。

用户 2026-11-12 晚间点名核实的一件事决定了整个形状：**wiki 可以在 workspace 之外，而且 agent 照读不误**。
证据三档：① `sandbox-local` 的 bwrap profile 是「read-only host root + 可写 workspace bind」；
② `sandbox-policy` 两种模式的策略文本只约束「修改」（"cannot modify" / "may modify files under the session workspace"），
没有一个字限制读；③ 本机实测：`read` 外部文件成功、写 `~/.dsh/zz-probe` → `Operation not permitted`。
→ 「人维护、agent 只读」这个形状不需要任何额外机制，天然成立。

## 决定

1. **模板而非运行时**：`content/wiki-template/` 是一份**拷贝即用**的起点（`AGENTS.md` 协议 + `index.md` + `log.md` +
   示例页 + `sources/README.md`）。不做 wiki 引擎、不做数据库、不做索引服务——AK 在 ~100 来源规模实证 index + 文件工具足够。
2. **frontmatter 只强制 `type`**：OKF（Google Cloud Open Knowledge Format v0.2，官方自述「formalizes the LLM-wiki pattern」）
   的合规判据就是「唯一必需键 `type`」；`description` 推荐，`sources`/`verified`/`stale_after` 写成可选升级。
   多强制一个键就多一道 friction，而 wiki 的第一杀手是 friction。
3. **协议做成 skill 而非塞进手册**：`presets/_shared/wiki/skills/consulting-the-knowledge-map/SKILL.md`，
   六个角色 preset 各挂一行（`_shared/wiki/skills/`）。手册是常驻（32KB 预算、每轮占上下文），协议只在「要查 wiki」时加载。
4. **指针校验只做三件事**：目录存在 / 是目录 / 有 `index.md`。结果写进派生文件 `startup-options.json` 的 `wikiCheck`
   （浏览器只渲染，不查盘），面板与 `/company-settings show` 都**点名**失效原因。
5. **注入分三档**（`company:startup-settings` 的 wiki 句）：workspace 内 = 可写 + ingest 回写纪律；workspace 外 = 只读、
   不要尝试写入；失效 = 明说失效并让人先修，**不输出正常查页指引**（否则模型会去 read 空气再凭记忆编）。
6. **不收 URL**：用户拍板 v1 只收本地目录。URL 要过 fetch（DNS 守卫 + 网络依赖），不符合「零依赖 + 只读可靠源」。
7. **模板不进 `manifest.json`**：它不被角色加载，只是被拷走的东西；进清单就会把它当成常驻读取面，与用途相反。

## 输掉的方案

- **把 wiki 页做成 skill（一页一 skill）**：skill catalog 是扁平名单（`**/SKILL.md` 递归发现不支持），目录树会被压扁，
  catalog 还随页数线性膨胀——违背「index 要小」的初衷。
- **上向量/RAG**：DeepSeek 官方 API 无 embeddings 端点（文档 sitemap 全枚举核验）；本地模型是 ~GB 级 + 原生依赖；
  qmd 那类方案要 ~2GB 模型与原生编译链，而它的中文 BM25 只是「逐字加空格 + 短语」，并不比词级分词强。
- **让 host 在 boot 时按指针自动播种**：会写用户的外部目录，越权且不可预期；改成「拷模板」这个显式动作。
- **`/company-wiki init <dir>` 命令**：要处理越界、覆盖、幂等、回执，成本远超收益；`cp -R` 已经够。
- **wiki 当自由指针、永不判失效**（前置卡的原实现）：路径会腐化，模型被指向不存在的目录还被告知「先读 index」。
  本卡把校验补上，并让注入段在失效时改口径。
- **把模板放进 `content/manifest.json`**：模板是「拷出去的起点」，不是「随包阅读的内容」；进清单就把两件事混成一个。

## 后果

- 新增 `packages/company-pack/content/wiki-template/`（6 份：协议、索引、历史、示例页、sources 说明、上手 README）。
- 新增 `packages/company-pack/presets/_shared/wiki/skills/consulting-the-knowledge-map/SKILL.md`；六个角色 preset 各加一行
  `customSkillDirs`（`_shared/wiki/skills/`）——一处内容、全员可见。
- `src/lib/startup-settings.ts`：`StartupOptions` 增 `wikiCheck`（`value/ok/problem/location`），`startupRows` 对 wiki
  按检查结果判失效（检查落后于设置时不谎报）。
- `src/host/startup/startup-store.ts`：`checkWikiPointer` / `resolveWikiDir` / `wikiLocation`；`refreshStartupOptions` 连带重算 wiki 检查。
- `src/host/startup/startup-prompt.ts`：`wikiRule` 三档；`startupSettingsText(settings, wikiCheck)`。
- `src/host/commands/settings-command.ts`：`show` 增 wiki 行（可用/只读/失效 + 原因）；`set wiki` 落盘后即查、失效时回执告警。
- `src/client/startup/StrategyPanel.tsx`：wiki 行显示失效原因（缺目录/非目录/缺 index）与位置标签（可写/只读）；五条新文案 zh+en。
- `checks/gates/shipped-links.mjs`：扫描**包含** `wiki-template/`，内部链接按模板根判存在；指向模板外的链接
  不判存在（拷贝后的根未知），但仍禁指仓库。2026-11-12 的 bug sweep 收掉了「整目录排除」的旧做法。
- `checks/lanes/preset.entry.mjs`：共享 skill 根登记 `_shared/wiki/skills/`（不登记 → 「只看见自己的 skills」把正当共享报成泄漏）。
- `docs/contracts/profile.md` 与 `packages/company-pack/content/README.md`：补 wiki 指针语义、校验档位与模板说明。

## 归位

- **选择 vs 规则**：`startup.json` 只存「指向哪」；wiki 里写什么、怎么写，全在模板的 `AGENTS.md`（部署侧数据）。
- **一份事实**：模板只有一份（`content/wiki-template/`），协议只有一份（`_shared/wiki/skills/`）；没有往六个角色目录复制副本。
- **不发明**：协议内容直接来自 AK 的 ingest/query/lint 与查询五技术、OKF 的 frontmatter 最小集；载体全用 DSH 现成的
  （skill 按需加载、section 活读、fs 工具浏览、沙箱只读边界），零新增 npm 依赖。

## 验证

实测 2026-11-12（全部本轮跑过）：

- `pnpm typecheck`：绿（pack 两面 + tests/client/company/harness）。
- `pnpm test`：**233 files / 1723 tests passed**。新增 2 个 spec：
  `tests/content/wiki-template.spec.ts`（6 条：五件齐全 / 示例页 `type`+`description` / index 链接目标在盘 / log 有 ISO 日期 /
  协议含 index·log·ingest·query·lint / 无绝对 home 路径）、`tests/presets/wiki-skill.spec.ts`（4 条：frontmatter 形状 /
  body 五要素 / 六 preset 都挂共享根 / 角色目录下无副本）。另扩 `tests/lib/startup-settings.spec.ts`（wiki 三态）、
  `tests/host/startup/startup-store.spec.ts`（检查三档 + 位置 + refresh 落盘）、`tests/host/startup/startup-prompt.spec.ts`（A4 三档 + 失效三因）。
- `pnpm verify`：ALL PASS（含 `shipped-links`：content 73 份 + skill 27 份 + persona 11 份）。
- `source run/env.sh && node checks/lanes/preset.entry.mjs`：**ALL PASS（6 个角色 + 5 个非角色 preset 全部可挂载）**，
  含六角色 `只看见自己的 skills`。
- **红→绿 ①（门禁排除面）**：模板首次进 `shipped-links` → 8 条
  `链接指向仓库/穿出 workspace`（`../index.md`、`path.md` 示例行）；排除 `wiki-template/` 后
  `PASS shipped-links（content 73 份…）`。
- **红→绿 ②（保护转移到 spec）**：把 `index.md` 的 `(./concepts/example-concept.md)` 改成 `(./concepts/missing-page.md)`
  → `tests/content/wiki-template.spec.ts` 红（`index 指到示例页，且链接目标在盘上`）；还原即绿（6 passed）。
- **红→绿 ③（共享 skill 根）**：只挂 preset 未登记共享根 → `preset-smoke` 六条
  `只看见自己的 skills: 看见了非本角色的 skill：consulting-the-knowledge-map`；在 `sharedRoots` 登记后 ALL PASS。
- **红→绿 ④（内容英文棘轮）**：模板 README 里写了中文按钮名 → `content-english` 红
  （`仍有中文: wiki-template/README.md`）；改成英文后绿。
- **红→绿 ⑤（语义审抓获：读上限漂移）**：`wikiCheck` 进派生文件后 `startup-options.json` 从 13 行变 19 行，
  而浏览器一直按 `limit: 16`（行）读 → JSON 会被截断、`parseStartupOptions` 折成空集合、面板静默显示「没有选项」。
  修法 = 把两侧上限提成 `STARTUP_SETTINGS_READ_LIMIT` / `STARTUP_OPTIONS_READ_LIMIT` 常量（与 `serialize*` 同家），
  并加 spec 断言「最坏形状行数 ≤ 上限」——本轮 `pnpm test` 1723 条里含这两条护栏。
- **真会话 A5（外部只读）**：`DSH_HOME=runtime/harness-home pnpm dsh --profile headless "…"`：
  ① `/tmp` 外部 wiki：读 `index.md` → 钻 `concepts/alpha.md` → 报出标记 `ZEBRA-42`（读穿透成立；`/tmp` 属平台临时区，
  按策略可写，所以写拒绝那半另找非临时路径验）；② `<home>/ai_dev_context/_temp/`（workspace 外、非临时区；本机维护者路径，脱敏记）：
  读 `index.md` 成功，`printf x >> …/index.md` → 退出码 1、原文 `bash: …: Operation not permitted`，文件未变。
- **真页面**：本次 client 改动只加条件渲染（失效原因/位置标签），默认态（全自动）不变；金样 `ui-expected-freshness` 由
  `pnpm verify` 复核通过，未重刷。

## 剩余风险 / 未做

- **A2 的真实调用未跑**：skill 的**发现面**已证（`preset-smoke` 六角色 `skills/list` 都看得见、且只看得见自己的 = 挂载与隔离都对），
  **正文加载**走的是 vendor 既有机制（`skill({name})` 重读 body，仓内五个既有 skill 同款），本次没有单独起真会话调它。
- **默认态没有截图级证据**：面板新增标签只在「wiki 已设」时出现，本次未起真页面走一遍设值→看标签的流程；
  逻辑面由 spec 覆盖、门禁由 verify 覆盖，视觉面未验。
- **`wikiCheck` 的新鲜度**：它随 `refreshStartupOptions`（boot + 每次写设置）重算；运行中目录被搬走时，面板会短暂显示旧结论，
  直到下一次刷新。注入段每次 assembly 现查盘，所以**模型侧不会拿到过期结论**。
- **没有 lint 自动化**：协议写了 lint 清单，但 schedule 周期 lint 与 workflow 并行 ingest 是排除项，另行开卡。
- **FTS 索引未做**：页数上去后的关键词召回（L1）已有实测与阶梯，触发条件写在研究材料里。
- **模板首用仍要人拷**：没有 init 命令（有意），README 给了 `cp -R` 与三步上手。
