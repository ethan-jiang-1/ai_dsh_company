---
topic: wiki-knowledge-map
intent: AK「LLM wiki/知识库」一手考证 + LLM 可浏览 wiki 生态参照 + vendor 无 wiki 组件负证据 + 仓内知识流现状与轻依赖接入形状比较
---

# Wiki 知识地图：一手来源与轻依赖接入形状

> 研究日期 = 2026-11-12（所有网络获取均为当日）；执行 = 研究子代理（父会话 session-04b8c6ec 委托）。
> 证据三档：**【事实】** = 一手来源可复核（代码给路径+行号+原句；网络给 URL+原句+获取日期）；**【推论】** = 由事实推出、未直接实证；**【建议】** = 设计主张。负证据与获取限制集中住 §6。
> 权威源码 = `vendor/dsh` 钉 `b830ec950faba0a46dda564be3e2d854afed94f1`（tag `dsh-v0.2.1-rc.5`），本材料只读未改。

## 0. 一句话结论

**【事实】** 用户说的「AK 有一阵子说出来的知识库」= Andrej Karpathy 2026-04-02 推文《LLM Knowledge Bases》+ 2026-04-04 gist `llm-wiki.md`（自称 "idea file"）：LLM 把原始资料增量「编译」成一个持久、互链、index 先行的 markdown wiki，查询时读 index 再钻页，中等规模不需要 RAG。**【事实】** vendor pin 无任何 wiki 组件（全树扫描负证据，§4.1）。**【事实】** 本仓已具备全部轻载体：handbook system-prompt section 注入、kb 只补缺播种、skill 目录式按需加载、fs 浏览工具、培养回路动态长 SKILL.md 的先例。**【建议】** 接入形状 = 外部 markdown wiki（AK 三层结构）+ host 只注入 index 指针 + agent 用现成 read/glob/grep 浏览；配置入口对齐 startup-settings 姊妹题；零新增依赖。

## 1. Part A1：AK 的「LLM wiki / 知识库」到底是什么

### 1.1 正主：2026-04-02 推文 + 2026-04-04 gist

**【事实】原始推文**：https://x.com/karpathy/status/2039805659525644595 ，created_at `2026-04-02T20:42:21.000Z`（X 官方 syndication 端点返回的元数据），作者 `karpathy`（Andrej Karpathy，认证账号），favorite_count 61073。标题句与开头（syndication 原样返回，逐字）：

> LLM Knowledge Bases
>
> Something I'm finding very useful recently: using LLMs to build personal knowledge bases for various topics of research interest. In this way, a large fraction of my recent token throughput is going less into manipulating code, and more into manipulating knowledge (stored as markdown and images). The latest LLMs are quite good at it.

全文为长推（Note Tweet），关键段（全文经两个独立镜像互证一致，通道与限制见 §6.2）：

> Data ingest:
> I index source documents (articles, papers, repos, datasets, images, etc.) into a raw/ directory, then I use an LLM to incrementally "compile" a wiki, which is just a collection of .md files in a directory structure. The wiki includes summaries of all the data in raw/, backlinks, and then it categorizes data into concepts, writes articles for them, and links them all.

> Q&A:
> Where things get interesting is that once your wiki is big enough (e.g. mine on some recent research is ~100 articles and ~400K words), you can ask your LLM agent all kinds of complex questions against the wiki, and it will go off, research the answers, etc. I thought I had to reach for fancy RAG, but the LLM has been pretty good about auto-maintaining index files and brief summaries of all the documents and it reads all the important related data fairly easily at this ~small scale.

> TLDR: raw data from a given number of sources is collected, then compiled by an LLM into a .md wiki, then operated on by various CLIs by the LLM to do Q&A and to incrementally enhance the wiki, and all of it viewable in Obsidian. You rarely ever write or edit the wiki manually, it's the domain of the LLM. I think there is room here for an incredible new product instead of a hacky collection of scripts.

**【事实】idea file gist**：https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f ，页面 owner = karpathy，唯一 revision 时间 `2026-04-04T16:25:13Z`（revisions 页只有一条），本文读取的 raw 版本 = `ac46de1ad27f92b28ac95459c782c07f6b8c964a/llm-wiki.md`（11,985 字节，全文已读）。发布推文 https://x.com/karpathy/status/2040470801506541998 （`2026-04-04T16:45:23Z`，syndication 逐字开头）：

> Wow, this tweet went very viral!
>
> I wanted share a possibly slightly improved version of the tweet in an "idea file". The idea of the idea file is that in this era of LLM agents, there is less of a point/need of sharing the specific code/app, you just share the idea, then the other person's agent customizes & builds it for your specific needs.

gist 核心原句（以下均 raw 全文逐字摘录）：

- 定位（L3、L5）："A pattern for building personal knowledge bases using LLMs." / "This is an idea file, it is designed to be copy pasted to your own LLM Agent (e.g. OpenAI Codex, Claude Code, OpenCode / Pi, or etc.)."
- 反 RAG 核心（L9）："Most people's experience with LLMs and documents looks like RAG: you upload a collection of files, the LLM retrieves relevant chunks at query time, and generates an answer. This works, but the LLM is rediscovering knowledge from scratch on every question. There's no accumulation."
- 正面主张（L11）："Instead of just retrieving from raw documents at query time, the LLM **incrementally builds and maintains a persistent wiki** — a structured, interlinked collection of markdown files that sits between you and the raw sources."
- 复利 artifact（L13）："This is the key difference: **the wiki is a persistent, compounding artifact.** The cross-references are already there. The contradictions have already been flagged."
- 分工（L15）："You never (or rarely) write the wiki yourself — the LLM writes and maintains all of it. You're in charge of sourcing, exploration, and asking the right questions." 以及隐喻 "Obsidian is the IDE; the LLM is the programmer; the wiki is the codebase."
- **三层架构**（L29-33）：**Raw sources**（"These are immutable — the LLM reads from them but never modifies them. This is your source of truth."）/ **The wiki**（"a directory of LLM-generated markdown files... The LLM owns this layer entirely... You read it; the LLM writes it."）/ **The schema**（"a document (e.g. CLAUDE.md for Claude Code or AGENTS.md for Codex) that tells the LLM how the wiki is structured... it's what makes the LLM a disciplined wiki maintainer rather than a generic chatbot."）
- **三操作**（L37-41）：Ingest（"A single source might touch 10-15 wiki pages."；作者偏好人在环逐条 ingest）/ Query（"**good answers can be filed back into the wiki as new pages.**... your explorations compound in the knowledge base just like ingested sources do."）/ Lint（"Periodically, ask the LLM to health-check the wiki. Look for: contradictions between pages, stale claims... orphan pages with no inbound links... missing cross-references, data gaps..."）
- **index 先行**（L47）："**index.md** is content-oriented. It's a catalog of everything in the wiki — each page listed with a link, a one-line summary... When answering a query, the LLM reads the index first to find relevant pages, then drills into them. This works surprisingly well at moderate scale (~100 sources, ~hundreds of pages) and avoids the need for embedding-based RAG infrastructure."
- **log.md**（L49）："append-only record of what happened and when... if each entry starts with a consistent prefix (e.g. `## [2026-04-02] ingest | Article Title`), the log becomes parseable with simple unix tools — `grep \"^## \\[\" log.md | tail -5`"
- **团队场景**（L22，与虚拟公司直接对口）："**Business/team**: an internal wiki maintained by LLMs, fed by Slack threads, meeting transcripts, project documents, customer calls. Possibly with humans in the loop reviewing updates. The wiki stays current because the LLM does the maintenance that no one on the team wants to do."
- 为什么成立（L66）："Humans abandon wikis because the maintenance burden grows faster than the value. LLMs don't get bored, don't forget to update a cross-reference, and can touch 15 files in one pass."
- 思想源头（L70）：Vannevar Bush 1945 Memex——"The part he couldn't solve was who does the maintenance. The LLM handles that."
- 规模升级可选件（L53）：qmd（本地 BM25+向量混合搜索 markdown，CLI+MCP）——"at small scale the index file is enough, but as the wiki grows you want proper search."
- 刻意抽象（L75）："This document is intentionally abstract. It describes the idea, not a specific implementation... The right way to use this is to share it with your LLM agent and work together to instantiate a version that fits your needs."

**【事实】Farzapedia 四原则**（Karpathy 转推实例并阐发，https://x.com/karpathy/status/2040572272944324650 ，`2026-04-04T23:28:36Z`；开头经 syndication 逐字验证，全文经镜像，§6.2）：

> Farzapedia, personal wikipedia of Farza, good example following my Wiki LLM tweet.

四条编号原则是 Karpathy 本人推文原句（不是社区转述——某二手报告曾标为「社区 paraphrase」，被一手文本证伪，见 §6.4）：

> 1. Explicit. The memory artifact is explicit and navigable (the wiki), you can see exactly what the AI does and does not know and you can inspect and manage this artifact, even if you don't do the direct text writing (the LLM does).
> 2. Yours. Your data is yours, on your local computer, it's not in some particular AI provider's system without the ability to extract it.
> 3. File over app. The memory here is a simple collection of files in universal formats (images, markdown). This means the data is interoperable... The agents can apply the entire Unix toolkit over them. They can natively read and understand them.
> 4. BYOAI. You can use whatever AI you want to "plug into" this information - Claude, Codex, OpenCode, whatever.

**【推论】** 这四条就是「轻依赖 wiki」的设计公理：显式可浏览（Explicit）、数据本地归用户（Yours）、文件优于应用（File over app）、不锁 AI 供应商（BYOAI）——与用户「不想做太多的依赖」完全同向；DSH 的 fs 工具 + markdown 天然满足 3/4，index 注入满足 1。

### 1.2 假设核验表（「预言语言」线索，a–e）

用户原话「你可以研究研究预言语言，你就明白了」中的「预言语言」疑似语音转写讹误。五个候选假设逐一核验：

| 假设 | 核验结果 | 一手证据 |
|---|---|---|
| (a) 2023 推文 "The hottest new programming language is English" | **【事实】存在**，2023-01-24，但主题是「英语编程」不是知识库 | https://x.com/karpathy/status/1617979122625712128 ，syndication 全文逐字："The hottest new programming language is English"（favorite_count 72915） |
| (b) Software 3.0 / 自然语言编程演讲（2025） | **【事实】存在**，含「为 LLM 写文档」「llm.txt」「DeepWiki 赞赏」 | YC 官方 library 页内嵌完整 transcript：https://www.ycombinator.com/library/MW-andrej-karpathy-software-is-changing-again （视频 YouTube `LCEmiRjPEtQ`，页面 created_at `2025-06-19T01:05:19Z`，series = AI Startup School），摘录见下 |
| (c) LLM-first 文档/wiki 想法 | **【事实】存在且是「知识库」的正主**：2025-03-12 推文（文档应为单个 .md）→ 2026-04 wiki gist（§1.1） | https://x.com/karpathy/status/1899876370492383450 （`2025-03-12T17:33:19Z`），全文见下 |
| (d) 对 DeepWiki 的评价 | **【事实】存在两处**：演讲赞赏 + 2026-02-11 专文长推 | 演讲 transcript + https://x.com/karpathy/status/2021633574089416993 （`2026-02-11T17:12:58Z`），摘录见 §2.2 |
| (e) llms.txt 相关讨论 | **【事实】演讲直接点名 llm.txt**；二手报道将其与 llms.txt 运动关联 | transcript 原句见下；the-decoder 报道（二手，仅佐证关联） |

**【事实】(c) 2025-03-12 推文全文**（syndication 返回 422 字符完整文本，非长推）：

> It's 2025 and most content is still written for humans instead of LLMs. 99.9% of attention is about to be LLM attention, not human attention.
>
> E.g. 99% of libraries still have docs that basically render to some pretty .html static pages assuming a human will click through them. In 2025 the docs should be a single your_project.md text file that is intended to go into the context window of an LLM.

同日后续回复（https://x.com/karpathy/status/1899888970206765270 ，`2025-03-12T18:23:23Z`，syndication 逐字）：

> @NickADobos Codebases are programmatically ~easy to collate into a single file. The issue is that most information is (tragically) locked in formats that were intended for uniquely human consumption - web pages, PDF files, images, videos, audio, etc. pre-LLM era tech.

**【事实】(b) 演讲关键原句**（YC 官方 transcript，逐字；口语转写含 "uh" 等保留原样）：

- Software 3.0 定义："basically your prompts are now programs that program the LLM. And uh remarkably uh these uh prompts are written in English."
- 自引置顶推："when this blew my mind a few uh I guess years ago now I tweeted this... this is my currently pinned tweet uh is that remarkably we're now programming computers in English."
- llm.txt："you can have maybe an llm.txt file, which is just a simple markdown that's telling LLMs what this domain is about. And this is very readable to an LLM."
- 文档改造："So if we can make docs legible to LLMs, it's going to unlock a huge amount of kind of use, and um, I think this is wonderful and should happen more." 以及 "anytime your docs say 'click,' this is bad... Vercel, for example, is replacing every occurrence of 'click' with an equivalent curl command that your LLM agent could take on your behalf."
- DeepWiki："Maybe even more dramatic example of this is Deep Wiki, where it's not just the raw content of these files. Uh, this is from Devon [转写讹误，应为 Devin]. But also, like, they have Devon basically do analysis of the GitHub repo, and Devon basically builds up a whole docs pages just for your repo. And you can imagine that this is even more helpful to copy-paste into your LLM."
- **顺行性遗忘**（外部知识层的动机）："they also kind of suffer from anterograde amnesia... if you have a coworker who joins your organization, this coworker will over time learn your organization... they go home and they sleep and they consolidate knowledge and they develop expertise over time. LLMs don't natively do this... context windows are really kind of like working memory, and you have to sort of program the working memory quite directly."

**【推论】「预言语言」判定**：知识库所指已确证 = (c) 的 2026-04 LLM Wiki（§1.1），与用户「AK 有一阵子说出来的知识库」（2026-04 距今约 7 个月）时间吻合。「预言语言」本身无法从证据还原：最可能是语音转写讹误，候选底本 = 「英语（编程）/自然语言」（对应 a/b，Karpathy 反复讲「用英语编程」）或「那个 wiki」之类；**未验证，留给用户确认**（§7 开放问题 1）。注意 (a)(b) 与知识库是两条相关但不同的线：英语编程 =  programming 范式；wiki = 知识积累范式；两者在「LLM 是一台用自然语言编程的新计算机」框架下汇合（演讲 LLM OS 类比）。

### 1.3 AK 的依赖厌恶——用户「不想做太多的依赖」的一手呼应

**【事实】** 三条一手推文构成一致立场：

1. **bacterial code 起源**（https://x.com/karpathy/status/1941616674094170287 ，`2025-07-05T21:54:23Z`，FxTwitter 全文，开头未及 syndication 验证——见 §6.2 分级）："How to build a thriving open source community by writing code like bacteria do 🦠. Bacterial code (genomes) are: - small (each line of code costs energy) - modular (organized into groups of swappable operons) - self-contained (easily 'copy paste-able' via horizontal gene transfer)... can you imagine someone going 'yoink' without knowing the rest of your code or having to import anything new, to gain a benefit?"
2. **DeepWiki + rip out**（2026-02-11 推文，§2.2 全文引用）："building more 'bacterial code', code that is less tangled, more self-contained, more dependency-free, more stateless, much easier to rip out from the repo" / "'Libraries are over, LLMs are the new compiler' :). And does your project really need its 100MB of dependencies?"
3. **litellm 供应链攻击**（https://x.com/karpathy/status/2036487306585268612 ，`2026-03-24T16:56:24Z`，syndication 逐字开头 + 镜像全文）："Classical software engineering would have you believe that dependencies are good (we're building pyramids from bricks), but imo this has to be re-evaluated, and it's why I've been so growingly averse to them, preferring to use LLMs to 'yoink' functionality when it's simple enough and possible."

**【推论】** 用户「我们不想做太多的依赖」与 AK 本人立场同构；AK 给出的替代路径正是「agent + wiki/代码理解 → 按需取功能」，而不是「引入一个 wiki 平台/组件」。这为 §5 的零新依赖形状提供外部一手佐证（佐证是推论，立场引文是事实）。

## 2. Part A2：「给 LLM 浏览的 wiki」生态参照

### 2.1 llms.txt 规范（Answer.AI / Jeremy Howard 一手）

**【事实】** 来源 = https://llmstxt.org/ （获取 2026-11-12，全文已读），署名 "Author: Jeremy Howard / Published: September 3, 2024 / Modified: August 10, 2026"，当前为 **v2**。核心原句：

- 定位："A proposal to standardise on using an /llms.txt file to provide information to help agents use a website."
- **index 先行、按需展开**："Agents are expected to view or search llms.txt to find the information they need, then follow the relevant links... **The file itself stays small enough to fit in context. The detail lives behind the links, and is fetched only when needed.**"
- 结构（Format 节）：H1 项目名（唯一必需）→ blockquote 摘要 → 若干非标题说明段 → 若干 H2 「file list」（`[name](url): notes` 列表）；"The 'Optional' section is used, by convention, for secondary information: links an agent can skip when a shorter context is needed."
- 路径语义："The file can be placed at the site root, or at any path within it, covering the pages under that path... where more than one file applies, agents should use the most specific one."（目录即地图：`/docs/llms.txt` 覆盖 `/docs/` 全部）
- 页面伴生 markdown："pages with information that agents might need provide a clean markdown version of those pages at the same URL... with .md appended (page.html.md) or with the extension replaced by .md (page.md)."
- 与既有标准关系："While sitemaps list all pages for search engines, llms.txt offers a curated overview for LLMs."；类比 "just as index.html gives any path a conventional location for its human-readable entry point, llms.txt gives any path a conventional location for its LLM-readable overview."
- 采纳（v2 自述）："thousands of sites publish an llms.txt file, documentation platforms generate one automatically, and Chrome's Lighthouse audits sites for one... The AI labs themselves publish llms.txt files for their own developer docs: OpenAI, Anthropic, and Gemini."

**【事实】活实例**：https://docs.anthropic.com/llms.txt 当日 HTTP 200，开头逐字："# Anthropic Developer Documentation / This file provides an overview of the Anthropic API documentation and developer resources."

- **结构**：单文件 index（H1+摘要+分节链接清单）→ 各页 .md 版本。
- **消费者**：coding agent / 聊天助手（规范自述 "a coding agent fetches a library's documentation to get an API call right"）。
- **依赖成本**：零运行时依赖——纯静态 markdown 文件约定；生成侧有 Mintlify/GitBook/VitePress 插件等可选件。
- **【推论】** llms.txt 是「index→pages」模式在 web 尺度的标准化；对本地 wiki 的可借鉴点 = index 的格式纪律（一行一链接+一句话摘要+Optional 可跳过）与「index 必须小到能进上下文」的预算观。

### 2.2 DeepWiki（Cognition 一手）

**【事实】发布公告**：https://cognition.ai/blog/deepwiki （获取 2026-11-12，全文已读），"DeepWiki: AI docs for any repo / By The Cognition Team / 2025.05.05"。原句：

> That's why we built Devin Wiki and Devin Search, tools that helps developers quickly grok and understand complex code. Now, we're launching DeepWiki, the free public version of Devin Wiki and Devin Search. Visit the DeepWiki for any repo by replacing github.com with deepwiki.com in the URL. We've already indexed over 50,000 of the top public GitHub repos... For private repos, sign up for a Devin account.

**【事实】结构 = index→pages，官方 MCP 文档**：https://docs.devin.ai/work-with-devin/deepwiki-mcp （获取 2026-11-12，全文已读）："The DeepWiki MCP server is a free, remote, no-authentication-required service that provides access to public repositories." 三工具逐字：

> read_wiki_structure - Get a list of documentation topics for a GitHub repository
> read_wiki_contents - View documentation about a GitHub repository
> ask_question - Ask any question about a GitHub repository and get an AI-powered, context-grounded response

服务入口 https://mcp.deepwiki.com/ 当日可达，页面给出 `https://mcp.deepwiki.com/mcp`（Streamable HTTP）与 Claude Code 接法 `claude mcp add -s user -t http deepwiki https://mcp.deepwiki.com/mcp`。

**【事实】AK 的评价与用法**（https://x.com/karpathy/status/2021633574089416993 ，`2026-02-11T17:12:58Z`；开头经 syndication 逐字验证，全文经镜像互证）：

> On DeepWiki and increasing malleability of software. This starts as partially a post on appreciation to DeepWiki, which I routinely find very useful and I think more people would find useful to know about.

> I find that in *many* cases, library docs can be spotty and outdated and bad, but directly asking questions to the code via DeepWiki works very well. **The code is the source of truth and LLMs are increasingly able to understand it.**

> But then I realized that in many cases it's even a lot more powerful not being the direct (human) consumer of this information/functionality, but **giving your agent access to DeepWiki via MCP**.

> "Use DeepWiki MCP and Github CLI to look at how torchao implements fp8 training. Is it possible to 'rip out' the functionality? Implement nanochat/fp8.py that has identical API but is fully self-contained"
>
> Claude went off for 5 minutes and came back with 150 lines of clean code that worked out of the box, with tests proving equivalent results, which allowed me to delete torchao as repo dependency... this simple version runs 3% faster.

- **结构**：repo → 自动生成的 wiki 页（主题目录 = structure，页内容 = contents）+ AI 问答；URL 替换即达（github.com → deepwiki.com）。
- **消费者**：人（浏览/问答）+ agent（MCP 三工具）；AK 实证 agent 消费比人消费更强（"when your agent asks, you get action" 是二手 gu-log 的阐发，AK 原句是上面 "even a lot more powerful... giving your agent access"）。
- **依赖成本**：公共 repo 免费远端服务、无认证；私有 repo 需 Devin 账号 + API key（`https://mcp.devin.ai/mcp`）。**【推论】** 对本仓 = 外部服务依赖 + 网络依赖 + 私有代码出境问题；作「可选外部知识源」可以，作「公司知识地图的载体」不合适（公司知识不在 GitHub 公共 repo 里，且用户明确不想多依赖）。
- **【事实】获取限制**：deepwiki.com 主站当日被 Vercel Security Checkpoint 拦截（需 JS），页面结构未直接目检；结构证据来自官方 MCP 文档与公告（§6.3）。

### 2.3 AGENTS.md 开放格式（agent 可读仓库说明书）

**【事实】** https://agents.md/ （获取 2026-11-12，全文已读）："A simple, open format for guiding coding agents, used by over 60k open-source projects."（项目数自述）/ "Think of AGENTS.md as a README for agents: a dedicated, predictable place to provide the context and instructions to help AI coding agents work on your project." / "README.md files are for humans... AGENTS.md complements this by containing the extra, sometimes detailed context coding agents need."

- **结构**：仓库根（或子目录）单个 markdown，无强制 schema；示例含 setup commands / code style 等节。
- **消费者**：coding agent（Codex/Claude Code 等，格式站自述）。
- **依赖成本**：零——纯文件约定。**【事实】** 本仓与公司 pack 已在用此格式（根 AGENTS.md；`packages/company-pack/content/AGENTS.md` 手册；kb 播种 `kb/AGENTS.md`）。**【推论】** AK gist 的 schema 层点名 AGENTS.md（§1.1），说明 wiki 的「维护协议」与本仓现有载体同格式——wiki schema 可以直接写成一份 AGENTS.md 式文件，无需新发明。

### 2.4 生态小结（结构 / 消费者 / 依赖成本对照）

| 模式 | 结构 | 消费者 | 依赖成本 | 一手来源 |
|---|---|---|---|---|
| AK llm-wiki | raw/（不可变）+ wiki/（LLM 维护）+ schema（AGENTS.md 式）；index.md + log.md 双导航 | 人浏览（Obsidian）+ agent 读写（fs/unix 工具） | 零运行时依赖；可选 qmd 搜索 | gist §1.1 |
| llms.txt | 单 index 文件（H1+摘要+链接清单）→ 各页 .md | web agent | 零（静态文件约定） | llmstxt.org §2.1 |
| DeepWiki | repo → 自动 wiki（structure→contents）+ ask_question | 人 + agent（MCP） | 远端服务；私有需 Devin | Cognition §2.2 |
| AGENTS.md | 仓库内单文件说明书 | coding agent | 零 | agents.md §2.3 |
| DSH skill（仓内先例，§4.3） | catalog（name+description）→ body 按需加载 | agent（skill 工具） | 零新增（已挂载） | vendor skills.md |

**【推论】** 共同模式 = **index 先行 + 正文按需展开 + 纯文本载体 + 目录即地图**；差异只在 index 的粒度（单文件 vs 目录树）与维护者（人写 vs LLM 编译）。AK wiki 是唯一把「LLM 做维护、知识复利」当第一性原理的，最贴合用户「动态地加进去…加不完」的诉求。

## 3. Part A3：概念定义（知识地图）

**【推论】** 综合 §1–§2 一手证据，本研究采用的定义：

> **知识地图** = 一个以自然语言（markdown）写成、按 wiki 组织（页面互链、目录即地图）的**外部知识层**；它有一张小到能进上下文的 **index**（每页一行链接+一句话摘要），agent **index 先行、按需钻页**（progressive disclosure）；它由**人和 agent 共同动态增长**（人投喂来源/agent 编译页面，查询的好答案回写为新页），并有周期性 **lint** 防腐；原始资料不可变、wiki 可再生，**文件优于应用**，不锁定任何 AI 供应商。

与用户原话的对应：**【事实→推论】** 「浏览到一个目录，这个目录是用 wiki 组织的」= 目录树 + index.md；「LM 的 wiki / AK 说出来的知识库」= §1.1 确证的 llm-wiki 模式；「动态地加进去…你肯定加不完」= Ingest/Query 回写/Lint 三操作解决的正是「维护负担 > 价值 → wiki 腐烂」问题（gist L66 原句）；「不想做太多的依赖」= File over app + BYOAI + §1.3 依赖厌恶。

**【推论】** 与 RAG 的分界（AK 原句支撑）：RAG 查询时重新发现知识（无积累）；知识地图把综合**编译一次、持续保鲜**（cross-reference 与矛盾标记已在盘上）。与「往 content/ 里塞」的分界：content 是随包版本发布的只读产品内容（§4.2），知识地图是部署侧/运行侧生长的外部输入——两者寿命不同，按 content-charter「跟谁一起变」判据必须分层。

## 4. Part B：仓内机制（代码一手）

### 4.1 B4：vendor pin 有无 wiki 组件——证伪

**【事实】pin 核实**：`git -C vendor/dsh rev-parse HEAD` = `b830ec950faba0a46dda564be3e2d854afed94f1`；`git describe --tags` = `dsh-v0.2.1-rc.5`；`git status --porcelain` 空（工作树零改动）。与根 AGENTS.md 簿记一致。

**【事实】全树扫描负证据**（grep `(?i)wiki`，2026-11-12 实跑）：

| 扫描域 | 结果 |
|---|---|
| `vendor/dsh/packages/`（含 experimental/、extensions/ 全部子包） | 仅 6 处命中，全部是 ui-primitives 的 wikipedia **图标**：`packages/client/ui-primitives/src/SiteGlyph.tsx` L39 `siWikipedia,`、L64 `'wikipedia.org': siWikipedia,`；其余为对应测试（`vendor/dsh/packages/client/ui-primitives/tests/link-icon.client.spec.tsx` L89/L142 用 en.wikipedia.org 做链接图标用例）与 README 描述 |
| `vendor/dsh/apps/`（cli/desktop/desktop-host/plugin-market-generator/web） | 无命中 |
| `vendor/dsh/lib/` | 无命中 |
| `vendor/dsh/docs/` | 仅 4 处，全部是翻译规则里引用的**外部** Vue.js GitHub wiki URL（`docs/i18n/translation-rules.md` L43/L66 及 zh 对应行），非组件 |
| `vendor/dsh/website/`、`native/`、`python/`、`scripts/` | 无命中 |

**【事实】** `packages/` 顶层目录清单（57 个组）中与「知识」相关的只有 `skill/`、`context/`、`compaction/`、`session-query/`、`storage/`、`workspace/` 等，无 wiki/knowledge-base 包；`packages/experimental/` 50 个子目录逐一在列（agent-team、session-search、translator 等），无 wiki。

**【结论·事实】** 用户「我估计 DSH 也有 Wiki 的组件的」——**证伪**：钉住的 dsh-v0.2.1-rc.5 没有 wiki 组件；唯一 wiki 字样是 wikipedia 图标与外部文档链接。父会话先前结论复核通过并扩查完毕。**【推论】** 「不用 DSH wiki 组件」的约束自动满足——没有可用的；最接近的现成载体是 skill 家族（§4.3）与 fs 工具。

### 4.2 B5：公司 pack 现有知识流

**分层判据（docs 一手）**：

- `docs/content-charter.md` L17-22 四槽表：**人**（身份/能力边界/工具面，换公司不变→通用层 preset）、**流程**（谁先谁后→通用层 skill/content）、**方法**（怎么做/检查表/判据/术语，换公司/产品类型/项目会变→方法层）、**政策**（阈值/签字线→公司层）。L42-44 三铁律，其中 L43："**方法不进 persona**：能力档只声明「需要方法」，不声明「用哪个方法」；方法必须是外部可替换的输入。" L48-51 四问顺序：换公司要改吗→公司层；换产品类型→产品类型层；换做法→方法层；只有机制变→通用/契约层。
- `packages/company-pack/content/README.md` L5："AGENTS.md：公司手册。host 在 agent 创建时注入 system prompt section；**不复制到 workspace**。" L6-8：模板用户要改→复制到 `<workspace>/.dsh-company/overrides/templates/`，"**这是提示级覆盖**：会话被指示优先读 override（host 注入前言里统一声明），不是文件系统强制。" L9-10：charters 首启只补缺生成 `kb/<role>/CHARTER.md`。L13：company/ seed 到 run bundle kb/。

**注入机制（src/host/prompt/ 一手）**：

- `packages/company-pack/src/host/prompt/handbook.ts` L19 `export const HANDBOOK_SECTION = 'company:handbook'`；L21 `export const HANDBOOK_MAX_BYTES = 32_768`（运行时超限只告警不截断，L72-75）。
- 同文件 L34-41 `readHandbook`：override 优先——`join(workspace, RUN_BUNDLE_PATHS.overrides, 'AGENTS.md')` 存在则用它，否则 pack `content/AGENTS.md`。**【事实】注意区分**：手册本身的 override 是**文件系统级**选源（readHandbook 直接换文件）；模板/章程的 override 是**提示级**（前言声明，agent 自觉优先读）。
- L42-49 注入前言（逐字）："Company content (read-only): ${contentDir}" / "When a role or skill says \`<company-content>/...\`, read that absolute path." / "If \`.dsh-company/overrides/...\` exists, prefer the override for templates/charters/handbook."——**这就是「host 只注入指针、正文按需读」的现成先例**。
- L81-88：`agent.ctx.inject(['systemPrompt'], ...)` → `scope.systemPrompt.section({ name: HANDBOOK_SECTION, order: 500, text: () => handbook.text, interpolate: false })`；L91 挂 `ctx.on('agent/created', ...)`；L76 非角色 preset（NON_ROLE_PRESETS）默认跳过注入。
- pack 内另有三处 section 注入先例：`prompt/delegation-contracts.ts` L165/175/185、`prompt/language-policy.ts` L59、`prompt/contracts.ts` L79（均为 per-agent systemPrompt.section）。

**kb 播种（run-bundle 一手）**：

- `packages/company-pack/src/host/run-bundle/bootstrap.ts` L22 `const SEED_MANIFEST = 'kb-setup/seed.json'`；L64-76 DIRS 骨架（kb/、六角色 kb/<role>/journal/、deliverables/、overrides/ 等）；L141-144 播种只补缺（`action: exists ? 'skip' : 'create'`）；L247-250 写盘用 `flag: 'wx'`（L227 注释："**只创建，绝不覆盖/截断。**"）；L193-198 target 越界/必须在 `.dsh-company/` 内 fail-loud。
- `content/kb-setup/seed.json` L3 note："target 相对 workspace；mode 恒为 only-fill（wx，绝不覆盖）... `{productType}` = company.md 的 productType（缺/未知 fail-closed，不猜）"；L42-44：`kb-setup/guide.md` → `.dsh-company/kb/AGENTS.md`；L38-40：`product-types/{productType}/requirements-model.md` → `kb/process-docs.md`。
- **kb 自带 index 先例**：`content/kb-setup/guide.md` L8-20「一眼看懂」表（文件｜是什么｜谁维护｜缺了怎么办，11 行覆盖全部 kb 文件）+ L22-27「读的顺序」（1 company.md → 2 policy-lines.md → 3 按需 org/roster/rates/owners/review-protocol → 4 自己的 CHARTER + 最近 3 篇 journal）。**【推论】** 这就是知识地图 index 的雏形——wiki index 可以照此形状长。
- **workspace 实盘**（company-workspace/.dsh-company/kb/，2026-11-12 find 实测）：AGENTS.md、company.md、org.md、owners.md、roster.md、rates.md、policy-lines.md、review-protocol.md、process-docs.md、motion-ledger.md、deliverables-index.json、deliverables-presented.json + 六角色目录（各 CHARTER.md + journal/）。路径唯一家 = `src/lib/run-bundle-paths.ts` L6 `RUN_BUNDLE_DIR = '.dsh-company'`、L12 kb、L25 overrides。

**载入清单与预算（manifest 一手）**：

- `content/manifest.json` L3 note："三层加载清单（2026-11-09）。t0 常驻 / t1 摘要 / t2 按需"；t0 = [AGENTS.md]（L5-7），t1 = [company/policy-lines.md, state/company.md]（L8-11），t2 = 43 份按需文件，legacy = 4 份 state。
- `checks/gates/content-manifest.mjs` L8 判据注释："预算：T0 合计 ≤6KB；T1 合计 ≤4KB；T2 单文件 ≤6KB"；L15 `BUDGETS = { t0: 6_144, t1: 4_096, t2: 6_144 }`；L79 注释："文件头的 `加载：` 是 agent 的读法；manifest 是 host 的读法。两者不一致 = 两份事实。"（文件头实例：`content/generic/collaboration.md` L3 "> 层：通用 · 加载：按需（T2）"）
- **【事实】负证据**：grep `manifest\.json|tiers` 于 `packages/company-pack/src` **无命中**——manifest 无运行时消费者，唯一消费者是结构门禁（checks/gates/content-manifest.mjs）与 release-smoke。**【推论】** t1/t2 的「按需」是提示级纪律（手册指针 + 文件头声明），不是 host 自动装载；真正的常驻注入只有 t0 手册。wiki 若走「host 注入」路线，注入的也只是指针，与现状同构。
- 手册正文的按需纪律：`content/AGENTS.md` L20 "## 细则（按需读，不进常驻上下文）"——六份 generic 细则只留路径指针。

**动态增长先例（培养回路）**：

- `src/host/cultivation/cultivation.ts` L12-17 头注（逐字节选）："**方法层** = `<DSH_HOME>/company/methods/<role>/<slug>/SKILL.md`（2026-10-28 M3 起公司级...）——根由 bundle patch 行 config.cultivationRoot 注入... 与各角色 preset 的第二 customSkillDirs 同前缀构造对齐；在分身 workspace 沙箱之外（D25 自改否决维持——workspace-write 下分身写不了...）。生效边界：**新开的该角色会话**加载（运行中会话不吃热更新...）"。提案对分身开放（cultivation_propose 工具），采纳/拒绝是人专用命令。
- `presets/ceo/agent.cordis.yml` L58 `includeDefaultRoots: false`（硬隔离，不并项目根/用户级技能）+ L59-66 customSkillDirs 三条：preset skills/、`../../company/methods/ceo/`（培养方法层）、`presets/_shared/delegation/skills/`。
- **【推论】** 培养回路已实证「运行中长出的知识 → 落 SKILL.md → 新会话自动发现」全链路；wiki 的动态增长可以复用同一「落盘 + 发现」形状，差别只在 wiki 是目录树+index 而非扁平 skill 集。
- **配置面现状**：`src/host/run-bundle/config.ts` L7-10 HostConfigLike 只有 `cultivationRoot` / `handbookSkipPresets` 两键，L13-15 未知键 fail-loud。**【事实】** 新增 wiki 配置键 = 在此扩一个字段 + 验证，模式现成。

**相邻 workspace 状态（非机制，仅登记）**：company-workspace 归档交付物 `deliverables-archive/2026-09-22-kb-rag-assessment/final.md`（虚拟公司角色产物）曾评估内部知识库，CEO 决定方向为「真相源继续留在 Markdown + git，检索层自建…RAG 只读不回写」。**【推论】** 公司虚构史里已有「markdown+git 为真相源」的共识，与 AK wiki 的 raw 不可变层同向；但它是角色扮演产物，不是本仓机制证据。

### 4.3 B6：vendor packages/skill 的按需加载（progressive disclosure 先例）

一手 = `vendor/dsh/docs/subsystems/skills.md`（subsystem 参考，生成 API 段由源码生成）+ `packages/skill/` 源码树。关键原句（行号为 skills.md）：

- **发现**（L66-76 表）：本地 provider 按 rank 扫六个根——100 `<projectRoot>/.dsh/skills`、200 `<projectRoot>/.agents/skills`、300 `Config.customSkillDirs`、400 `<dshHome>/skills`、500 `<agentsHome>/skills`、600 bundled。L77："The project root is the nearest ancestor containing `.git`"。
- **形状**（L85）："The local provider accepts directory bundles (`<name>/SKILL.md`) and flat Markdown files (`<name>.md`). Nested recursive `**/SKILL.md` discovery is not supported."
- **catalog 只放路由信息**（L229）："`dsh-tool-skill` injects the initial durable user-role `<system-reminder>` at the first `agent/pre-step`... The catalog contains sorted skill `name` and normalized, XML-escaped `description` only; **it omits bodies, paths, sources, providers, and routing hints**."（L94 同义："The model session catalog uses only model-invocable `name` and `description`, never the body or absolute file path."）
- **正文按需加载**（L233）："The model-facing `skill({ name })` tool... rereads the complete definition for the calling agent cwd... returns a tool result containing `<skill_content name=\"...\">`, `<skill_resources>`, and `<skill_instructions>`... **Body-only edits therefore change later tool calls without producing catalog messages** or rewriting earlier tool results."
- **不缓存正文**（L192）："Full definitions are not cached by the registry. Each `get()` calls the winning provider with the selected candidate, so the local provider rereads the current body."
- **动态发现**（L81）："Chokidar watches existing roots for direct bundle/flat-entry additions and removals plus direct skill-entry changes... Model-facing `write` and `edit` observations synchronously invalidate the provider when their target is catalog-relevant, while the host watcher covers IDE, Git, shell, and external-process mutations."
- **变更通知**（L338）：`skills/change` 事件 = 无 diff 的失效通知，消费者自取 snapshot。

**【推论】** skill 机制 = 「index（name+description 目录）常驻、body 按需读、盘上变更自动失效」的完整 progressive disclosure 实现，且公司 pack 已挂载（§4.2 ceo preset）。wiki 的「index 先行」与它同构；但 skill catalog 是**扁平名单**、无嵌套目录（L85），不适合直接承载 wiki 的层级目录树——wiki 正文应走 fs 浏览，skill 只承载「wiki 使用协议」（§5 形状 C）。

### 4.4 仓内已有 progressive disclosure 盘点（小结）

**【事实】** 三层现成机制：① t0/t1/t2 清单 + 预算门禁（§4.2 manifest）；② 手册「细则按需读」指针 + kb guide「读的顺序」（§4.2）；③ skill catalog→body（§4.3）。**【推论】** wiki 接入不需要发明任何新机制——缺的只是「外部 wiki 目录 + 它的 index 指针」这一个新内容槽。

## 5. Part B7：轻依赖接入形状（2-3 个，比较）

约束回顾（用户原话 + 仓纪律）：不依赖 DSH wiki 组件（已证无，§4.1）；不重依赖；「不发明」纪律（根 AGENTS.md："不自造 spec 流程/调度器/记忆/门禁，优先用 DSH 现成载体"）；动态增长（人/agent 都可加页）；content-charter 四槽三层（wiki 内容属方法/公司层外部输入，不进 persona，L43）。

### 形状 A：外部 markdown wiki + index 指针注入 + fs 工具浏览（内容形状）

- **【建议】** wiki = 一个 git 仓库/目录，按 AK 三层实例化：`raw/`（不可变来源）+ `wiki/`（markdown 页 + index.md + log.md）+ schema（一份 AGENTS.md 式维护协议：页面格式、ingest/query/lint 工作流、index 更新纪律）。
- **落位两选**：(a1) 镜像/克隆进 workspace（如 `.dsh-company/wiki/` 或 workspace 根 `wiki/`）——agent 在 workspace-write 沙箱内**可读写**，动态增长全通；(a2) 原地外部目录，host 注入绝对路径指针——与 handbook 注入 contentDir 完全同构（handbook.ts L43 先例），agent **只读**（沙箱外写不了，cultivation.ts L15-16 同款边界）。
- **注入**：host 只注入几行指针（wiki 根路径 + 「先读 index.md 再钻页」纪律），走现成 systemPrompt.section（handbook 同款）或播种一份 wiki-guide 进 kb（kb-setup/guide.md 同款）。index 本体不进常驻上下文——agent 按需 read。
- **浏览**：复用 tool-fs（read/write/edit）+ tool-fs-search（glob/grep），各角色 preset 已挂载（ceo/agent.cordis.yml 工具面）。AK 实证 ~100 来源/数百页规模 index+unix 工具足够（gist L47），无需搜索服务。
- **动态增长**：人加页 = git 提交/直接写文件；agent 加页 = write/edit（a1 落位）；ingest 时维护者 agent 更新 index.md + log.md（AK 三操作）；skill-filesystem 的 watcher 先例证明盘上变更可被发现（skills.md L81），wiki 若需「新页通知」可借 skills/change 同款思路，但**【推论】** 起步不需要——index 每次按需读，天然新鲜。
- **依赖成本**：零新包、零新服务；新增物 = 一份 schema 文档 + 一段注入代码（或一条 seed 条目）。
- **charter 对齐**：wiki 内容换公司/换方法会变 → 公司/方法层外部输入；persona 只声明「有外部知识地图可查」，不写死内容（L43 铁律满足）。
- **风险**：index 漂移（需 lint 纪律，AK 同款问题）；a2 落位 agent 无法写（增长只能靠人）；wiki 与 kb 边界要写清（kb=公司事实状态，wiki=外部领域/方法知识）。

### 形状 B：wiki 作为 settings 可选知识槽（配置入口）

- **【建议】** 在 HostConfigLike（config.ts L7-10）加 `wikiRoot`（或 wiki 列表）键，cultivationRoot 同款模式：bundle patch 行注入默认值、部署可覆盖、未知键 fail-loud 纪律不变；handbook 注入处读该键生成指针段。用户「依赖哪个 wiki 可配置」由此成立。
- **与姊妹题关系**：`_backlog/_archive/research/startup-settings/README.md` L8 已把「选依赖哪个 wiki」列入 composer 总 settings 研究范围——**【建议】** 本题（wiki 是什么/长什么样）与彼题（settings 入口/持久化/启动注入）正交：A 定义内容形状，B 定义选择入口，落地时应合流，避免两处各造一套配置。
- **依赖成本**：少量 host 代码（一个配置键 + 验证 + 注入分支），无新包。
- **charter 对齐**：「选哪个 wiki」= 部署配置（跟公司走）；wiki 内容本身仍是方法/公司层外部输入。四问答案与 A 相同。
- **风险**：若 startup-settings 题尚未定性，B 的 UI/持久化形状未定——**【建议】** B 可先以 cordis.yml config 键落地（现成载体），UI 入口等姊妹题结论。

### 形状 C：wiki 使用协议作为 skill（按需加载的纪律层）

- **【建议】** 把「何时查 wiki / 如何读 index / 如何 ingest 新来源 / 如何回写答案 / lint 清单」写成一份 SKILL.md（name+description frontmatter，pack 现有 skill 同款形状，如 presets/ceo/skills/assembling-the-team/SKILL.md），放 customSkillDirs（或 _shared/skills）。skill catalog 只常驻 name+description（skills.md L229），协议正文按需加载（L233）——纪律本身也 progressive disclosure。
- **不推荐的变体**：把每个 wiki 页做成一个 skill。**【推论】** 不可行/不合算：skill 名 kebab-case、无嵌套递归发现（skills.md L85），目录树会被压扁；catalog 随页数线性膨胀违背「index 小」原则；且 skill 语义是「怎么做」（方法），wiki 页语义是「是什么」（知识）——四槽错位。
- **依赖成本**：零新包（skill-filesystem 已挂载）；新增物 = 一份 SKILL.md。
- **局限**：skill 是扁平路由，承载不了 wiki 的层级地图——C 只承载协议，不承载内容；必须与 A 组合。

### 专用浏览工具 vs 复用 fs 工具

- **【事实】** 专用工具（wiki_read/wiki_search 等）需要新 tool 包 + presenter + 测试（vendor docs/cookbook/adding-a-tool.md 流程）；fs 工具（read/glob/grep）已全覆盖「读 index→钻页→全文搜」动作。
- **【事实】** AK gist 把搜索列为**可选**升级件（L53 "Optional: CLI tools"，qmd），小 scale index 足够（L47）。
- **【建议】** 起步复用 fs 工具，不造专用工具（「不发明」纪律 + AK 同款渐进）；规模真大了再议 qmd 式本地搜索（仍可是 bash 调 CLI，不必成工具包）。DeepWiki MCP 只作可选外部源（§2.2 依赖成本），不作载体。

### 比较与推荐

| 维度 | A（外部 wiki+指针+fs） | B（settings 知识槽） | C（协议 skill） |
|---|---|---|---|
| 解决什么 | wiki 的内容形状与浏览 | 依赖哪个 wiki 可配置 | 维护/查询纪律的按需加载 |
| 新依赖 | 0 | 0（少量 host 代码） | 0 |
| 动态增长 | a1 落位人/agent 全通；a2 只人 | 不直接涉及 | 协议本身可培养回路演进 |
| 现成载体 | handbook 指针注入 / kb seed / fs 工具 | cultivationRoot 配置模式 | skill-filesystem + SKILL.md |
| charter 对齐 | 方法/公司层外部输入，不进 persona | 部署配置 | 方法层 skill |
| 单独成立？ | 是（最小可用） | 否（需 A 的内容） | 否（需 A 的内容） |

**【建议】推荐组合 = A 为体 + B 为入口 + C 为纪律**，三者都零新依赖、全部复用现成载体；最小起步 = A(a1 镜像进 workspace) + 一份 schema + 一段指针注入，B/C 随 startup-settings 题与培养回路自然合流。**【推论】** 该组合同时满足 AK 四原则（Explicit=index 可浏览、Yours=本地 git、File over app=纯 markdown+fs、BYOAI=不锁模型/ harness）与用户全部约束。

## 6. 获取限制与负证据台账

### 6.1 通道限制（实测）

- **web_fetch 全 DNS 拦截**：实测 `web_fetch raw.githubusercontent.com` 报 "URL hostname ... resolves to a non-public IP address"。与仓内手册一致——`content/AGENTS.md` L34（工作纪律节）："**取证能力边界**：`web_fetch` 对一切域名被 DNS 检查拦截；**shell 出网不受限**（`bash` + `curl` + 浏览器 UA 直取可达）"。本材料全部网络证据经 bash curl（浏览器 UA）取得。
- **x.com 登录墙**：直取推文页 HTTP 200 但返回 JS 壳（无 `__INITIAL_STATE__`、无 og:description），拿不到正文。
- **nitter 已死**：nitter.net 返回关停公告（2026-08-24 X Corp cease-and-desist，2026-10-10 公告），不可用。
- **deepwiki.com 主站**：Vercel Security Checkpoint（需 JS），页面结构未目检；以官方 MCP 文档+公告替代。
- **GitHub gist API**：api.github.com/gists/... 返回 `{"message":"Server Error"}`；改走 gist HTML 页 + raw 版本链接成功。

### 6.2 推文文本的证据分级（重要）

- **一级（X 官方数据端点）**：`cdn.syndication.twimg.com/tweet-result?id=...` 返回作者/时间/正文，但长推（Note Tweet）**截断至 ~275-280 字符**，`note_tweet` 字段只回 id 不回全文（计算正确 token 重试仍如此）。本材料所有推文的**开头段**均经此端点逐字验证。
- **二级（第三方镜像，全文）**：`api.fxtwitter.com`（FxTwitter/FxEmbed 开源镜像）返回完整 Note Tweet 文本。已验证：April 2 / Feb 11 / Apr 4 Farzapedia / Mar 12 四条的镜像开头与一级端点**逐字一致**。全文引用按「镜像全文、开头一手验证」标注。
- **三级（独立 API 抓取合集）**：aeonfun/soul.md 仓 `examples/karpathy/data/x/curated-tweets.md`（自述 2026-04-21 经 surf-mcp 抓取）含 April 2 全文，与 FxTwitter 文本**逐字一致**（diff 仅尾部空白）——构成第三个独立来源互证。
- **未做一手开头验证的**：bacterial 起源推（1941616674094170287，2025-07-05）仅 FxTwitter 单通道全文（§1.3 引用已标注）；其存在与日期另被 Feb 11 推文内链一手证实（Feb 11 全文含该 URL）。
- **时间戳纠错**：promptless.ai 博客称事件发生于 "On April 3, 2026"，与一手 created_at `2026-04-02T20:42:21Z` 不符——按一手 UTC 时间为准（4 月 3 日应为 UTC+8 本地日期）。

### 6.3 负证据（查了没有）

- vendor pin 无 wiki 组件：§4.1 全表（packages/apps/lib/docs/website/native/python/scripts）。
- 本仓 `docs/` 与 `notes/` grep `(?i)wiki|llms\.txt|deepwiki|karpathy|知识地图` **无命中**——此前无 wiki 相关决定或讨论（本研究是首次）。
- `content/manifest.json` 无运行时消费者（src 内 grep 无命中），只有门禁消费——t1/t2 不是自动装载。
- Farzapedia 全文不在 curated-tweets 合集内（grep 无命中），其全文仅镜像通道。

### 6.4 二手来源的使用与证伪

- 二手仅用作**线索与佐证**，未转抄当一手：akitaonrails/ai-memory 研究报告（提供 gist 线索）、promptless.ai（病毒传播描述）、the-decoder（Mar 2025 推文与 llms.txt 关联）、gu-log（Feb 2026 推文引文，已与镜像全文核对一致）、blockchain.news（仅主题级佐证，AI 改写无逐字引文）。
- **证伪一例**：ai-memory 报告把 Farzapedia 编号四原则标为「community paraphrase, not Karpathy's」——一手推文文本（syndication 开头 + 镜像全文）证明编号列表就在 Karpathy 本人推文里。二手综述不可靠，本材料全部关键引文已回一手。

## 7. 开放问题（留给父会话/用户）

1. **「预言语言」确指**：知识库所指已确证（llm-wiki），但「预言语言」一词无法从证据还原（§1.2 推论）——需用户确认是否为「英语/自然语言编程」的转写讹误，或另有所指。
2. **wiki 写权限落位**：a1（镜像进 workspace，agent 可写）vs a2（原地外部目录，agent 只读、人维护）——涉及「agent 能否自主长知识」的授权边界（cultivation 先例是人采纳制，D25 自改否决）。需用户拍板。
3. **wiki 与 kb 的边界判据**：kb=公司事实状态（state），wiki=外部领域/方法知识——是否需要在 content-charter 增补一条判据？（改宪章 = 卡 + 语义审，charter L93-96。）
4. **多角色可见性**：全公司共享一张 wiki，还是角色分域（skill 硬隔离先例 includeDefaultRoots:false vs kb 共享盘先例）？AK 团队示例是共享 wiki + 人在环审核。
5. **index 预算与注入位置**：wiki 指针段进 handbook section（order 500 之后？）还是独立 section？index.md 本身是否受 t1 预算（≤4KB）约束？——涉及门禁扩面。
6. **外部源策略**：DeepWiki MCP / llms.txt 站点是否允许作为 wiki 的可选外部来源（agent 经 bash curl 或 MCP 取）？用户「不想多依赖」的边界是「不依赖组件」还是「不依赖任何外部服务」？
7. **增长节奏**：ingest 由人触发还是 agent 自主？lint 频率？AK 偏好人在环逐条 ingest（gist L37），虚拟公司场景是否沿用「提案-采纳」培养回路同款闸？

## 8. 来源清单（全部获取日期 2026-11-12）

一手（网络）：
- Karpathy llm-wiki gist：https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f （raw rev ac46de1a，全文）
- 推文（x.com URL；正文通道见 §6.2）：2039805659525644595（Apr 2 LLM Knowledge Bases）/ 2040470801506541998（Apr 4 idea file）/ 2040572272944324650（Apr 4 Farzapedia）/ 2021633574089416993（Feb 11 DeepWiki）/ 1941616674094170287（Jul 5 bacterial）/ 2036487306585268612（Mar 24 litellm）/ 1899876370492383450 与 1899888970206765270（Mar 12 LLM-first docs）/ 1617979122625712128（2023 English）
- YC 演讲官方 transcript：https://www.ycombinator.com/library/MW-andrej-karpathy-software-is-changing-again （YouTube LCEmiRjPEtQ）
- llms.txt v2：https://llmstxt.org/ ；实例 https://docs.anthropic.com/llms.txt
- DeepWiki：https://cognition.ai/blog/deepwiki 、https://docs.devin.ai/work-with-devin/deepwiki-mcp 、https://mcp.deepwiki.com/
- AGENTS.md 格式：https://agents.md/

一手（代码，vendor 钉 b830ec95 / 本仓工作树）：
- vendor/dsh/docs/subsystems/skills.md；vendor/dsh/packages/client/ui-primitives/src/SiteGlyph.tsx
- packages/company-pack/src/host/prompt/handbook.ts；src/host/run-bundle/bootstrap.ts、config.ts；src/host/cultivation/cultivation.ts；src/lib/run-bundle-paths.ts
- packages/company-pack/content/manifest.json、README.md、AGENTS.md、kb-setup/seed.json、kb-setup/guide.md；presets/ceo/agent.cordis.yml
- docs/content-charter.md；checks/gates/content-manifest.mjs

二手（仅线索/佐证，已标注）：
- https://raw.githubusercontent.com/akitaonrails/ai-memory/v1.10.1/docs/research-karpathy-llm-wiki.md ；https://promptless.ai/blog/technical/karpathys-llm-wiki-personal-knowledge-base ；https://the-decoder.com/ai-expert-andrej-karpathy-envisions-a-web-where-99-9-of-content-is-optimized-for-ai-not-humans/ ；https://gu-log.vercel.app/en/posts/en-mp-66-20260211-karpathy-deepwiki-mcp-rip-out/ ；https://blockchain.news/ainews/DeepWiki ；https://github.com/aeonfun/soul.md/blob/b0017282153fd410bbefc74d8903e059679c02c6/examples/karpathy/data/x/curated-tweets.md
