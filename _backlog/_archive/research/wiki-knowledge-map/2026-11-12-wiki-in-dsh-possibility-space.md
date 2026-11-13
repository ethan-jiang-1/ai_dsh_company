---
topic: wiki-knowledge-map
intent: 综合收口——wiki 落入 DSH 的可能性空间（三轴坐标系 + 四种端到端装配 + 与 startup-settings 合流 + 待用户拍板的决策清单），供定性判断用，不替用户做决定
---

# Wiki 落入 DSH：可能性空间与装配选择

> 研究日期 = 2026-11-12；执行 = 父会话综合（材料来自本目录六份 + 姊妹题 startup-settings）。
> 本件是**收口件**：不复述证据（指向各材料），只把「有多少种落法、各自长什么样、代价多少、什么时候选哪个」摆清楚。
> 三档标注沿用：**【事实】**（有材料里的代码/一手来源支撑）/ **【推论】** / **【建议】**。

## 0. 一句话结论

**【推论】** wiki 落进 DSH 的可能性空间不是「一条路」，而是 **三条正交轴的组合**：**内容层格式**（AK 三层 ↔ OKF 规范）× **检索层**（L0 index/fs ↔ L1 自建 FTS ↔ L2 外部搜索服务）× **载体层**（纯文件 ↔ 手册指针 ↔ skill 协议 ↔ schedule/workflow 自动化 ↔ client 面板）。**每种组合都零新增 npm 依赖**——因为三轴上的每个选项都有零依赖实现。**【建议】** 从这个空间里只需先选两点：**内容层按 OKF 最小集长**（只为将来互通，成本≈0）、**检索层从 L0 起步**（L1 代码先不写）；载体层按需逐档加。**真正的决策不在技术，而在三个产品问题**：wiki 归谁写（人/agent/混合）、存在哪（workspace/外部/公司级）、怎么算「有用」（见 §5）。

## 1. 三条轴：可能性空间的坐标

### 轴 1 · 内容层格式：AK 三层 ↔ OKF 规范

**【事实】** AK gist 给三层（`raw/` 不可变 + `wiki/` LLM 维护 + schema 维护协议）+ index.md/log.md（[主材料](2026-11-12-wiki-knowledge-map.md) §1.1）；OKF v0.2 给文件级规范：唯一必需键 `type`、`description` 推荐、trust 族（`sources`/`generated`/`verified`/`status`/`stale_after`）全 opt-in、每层目录 index.md、log.md ISO 日期、断链容忍（[OKF 材料](2026-11-12-okf-and-llm-knowledge-standards.md) §1.4）。**【事实】** Google 官方明说 OKF 是「把 LLM-wiki pattern 规范化」（v0.1 博客原句："an open specification that formalizes the LLM-wiki pattern into a portable, interoperable format"），并逐字引用 Karpathy。

**【推论】两者是同一件事的两层**：AK 管「怎么运转」（ingest/query/lint、谁维护、为什么成立），OKF 管「文件长什么样」。**没有互斥关系**——最省的做法是 AK 的目录结构 + OKF 的 frontmatter 最小集（只有 `type` 是硬要求，其余渐进补）。

**【建议】** 起步只写 `type` + `description` 两键（合规成本 ≈ 0）；`verified`/`stale_after` 等信任字段等「页数多了、需要筛可信度」时再补——OKF 的合规判据明确允许不写任何可选键（§1.4.8）。

### 轴 2 · 检索层：L0 → L1 → L2

**【事实】** 三级的实证与代价（[搜索生态](2026-11-12-oss-search-landscape.md) §7、[探针](2026-11-12-selfbuilt-fts-probe.md)、[家底](2026-11-12-dsh-retrieval-inventory.md) §1）：

| 级 | 实现 | 新依赖 | 实测/证据 |
|---|---|---|---|
| **L0** | index.md 先行 + grep/glob/read | **0**（ripgrep 15.0.0 随 DSH 分发，`@vscode/ripgrep`） | AK 实证 ~100 来源够用；DSH 默认挂载 |
| **L1** | node:sqlite FTS5 + `Intl.Segmenter('zh')` 预分词 | **0**（Node 22 内置，带 ExperimentalWarning） | 本仓 404 文件真实中文语料：建索引 1.4s、查询 0.05–1.7ms；1 万页压测同量级 |
| **L1'** | 纯 JS 库（FlexSearch 内置 CJK / MiniSearch 插分词 / Orama / lunr+zh） | 1 个 npm 包（零运行时依赖） | FlexSearch README 内置 CJK encoder；lunr-zh 明用 Segmenter+bigram |
| **L2** | qmd CLI（BM25+向量+LLM 重排）或 DeepWiki MCP | ~2GB 模型 + 原生编译链（qmd）/ 远端服务（DeepWiki） | qmd MIT、31k stars、活跃；CJK 只是逐字+短语，不比词级分词强 |

**【事实·关键负证据】** ① 裸 FTS5 unicode61 对中文子词查询零命中；② trigram tokenizer 对 2 字中文词零命中（实验 A/C，[搜索生态](2026-11-12-oss-search-landscape.md) §1.2）；③ **DeepSeek 官方 API 没有 embeddings 端点**（文档 sitemap 全枚举核验）——向量路线的 embedding 来源是硬约束。

**【推论】** L0 与 L1 不是替代关系：index 管**语义路由**（该看哪页），FTS 管**关键词召回**（哪页出现过这词），LLM 管**判断与综合**。三层各司其职，这正是「靠语言模型能力更好地搜索」的轻依赖实现。**【建议】** 起步 L0；页数 > ~200 或「index 里找不到」成常态再上 L1（一个 ~100 行脚本）；L2 只在「同义改写召回」成为真实痛点时才考虑。

### 轴 3 · 载体层：五档由简到繁

**【事实】** 每档都有仓内先例与已挂载面（[载体材料](2026-11-12-dsh-integration-carriers.md) §8.1）：

| 档 | 载体 | 承载什么 | 成本 |
|---|---|---|---|
| 0 | **纯文件** | wiki 本体（agent 用 fs 工具读） | 0（不碰 DSH 任何机制） |
| 1 | **手册正文/`systemPrompt.section`** | 指针 + 「index 先行」纪律 | ≈0（写进现有 `content/AGENTS.md`） |
| 2 | **skill（catalog→body）** | ingest/query/lint 协议 | 1 份 SKILL.md |
| 3 | **kb seed + schedule** | 播种骨架 + 周期 lint | 1 条 seed（`seeds` 数组，17 条现状）+ 1 条 schedule 任务（6 preset 已挂 `tool-schedule`） |
| 4 | **workflow + client UI** | 并行 ingest 编译 + 人浏览面板 | workflow 脚本（仅 vp-eng 挂）+ 页签组件（双语字典） |

**【事实】** `conversation.view` 是 **list** 槽（`ui-conversation/.../slots.ts` L260），wiki 面板可与培养主视图（order 20）并存不抢槽；`kb-setup/seed.json` 顶层 = `version`/`note`/`seeds`，17 条。**【事实·不适配】** hooks 包是外部 hooks 协议兼容层（`hook-protocol` 是构建残壳）；inspect provider 是运行时调试面；deliverables/goal 语义不对（[载体材料](2026-11-12-dsh-integration-carriers.md) §3/§5/§6）。

## 2. 四种端到端装配

> 装配 = 三轴各取一档的组合。以下四种是**代价/收益曲线上的四个点**，不是全部组合；中间的组合按需插值。

### M0 · 纯文档 wiki（只碰文件系统）

内容层 = AK 三层 + OKF 最小 frontmatter；检索 = L0（人/agent 都用 grep）；载体 = 第 0 档。
**新代码**：0。**新依赖**：0。**DSH 改动**：0。
**能做的**：agent 用 read/grep/glob 浏览检索；人用 Obsidian/Quartz 看。
**不能做的**：角色不知道 wiki 存在（没有指针）、没有 ingest/lint 纪律、不防腐。
**【推论】** 适合「先验证 wiki 有没有用」——但它缺一个关键东西：**agent 不会主动去查**。所以实际上至少要到 M1。

### M1 · 最小挂载（推荐起步）★

M0 + **指针**（手册正文一段或新 section：「公司知识地图在 `<path>/index.md`，查外部知识先读 index 再钻页」）+ **协议 skill**（一份 SKILL.md：ingest 三操作 / query 协议五技术 / lint 清单）。
**新代码**：≈0（指针几行文字；skill 是纯 markdown）。**新依赖**：0。
**覆盖**：发现（指针）+ 浏览（fs）+ 检索（L0）+ 维护纪律（skill 按需加载）。
**缺**：没有自动化（lint 靠人记）、没有播种（每 workspace 手建）。
**【推论】** 这是**性价比拐点**：从 0 到「wiki 真的被用起来」，成本几乎是几段文字。

### M2 · 标准挂载（自动化 + 播种）

M1 + **kb seed 一条**（首启播种 wiki 骨架，only-fill 不覆盖）+ **schedule 周期 lint**（一条 weekly 任务，prompt = 按 lint 清单检查并写 log）+ 可选 **client 右栏页签**（浏览）。
**新代码**：seed 1 条（数据）+ 任务 1 条（数据）+ 页签组件（可选，须走 company-ui-change-definition：zh+en 字典）。
**覆盖**：+ 自动防腐 + 自动播种 + 可选人浏览。
**风险**：schedule 任务**是会话级的**（到期回创建它的会话，会话不在就不执行）——不是守护进程。
**【推论】** 适合「wiki 已有人用、开始腐烂」的阶段。

### M3 · 全量挂载（并行编译 + 检索升级）

M2 + **workflow 并行 ingest**（vp-eng 脚本 fan-out：每 child 一个来源/主题域）+ **自建 FTS CLI**（L1，~100 行，`--json` 输出）+ 可选 Quartz 静态导出。
**新代码**：FTS 脚本 + workflow 脚本模板。**新依赖**：0。
**风险**：① 并行写同一 `index.md` 会冲突 → schema 必须规定「child 只写自己的页，index 由收口者更新」；② 只有 vp-eng 挂 `tool-workflow`，其他角色要经它或 ceo 的命名 child。
**【推论】** 适合「来源批量涌入」或「页数数百+」。

## 3. 装配对比

| 维度 | M0 纯文件 | M1 最小 ★ | M2 标准 | M3 全量 |
|---|---|---|---|---|
| 新依赖 | 0 | 0 | 0 | 0 |
| 新代码 | 0 | ≈0（文字） | seed+任务（数据）；面板可选 | ~100 行脚本 + workflow 模板 |
| agent 会发现 wiki 吗 | **不会** | 会（指针） | 会 | 会 |
| 检索 | L0 | L0 | L0 | L0+L1 |
| 自动防腐 | 无 | 无（靠人记） | 有（周期 lint） | 有 |
| 批量 ingest | 手写 | 手写 | 手写 | 并行 |
| 人浏览 | Obsidian/Quartz | 同左 | + 右栏页签 | + 静态导出 |
| 失败模式 | 建了没人用 | 指针漂移、页不更新 | 任务没跑（会话不在） | index 冲突、脚本腐化 |

## 4. 与 startup-settings 合流（跨题）

**【事实】** 姊妹题已定性（`_backlog/_archive/research/startup-settings/README.md` frontmatter `已定性`），结论原句："推荐「DSH 原生承载公司级默认 + `.dsh-company/startup.json` 承载 workspace 覆盖」双轨，字段集 = 必选 6（wiki/productType/deliveryMode/method/collaborationMode/timeZone）+ 可选 3"。其机制半材料给出 `settings.wiki` = string 指针字段、注入走 `systemPrompt.section` 的 thunk 活读（下一轮生效，无需重启）。

**【推论】合流点只有一个**：本题的**指针注入**（M1 轴 3 第 1 档）就是姊妹题的 `settings.wiki` **消费点**。两者不是两套东西：
- 本题定 **wiki 指针该指向什么形状**（根目录 + index.md 先行 + 内容层协议）；
- 姊妹题定 **这个值存在哪、从哪改**（`.dsh-company/startup.json`，composer 红框按钮 → 公司 self-hosted modal）。
**【建议】** 落地时 `settings.wiki` 的值语法规格 = 单个路径字符串（约定 `<root>/index.md` 恒为入口）；注入段文案由本题给定（「先读 index，再钻页；不确定就 grep」）。

### 4.1 补充（2026-11-12 晚，用户点名核实）：wiki 可以在 workspace 之外

**【事实】** 用户提问「wiki 可能不在 workspace 里面啊……你只是只读，按理是可以的，是吧？」——**成立**。三档证据：

1. **源码（设计就是读空域、写限域）**：`vendor/dsh/packages/sandbox/sandbox-local/README.md` L75 原句："The bwrap profile combines a **read-only host root**, a fresh `/dev`, and `/proc` from a private PID namespace ... `workspace-write` adds an ephemeral `/tmp` and a **writable workspace bind**."；`vendor/dsh/packages/sandbox/sandbox-policy/README.md` L116/122 两种模式的策略原句只约束「修改」——`read-only`："Any available operation enforced by the DSH file sandbox **cannot modify files** in the standing mode."；`workspace-write`："may **modify files under** the session workspace: "<workspace root>". 两处都**没有一个字限制读**。
2. **Windows 档同款（明写）**：`sandbox-local/README.md` L131 "NTFS hard links alias one file object across workspace and external paths, **reads stay unconfined**"；`sandbox-windows-acl/README.md` L32 "WRITE_RESTRICTED intersects **write accesses only**"。
3. **本机实测（2026-11-12）**：`read` 工具读 `~/.dsh/profiles/web/package.json` 成功；`ls /Users/bowhead` 正常；`echo x > ~/.dsh/zz-probe-write.txt` → `Operation not permitted`。

**【推论】对 wiki 落位的直接结论**：**a2 形状（外部目录 + 绝对路径指针 + agent 只读）在技术上完整成立**——agent 能 read/grep 外部 wiki 全树，写不进去（沙箱拒），所以「只人维护、agent 只读」不需要任何额外机制，天然成立。反过来，要让 agent 写 wiki，必须把它放进 workspace（a1）或由外部进程/人代写。这条把 §5 开放问题 1/2 的一半闭合了。

**【建议·已定（用户 2026-11-12 拍板）】** wiki 指针 v1 **只支持本地目录**（不做 http(s) URL）：值 = 一个目录路径，允许**绝对路径**（可在 workspace 外）或相对 workspace 的路径。理由：只有本地目录才能被 agent 直接 read/grep（URL 得先 fetch，且 fetch 有 DNS 守卫与网络依赖，不符合「零依赖 + 只读可靠源」）。**注入段必须写明**：该目录是只读外部知识，先读 `index.md` 再钻页，绝不尝试写入（写会失败且不该尝试）。

**【建议·落地提示（给 startup-settings 卡）】** 既然 wiki 是本地目录，面板就该做**存在性校验**：值指向不存在的目录、或存在但没有 `index.md`，都应在面板标出来（与产品类型/交付模式的「失效值不静默」同款，卡 A7）。「wiki 是自由指针所以永不失效」的写法会漏掉这条——路径是会腐化的（目录改名/搬家/换机器）。

## 5. 待用户拍板的决策清单

**【推论】** 技术面已经没有阻塞项（三轴每档都有零依赖实现且各有实证/先例），剩下的是三个产品问题 + 三个边界问题：

**产品问题**
1. **wiki 归谁写**：只人写（agent 只读）/ agent 写人审（培养回路同款「提案-采纳」）/ agent 自主写？→ **【已定·事实支撑】** 若 wiki 住 workspace 外，agent **只能读**（沙箱写不进去，§4.1 实测），所以「人写、agent 只读」是零成本默认；要 agent 写就得放进 workspace。
2. **wiki 存在哪**：workspace 内（`.dsh-company/wiki/` 或根 `wiki/`，agent 可写、随 workspace 走）/ 外部独立 git 仓（agent 只读、人维护、可跨 workspace 复用）/ 公司级 `<DSH_HOME>/company/wiki/`（跨 workspace 共享，同培养方法层的先例）？→ **【已定·v1】** 指针值 = **本地目录路径**，允许绝对路径（可在 workspace 外）；不收录 URL（用户 2026-11-12 拍板，§4.1）。「放哪个目录」仍是部署选择，机制上三种都能指。
3. **怎么算「有用」**：先小规模试一条真实主题（比如「本仓的门禁体系」或某客户领域知识），N 周后看「agent 有没有真的引用 wiki 页」？还是先建结构再等需求？

**边界问题**
4. **外部知识源边界**：llms.txt 站点 / DeepWiki MCP 允许作为 wiki 的**可选来源**吗？（DSH 的 MCP 客户端已内置，接它们只需一行配置、不新增 npm 包——但会引入外部进程/远端服务依赖。）
5. **可见性**：全公司一张 wiki（全部角色只读 + 单一维护者）还是按角色分域？起步建议前者（零 delta）。
6. **与 kb 的边界**：kb = 公司事实状态（谁是谁、费率、流程），wiki = 外部领域/方法知识。这条判据要不要进 content-charter？（改宪章 = 卡 + 语义审。）

## 6. 反模式（明确不要做的）

**【建议】** 以下每条都有材料里的负证据支撑：

1. **不要把每个 wiki 页做成一个 skill**——skill catalog 是扁平名单、无嵌套递归发现，目录树会被压扁，且 catalog 随页数线性膨胀（[主材料](2026-11-12-wiki-knowledge-map.md) §5 形状 C 变体）。
2. **不要一上来就上向量/RAG**——DeepSeek 无 embeddings 端点、本地模型重量级；AK 在 ~100 来源规模实证 index 够用；GraphRAG/RAGFlow 是 Python 平台栈（[搜索生态](2026-11-12-oss-search-landscape.md) §3/§4）。
3. **不要引入 qmd 作为依赖**——~2GB 模型 + better-sqlite3/node-llama-cpp/tree-sitter 原生编译链；它的 CJK 策略（逐字加空格）不比自建词级分词强（[搜索生态](2026-11-12-oss-search-landscape.md) §1.1）。**可借鉴其 RRF 融合与 `--json` 输出纪律**。
4. **不要用 FTS5 的 trigram tokenizer 做中文**——2 字词零命中（实验 C 实证）。
5. **不要把 wiki 塞进 inspect provider / deliverables / goal**——语义错位（[载体材料](2026-11-12-dsh-integration-carriers.md) §5/§6）。
6. **不要指望 hooks 包做事件驱动**——它是外部协议兼容层的构建残壳；要事件用 Cordis 事件（§3）。
7. **不要在 vendor 里加任何东西**——vendor 铁律；wiki 是 workspace/内容层资产。

## 7. 一页速查（如果只记三件事）

1. **你记对了**：OKF = Google Cloud **Open Knowledge Format**（2026-06 v0.1 / 2026-07 v0.2，Apache-2.0，SPEC.md 37KB），官方自述「把 Karpathy 的 LLM-wiki pattern 规范化」。它不是平台、不是运行时，是**文件约定**——`type` 一个键就合规，其余全 opt-in。
2. **搜索不用买**：DSH 自带 ripgrep（L0）；中文全文搜用 Node 内置 `node:sqlite` FTS5 + `Intl.Segmenter` 就够（本仓实测：404 文件 1.4 秒建索引、毫秒级查询）——**零新依赖**。
3. **落法是拼装**：内容层按 AK 目录 + OKF frontmatter 最小集；检索从 L0 起步；载体从「手册指针 + 一份 skill」起步（M1）——全部零新依赖，之后按需加 schedule lint / 并行 ingest / client 面板。
4. **wiki 可以不在 workspace 里**：沙箱只限写不限读（bwrap read-only host root + 可写 workspace bind），所以外部目录的 wiki **能被 agent 完整浏览**、写不进去——「人维护、agent 只读」天然成立。指针 v1 = 本地目录路径（允许绝对路径），不做 URL。

## 8. 材料索引

- 证据底座：[主材料](2026-11-12-wiki-knowledge-map.md)（AK/llms.txt/DeepWiki/AGENTS.md 一手 + 仓内现状）、[OKF](2026-11-12-okf-and-llm-knowledge-standards.md)、[搜索生态](2026-11-12-oss-search-landscape.md)、[DSH 家底](2026-11-12-dsh-retrieval-inventory.md)、[载体](2026-11-12-dsh-integration-carriers.md)、[探针](2026-11-12-selfbuilt-fts-probe.md)、[父会话交接](2026-11-12-parent-handoff.md)
- 跨题：[startup-settings](../startup-settings/README.md)（已定性：settings 入口 + 双轨持久化）
