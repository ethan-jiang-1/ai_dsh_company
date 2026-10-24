# dsh-company-pack

唯一自写包（决策 D1：一个包；行多包少）。**owner 表**（每件东西是什么、谁消费——RFC pack-boundaries 2026-10-05 立）：

| 件 | 是什么 | 消费方向 | 出生 |
|---|---|---|---|
| `workspace/` | **出厂公司盘骨架**（手册 `AGENTS.md`、`templates/`、`kb/org.md`、五份 `CHARTER.md` + 起动件 `kb/owners.md`/`kb/motion-ledger.md` + 空目录）：角色跑起来读的全在这里——**随包分发**，否则第三方装完没手册没章程（2026-10-13 立；单源判据 = verify 的 `company-skeleton`） | 安装后落到使用者的公司盘（会话 cwd）；**基部起步**（CHARTER 历史纪要是扩张数据，出厂为空；升级只动没改过的文件） | D43 + RFC run-bundle-install-unit（2026-10-24） |
| `presets/<role>/` | persona + skills **声明**（改它 = 改角色；生效边界见 [docs/presets.md](../../docs/presets.md)） | loader 组合 → 角色会话 | R0–R2 |
| `src/` | **自写实现**两半：Host = `src/index.ts` 注册入口 + `src/host/`（Node-only 自举与培养注册/文件操作）+ `src/lib/`（共享读模型纯逻辑）；Client = `src/client/` 注册入口与浏览器面——具体布局唯一家 = [src/README](./src/README.md) | vendor runtime + `tests/company`（Host 源码直测）/ `tests/client`（Client 注册与视图） | R3+ |
| `lib/` | **generated 发布产物（read-only）**：`tsc -b packages/company-pack` → tsdown 两面产出；**改 `src/` ≠ 浏览器已重建**——dsh web 常驻面必须重跑构建（事实家 = [bootstrap](../../docs/guides/bootstrap.md)） | `npm pack` → profile 安装（`exports`：`.` → `lib/index.js`、`./client` → `lib/client.js`） | R5 |
| `cordis.patch.yml` | **bundle 装配行**：`agent-preset-registry` 替换出厂行；`dsh.bundle.patch` 为**数组** = registry 1 + 五角色预设行 + 委派子人格 `researcher` 一行（0.2.1） | profile 组合层 | R0–R2 |
| `package.json` | **发布/注入声明**：peerDependencies（**版本以此为准，此处不复述**——复述必漂）、`dsh.compatibility` 矩阵（`pack-compat` 门禁强制含当前 tag）、`files` 白名单、`dsh.client` 字段 | 包管理器 + loader | R0–R2 |

⚠ `lib/` 是生成产物：`git diff` 里它先变 = 你改了构建或忘了它由 `src/` 生成——永远改 `src/`，构建产 `lib/`（物理拆分 host/domain 的重启条件 = implemented/pack-boundaries（已删，历史在 git） 重启条件节）。

发布前清单已全部落地（2026-09-25 随升 pin ①）：cordis 在 peerDependencies、`dsh.compatibility`
版本矩阵（历史版本 + 当前钉住，见 `package.json`；`pack-compat` 门禁强制含当前 tag）、
`npm pack` → 干净 profile → `dsh plugin add` 真实安装冒烟 =
release-smoke ALL PASS（[docs/release.md](../../docs/release.md)）。pack 保持 `private: true`——
真实 npm 发布等第二个消费者出现再定。

**装完第一步（自动，2026-10-24 起 = 一个 run bundle）**：插件第一次跑起来会把包内 `workspace/` 骨架落到
`<DSH_HOME>/company-workspace`（**只补缺、绝不覆盖**；见 host 半 `src/host/bootstrap.ts`），并在
`<DSH_HOME>/bundle.json` 写 bundle 身份（id / createdAt / pack 版本 / 基部逐文件 sha256）。**一次安装 = 一个
DSH home = 一个 bundle**；装完即有盘可连，填 `kb/owners.md` 就能开工。第二个 CEO **新开一个 `DSH_HOME`**，
不要复用（sessions / 凭据 / 方法层 / workspace 登记都在 home 里，复用即共享历史）。

- 基部升级（同一次 apply）：目标缺失 ⇒ 补建；用户改过（哈希 ≠ 上次基部哈希）⇒ 保留并记日志；没改过 ⇒ 替换。
  扩张面（journal / 交付物 / 台账 / 方法层 / 会话）一个字节不动。manifest 只创建、绝不覆盖。
- 落点用 `DSH_COMPANY_HOME` 换、`DSH_COMPANY_BOOTSTRAP=off` 只关“复制骨架”（**自管盘的部署**这么用；
  本仓 `run/env.sh` 就是关的——dev 盘在 `company-workspace/`，制度件是指回本目录的符号链接，
  由 `pnpm bundle:init` 建；bundle.json 仍会写）。

## 已知限制（随行为变更同 diff 更新；2026-09-28 立，借 FAQ 04 package README tier）

- **侧栏角色色调只借平台令牌**（2026-10-13）：CEO 用 adaptive 的 `--dsw-alias-*` 品牌对（浅/深主题自动反转），其余四色用 **static 色相**（blue/green/amber/red，固定值、两主题同观感）+ 按底色选的黑/白字（对比度实测见探针 G6）——**不是**上游策展的分类色板（那份仍缺，见角色身份 UX 提案开放问题 2），换主题观感不一致处即此债。
- **侧栏角色标记受 16px 座位约束**（2026-10-13）：行首座位是**可共存的 list 格**（同格还有计划任务时钟，16px 跨度），故标记按 12px 设计、单字母（C/F/O/E/S）。与时钟同格时两者合计 28px > 座位 16px，靠"座位居中溢出 + 标题前 4px 间隙"恰好不撞标题盒（几何判据 = [sidebar-role-mark-probe](../../probes/browser-visual/sidebar-role-mark-probe.mjs)）；**再加第三个同格占用者、或把标记改宽，这条就破**。
- 机制与出厂行替换已对钉版 `dsh-v0.2.1-rc.2` 验证（2026-09-30 升 pin + 插件收割：pack-compat / release-smoke / 全套门禁；本仓嵌套工作区 vendor 自建偏离 = D27）。
- 委派子会话的签字审批到不了人（子会话审批面宿主侧受限）——人机审批实际是 Lead 专属（上游 seam 候选，见[归档搁置池](../../_backlog/_archive/legacy/suspended.md)）。
- 浮窗 raise 置顶依赖 CSS 垫片（vendor rc.2 缺陷；上游修复后撤垫片）。
- 依赖图画布按栏宽等比缩放（`transform: scale()`，fitScale 下限 0.75；**不用 CSS 宽度缩放**——Safari 里 foreignObject 文字不跟缩，会堆向左上角）；更宽的图（约 ≥5 个并行根任务）缩到下限后横向滚动。
- **依赖图串行长链高度可超单屏**（2026-10-19；2026-10-20 真样本复看）：`fitScale` 只缩宽、不缩高；21 节点**串行链**合成样本高 2366px，窄 pane 自带纵向滚动（用户接受）。真 21 节点会话是宽图（1716×321），390 窄栏只横向滚动、无纵向双滚动，见[看板卡](../../_backlog/_archive/settled_issues/2026-10-19-board-dag-ux-deep-dive.md)。
- **成品目录读生成索引**（2026-10-19；2026-10-20 补 present/自动重建）：`kb/deliverables-index.json` 由 `tools/deliverables-index.mjs` 生成（`present` 状态取自 `deliverables-check --json`；收敛后自动重建），面板只读、不实时。
- 浮窗几何记忆（位置/大小按页签 contentId 存 localStorage）按 **origin** 隔离：同一次服务运行 + 页面刷新有效；换端口重启即新 origin、记忆清零（vendor 侧栏布局持久化同此边界）。
- 成员会话常驻注入基线 = 手册字节数（**以 `handbook-budget` 门禁读数为准，此处不复述易腐数字**）：preset `agent-instructions.maxBytes` 钉 32768 且 **verify `handbook-budget` 门禁强制"手册字节 + 1024B ≤ maxBytes"**（超限 = agent-instructions **静默截断**手册尾部——2026-10-02 曾实测活 bug：预算 16384 落地时手册仅 1.2KB，手册长过预算后"工作纪律"节从未注入、行数栅栏与 overlay 层核对都没抓到；负例即该门禁出生现场）。
- **上网能力（`web_search` / `web_fetch`）必须随每个 preset 声明**：web-app bundle 把 host 上的 `tool-web` 行 `disabled: true`，改为按 agent preset 组合（vendor base 注释原文）——所以它**不是**全局继承来的；漏声明时角色与它 spawn 的 child 都静默无联网。子会话（`subagent` / team teammate）**继承 Lead 的组合**（`composeFrom`；roles-isolation §2/§4），故 Lead 有即可，不必另配。
- **one-shot 委托 child 的目录里看得见 Team 工具但调不通**（上游已登记限制，vendor tool-agent-team README "One-shot child tool visibility"；2026-10-02 真跑实证：child 目录 41 工具含全部六个 Team 工具，调用在身份确认后被拒）。防线 = CEO preset 两份委托 persona 各一句「别碰 team 工具，并行调研只用 subagent」+ `delegation-smoke --delegate` 的 [3] 守卫（边界变了就红）。
- **搜索成本 = 一次完整模型回合**：DeepSeek 无独立检索端点，每次 `web_search` 都按一次 Messages 调用计延迟与 token（故 `searchTimeoutMs` 设 60s）；凭据复用 `DEEPSEEK_API_KEY`，缺失即 fail-loud 结构化报错、不静默降级。`web_fetch` 为匿名抓取，只接受公开 HTTP(S) 目标。
