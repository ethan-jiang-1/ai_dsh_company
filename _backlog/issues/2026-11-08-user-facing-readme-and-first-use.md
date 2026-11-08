---
status: 推敲中
opened: 2026-11-08
---

# 推敲：README 与安装手册改为使用者面向，补「第一次经营一家公司」，开发面归位

> 立卡：2026-11-08 ｜ 状态：推敲中 ｜ 类型：Task ｜ 毕业：未定 ｜ 可关闭：否
>
> **结论/去向**：未定。倾向「做」；落点拟 `note` — `notes/implemented/`（文件名待定）。

**问题与期望结果：** 2026-11-08 用户拿出一张另一个项目的已结卡（`ai_dsh_deep_research/_backlog/_archived/settled_issues/2026-11-07-user-facing-readme-and-install-guide.md`，机器本地路径，刻意不链接），问本仓有没有同类要求。**有，但病不一样**：那边是「用户手册被参考内容淹没」，这边是**缺用户教程**——产品真正的用法只住在维护者的 demo 合同里，而读者最先看到的两份文档（根 README 与随 tarball 的安装手册）都不回答「装好之后第一次怎么用」。

期望结果：一个**已经在用 DSH、没读过本仓任何文档**的人——

- 只看根 README，五分钟回答七问：①这是什么 ②能给我什么 ③装前要什么 ④第一条命令 ⑤第一次怎么用 ⑥东西在哪 ⑦坏了去哪；
- 只看《安装手册》，能从「装好」走到「第一次开成一场经营会」，并知道交付物落在哪；
- 开发者与 Agent 的入口不消失，但不占首屏。

**当前情况（2026-11-08 实测）：**

1. **根 README 87 行，预算 90（余 3 行，顶格）**。前 20 行以交付形态与 profile 语义为主（bundle / 六个角色 preset / named profile / 公司状态）；维护者 dev 12 行（L69–80，≈14%），数据布局节 11 行（L57–67）与手册 §四重复；无截图、无「第一次怎么用」、无「坏了去哪」。入口链在 L85–87。
2. **《安装手册》229 行**，由 [install-manual.mjs](../../tools/lib/install-manual.mjs) 生成（[dist-manual](../../checks/gates/dist-manual.mjs) 强制「手册 == 当前模板渲染」+ 必含短语表）。§零前置、§一 GUI 安装已可照做；但 §二「第一次启动」只讲 workspace 与首启写盘（「首屏即可开工」一句带过），§三「验证」先给 `--dump-config | grep -c` 机器核对；**全文没有「怎么用这家公司」**，也**没有「要不要模型凭据」**（凭据只在 §四/§七的表里出现）。§四数据布局是平面视角，不是「我的报告在哪」。
3. **产品的「怎么用」只在 [docs/demo.md](../../docs/demo.md)**（236 行维护者演示合同：动议 → 分镜 → 观测点，含 `node checks/audit/...` 仓内命令）。它不随包分发，也不是用户教程。
4. **三处安装命令副本**（README L29–35、[pack README](../../packages/company-pack/README.md) Install、手册 §一）。2026-11-02 归档卡已拍板 owner 口径——「手册 = 收件人唯一安装路径；README/pack README = 首屏 + 指针」（见 [harness-release-alignment](../_archive/settled_issues/2026-11-02-harness-release-alignment.md) 噪声退休表）——**口径定了，没落实**。
5. **前两轮修的不是这件事**：[release-and-docs](../_archive/settled_issues/2026-11-01-release-and-docs.md) 修事实（旧形状、sha、门禁），[harness-release-alignment](../_archive/settled_issues/2026-11-02-harness-release-alignment.md) G8 修「收件人读到内部流程引用」。**受众与首次使用没有被处理过**。
6. **分发事实**：`market-index.staged.json` 明写 0.9.0「尚未发布到 npm registry」（2026-11-05）；`_dist/*.tgz` 是 gitignored。今天一个仓库外读者**没有可执行的安装入口**——README 的「输入包名」只在发布后成立。
7. **机械约束**：`doc-budget`（README 90，反向棘轮 ≥72）、`dist-manual`（模板同源 + 必含短语）、`dev-product-parity`（禁旧词）、`md-links` / `command-refs` / `nav-count-claims`（禁「N 个页签」）/ `base-clean`。

**冷读探针（2026-11-08，两次单读者，读者均为有 DSH 背景的模型；每次只给被读文档全文）：README 5.0 / 7，安装手册 5.0 / 7。**
两份文档逐问同形：①能答（手册第一段把 `preset`/`host 行` 堆在一起，读者仍答对了「bundle 装进 named profile」——**术语不是这次的主因**）②答一半 ③答一半（README 缺 DSH 版本窗口与 token 来源；手册有版本窗口，但**全文没写要不要模型凭据**）④能答（两份都答对）⑤答一半（README 停在 workspace picker；手册只有「首屏即可开工」一句）⑥能答 ⑦答一半（手册有排障面，但**没有支持渠道**；README 只指向安装类文档）。
两次自报「仍不知道的三件事」几乎重合：**六个角色分别是谁、第一次该说什么/产出什么**；**是否需要模型凭据、怎么配**；**出问题找谁**。
**读法**：单读者、模型比真人宽容（识得 DSH 词），不是用户验收；但两份文档在同一处失分，说明这不是 README 的排版问题，而是**产品价值、第一次使用、支持面**三块内容没写。

**诊断（结构面，非冷读）：**

| 面 | 现在回答谁的问题 | 处置方向 |
|---|---|---|
| README L3–20 | 维护者：交付形态、profile 语义、home 策略 | 压成「你会得到什么」+ 一句交付形态 |
| README L22–40 | 安装者：GUI/CLI 两条路径 + caveat | 只留 happy path 三步 + 装好的可见标志；分支进手册 |
| README L42–55 | 排障者：workspace 解析优先级、token 门 | 保留一句「第一次怎么选 workspace」，其余进手册 |
| README L57–67 | 维护者：三平面所有权 | 删表，留一行「东西在 `.dsh-company/`」，全表归手册 |
| README L69–80 | 维护者 dev | 回 [bootstrap](../../docs/guides/bootstrap.md)（已有同内容），README 留一行 |
| 手册 §一–§三 | 安装者 | GUI 三步保留；§二/§三 合并为「装好的标志」+「第一次用」；机器核对进附录 |
| 手册 §四–§八 | 生命周期参考 | 保留，标题改「你的东西在哪」 |
| 两份文档的凭据 / 支持 | 使用者：要不要 key、坏了找谁 | 各加一行：模型凭据由 DSH 管理（缺了角色会报什么）；出问题去 issue 或找发布方 |

## 借用与适配（不照抄）

| 源卡做法 | 本仓是否借 | 适配与理由 |
|---|---|---|
| 七问冷读 + 首屏术语禁令 | 借 | 同是 DSH 用户；但 DSH 平台词（profile / workspace / plugin / bundle）放行，只禁**本仓内部词**（preset / persona / harness home / host 行 / D 号 / 包内路径），首次出现同句给一句人话 |
| README 产品页，开发面另劈一个 MD | **改** | 不新建 CONTRIBUTING：开发面回 [bootstrap](../../docs/guides/bootstrap.md)（已有「维护者 dev」形状表与完整配方）+ [AGENTS.md](../../AGENTS.md)（Agent 入口）。再开一个 = 第三个开发入口，违反一处事实一个家 |
| 手册 = 收件人唯一完整路径 | 借 | 手册是生成物：改模板再 `node tools/export-dist.mjs`，**禁手改**；`dist-manual` 的必含短语表同 diff |
| 契约测试：README 命令 ⊆ 手册命令 | 借 | 新增 `readme-manual-commands` 门（`checks/gates/` 下，先红后绿）；现有 [command-refs](../../checks/gates/command-refs.mjs) 只查 `pnpm`/`node`，不查 `dsh` 命令 |
| 2 张截图 | 借（可选） | 首屏 + Plugins 页安装证据；本仓有 `cdp-probe` 同款抓图机器，能从真实例取、不带 token |
| 「第一次研究」6 步 | **升级** | 本仓缺的不是顺序，是内容：要写「第一次经营一家公司」（选 workspace → 对 CEO 说一句动议 → 澄清 → 任务板/名册 → 成员会话 → 交付物） |
| pack README 二期 | 借 | 本轮只收安装副本，保留 npm 页安装块；不改 Data/Backup/Uninstall 结构 |
| 预算 60→90 提额 | **改** | 本仓 doc-budget 是棘轮、README 已 87/90：先搬（dev 段 → bootstrap；数据表 → 手册）再写；提额是 [docs/AGENTS](../../docs/AGENTS.md) 的第③步且要 Note 论证 |

## 方案与取舍

### 读者 → 页面 → 回答（单一 owner）

| 读者 | 页面 | 回答 |
|---|---|---|
| 使用者（第一次） | 根 README | 这是什么、值不值得装、怎么装、第一次怎么用 |
| 使用者（边界情况） | 安装手册（随 tarball 分发） | 前置、完整路径、第一次经营、升级、备份、卸载、排障 |
| 开发者 | [bootstrap](../../docs/guides/bootstrap.md) | 环境怎么立、维护者 dev 与真插件安装的差别 |
| Agent | [AGENTS.md](../../AGENTS.md) | 入口链、纪律、命令表 |
| 想懂机制的人 | [docs/index](../../docs/index.md) | 设计、合同、决策台账 |

### 根 README 目标结构（≤90 行，骨架不是定稿文案）

```text
# 梦之队（ai_dsh_company）
一句话（结果）+ 一句话（装在 DSH 里、产物写进你的项目）
![首屏](docs/assets/readme-first-screen.png)        ← 可选

## 你会得到什么
4 条结果 bullet（六角色分工 / 一场会议式的经营判断 / MRD→PRD 产品定义 / 产物与状态都在项目里）

## 5 分钟装好
需要：DSH（版本窗口）· 一个项目目录 · Desktop 自带 Node/pnpm，CLI 需 pnpm
1) Plugins 页 Add plugin（包名，或 tarball 绝对路径）
2) 按提示重启 profile
3) 用同一个入口启动
装好的标志：Plugins 页 dsh-company-pack 已启用；侧栏品牌「梦之队」；首屏 CEO 会话与公司视图

## 第一次经营一家公司
1..5（选 workspace → 对 CEO 说一句动议 → CEO 澄清并建任务板 → 看名册/成员会话 → 收交付物）

## 产物在哪
.dsh-company/ 一行 + deliverables / kb / logs 一句

## 这不是什么（3 行）
不是独立 App；不是自动跑的公司；不会写你的项目根

## 常见问题（3–4 行）
要模型 key 吗 / 支持哪些平台 / 卸载会删数据吗 / 升级怎么做

## 更多
完整安装与使用手册 · 发布合同（release） · 开发者（bootstrap） · Agent（AGENTS） · License
```

### 手册目标结构（`tools/lib/install-manual.mjs`）

```text
表头元数据（保留六行，不占主路径）
一、它是什么（结果导向 + 你会得到什么；「不是独立 App，是 DSH 的插件」）
二、开始之前（DSH 版本怎么查 / Node / pnpm / 凭据 / 平台）
三、安装（唯一 happy path：Plugins 页三步 + 装好的三个可见标志 + 已有 profile 警告）
四、第一次经营一家公司（选 workspace → 对 CEO 说 → 澄清 → 任务板/名册 → 成员会话 → 交付物；每步给可见结果）
五、你的东西在哪（现 §四平面表保留）
六、升级  七、备份与迁移  八、卸载  九、故障排查（现 §八 + 常见问题合并）
附录 A 其他安装入口（CLI / 市场 / 浏览器两包；保留「仅 `dsh web`」「三个成功」短语）
附录 B 机器核对（--dump-config / sha256 / stderr）
```

原则：主路径只留一条；「装好的标志」优先用界面可见变化；机器核对降附录。

### 开发面去向

| 现 README 内容 | 去向 |
|---|---|
| 「维护者 dev」4 条命令 | [bootstrap](../../docs/guides/bootstrap.md)（已有同内容）+ README 一行 |
| 数据平面表 | 手册 §五 + README 一行 |
| 「分发」与「入口」链接块 | README「更多」收成 4 条（手册 / 发布 / 开发 / Agent） |

### 输掉的方案

- **只改 README 文案**：首屏好看了，装完还是不会用；最贵的缺口（第一次使用）没动。
- **新建 `docs/` 下的 user-guide 让 README 指过去**：多一跳；且它不进 tarball/手册，收件人拿不到。
- **README 只做导航（现状加强版）**：GitHub 首屏仍是内部工程。
- **同轮全站双语/英文**：没有英文读者证据，维护翻倍。
- **把 demo.md 改造成用户教程**：demo 是演示合同（有仓内命令、验收判据、业务动议原文），改造会同时污染两边的 owner。

## 范围与排除项

**做：** 根 README 重写；手册模板重排 + 新增「第一次经营一家公司」；两份文档补凭据与支持口径；开发面回 bootstrap；README/pack README 安装副本收束；`readme-manual-commands` 门（先红后绿）；可选 2 张截图。

**排除：** 不改产品行为/UI；不动 `docs/` 其他合同（除 README 指针与 index 如有新增——预计不新增）；不新建 CONTRIBUTING；不做 npm publish / GitHub Release（分发另卡）；不改 [demo.md](../../docs/demo.md) 剧本；不做双语；不手改 `_dist`；不改 pack README 的 Data/Backup/Uninstall 结构；不升 vendor pin。

## 未决问题（需要用户拍板）

| # | 问题 | 推荐 | 影响面 |
|---|---|---|---|
| 1 | 范围：A（README + 手册 + 开发面 + 契约门）全做，还是先做 README + 手册最小版？ | 全做 | 全做约 1 轮；最小版会留下「命令副本仍三处」 |
| 2 | 截图：2 张真图（起实例抓，含 Plugins 页证据）还是本轮不配图？ | 2 张 | 需一次真启动 + 抓图；不做则首屏纯文字 |
| 3 | 分发与支持口径：0.9.0 未发布——README 主路径写「未发布期向发布方索取 tarball」，还是先发布再改 README？「坏了找谁」写仓库 issue 还是发布方？ | 前者 + 仓库 issue | 真实 publish 仍是人工 handoff（另卡）；issue 入口 = 仓库公开面 |
| 4 | pack README：本轮只收安装副本，还是同轮做完整产品页？ | 只收副本 | 完整改会动 160 行预算与 npm 页结构 |
| 5 | 预算：搬完仍超 90 时，允许按 docs/AGENTS 第③步在 Note 论证后提额（建议 ≤110）吗？ | 先压到 ≤90；实在不行再提 | 提额会改 `DOC_LINE_BUDGETS` 并需 Note |

## 候选验收标准（拍板后改名 `## 验收标准` 并翻 `待落地`）

1. **冷读探针**：README 与手册各做一次，只给被读文档；七问全对（本卡基线 = 两份各 5.0/7）。问答记录留档；仍有缺口必须写明「出范围」。
2. **首屏术语**：README 前 25 行正文（代码块除外）不出现本仓内部词（preset / persona / harness home / host 行 / D 号 / 包内路径）；`bundle`、`profile` 若出现，必须同句有 DSH 人话。
3. **命令可跑**：README 安装块在干净 home 可逐条执行（复用 `company-entry-smoke` / `release-smoke` 序列或新增 doc-command 重放）；「已有 profile 不要重复第一步」的破坏性警告紧邻命令。
4. **装好的标志**：README 与手册给同一组用户可见标志（Plugins 页卡片、侧栏品牌、首屏 CEO 会话/公司视图）；`--dump-config` 与 sha256 只出现在手册附录。
5. **第一次使用**：手册新增节 1..N，一步一动作、每步有可见结果，终点 = 交付物出现在 `<workspace>/.dsh-company/deliverables/`；在真启动实例上从头走查一遍并记录「哪一步卡了」。
6. **凭据与支持**：两份文档说清「要不要模型凭据 / 在哪配 / 缺了会看到什么」与「去哪问」（仓库 issue 或发布方）；不把维护者的 `pnpm orient` 凭据自检抄成用户步骤。
7. **开发面归位**：README 开发者内容 ≤1 行；bootstrap 有完整配方；AGENTS 入口链未被打散。
8. **一致性**：README 代码块里的 `dsh` 命令逐字出现在手册（README ⊆ 手册）；新门先红后绿；`dist-manual` / `dev-product-parity` / `md-links` / `command-refs` / `nav-count-claims` 绿；`_dist` 由 `node tools/export-dist.mjs` 重导、不手改。
9. **预算**：README ≤90（若按第③步提额，Note 里论证并改 `checks/gates/doc-budget.mjs`）；手册表头版本/sha 与重导一致；`pnpm release --check` 不因本次改动变红。
10. **截图（若做）**：2 张来自真实产品、无 token/密钥、alt 文本在场、放 `docs/assets/*.png`。

## 已知风险

- **三处命令副本继续漂** → 契约门对账；手册 = 唯一完整路径，README/pack README 只留最短。
- **生成物**：模板改了不重导 → `dist-manual` 模板同源检查红（预期）；重导改 sha/日期，必须同 diff。
- **预算反弹**：搬完仍超就提额 = 反序；先压、先搬。
- **截图腐烂**：只 2 张；UI 大改时重拍（写进收尾清单，不追求每次同步）。
- **教程与 demo 重复**：demo = 维护者演示合同（含仓内命令与验收判据），手册 = 用户教程；分工写进两处开头，互不抄。
- **分发事实**：未发布期若把安装块写成「输入包名即可」，读者照做会失败 → 必须写明索取 tarball 的路径。
- **凭据口径**：把维护者面（`env | grep DEEPSEEK` 为空不代表没配、`pnpm orient` 的凭据行）抄进用户文档 = 误导；用户面只写 DSH 的凭据设置与「缺凭据时角色会报什么」。
- **冷读会暴露产品问题**（如首屏没有 CEO 会话、角色入口难找）→ 记为产品发现，不在 README 里圆场。

## 关闭条件

用户对未决 1–5 给答复（或「全按推荐」）→ 本卡翻 `待落地`（`毕业：做` + `去向 note` + 候选验收改名 `## 验收标准`）→ 实施、真证据、Note 与归档同变更。**本卡当前不授予实施权限。**
