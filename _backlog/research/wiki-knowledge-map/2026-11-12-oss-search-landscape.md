---
topic: wiki-knowledge-map
intent: 「靠语言模型能力更好地搜索信息」的开源生态深挖——qmd/纯JS全文库/向量升级件/GraphRAG参照系/wiki生态/agentic search 技术，产出比较表与 L0–L3 搜索阶梯，CJK 检索质量为一等公民
---

# 开源搜索/检索生态深挖：中文 wiki 知识地图的搜索阶梯

> 研究日期 = 2026-11-12（所有网络获取均为当日）；执行 = 研究子代理（父会话 session-a3f1b298 委托）。
> 证据三档：**【事实】** = 一手 URL+逐字原句+获取日期（本地实测给命令与输出）；**【推论】** = 由事实推出；**【建议】** = 设计主张。负证据与获取限制住 §8。
> 前置材料 = 同目录 `2026-11-12-wiki-knowledge-map.md`（AK gist 已考证：~100 来源 index+unix 工具足够，qmd 被列为可选升级件；本材料不重考 AK 推文，只挖搜索生态）。
> 父会话已实跑事实（直接引用）：Node v22.23.1 `require('node:sqlite')` 无 flag 可用（带 ExperimentalWarning）；`:memory:` 上 FTS5 建表成功；`new Intl.Segmenter('zh',{granularity:'word'})` 对「虚拟公司知识地图检索」正确分词为 虚拟/公司/知识/地图/检索。

## 0. 一句话结论

**【建议】** 中文 wiki 的搜索阶梯 = **L0 index+fs 工具（AK 原方案，~100 来源够用）→ L1 零新依赖自建 FTS（node:sqlite FTS5 + Intl.Segmenter 预分词，父会话 404 文件真实语料 + 前任 1 万页压测双实证，查询毫秒级；备选 = FlexSearch 内置 CJK 等零运行时依赖纯 JS 库）→ L2 qmd 式本地 CLI（现成但 ~2GB 模型+原生编译依赖）→ L3 向量混合（DeepSeek 官方 API 无 embeddings 端点，受 embedding 来源制约，暂缓）**。qmd 的 CJK BM25 只是「逐字加空格+短语查询」，并不比自建分词方案更强；其向量侧默认模型对中文覆盖有限（README 自述）。生态正向 Intl.Segmenter 收敛做零依赖 CJK 分词（lunr-languages 明文），bigram 兜底可补词级分词召回缺口。agentic search 五技术（index 先行/查询分解/词汇版 HyDE/LLM 重排/分层摘要）零代码写进 schema 即可（§6）。

## 1. qmd 深挖 + 零新依赖自建 FTS 路径评估

### 1.1 qmd（github.com/tobi/qmd，AK gist 点名的升级件）

**【事实】定位与架构**（README，https://raw.githubusercontent.com/tobi/qmd/main/README.md ，获取 2026-11-12，66,389 字节全文已读）：

> QMD combines BM25 full-text search, vector semantic search, and LLM re-ranking—all running locally via node-llama-cpp with GGUF models.

管线（README 架构图+「Fusion Strategy」节逐字）：查询扩展（fine-tuned 小模型，产出 lex/vec/hyde 三类 typed expansion）→ 原查询（×2 权重）与扩展查询并行走 **BM25（SQLite FTS5）+ 向量**两后端 → **RRF 融合**（"Combine all result lists using `score = Σ(1/(k+rank+1))` where k=60"，top-rank bonus +0.05）→ **LLM 重排**（qwen3-reranker，"LLM scores each document (yes/no with logprobs confidence)"）→ 位置感知混合（"RRF rank 1-3: 75% retrieval, 25% reranker (preserves exact matches)"）。HyDE 是显式组件（架构图 `X --> HYDE[HyDE]`）。

**【事实】存储**：SQLite。FTS 表定义（src/store.ts L1077-1079，https://github.com/tobi/qmd/blob/main/src/store.ts#L1077-L1079 ）：`CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(... tokenize='porter unicode61')`；向量侧用 **sqlite-vec**（package.json 依赖 `sqlite-vec: 0.1.9` + 五平台 optionalDependencies 二进制；store.ts L4805 注释 "sqlite-vec rejects k above this in MATCH queries (v0.1.9)"）。注意 qmd 用 **better-sqlite3**（原生绑定）而非 node:sqlite。

**【事实】CLI/MCP 用法**（README 逐字）：
- CLI：`qmd collection add ~/notes --name notes`（目录→collection）；`qmd context add qmd://notes "Personal notes and ideas"`（树状上下文，README 自称 "This is the key feature of QMD as it allows LLMs to make much better contextual choices when selecting documents"）；`qmd embed`（生成向量）；三档搜索 `qmd search`（"Fast keyword search"）/ `qmd vsearch`（"Semantic search"）/ `qmd query`（"Hybrid + reranking (best quality)"）；`qmd get` / `qmd multi-get`（取文档）。
- agent 友好输出：`qmd search "authentication" --json -n 10`、`qmd query "error handling" --all --files --min-score 0.4`（README："QMD's `--json` and `--files` output formats are designed for agentic workflows"）。
- MCP：stdio 默认 + HTTP transport（共享常驻、避免重复加载模型；README 警告 "the endpoints are unauthenticated — put your own auth in front of a"）；工具 `query`/`get`/`multi_get`/`metadata`，`query` 支持 `rerank: false` 退化为 RRF-only。
- SDK：`createStore({ dbPath })`，"The SDK requires explicit `dbPath` — no defaults are assumed."
- 安装：`npm install -g @tobilu/qmd`（或 bun）；要求 Node >= 22；macOS 需 `brew install sqlite`（"for extension support"）。

**【事实】安装重量（模型下载）**（README「GGUF Models」节逐字表格）：

| Model | Purpose | Size |
|-------|---------|------|
| `embeddinggemma-300M-Q8_0` | Vector embeddings (default) | ~300MB |
| `qwen3-reranker-0.6b-q8_0` | Re-ranking | ~640MB |
| `qmd-query-expansion-1.7B-q4_k_m` | Query expansion (fine-tuned) | ~1.1GB |

"Models are downloaded from HuggingFace and cached in `~/.cache/qmd/models/`." → **首次全功能使用约 2GB 模型下载**；`qmd search`（纯 BM25）不需要模型，但 `query`/`vsearch` 需要。npm 依赖（package.json 逐字）：`better-sqlite3 ^13.0.3`、`node-llama-cpp 3.20.0`、`sqlite-vec 0.1.9`、`web-tree-sitter 0.26.12` + tree-sitter-go/python/rust/typescript 四语法包、`@modelcontextprotocol/server 2.0.0`、fast-glob/picomatch/yaml/zod；`pnpm.onlyBuiltDependencies` 列 better-sqlite3/esbuild/node-llama-cpp/tree-sitter* —— **多个原生编译/预构建二进制依赖**。

**【事实】license 与活跃度**：LICENSE 逐字 "MIT License / Copyright (c) 2024-2026 Tobi Lutke"（https://raw.githubusercontent.com/tobi/qmd/main/LICENSE ）；package.json `"license": "MIT"`，author "Tobi Lutke <tobi@lutke.com>"（Shopify CEO，AK gist 点名来源）。GitHub API（https://api.github.com/repos/tobi/qmd ，获取 2026-11-12）：stars 31,064、created_at 2025-12-08、pushed_at **2026-10-15T03:04:06Z**（距今约 4 周）、open_issues 255、archived false；latest release **v2.8.3 published 2026-08-16**（https://api.github.com/repos/tobi/qmd/releases/latest ）。**【推论】** 维护活跃（月级推送、3 万星），但 255 个开放 issue + 快速迭代（2025-12 创建至今 2.8.x）意味着 API/行为仍在漂移。

**【事实】CJK 表现——两层，都有明确说明**：

1. **BM25 层 = 逐字加空格 + 短语查询**（不是词级分词）。src/store.ts L927-933（https://github.com/tobi/qmd/blob/main/src/store.ts#L927-L933 ，raw 全文已读）逐字：

> ```
> /**
>  * FTS5's unicode61 tokenizer does not segment CJK text into searchable words.
>  * Normalize CJK runs by spacing every character so exact CJK queries can be
>  * translated into phrase queries while Latin text keeps the default tokenizer.
>  */
> export function normalizeCjkForFTS(text: string): string {
>   return text.replace(CJK_RUN_PATTERN, run => ` ${Array.from(run).join(' ')} `);
> }
> ```

   其中 `CJK_RUN_PATTERN = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]+/gu`（L923）。查询侧 `sanitizeFTS5Phrase`（L939-950）把查询同样逐字展开成相邻 phrase terms。**【推论】** 这是「字级 unigram + 短语匹配」：召回靠子串级短语，精度低于词级分词（「知识地图」能中，但「地图」与「知识」的跨词组合噪声更高）；与自建 Intl.Segmenter 词级方案相比**并不更强**，且 qmd 为此维护了版本化重建迁移（`FTS_CJK_NORMALIZED_VERSION`，L924/L1141）。
2. **向量层 = 默认模型中文覆盖有限，需手动换模型**。README「Custom Embedding Model」节逐字：

> Override the default embedding model via the `QMD_EMBED_MODEL` environment variable. This is useful for multilingual corpora (e.g. Chinese, Japanese, Korean) where `embeddinggemma-300M` has limited coverage.
>
> ```sh
> # Use Qwen3-Embedding-0.6B for better multilingual (CJK) support
> export QMD_EMBED_MODEL="hf:Qwen/Qwen3-Embedding-0.6B-GGUF/Qwen3-Embedding-0.6B-Q8_0.gguf"
> ```
>
> Supported model families: **embeddinggemma** (default) — English-optimized, small footprint; **Qwen3-Embedding** — Multilingual (119 languages including CJK), MTEB top-ranked

   换模型后必须 `qmd embed -f` 全量重嵌（"vectors are not cross-compatible between models"）。

**【推论】qmd 对本仓的契合度**：架构是 L2/L3 的完整参考实现（BM25+向量+RRF+LLM 重排+HyDE 全齐），但「不引重依赖」约束下不合格——better-sqlite3/node-llama-cpp/tree-sitter 原生链 + ~2GB 模型 + macOS 还要 brew sqlite；中文场景还需额外换 embedding 模型。**可借鉴不引入**：RRF 融合公式、位置感知混合、context 树、`--json/--files` agent 输出纪律、CJK 归一化思路（自建可用更强的词级分词替代）。

### 1.2 零新依赖自建 FTS 路径：node:sqlite FTS5 + Intl.Segmenter（本轮实测）

父会话已证可用性；本轮补全链路实验与局限评估（全部 2026-11-12 本机实跑，Node v22.23.1，`node -e` 只读实验，未装任何依赖）。

**【事实】实验 A：默认 unicode61 对中文整句成单 token（负证据）**。命令与输出（`:memory:`，3 条中文文档）：

```
sqlite_version: 3.51.3
A1 unicode61 MATCH 知识 -> []                      ← 单词查询零命中
A2 unicode61 MATCH 虚拟公司知识地图检索 -> [{"rowid":1}]  ← 整句才能命中
```

→ 证实 qmd 源码注释同一判断：unicode61 把 CJK 连续段当一个 token，**裸 FTS5 对中文不可用**，必须预分词或换 tokenizer。

**【事实】实验 B：Intl.Segmenter 预分词全链路成立**。`tok = s => [...seg.segment(s)].filter(x=>x.isWordLike).map(x=>x.segment).join(' ')`（`seg = new Intl.Segmenter('zh',{granularity:'word'})`）；写入 `tok(原文)`，查询 `tok(查询)`：

```
B0 tokenize 虚拟公司知识地图检索 -> 虚拟 公司 知识 地图 检索
B1 seg MATCH tok(知识地图) -> rowid 1 与 2 全中（隐式 AND：知识 AND 地图）
B2 seg MATCH tok(检索) ORDER BY bm25(seg) -> 正常返回负分排序
B3 seg MATCH "知识 OR 搜索" -> 3 条全中
```

→ **分词、AND/OR、bm25 排序全部可用**；查询构造纪律 = 查询串同样过 `tok()`，多词默认 AND，需要 OR 时显式拼。

**【事实】实验 C：trigram tokenizer 对 2 字中文词无效（负证据，重要）**。`CREATE VIRTUAL TABLE tri USING fts5(body, tokenize='trigram')`（SQLite 3.51.3 支持建表）：

```
C1 trigram MATCH 知识   -> []   ← 2 字词零命中
C2 trigram MATCH 图检索 -> [rowid 1]  ← 3 字子串可中
C3 trigram MATCH 知     -> []   ← 1 字零命中
```

→ trigram 以 3 字符滑窗建 token，**查询必须 ≥3 字符**；中文高频词多为 2 字（知识/检索/公司），trigram 路线对中文基本不可用（除非查询改写补字，得不偿失）。**【推论】** 「FTS5 trigram 免分词」这一直觉方案被证伪，Intl.Segmenter 预分词是零依赖下的正解。

**【事实】实验 D：规模压测（1 万中文页）**。10,000 条 ~60 字中文文档（模板生成），title+body 双列 FTS5，Intl.Segmenter 分词后事务写入 + `optimize`：

```
insertMs: 1272（含分词）   dbBytes: 4,386,816（4.18MB）
查询延迟（bm25 排序 LIMIT 10）：知识地图 0.79ms / 检索 0.99ms / 开源 软件 1.68ms / 市场 分析 1.29ms
MATCH tok(评审) 命中 2000 条（召回正确）
```

→ **【推论】** AK 式 wiki（~100 来源/数百页）远在能力范围内；即便涨到 1 万页，索引 4MB 级、查询毫秒级、全量重建秒级——**L1 自建 FTS 的规模上限对虚拟公司场景基本不构成约束**。注意「虚拟公司 团队」AND 查询 0 命中是语料本身无共现（AND 语义正确），提示查询协议要写清 AND/OR 降级策略（§6）。

**【事实】实验性 API 状态**：运行时仍打印 `ExperimentalWarning: SQLite is an experimental feature and might change at any time`（本轮每次 node:sqlite 实验均出现）。官方文档核验（https://nodejs.org/docs/latest-v22.x/api/sqlite.html ，获取 2026-11-12）：模块级 "Stability: 1.1 - Active development"，部分 API "Stability: 1 - Experimental"。

**【推论】局限清单**：
1. **实验性 API**：node:sqlite 在 v22 仍 Experimental，跨 Node 大版本可能有 API 变化；缓解 = 封装薄适配层 + 升级 Node 时跑回归（本仓 keyless 测试可容纳）。
2. **分词质量**：Intl.Segmenter 是 ICU 词典分词，无用户词典/新词发现；「虚拟公司」这类专有组合可能被切开（实测切为 虚拟/公司）——查询与文档用同一分词器即可对齐，但跨词形召回（「虚拟机」vs「虚拟」）依赖 OR 降级或字级兜底。
3. **无增量同步魔法**：FTS 表与 wiki 文件的一致性要自己维护（ingest/lint 时重建或 upsert）；qmd 用触发器+迁移解决，自建可用「全量重建秒级」偷懒（实验 D 支撑）。
4. **查询构造纪律**：用户/agent 查询必须过同一 `tok()`；FTS5 MATCH 语法字符（引号/`*`/`-`/`:`）需转义，否则报错或语义漂移——这是 schema 里要写的协议，不是代码难题。

## 2. 纯 JS 全文搜索库（自建候选）

> 本节起由父会话接手补全（前任子代理两次中断；§1 为其成果）。元数据一手 = GitHub API + npm registry（bash curl，获取 2026-11-12）；CJK 行为一手 = 各项目 README/docs 原句。

**【事实】四库元数据**（npm registry latest + GitHub API）：

| 库 | license | 版本/发布 | stars | 最近 push | 运行时依赖 |
|---|---|---|---|---|---|
| MiniSearch（lucaong/minisearch） | MIT | 7.2.0 / 2025-09-16 | 6,197 | 2025-09-16 | **{}（零）** |
| Orama（oramasearch/orama） | Apache-2.0（npm 包） | 3.1.18 / 2025-12-19 | 10,608 | 2026-10-18 | **{}（零）** |
| FlexSearch（nextapps-de/flexsearch） | Apache-2.0 | 0.8.212 / 2025-09-06 | 13,820 | 2026-06-28 | **{}（零）** |
| Lunr（olivernn/lunr.js） | MIT | 2.3.9 / **2020-08-19** | —（repo 更名，API 404） | 核心停滞 ~6 年 | **{}（零）** |

**【事实】CJK 支持逐个核验**：

- **MiniSearch**：默认分词 = 按 Unicode 空格/标点切分（README Tokenization 节逐字："By default, documents are tokenized by splitting on Unicode space or punctuation characters. The tokenization logic can be easily changed by passing a custom tokenizer function as the `tokenize` option"，https://raw.githubusercontent.com/lucaong/minisearch/master/README.md L258-260）。**无内置 CJK**——中文整句会成一个巨 token；但 `tokenize` 可插 Intl.Segmenter（接口现成）。
- **Orama**：自述 "Stemming and tokenization in 30 languages"（README L26）；中文专页逐字："At the time of writing, Orama supports Chinese (Mandarin) via a custom tokenizer, which is part of the `@orama/tokenizers` package."（https://docs.orama.com/docs/orama-js/supported-languages/using-chinese-with-orama ，正文嵌在 RSC payload，已提取）。定位 = "A complete search engine and RAG pipeline in your browser, server or edge network"（GitHub description）——全文+向量+混合一体。
- **FlexSearch**：**内置 CJK encoder**，四库中唯一开箱即用。README Supported Charsets 逐字："Latin / Chinese, Korean, Japanese (CJK) / Hindi / Arabic / Cyrillic / Greek and Coptic"；doc/encoder.md "CJK Word Break (Chinese, Japanese, Korean)" 节示例逐字：`const index = new Index({ encoder: Charset.CJK }); index.add(0, "一个单词"); var results = index.search("单词");`（https://raw.githubusercontent.com/nextapps-de/flexsearch/master/doc/encoder.md L570-576）。
- **Lunr**：核心 2020 年后未发版（npm time 一手）；中文靠 **lunr-languages**（MihaiValentin/lunr-languages），其 README 脚注逐字："Chinese tokenization uses `Intl.Segmenter` with CJK bigrams by default, which works in modern browsers and Node.js without native dependencies. In Node.js, if `@node-rs/jieba` is installed, Lunr Languages uses it automatically for higher-quality Jieba segmentation."（https://raw.githubusercontent.com/MihaiValentin/lunr-languages/master/README.md L55）；Chinese Tokenization 节并说明 bigram 的作用："Bigrams improve recall for common two-character search terms such as `车主` and `学姐`, while Jieba generally provides better precision and ranking for serious Chinese search."（L204）

**【推论】** ① 生态正在向 **Intl.Segmenter 收敛**做零原生依赖的 CJK 分词（lunr-languages 明文；与本仓探针同路线，互为佐证）；② **bigram 兜底**是词级分词召回缺口的现成解法（探针 §3.1「双语→双|语」类问题，索引侧加字级 bigram 即可补）；③ 四库都是可靠开源（MIT/Apache、零运行时依赖），但**都引入一个 npm 依赖面**——与 node:sqlite 内置路线相比多一层供应链；lunr 核心停滞是减分项（其 zh 能力住在活跃的 lunr-languages）。④ 若想要浏览器侧/内存态搜索（client 面板内搜 wiki）或避开实验性 API，FlexSearch（内置 CJK）与 MiniSearch（插 Segmenter）是首选候选。

## 3. 向量/混合检索升级件（只评估，不推荐轻率引入）

**【事实】候选重量**（GitHub API，获取 2026-11-12）：

| 件 | license | stars | 最近 push | 重量/形态 |
|---|---|---|---|---|
| sqlite-vec（asg017/sqlite-vec） | Apache-2.0 | 8,261 | 2026-05-18 | SQLite **C 扩展**（loadable extension），"A vector search SQLite extension that runs anywhere!" |
| LanceDB（lancedb/lancedb） | Apache-2.0 | 11,881 | 2026-11-12 | **Rust 核心 + 原生绑定**，嵌入式多模态检索库 |
| transformers.js（huggingface/transformers.js） | Apache-2.0 | 16,413 | 2026-11-11 | JS + ONNX/wasm 运行时，**模型文件另下**（多语 embedding 模型百 MB 级起） |
| node-llama-cpp（withcatai/node-llama-cpp） | MIT | 2,203 | 2026-11-05 | llama.cpp **原生编译**绑定 + GGUF 模型（qmd 同款底座，§1.1） |

**【事实·负证据】DeepSeek 官方 API 无 embeddings 端点**：官方文档 sitemap（https://api-docs.deepseek.com/sitemap.xml ，获取 2026-11-12）枚举的全部 API 页 = create-chat-completion / create-completion / create-file / create-message / create-response / delete-file / fetch / get-user-balance / list-files / list-models / retrieve-file / search——**无 embeddings/向量端点**；首页 grep `embedding` 零命中。

**【推论】** 向量路线的 embedding 来源只有两条：本地模型（transformers.js / node-llama-cpp，模型下载+原生/wasm 重量）或第三方 API（新供应商依赖）——在「零/轻依赖 + 只用可靠开源」约束下都偏重；且 qmd 已证默认 embedding 模型中文覆盖有限（§1.1 README 原句）。**L3 暂缓**，触发条件 = 语义召回（同义改写）成为真实痛点且愿意接受模型重量。sqlite-vec 是「将来若要在 SQLite 里加向量」的最短路径（与 FTS5 同库），但 node:sqlite 加载 C 扩展需 `allowExtension` 面 + 平台二进制分发，届时再评估。

## 4. LLM 编译知识图谱/高级 RAG（参照系）

**【事实】**（GitHub API + README 定位句，获取 2026-11-12）：

| 项目 | license | stars | 语言 | 最近 push | 一句话定位 |
|---|---|---|---|---|---|
| microsoft/graphrag | MIT | 36,630 | Python | 2026-11-09 | "A modular graph-based Retrieval-Augmented Generation (RAG) system"——LLM 抽实体图 + 社区摘要 |
| HKUDS/LightRAG | MIT | 40,661 | Python | 2026-11-11 | "[EMNLP2025] LightRAG: Simple and Fast Retrieval-Augmented Generation"——图+向量双层检索 |
| gusye1234/nano-graphrag | MIT | 4,004 | Python | 2026-01-27 | "A simple, easy-to-hack GraphRAG implementation" |
| parthsarthi03/raptor | MIT | 1,780 | Python | 2024-09-03 | RAPTOR 官方实现（研究代码，已停滞）——递归聚类+摘要树 |
| infiniflow/ragflow | Apache-2.0 | 94,047 | Go+Python | 2026-11-12 | "RAGFlow is an agent-native database"——完整平台（服务栈），最重 |

**【推论】** 全部是 Python/平台栈 + LLM 编译 token 成本 + 外部服务依赖，与轻依赖目标不符——**只借思想不引入**：分层摘要（RAPTOR）、实体互链（GraphRAG）正是 AK wiki 用「LLM 手工编译 index+互链页」实现的东西（主材料 §1.1）；AK 路线把编译成本摊到日常 ingest、把维护交给 agent，换来零运行时基础设施。RAPTOR 论文摘要一手见 §6。

## 5. wiki 生成/浏览生态（借鉴不依赖）

**【事实】**（GitHub API + README，获取 2026-11-12）：

- **deepwiki-open**（AsyncFuncAI/deepwiki-open）：MIT，18,407 stars，Python，push 2026-11-12。"Open Source DeepWiki: AI-Powered Wiki Generator for GitHub/Gitlab/Bitbucket Repositories"——repo→wiki 自动生成（RAG+LLM），需 Python 服务 + 模型 API。**借鉴**：structure→pages→ask 的三层结构（与 Cognition DeepWiki 同构，主材料 §2.2）。
- **Quartz**（jackyzha0/quartz）：MIT，13,573 stars，TypeScript，push 2026-11-10。"a fast, batteries-included static-site generator that transforms Markdown content into fully functional web[site]"——markdown→静态站（backlinks/图谱/搜索内置）。**定位**：AK wiki 的**人浏览层**可选件（Obsidian 的开源替代），产物是静态文件，agent 侧零依赖。
- **Obsidian**：闭源商业软件（非开源）——AK 用它作人浏览 IDE（主材料 §1.1 TLDR），只登记不推荐为依赖。
- **MCP memory 服务器**：modelcontextprotocol/servers（91,937 stars，参考服务器合集，per-server MIT）；**basic-memory**（basicmachines-co/basic-memory）：AGPL-3.0，4,555 stars，Python，push 2026-11-11，"AI conversations that actually remember"——**markdown 为底座的记忆知识图谱**（MCP 接入）。**借鉴**：「markdown 即记忆基质」与 AK File-over-app 同向；AGPL + Python + MCP 依赖面不符合本仓约束，不引入。DSH 官方已给第三方记忆 MCP 的 default-off overlay 先例（家底材料 §2.2 引 `docs/user/guide/mcp-memory.md`）。
- **llms.txt 生成工具**：主材料 §2.1 已覆盖（Mintlify/GitBook/VitePress 插件等），不重复。

## 6. 无基础设施的 agentic search 技术（靠 LLM 能力本身）

> 这一层是用户「靠语言模型的能力更好地搜索到信息」的直接答案：**不写代码、不加依赖，把查询纪律写进 wiki schema（维护协议）即可**。

**【事实】一手来源**（arxiv abs 页摘要逐字节选，bash curl 获取 2026-11-12）：

- **HyDE**（https://arxiv.org/abs/2212.10496 ，"Precise Zero-Shot Dense Retrieval without Relevance Labels"）："Given a query, HyDE first zero-shot instructs an instruction-following language model (e.g. InstructGPT) to generate a hypothetical document. The document captures relevance patterns but is unreal and may contain fal[se details]..."——先让 LLM 生成假想答案文档再去检索。
- **Search-R1**（https://arxiv.org/abs/2503.09516 ，"Training LLMs to Reason and Leverage Search Engines with Reinforcement Learning"）："the LLM learns to autonomously generate (multiple) search queries during step-by-step reasoning with real-time [search engine interaction]"——RL 训练模型在推理中自主多轮发查询。
- **RAPTOR**（https://arxiv.org/abs/2401.18059 ）："recursively embedding, clustering, and summarizing chunks of text, constructing a tree with differing levels of summarization from the bottom up"——分层摘要树检索。
- **index-first / progressive disclosure**：AK gist L47 与 llms.txt v2 原句已在主材料 §1.1/§2.1 一手引用，不重复。
- **LLM-as-reranker**：qmd 用 qwen3-reranker 做重排（§1.1 README 原句）。

**【推论】零依赖对应物**（全部可写成 schema 里的查询协议）：
1. **index 先行**：先读 index.md 语义路由，再钻页（AK 原方案，~100 来源实证够用）。
2. **查询分解 + 迭代搜读**：复杂问题拆子查询 → FTS/grep 召回 → read 钻页 → 不够再改查询（Search-R1 的 prompt 协议版，无需 RL）。
3. **词汇版 HyDE**：检索前让 LLM 把问题扩成「假想答案里会出现的关键词」再查 FTS（qmd query expansion 的零模型版；对中文同义改写尤其有用）。
4. **LLM 重排**：FTS 返回 top-k 后由 agent 读 snippet 自判相关性（原生能力，无需 reranker 模型）。
5. **分层摘要**：index（一句话/页）→ 页首摘要 → 正文，即 RAPTOR 树的手工维护版；好答案回写为新页（AK Query 操作）让检索复利。

**【建议】** wiki schema 的「查询协议」节直接收这五条；它们与 L0/L1 搜索层正交——搜索层给召回，协议给判断，这正是「LLM 能力 × 轻基础设施」的分工。

## 7. 比较表与搜索阶梯

**【建议】总比较**（依赖重量以「本仓新增」计）：

| 方案 | 新依赖 | license | CJK | 维护 | 自建契合度 |
|---|---|---|---|---|---|
| L0 index + read/glob/grep | **0**（rg 随 DSH 分发，家底材料 §1） | — | index 自然语言路由，无分词问题 | DSH 内置 | ★★★★★ |
| L1a node:sqlite FTS5 + Intl.Segmenter | **0**（运行时内置；实验性 API） | — | 词级分词，bigram 可兜底 | DSH session-query 同款先例（家底材料 §4.3） | ★★★★★ |
| L1b FlexSearch / MiniSearch / Orama / lunr+zh | 1 个 npm 包（零运行时依赖） | Apache/MIT | FlexSearch 内置 CJK；lunr-zh=Segmenter+bigram；Orama=@orama/tokenizers；MiniSearch 自插 | 活跃（lunr 核心除外） | ★★★★ |
| L2 qmd CLI（BM25+向量+重排） | ~2GB 模型 + 原生编译链 | MIT | BM25 逐字+短语；向量需换 Qwen3-Embedding | 活跃（31k stars） | ★★（借鉴不引入） |
| L3 向量混合（sqlite-vec/LanceDB/transformers.js） | 原生扩展/模型重量 | Apache/MIT | 取决于 embedding 模型 | 活跃 | ★（DeepSeek 无 embeddings 端点，暂缓） |
| GraphRAG 系 / RAGFlow | Python 平台栈 | MIT/Apache | — | 活跃 | 参照系 |

**【建议】搜索阶梯与升级触发信号**：

- **L0（起步）**：index.md 先行 + fs 工具浏览。**触发升级**：页数超过约 100–200（AK 实证规模上限）、或「index 浏览找不到」频发、或需要关键词召回排序。
- **L1a（第一升级，零依赖）**：自建 FTS5 索引（探针实证：404 文件 1.4s 建索引、毫秒查询；前任 1 万页压测同量级）。**触发换 L1b**：需要浏览器侧/内存态搜索（client 面板内搜），或要避开实验性 API。
- **L1b（备选）**：FlexSearch（内置 CJK）或 MiniSearch+Segmenter；lunr-languages 的 bigram 兜底思路无论哪条都值得抄。
- **L2（语义召回需求真出现时）**：qmd 式 CLI 经 bash/MCP 接入（MCP 客户端 DSH 已内置，家底材料 §2）；接受 ~2GB 模型与原生链才算。
- **L3（暂缓）**：embedding 来源（本地模型/第三方 API）解决后再议；sqlite-vec 是与 FTS5 同库的最短路径。

**【推论】** 本仓推荐起点 = **L0 + L1a**（双零依赖，各有实证与 DSH 先例），L1b 登记为备选，L2/L3 写清触发条件留待将来——与用户「自建、只靠可靠开源」完全同向。

## 8. 获取限制与负证据

### 8.1 通道限制（实测）

- **web_fetch DNS 拦截**：本轮实测 `web_fetch https://raw.githubusercontent.com/tobi/qmd/main/README.md` 报 `URL hostname "raw.githubusercontent.com" resolves to a non-public IP address`（获取 2026-11-12）。与前置材料 §6.1 一致：全部网络证据改经 bash curl（浏览器 UA）取得，shell 出网不受限。
- GitHub API（api.github.com）未认证可用，本轮用于 repo 元数据/树/release；速率限制 60 次/小时，用量已登记于 §9。

### 8.2 负证据（查了没有/不成立）

- 裸 FTS5 unicode61 中文单词查询零命中（实验 A）。
- FTS5 trigram 对 2 字中文词零命中（实验 C）——「免分词 trigram」路线证伪。
- **DeepSeek 官方 API 无 embeddings 端点**（sitemap 全枚举 + 首页 grep 零命中，§3）。
- Lunr 核心 2020-08-19 后未发版（npm registry time 一手，§2）；其 repo 已更名 olivernn/lunr.js（旧名 olivernight/lunr 404）。
- Orama repo 现名 oramasearch/orama（oramasearch 与 askorama 均非；GitHub API 重定向实测）。

### 8.3 获取限制（父会话补全阶段）

- developers.google.com 直接 curl 返回 301，需 `-L` 跟随；docs.orama.com 为 JS 壳，正文嵌在 RSC payload 里（已用 node 提取原句）。
- GitHub API 未认证限 60 次/小时，本轮用量登记：父会话约 25 次 + 前任子代理若干（rate_limit 端点实测 remaining 54，2026-11-12）。
- NLWeb repo 元数据 API 两次返回空（原因不明），改用 raw README 一手（§5 未引其元数据）。

## 9. 来源清单（全部获取日期 2026-11-12）

一手（网络，bash curl + 浏览器 UA）：
- qmd README：https://raw.githubusercontent.com/tobi/qmd/main/README.md （66,389 字节全文）
- qmd package.json：https://raw.githubusercontent.com/tobi/qmd/main/package.json （v2.8.3 全文）
- qmd LICENSE：https://raw.githubusercontent.com/tobi/qmd/main/LICENSE （MIT 全文）
- qmd src/store.ts：https://raw.githubusercontent.com/tobi/qmd/main/src/store.ts （263,828 字节；CJK 节 L922-960、FTS 建表 L1077-1079 已读）
- qmd src/db.ts：https://raw.githubusercontent.com/tobi/qmd/main/src/db.ts （6,640 字节）
- qmd repo 元数据：https://api.github.com/repos/tobi/qmd ；release：https://api.github.com/repos/tobi/qmd/releases/latest ；树：https://api.github.com/repos/tobi/qmd/git/trees/main?recursive=1

一手（本地实测，Node v22.23.1 / SQLite 3.51.3，命令与输出见 §1.2）：
- 实验 A/B/C：`:memory:` FTS5 unicode61 vs Intl.Segmenter 预分词 vs trigram
- 实验 D：临时目录文件库 1 万中文页压测（mktemp，跑后即删，未留仓库残留）

一手（网络，父会话补全阶段，bash curl + 浏览器 UA，获取 2026-11-12）：
- GitHub API 元数据：lucaong/minisearch、oramasearch/orama、nextapps-de/flexsearch、asg017/sqlite-vec、lancedb/lancedb、huggingface/transformers.js、withcatai/node-llama-cpp、microsoft/graphrag、HKUDS/LightRAG、gusye1234/nano-graphrag、parthsarthi03/raptor、infiniflow/ragflow、AsyncFuncAI/deepwiki-open、jackyzha0/quartz、modelcontextprotocol/servers、basicmachines-co/basic-memory
- npm registry：https://registry.npmjs.org/lunr 、/ @orama/orama 、/ minisearch 、/ flexsearch（latest/time/license/repository/dependencies）
- MiniSearch README：https://raw.githubusercontent.com/lucaong/minisearch/master/README.md （Tokenization 节 L256-286）
- FlexSearch README + encoder doc：https://raw.githubusercontent.com/nextapps-de/flexsearch/master/README.md （Supported Charsets）、https://raw.githubusercontent.com/nextapps-de/flexsearch/master/doc/encoder.md （CJK Word Break L570-576）
- lunr-languages README：https://raw.githubusercontent.com/MihaiValentin/lunr-languages/master/README.md （Supported Languages 脚注 L55、Chinese Tokenization 节 L196-204）
- Orama 中文文档：https://docs.orama.com/docs/orama-js/supported-languages/using-chinese-with-orama （RSC payload 提取原句）
- DeepSeek API sitemap：https://api-docs.deepseek.com/sitemap.xml （全枚举，无 embeddings）
- arxiv 摘要：https://arxiv.org/abs/2212.10496 （HyDE）、https://arxiv.org/abs/2503.09516 （Search-R1）、https://arxiv.org/abs/2401.18059 （RAPTOR）
- node:sqlite 稳定性：https://nodejs.org/docs/latest-v22.x/api/sqlite.html （Stability: 1.1 / 1）
