---
topic: wiki-knowledge-map
intent: DSH 检索/知识家底逐项源码盘点（fs 搜索/MCP/web/session 检索/记忆上下文/插件生态/运行时），判定零依赖自建 wiki 能复用什么、必须自建什么
---

# DSH 检索/知识家底盘点（wiki 自建视角）

> 研究日期 = 2026-11-12；执行 = 新鲜上下文研究子代理（父会话 session-a3f1b298 委托）。
> 证据三档：**【事实】** = 代码路径+行号+原句，或本地只读实测命令+输出；**【推论】**；**【建议】**。负证据集中住 §9。
> 权威源码 = `vendor/dsh` 钉 `b830ec950faba0a46dda564be3e2d854afed94f1`（tag `dsh-v0.2.1-rc.5`），本轮只读未改（开工时 `git rev-parse HEAD` 核对一致、`status --porcelain` 空）。
> 姊妹材料 `2026-11-12-wiki-knowledge-map.md` 已证：vendor 无 wiki 组件（其 §4.1）、skill catalog→body 按需加载（其 §4.3）、公司 pack handbook 指针注入/kb 播种/培养回路（其 §4.2）——本材料不重做，只挖检索/知识家底。
> 行号均指 vendor 树内文件（路径以 `vendor/dsh/` 为根者另注）。全局安装 checkout 仅作生态对照（§6.4）。

## 0. 一句话结论

**【事实】** DSH 的检索家底 = ① 随包分发的 ripgrep 15.0.0（grep/glob 工具，零系统依赖、默认挂载）② MCP **纯客户端**（一行 cordis 配置即接任意外部 MCP server，默认无 server）③ web_search/web_fetch（DeepSeek 后端默认挂载；fetch 有公网 IP 守卫，本机 fake-IP DNS 是「拦一切域名」的根因，配 HTTPS_PROXY 可绕）④ 会话历史 FTS5 全文检索（node:sqlite + unicode61，默认关，只搜会话不搜文件）。**【推论】** 自建 markdown wiki 的「全文搜 + 浏览 + 外部知识接入」三件事全部有零新依赖的现成通道；必须自建的只有 wiki 内容层本身（目录/index/维护协议）与（若要中文全文搜）分词预处理——DSH 没有面向任意文件的知识索引组件。

## 1. fs 搜索工具 internals：grep/glob = 随包 ripgrep，零系统依赖

### 1.1 包位置与底层

**【事实】** grep/glob 两工具同住一个包：`vendor/dsh/packages/fs/tool-fs-search/`（npm 名 `@deepseek-ai/dsh-tool-fs-search`，version `0.2.1-rc.5`）。package.json description 原句：

> "Model-facing filesystem discovery tools (glob, grep) backed by the packaged ripgrep binary (@vscode/ripgrep)"

dependencies 只有两条：`"@vscode/ripgrep": "^1.18.0"` 与 `@deepseek-ai/schemastery`（package.json dependencies 节）。

**【事实】** 底层就是 ripgrep，且 **glob 也是 rg**（不是独立实现）：
- `src/search-core.ts` L4-12（模块头注，逐字）："the package-owned `SEARCH_*` error vocabulary, one spawn helper that runs the PACKAGED ripgrep binary (`@vscode/ripgrep`) with a plain argv vector ... The ripgrep binary ships inside the npm package, so no system `rg` install is required, and no shell layer exists between the argv vector and ripgrep, so no shell quoting is involved."
- `src/grep.ts` L101："Build the fixed line-oriented `rg --json` argv for one `grep` call."；L286 工具 description："Search file contents with a ripgrep regular expression. Returns matching lines with line numbers, grouped by file."
- `src/glob.ts` L78："Build the fixed `rg --files` argv for one `glob` call."；L28 注释：VCS 等目录名 ripgrep 绝不下降。
- 执行走 `ctx.subprocess.spawn()`（`src/index.ts` L9-10），不经 shell、不是后台任务（search-core.ts L8-10）。

### 1.2 rg 二进制随 DSH 分发（含单文件运行时 sidecar）

**【事实】** 二进制解析 = `src/search-core.ts` L171-184 `resolveRgPath()`：每进程懒解析一次；pkg 单文件运行时用可执行文件旁的 `-rg` sidecar（L174-177：win32 `<exe名>-rg.exe`，其余 `${process.execPath}-rg`）；Node 模式回退 `(await import('@vscode/ripgrep')).rgPath`（L178）；Electron 把 `.asar` 替换为 `.asar.unpacked`（L179-181）。L162-166 注释："A single-file runtime uses the executable's `-rg` sidecar because a native helper cannot be spawned from pkg's virtual filesystem. Node-mode builds fall back to the platform package selected by `@vscode/ripgrep`."

**【事实】** 平台二进制以 npm optional 平台包分发：`vendor/dsh/pnpm-lock.yaml` L19336 起列 `@vscode/ripgrep-darwin-arm64@1.18.0`、`darwin-x64`、`linux-arm64/arm/ia32/ppc64/riscv64/s390x/x64`、win32 各架构。

**【事实】本地实测**（2026-11-12，本仓 node_modules，只读）：

```
$ node_modules/.pnpm/@vscode+ripgrep-darwin-arm64@1.18.0/node_modules/@vscode/ripgrep-darwin-arm64/bin/rg --version
ripgrep 15.0.0 (rev 3a612f88b8)
features:+pcre2
simd(compile):+NEON
simd(runtime):+NEON
PCRE2 10.45 is available (JIT is available)
```

即 @vscode/ripgrep 1.18.0 装的是 **ripgrep 15.0.0，带 PCRE2**；二进制真实在盘（本仓 pnpm setup 已装）。

### 1.3 预算、溢出与默认挂载

**【事实】** 默认上限：`src/grep.ts` L29 `export const GREP_MAX_MATCHES = 250`；`src/glob.ts` L25 `export const GLOB_MAX_RESULTS = 100`；`src/search-core.ts` L36 `RAW_OUTPUT_MAX_BYTES = 20_000_000`（注释 L33-34："matching Claude Code's ripgrep raw buffer"）、L43 `SEARCH_TIMEOUT_MS = 30_000`。超上限的完整结果落 spill：search-core.ts L15-17 "The model-facing recovery artifact is the formatted result saved through `ctx.spillStore.saveText()`"；grep.ts L287 工具描述原句："Returns up to ${caps.maxMatches} matches; a larger result reports where the complete match list was saved."

**【事实】** 默认挂载：`vendor/dsh/packages/bundle/base/cordis.patch.yml` L298-301：

```yaml
    - id: tool-fs-search
      name: '@deepseek-ai/dsh-tool-fs-search'
      config:
        sampleOverCapGlobResults: false
```

无 disabled → base 默认启用。Web app 把 host 面该行关掉（`bundle/web-app/cordis.patch.yml` L507-508 `- id: tool-fs-search / disabled: true`），改由每个 agent preset 挂（`bundle/web-app/presets/standard.patch.yml` L29-30 同款 name 行）——即 Web 会话里 grep/glob 仍是默认可用，只是挂点在 preset。

**【推论】** 「wiki 全文搜」零依赖现成：grep 就是带 PCRE2 的 ripgrep 全文正则搜，glob 就是文件发现，二者已默认挂载、二进制随 DSH 分发、无需系统 rg、无需新包。AK gist 的「unix 工具浏览 wiki」在 DSH 里是一等工具而非 bash 借道。局限（事实）：grep 是**正则行匹配**，无排序/无分词/无摘要——数百页规模够用（AK 同规模实证），更大规模的「相关性排序搜」要自建（§8）。

## 2. MCP：纯客户端，一行配置接外部 server；DSH 不自暴露为 MCP server

### 2.1 client or server？

**【事实】** `vendor/dsh/packages/mcp/` 只有两个子包：`mcp-client`、`mcp-resources`。组 README（`packages/mcp/README.md` Summary）原句：

> "The `mcp/` group lets the model call external Model Context Protocol (MCP) tools and read server resources. Configure only `mcp-client` entries; shipped profiles already mount `mcp-resources` once."

**【事实】负证据（server 侧）**：全 `vendor/dsh/packages/**/*.ts` grep `McpServer|mcp-server|serveMcp|as an MCP server|expose.*MCP`，命中仅两类：① mcp-client 的**测试夹具**（tests/fixture-server.ts 等用官方 SDK `@modelcontextprotocol/server` 造假 server 供测试）；② ACP 包（`packages/acp/acp/src/mcp.ts` L26 `mountAcpMcpServers`，把 ACP 协议传入的 McpServer 配置转成 `McpClient.Config[]`——仍是 client 消费）。无任何把 DSH 自身暴露为 MCP server 的产品代码。

**【事实】** `mcp-resources` 提供三个共享资源工具（`src/tools.ts` L34/L43/L52）：`list_mcp_resources`、`list_mcp_resource_templates`、`read_mcp_resource`（按 server 名 + URI 读资源）。base bundle 默认只挂它（`bundle/base/cordis.patch.yml` L492-493）。

### 2.2 会话接 MCP server 的配置形状

**【事实】** 形状 = cordis 组合里**一 server 一行插件条目**（`packages/mcp/mcp-client/README.md` Minimal configuration 节，逐字）：

```yaml
- id: mcp-github
  name: '@deepseek-ai/dsh-mcp-client'
  config:
    serverName: github
    transport: stdio
    command: npx
    args: ['-y', '@modelcontextprotocol/server-github']
    env:
      GITHUB_TOKEN: !!js process.env.GITHUB_TOKEN

- id: mcp-web
  name: '@deepseek-ai/dsh-mcp-client'
  config:
    serverName: web
    transport: streamable-http
    url: http://localhost:3000/mcp
    headers:
      Authorization: !!js '`Bearer ${process.env.MCP_TOKEN}`'
```

关键字段（同 README 字段表）：`transport` = `stdio | streamable-http`（必填）；`serverName` 必填、`[A-Za-z0-9_-]{1,32}`；stdio 用 command/args/env/cwd，http 用 url/headers；`toolCallTimeoutMs` 默认 60,000；`failOnStartupError` 默认 false（连不上照样启动，只是没工具）；自动重连默认开（500ms 起指数退避、30s 封顶、10 次预算）。工具名 = `mcp__<serverName>__<rawName>`（README："the same naming shape Claude Code and Codex use"）。

**【事实】** 默认无 server：README Summary 原句 "No server is enabled by default."；base bundle 无 mcp-client 行（grep 只见 mcp-resources，§2.1）。持久化接法 = 把 insert 行并进 `$DSH_HOME/profiles/<name>/cordis.patch.yml` 或 `$DSH_HOME/cordis.patch.yml`（`docs/user/guide/mcp-memory.md` Enable one 节原句），或启动时 `--patch <overlay.yml>`。

**【事实】** 官方已给「第三方记忆 MCP」参考配置（`docs/user/guide/mcp-memory.md`，详见 §5.2/§6.3）：三个 default-off overlay 在 `vendor/dsh/apps/cli/config/examples/mcp-memory/`（memorix / mcp-reference-memory / engram 三个 .cordis.yml，实测 ls 在盘）。

**【推论】** qmd MCP（本地 CLI+MCP）与 DeepWiki MCP（`https://mcp.deepwiki.com/mcp`，streamable-http、无认证——URL 见姊妹材料 §2.2 一手）这类外部搜索服务，**不需要装任何新 npm 插件包**：`dsh-mcp-client` 已随 DSH 分发，缺的只是一行 insert 配置（overlay/profile patch）。这满足「不依赖别的插件」的字面约束（不新增包），但引入了外部进程/服务依赖（qmd 要另装 CLI；DeepWiki 是远端服务）——是否算「重依赖」由用户边界定（姊妹材料开放问题 6）。

## 3. web_search / web_fetch：DeepSeek 后端默认挂载；DNS 守卫源码与本机根因

### 3.1 包与默认选择

**【事实】** 包组 = `vendor/dsh/packages/web/`，七包分工（组 README 表，逐字摘）：`web/` = "Search/fetch service ... one selection and error policy"（ctx.web）；`web-search-exa/`、`web-search-perplexity/`、`web-search-deepseek/` = 三个搜索后端；`web-deepseek-api/` = "Searches and fetches pages through the DeepSeek Search and Fetch APIs"；`web-fetch-http/` = "Fetches public HTTP(S) pages anonymously"；`tool-web/` = "Exposes `web_search` and `web_fetch` to the model"。

**【事实】** 出厂默认（`bundle/base/cordis.patch.yml` L467-489）：

```yaml
    - id: web
      name: '@deepseek-ai/dsh-web'
      config:
        searchProvider: deepseek-official
        fetchProvider: http
    - id: web-search-deepseek
      ...
        apiKeyEnv: DEEPSEEK_API_KEY
    - id: web-deepseek-api
      ...
    - id: web-fetch-http
      ...
    - id: tool-web
      ...
      config:
        fetch: true
        searchTimeoutMs: 60000
```

即 **web_search 默认后端 = DeepSeek 原生搜索（Messages API），web_fetch 默认 = 匿名 HTTP**。base 注释（L454-466）原句摘："DeepSeek search resolves the same DEEPSEEK_API_KEY credential the Models page manages for chat, at each search" / "Search is a full auxiliary model request with server-side retrieval, so this shipped DeepSeek route gets 60s" / "The DeepSeek Search and Fetch APIs register as deepseek-search-api and deepseek-fetch-api with the same credential; the Web search settings switch selects both in place of these defaults." Web app 同样把 host 面 tool-web 关掉、按 preset 挂（web-app/cordis.patch.yml L584-585）。

**【事实】** 后端细节：`web-search-deepseek/README.md` Summary："searches the web through DeepSeek's native search using the DeepSeek account sign-in or an existing `DEEPSEEK_API_KEY` ... one search costs a full model turn in latency and tokens"；端点 = Anthropic 兼容 base `https://api.deepseek.com/anthropic/v1` + `/messages`，读 `$DEEPSEEK_SEARCH_BASE_URL`（独立于对话的 `$DEEPSEEK_BASE_URL`）。`web-deepseek-api/README.md` Summary："one direct request per operation, without an auxiliary model request ... Search returns titles, URLs, available snippets ... Fetch returns page Markdown"；切换开关 = Web UI "Plugins > Built-in plugin settings > Web search" 的 "Use the new Web Search API"。Exa/Perplexity 后端包在树里但 base 未挂（grep bundle 无命中，§9）。

### 3.2 web_fetch 的 DNS 守卫：源码位置

**【事实】** 守卫在 `vendor/dsh/packages/web/web-fetch-http/src/network.ts`：
- L3-4（头注）："One DNS answer set is validated before Undici receives it through a custom lookup, so the connection cannot resolve the hostname again to a private address."
- L54-64 `isPublicIpAddress()`：ipaddr.js 解析，IPv4/IPv6 均要求 `parsed.range() === 'unicast'`（L61-63），IPv4-mapped IPv6 按内嵌 IPv4 判。
- L75-110 `resolvePublicAddresses()`：系统 DNS 一次解析全部地址，**任一**地址非公网即整组拒绝——L100-101 原句：

```ts
    if (!isPublicIpAddress(entry.address)) {
      throw new WebError(`URL hostname "${hostname}" resolves to a non-public IP address`, 'WEB_BLOCKED_URL')
```

另有 NAT64 翻译地址复检（L103-105）。验证过的地址集被 pin 进 Undici connect lookup（L203），防二次解析绕过。

### 3.3 「拦一切域名」的本机根因（实测，非 DSH bug）

**【事实】本地实测**（2026-11-12，node:_dns 只读查询）：

```
$ node -e "dns.lookup(h, {all:true, order:'verbatim'})"  # 三个域名
raw.githubusercontent.com → [{"address":"198.18.0.62","family":4},{"address":"2001:2::3e","family":6}]
example.com               → [{"address":"198.18.0.89","family":4},{"address":"2001:2::59","family":6}]
llmstxt.org               → [{"address":"198.18.0.76","family":4},{"address":"2001:2::4c","family":6}]
```

本机 DNS 对一切公网域名返回 `198.18.0.x` / `2001:2::x`（代理工具 fake-IP 模式的典型地址段）。用 DSH 同款判定库实测分类（本仓 node_modules 的 ipaddr.js@2.5.0）：

```
198.18.0.62   → range: reserved      → isPublicIpAddress = false
2001:2::3e    → range: benchmarking  → isPublicIpAddress = false
93.184.216.34 → range: unicast       → isPublicIpAddress = true（对照：真公网 IP 放行）
```

**【推论】** 姊妹材料 §6.1 实测「web_fetch 对一切域名被 DNS 检查拦截」的根因 = 本机 fake-IP DNS × 守卫的公网判定，二者叠加；守卫代码按设计工作（SSRF 防护），不是 DSH 缺陷。凡 DNS 返回真实公网 IP 的环境，web_fetch 直接可用。

**【事实】代理逃生门**：`web-fetch-http/src/provider.ts` L13 `import { proxyRouteFor } from '@deepseek-ai/dsh-http-proxy'`（包在 `vendor/dsh/packages/util/http-proxy`）；L123-125 注释原句："A proxied hop skips public-address resolution and pinning: the proxy performs the origin's [resolution]"。`docs/user/guide/network-proxy.md` 原句："DSH routes its outbound requests — model calls, web search, page fetches, and MCP servers over HTTP — through the proxy named by the standard proxy environment variables. It reads them at launch"；`export HTTPS_PROXY=http://127.0.0.1:7890`（或 `$DSH_HOME/.env`）；SOCKS 不支持；loopback 恒 bypass。**【推论】** 本机要让 web_fetch 复活，正路 = 给 DSH 进程配 HTTP 代理环境变量（代理做真实解析），而非改守卫（vendor 只读铁律也不允许）。

### 3.4 取外部知识的现成通道评估

**【事实】** fetch 内容形态：`web-fetch-http/README.md` L55 "A successful call yields a `WebFetchResult`: the final URL after allowed redirects, the HTTP status code, a decoded body classified as `html` or `text`, and a `truncated` flag"；L84 "`dsh-tool-web` owns HTML→markdown and truncation formatting"；L134 "Only textual content decodes — html/xhtml and `text/*` plus JSON/XML families ... text-extractable PDF decoding is named deferred work"。

**【推论】** agent 取 llms.txt 站点等外部知识：web_search（DeepSeek 后端，需凭据）+ web_fetch（HTML→markdown 现成）是默认通道；本机 DNS 环境下 fetch 需代理变量或走 bash curl（姊妹材料已证 shell 出网不受限）。PDF 解析不在 web_fetch 能力内（deferred work 原句）——wiki ingest 若收 PDF 要另想办法（§5 document 包、§8 缺口）。

## 4. session 检索：会话历史 FTS5（默认关），不是文件检索

### 4.1 三包分工

**【事实】** `vendor/dsh/packages/session-query/` 组（组 README Summary 原句）："retrieval over live and durable session history, independent of compaction: programmatic callers query one unified service for exact logs, filtered lists, relationship traces, and full-text search; a SQLite backend powers the search; the Web UI gets an `/export` command"。子包：
- `session-query/` = 统一服务 `ctx.sessionQuery`（精确读/过滤/关系追踪；全文方法抽象）。
- `session-query-sqlite/` = "Full-text search across session history backed by a SQLite FTS5 index"（组 README 表原句），唯一具体后端。
- `session-log-export/` = Web `/export` 会话 ZIP 下载。
- 目录里另有 `tool-session-query/` 残壳：实测 find 只有 `lib/`（index.js、types、tsbuildinfo）与 `node_modules/`，**无 package.json/src/README**——不是工作区包，真身在 experimental（下）。

**【事实】** `vendor/dsh/packages/experimental/tool-session-query/` = 模型面工具包（README Summary）："let a model search earlier sessions, inspect event matches, trace session or event relationships, and read exact event data. Its five read-only tools ... authorize cross-session access only when the target session's `cwd` exactly matches the caller's ... The package is opt-in"。五工具名（`src/index.ts` L66/76/86/96/109）：`session_search`、`session_event_search`、`session_trace`、`session_event_trace`、`session_event_read`。搜索排除调用者自身会话（README 同段）。

**【事实】** `vendor/dsh/packages/experimental/session-search/` = **bundle**（README kind: package-bundle）："Give every Agent five experimental read-only global tools to search earlier sessions. The content index opens on the first search and is shared by all Agents. The bundle ships switched off in Web and Desktop. Select it in Plugins to enable it." 其 `cordis.patch.yml`（逐字摘）：insert 组 `optional-session-search`，`isolate: sessionQuery: true`，内含 `session-query-sqlite`（`path: ':memory:'`、`openAt: first-search`）+ `tool-session-query`。Known Limitations 原句："The bundle keeps one in-memory index after the first search. The index is rebuilt after restarting the application or switching the bundle off and on."

### 4.2 默认启用状态

**【事实】** 服务默认挂、**内容搜索默认关**：`bundle/base/cordis.patch.yml` L157-161：

```yaml
    - id: session-query-sqlite
      name: '@deepseek-ai/dsh-session-query-sqlite'
      config:
        path: ':memory:'
        openAt: never
```

base 注释（L150-156）原句摘："search calls fail with SESSION_QUERY_SEARCH_DISABLED and SQLite is never opened; the Web sidebar search matches titles and workspace names only. Deployments enabling content search override `openAt` to `first-search` or `startup` in a later patch layer ... typically with a durable `path`." web-app 层重申同值（web-app/cordis.patch.yml L27-30），注释并点明 "defers the node:sqlite import ... so Node 22 startup stays quiet"（ExperimentalWarning 规避，§7 呼应）。模型面五工具 = opt-in（Plugins 里开 Session search bundle，或 preset 挂 tool-session-query）。

### 4.3 FTS5 实现要点与 tokenizer 决策（对 wiki 搜索最有借鉴价值）

**【事实】** 一手决策记录 = `vendor/dsh/.agents/notes/archived/feature/2026-07-10-sqlite-session-query-provider.md`（Status: implemented，Archived: 2026-09-04）。关键原句：
- Tokenizer choice 节："Both persistent and live FTS5 tables use `unicode61`. The implementation experiment found that this tokenizer supports the two-character token `AI` and produces an index about 2.1× smaller than the trigram alternative. The accepted limitation is token/phrase recall: `AI` does not match the larger token `BRAID`, and arbitrary substring search uses the provider-independent text scan instead."
- Alternatives 节："Use the FTS5 trigram tokenizer — rejected because it omits useful queries shorter than three characters and measured about 2.1× the index size of `unicode61`"；"Use FTS5 BM25 independently in each table — rejected because scores from differently populated persistent and TEMP corpora are not comparable"（排序改用「高亮命中跨度数降序 + 文档长度升序 + 时间降序」，Search semantics 节）。
- 查询安全："Queries are trimmed, whitespace-normalized, and quoted as one literal FTS5 phrase. Embedded quotes are doubled before binding, so MATCH operators such as `OR`, `NEAR`, quotes, parentheses, and `*` remain data rather than executable query syntax."
- 架构边界："a rebuildable index must not share the authoritative log's schema, reset, or failure boundary"（Alternatives 首条）——派生索引与真相源分库。
- 底层 = node:sqlite：`session-query-sqlite/src/schema.ts` L52 `const { DatabaseSync } = await import('node:sqlite')`（懒导入）。

**【事实】负证据**：`session-query-sqlite/src/*.ts` 与 README grep `CJK|Chinese|Segmenter|segment` **零命中**——DSH 的 FTS5 检索没有中文分词处理（unicode61 对 CJK 的行为与补救见 §7 实测）。

**【推论】** 对 wiki 的复用价值分两层：① **服务本身不可直接复用**——它只索引会话事件（extractor 面向 SessionEventMap），不接受任意 markdown 文件语料；② **设计可直接照抄**——派生 FTS5 索引分库、literal phrase 转义、unicode61 vs trigram 的取舍、无 BM25 的确定性排序、node:sqlite 零依赖路线，全部是已验证过的先例（仓纪律「借鉴成熟插件/不发明」的正解）。wiki 若建搜索索引，等于把这套模式换个语料源重放一遍。

## 5. 记忆/上下文相关包：六组定位 + 无内置跨会话记忆工具 + document 不做文本解析

### 5.1 六组一句话定位（组 README Summary 原句）与默认挂载

| 组 | 一句话定位（README 原句摘） | 默认挂载（实测 grep bundle） |
|---|---|---|
| `packages/context/` | 请求上下文插件：注入模型可见上下文、**不定义工具**；"Only `agent-instructions` (`dsh-base`) ships mounted by default; the rest are opt-in."（README L12） | base 挂 agent-instructions（base cordis.patch.yml L303，maxBytes 65536）；web-app 另挂 session-reference/file-reference-local/harness-dev-context（L94/L97/L211），time-context 按 preset 挂（standard.patch.yml L19-20） |
| `packages/compaction/` | 长会话压缩家族：token 压力下自动摘要 + `/compact` 手动 + 超大工具输出修剪 + 图片占位（README L12） | base 挂 compaction-basic + command-compact（L351/L356）；tool-result-pruner/image-offload 两子包 base/web-app 均未挂 |
| `packages/storage/` | **非会话**应用数据的持久 KV：json/sqlite 后端 + schema 校验的 domain 形式；"These packages are optional and host-side: they do not expose tools, prompt content, or session events to the model."（README L12） | base 挂 storage + storage-json（root = `$DSH_HOME/storages`）+ storage-domain（backend json）（L179-187）；storage-sqlite 未挂 |
| `packages/spill/` | 超大文本存到上下文之外、返回 locator + 取回指引（README L12）；§1.3 grep 溢出结果即走此通道 | base 挂 spill-local + spill-policy（L411-414，maxInlineTokens 12500） |
| `packages/document/` | 仅一包 office-to-pdf：授权 Office 文件→可复用 PDF，"The shared service converts through LibreOffice kit."（README L12） | base 未挂；web-app 挂（L287；office-to-pdf README L28 "The Web bundle mounts this provider"） |
| `packages/deliverables/` | 记录 turn 交付物为持久 Session 事件：`present` 工具声明交付文件 + workspace-changes 从 git 快照记录每 turn 改动（README L12） | tool-present 按 web-app preset 挂（standard.patch.yml L122）；workspace-changes web-app 挂（L357） |

**【事实】** context 的持久性语义（context/README.md L12 原句）："Context is durable: injected instructions and references enter session history as user-role messages, so they persist, replay, and compact like other conversation content."——注入的指令/引用以 user 消息进会话日志，随日志持久、重放、压缩。

### 5.2 跨会话持久记忆：无内置记忆工具；官方路线 = 第三方记忆 MCP（default-off）

**【事实】负证据**：`packages/` 与 `packages/experimental/` 目录清单（实测 ls）无任何 memory/knowledge 包；`goal/`、`schedule/` 按 vendor AGENTS.md Repository layout 原句是 "session goals" / "scheduled follow-ups"——会话内机制，不是跨会话记忆。

**【事实】** 官方记忆指南 = `docs/user/guide/mcp-memory.md`：三个 **default-off reference configurations**（L5 原句 "These three **default-off reference configurations** connect one memory system to DSH through `@deepseek-ai/dsh-mcp-client`"）——Memorix（本地启发式，可无 LLM/embedding）、MCP Reference Memory（本地知识图谱 JSONL）、Engram（Go 二进制）（L19-21 表）；L31 原句："No memory server is present in the shipped composition, so omitting `--patch` keeps all three disabled."；L7 声明仅为互操作示例、不代表背书。Reference Memory 的搜索语义（L55 原句）："Search is case-insensitive substring matching over entity names, types, and observations, not semantic retrieval."——连第三方参考实现也不是语义检索。

**【事实】** 内置的持久载体（不是「记忆工具」，但可承载 wiki 知识）：① 会话日志本身（durable session，§4 的 FTS5 可搜）；② storage-domain KV（host 侧，插件作者可用，模型不可见，§5.1）；③ agent-instructions——`AGENTS.md`/`CLAUDE.md` 工作区指令进上下文且文件编辑后刷新（context/README.md L27 表行）；④ session-reference——`@label` 提及他会话 → 有界只读快照作持久 untrusted 背景上下文（session-reference/README.md L12 原句 "a bounded, read-only snapshot of each referenced session as durable, untrusted background context"；opt-in 服务，web-app 已挂）；⑤ skill catalog 按需加载（姊妹材料 §4.3 已证）。

**【推论】** DSH 对「跨会话记忆」的官方答案 = 外接记忆 MCP（引入外部进程依赖）；零依赖自建 wiki 的正解是把 **markdown 文件本身当持久记忆**——agent-instructions/skill 注入 + grep 检索已构成闭环，无需记忆 MCP。session-reference 提供的是「跨会话引用」而非长期记忆，且快照有界、带 untrusted 警告，不适合当 wiki 正文载体。

### 5.3 document 组不做文档解析：ingest 不可复用（方向相反）

**【事实】** office-to-pdf 是**渲染**不是**解析**：输入 DOC/DOCX/XLS/XLSX/PPT/PPTX → 输出 PDF 字节（office-to-pdf/README.md L12 原句 "The provider accepts DOC, DOCX, XLS, XLSX, PPT, and PPTX."）；依赖独立发布的 `@deepseek-ai/libreoffice-kit` `^0.1.5`（L32），native 引擎或 Node WASM。README grep `extract|markdown|parse|ingest` 零命中——无文本提取、无 markdown 输出。

**【事实】** DSH 已有的「→markdown」能力在 web 侧：tool-web 依赖 `turndown ^7.2.4` + `@joplin/turndown-plugin-gfm ^1.0.67`（tool-web/package.json dependencies 节，实测），即 §3.4 的 HTML→markdown 是随包现成的。

**【推论】** wiki ingest 分料判定：markdown 本身即文本，fs read 直接可用、无需解析器；HTML 网页有 web_fetch→markdown 现成通道；**Office/PDF→文本方向 DSH 全缺**（office-to-pdf 只到 PDF 为止，PDF→text 是 web_fetch 的 deferred work，§3.4）——ingest 若要收这两类必须自建或借外部工具（§8 缺口）。

## 6. 插件生态：无官方市场/registry；市场 = 用户自添 index.json；两树零 knowledge 类插件

### 6.1 两个 market 包是什么

**【事实】** `apps/plugin-market-generator/` = **索引文件参考生成器**（README L5 原句）："A reference generator for plugin market index files. It reads a plain list of npm package names and Git repository URLs and writes one `index.json` that the DSH **Discover** page can show without further requests. It is a standalone Node program, not a Cordis application, and it never installs or runs the code of the packages it describes."——输入一行一个 npm 包名/Git URL，输出静态 index.json；只收 `package.json` 声明 `dsh.bundle` 的包（L46）；`--registry` 默认 `https://registry.npmjs.org/`（L36）。

**【事实】** `packages/experimental/plugin-market-bundle/` = **可选 bundle**，挂 Host `pluginMarket` 服务 + Web Plugins 页 Discover tab（README L12）；"Shipped profiles leave it disabled."（同段）；Known Limitations L56 原句："There is no official market; Discover lists only the index sources the user adds."。开启后 Creator preset 获得只读 `plugin_market` 工具（README L46）。

**【事实】** 服务本体 = `packages/boot/plugin-market/`（README L12）：读用户配置的索引、用 `dsh-plugin-market-index` 校验、标注安装状态/兼容性/安装参数；安装走 `pluginManager.installBundle`。默认 `indexes: []`（L31），L27 原句："No index source is configured by default, so the Host sends no market request until a user adds one."

### 6.2 有无社区插件市场/registry？——没有官方的，机制是「自托管 JSON 索引」

**【事实】** 三处一手负证据：① plugin-market-bundle README L56 "There is no official market"；② 用户指南 `docs/user/guide/plugin-market.md` L23 原句 "DSH ships no index source."，L34 "Markets are third-party content."；③ 发布指南 `docs/user/develop/basic/publish.md` L163 原句 "Publishing to a registry is not required — users can install straight from a git host:"。发布市场 = 把 index.json（+icons/）放任意静态 host（plugin-market.md L39 "Put it on any static host, for example GitLab Pages, GitHub Pages, or an object store behind https"）。npm registry 只是安装源之一，不是 DSH 运营的社区目录。

**【推论】** DSH 对「分布式发现」的官方答案 = 静态 JSON 索引 + 客户端搜索 + 确认式安装，无中心服务。自建 wiki 的 index/目录页可借鉴同一形状（一个静态 index + 客户端检索），但不需要安装/兼容性机器。

### 6.3 knowledge/wiki/memory/RAG 类插件盘点（vendor 树 + 全局 checkout）

**【事实】实测命令**（2026-11-12，只读目录清单 + 精确过滤）：

```
$ find vendor/dsh/packages -maxdepth 2 -type d | grep -iE 'knowledge|wiki|memory|(^|-)rag($|-)|brain|recall|remember|embed|vector|semantic|notebook'
（零命中，exit=1）
$ ls <全局checkout>/node_modules/@deepseek-ai/ | grep -iE '同上'
（零命中，exit=1）
```

全局 checkout = `<全局安装 dsh>/`，其 `node_modules/@deepseek-ai/` 共 **306 个官方包**（实测 wc -l），顶层无第三方 `dsh-*` bundle（grep `^dsh` 零命中）——即全局安装里也没有社区 knowledge 插件。注意宽过滤 `rag` 会误匹配 sto**rag**e，已用词边界排除。

**【事实】** 两树中「最接近知识类」的目录（只列名 + 一句话，不深读）：

| 目录/包 | 一句话 |
|---|---|
| `packages/storage/`（storage/storage-json/storage-sqlite/storage-domain） | 持久 KV 基础设施，非知识组件（§5.1） |
| `packages/experimental/session-search/` | 会话历史 FTS5 搜索 bundle，默认关（§4） |
| `apps/cli/config/examples/mcp-memory/`（memorix/mcp-reference-memory/engram 三 overlay） | 第三方记忆 MCP 参考配置，default-off；DSH 不下载/不初始化/不背书（mcp-memory.md L11，§5.2） |
| `packages/client/ui-sidebar-documentpreview/` | Web 侧栏文档预览渲染器（Markdown/code/HTML/PDF/Office，web-app cordis.patch.yml L289-291 注释），只渲染不索引 |
| `packages/boot/plugin-market/` | 插件索引搜索服务——其 CJK 搜索设计对 wiki 最有借鉴价值（下） |

**【事实】可借鉴设计（CJK 搜索）**：boot/plugin-market/README.md L58 原句："It is split into runs of letters, marks, and digits; a run of Chinese, Japanese, or Korean characters becomes its overlapping character pairs and its last character, so text written without spaces matches without a dictionary. Words are compared after NFKC normalization and without case. Every query word must match an indexed word as a prefix or, from four characters, within an edit distance of one fifth of its length rounded to the nearest integer, at most 2. Name and title matches weigh three times, and keyword matches twice, a match elsewhere."——即 **CJK 重叠 bigram + 末字符**（无词典）、NFKC 归一、前缀匹配 + 受限编辑距离模糊、标题×3/关键词×2 加权。这是 DSH 树内唯一现成的中文搜索分词先例（与 §4.3 unicode61 无 CJK 处理互补）。

**【建议】** 用户不依赖上述任何包；登记三条可借鉴设计：① CJK bigram 分词 + 加权模糊匹配（wiki 中文搜索的零依赖路线，§7/§8）；② 静态 index.json 自托管发现形状（wiki 目录页）；③ 派生索引与真相源分离（§4.3 已录）。记忆 MCP 三件套只作生态登记：引入即外部进程依赖，与零依赖边界冲突（§5.2）。

## 7. 运行时事实复核（本机实测，2026-11-12）

### 7.1 Node 版本与 engines

**【事实】实测**：`node --version` → `v22.23.1`。vendor 根 `package.json` L8-10：`"engines": { "node": "^22.19.0 || >=24.0.0" }`——本机在 engines 范围内。node:sqlite 在此范围可用但属 experimental（§4.2 web-app 注释 "defers the node:sqlite import ... so Node 22 startup stays quiet" 即为此警告的规避）。

### 7.2 node:sqlite FTS5 建表+查询复核（含 CJK 行为判定）

**【事实】实测命令**（`node -e`，`:memory:` 库，零盘写）：建 unicode61 与 trigram 两张 FTS5 虚表，插入英文行与中文行 `"DSH 的检索家底包括全文搜索与知识地图"`，分别 MATCH。输出逐字：

```
sqlite_version=3.51.3
EN MATCH search: unicode61=1 trigram=1
CJK MATCH 检索(2字): unicode61=0 trigram=0
CJK MATCH 检索家(3字): unicode61=0 trigram=1
CJK MATCH 全文搜索(4字): unicode61=0 trigram=1
Segmenter(zh) words=["DSH","的","检索","家底","包括","全文","搜索","与","知识","地图"]
presegmented MATCH "检索": unicode61=1
OK
```

**ExperimentalWarning 原文**（stderr 逐字）：

```
(node:31238) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
```

**【事实】判定**：① FTS5 随 node:sqlite 可用（SQLite 3.51.3），建表/插入/MATCH 全通；② **unicode61 把连续 CJK 当单一 token**——中文子词查询（2/3/4 字）全部 0 命中，证实 §4.3 「无 CJK 处理」的实际后果；③ **trigram 支持 ≥3 字子串匹配，2 字查询 0 命中**（与 §4.3 决策记录 "omits useful queries shorter than three characters" 一致）；④ **预分词路线成立**：Intl.Segmenter 分词后空格拼接入库，unicode61 MATCH「检索」= 1。

### 7.3 Intl.Segmenter('zh') 分词复核

**【事实】** 同上实测：`new Intl.Segmenter("zh", { granularity: "word" })` 对测试句输出 `["DSH","的","检索","家底","包括","全文","搜索","与","知识","地图"]`——词级切分合理（「检索」「家底」「全文」「搜索」「知识」「地图」均成词）；`isWordLike` 可滤标点。**无 ExperimentalWarning**（stderr 只有 SQLite 一条）——Segmenter 是稳定 API。

**【推论】** 零依赖中文全文搜有两条已实证路线，均只用 Node 内置（node:sqlite + Intl.Segmenter），零新 npm 依赖：**A. 分词路线**——Segmenter 切词→空格拼接→unicode61 FTS5（精度高、索引小，§4.3 已证 unicode61 索引比 trigram 小 2.1×）；**B. bigram 路线**——CJK 重叠二字组（§6.3 plugin-market 官方先例，无词典、召回高，2 字查询可中）。trigram 直接用于中文则受 ≥3 字限制，2 字词（中文高频）漏检。

**【建议】** wiki 搜索起步选 A 或 B 之一即可（数百页规模两者都够）；要兼得可 B 召回 + A 精排。node:sqlite 的 experimental 身份是真实风险（API 可能变），但 wiki 索引按 §4.3 「派生索引可重建、与真相源分库」设计后，最坏情况 = 重建索引，markdown 真相源无损。

## 8. 家底表与缺口

### 8.1 家底汇总表（含 §1–§4 已查项）

| 能力 | 包/路径（vendor/dsh/ 为根） | 默认启用？ | 对自建 wiki 的复用价值 |
|---|---|---|---|
| 全文正则搜 grep | packages/fs/tool-fs-search | ✅ base（Web 按 preset） | **直接复用**：ripgrep 15.0.0+PCRE2 随包分发，wiki 全文搜零新依赖（§1） |
| 文件发现 glob | 同上 | ✅ | **直接复用**：wiki 页面枚举（§1） |
| 外部 MCP 工具接入 | packages/mcp/mcp-client | 客户端随包；**无 server 默认启用** | 一行配置接 qmd/DeepWiki 等外部知识服务；引入外部进程/服务依赖（§2） |
| MCP 资源读取 | packages/mcp/mcp-resources | ✅ base | 读已接 server 的资源（§2） |
| web_search | packages/web/tool-web + web-search-deepseek | ✅（需 DEEPSEEK_API_KEY） | 外部知识搜索默认通道（§3） |
| web_fetch（HTML→markdown） | web-fetch-http + tool-web（turndown 随包） | ✅（本机 fake-IP DNS 需代理变量） | 外部网页 ingest→markdown 现成（§3/§5.3） |
| 会话历史 FTS5 | session-query-sqlite + experimental/session-search | 服务挂、**内容搜索默认关**（openAt: never）；五工具 opt-in | **不可直接复用**（只索引会话事件）；架构设计可照抄（§4） |
| 工作区指令注入 | packages/context/agent-instructions | ✅ base | wiki 作 AGENTS.md 指针/维护协议注入的现成载体（§5） |
| skill 按需加载 | packages/skill（base L308-309） | ✅ base | wiki 维护协议作 skill 按需加载（姊妹材料 §4.3 已证） |
| 跨会话引用 | packages/context/session-reference | web-app 挂（opt-in 服务） | 有界只读快照，非 wiki 正文载体（§5.2） |
| 持久 KV | packages/storage/{storage,storage-json,storage-domain} | ✅ base（host 侧、模型不可见） | 插件形态 wiki 的元数据存储；纯 markdown 路线用文件即可（§5.1） |
| 大文本溢出 | packages/spill/{spill-local,spill-policy} | ✅ base | 搜索结果/大页溢出的现成落盘通道（§1.3） |
| 长会话压缩 | packages/compaction/{compaction-basic,command-compact} | ✅ base | 间接：wiki 维护长会话自动压缩已默认（§5.1） |
| Office→PDF | packages/document/office-to-pdf | web-app 挂 | **ingest 无用**：渲染方向，无文本提取（§5.3） |
| 交付物记录 | packages/deliverables/{tool-present,workspace-changes} | preset/web-app 挂 | wiki 维护 turn 的交付展示（§5.1） |
| 插件市场索引 | boot/plugin-market + experimental/plugin-market-bundle + apps/plugin-market-generator | ❌ 默认关、无官方市场 | 借鉴 index.json 静态形状 + **CJK bigram 搜索先例**（§6） |
| 中文搜索运行时 | Node 内置 node:sqlite FTS5 + Intl.Segmenter | N/A（运行时，非插件） | **自建索引的地基，已实测**：分词/bigram 两路线 + bm25() 排序均可用（§7） |

### 8.2 缺口清单（DSH 没有、必须自建）

1. **面向任意文件语料的知识索引组件**——session FTS5 只索引会话事件（extractor 面向 SessionEventMap，§4.3），vendor 无 wiki/knowledge 组件（姊妹材料 §4.1、本材料 §6.3 双证）。wiki 索引必须自建。
2. **中文分词预处理**——unicode61 对 CJK 子词查询零命中（§7.2 实测）；DSH 树内唯一 CJK 先例是 plugin-market 的 bigram（§6.3），不是可复用的文件搜索服务。分词层必须自建（Segmenter 或 bigram，均已实证零依赖）。
3. **文件语料的相关性排序**——grep 是行匹配无排序（§1.3）；DSH 会话搜索刻意不用 BM25（§4.3）。运行时 bm25() 可用（§8.3 实测），但「wiki 排序搜」要自建。
4. **wiki 内容层**——目录/index/维护协议/页面组织（姊妹材料 §4.1 结论，本材料不重做）。
5. **PDF/Office→文本 ingest**——web_fetch 的 PDF 提取是 deferred work（§3.4），document 组只到 PDF 为止（§5.3）。收这两类料必须自建或借外部工具。
6. **跨会话记忆工具**——无内置（§5.2）；wiki 若兼任长期记忆，「文件 + 注入 + 检索」回路要自建（外接记忆 MCP 则违反零依赖边界）。
7. **文件索引的增量维护协议**——DSH 会话索引是 first-search 全量建 + 重启重建（§4.1 Known Limitations），无文件语料增量先例；wiki 索引何时重建/增量更新要自定义。

### 8.3 对「零依赖自建 wiki+搜索」的含义

**【事实】补充实测**（bm25 排序，`node -e`，`:memory:`）：预分词行入库后 `SELECT body, bm25(w) AS score FROM w WHERE w MATCH '检索' ORDER BY score` 正常返回（score 为负、越小越相关）——node:sqlite 的 FTS5 排序能力在盘可用。

**【推论】** 零依赖边界**成立**：wiki 三层需求全部有着落——浏览/发现 = grep/glob（默认挂载）；外部知识 = web 工具 + MCP 客户端（默认挂载，需凭据/代理）；中文全文搜 = 自建薄层（Intl.Segmenter/bigram 预处理 + node:sqlite FTS5 + bm25，全 Node 内置，**零新 npm 包**）。必须自建的只有「内容层 + 索引预处理层」，且每一块都有已验证先例可抄：§4.3 派生索引分库架构、§6.3 CJK bigram、§7 分词路线实测。

**【建议】** 最小落地分两步：① 起步 = markdown wiki 目录 + index.md + grep/glob 搜（当天可用，零自建代码）；② 增强 = FTS5 派生索引（Segmenter 分词或 bigram）+ 重建脚本 + bm25/加权排序（照抄 §4.3 架构：索引可重建、与 markdown 真相源分离）。不引入记忆 MCP/qmd/DeepWiki，除非用户放宽「外部依赖」边界（姊妹材料开放问题 6）。唯一登记的运行时风险 = node:sqlite experimental（§7.2 警告原文），由「索引可重建」设计兜底。

## 9. 负证据台账（随查随记）

已确认的负证据（细节见各节）：
1. DSH 无 MCP server 侧产品代码（§2.1 grep 全 packages，命中仅测试夹具与 ACP 转发）。
2. base bundle 无 mcp-client 行、无任何 MCP server 默认启用（§2.2；mcp-client README "No server is enabled by default."）。
3. Exa/Perplexity 搜索后端包在树但 base/web-app bundle 未挂载（§3.1 grep bundle 无命中）。
4. `packages/session-query/tool-session-query/` 是无 package.json 的构建残壳，非工作区包（§4.1 find 实测）。
5. session-query-sqlite 无 CJK/分词处理（§4.3 grep 零命中）。
6. web_fetch 不做 PDF 文本提取（web-fetch-http README L134 "text-extractable PDF decoding is named deferred work"）。
7. 会话内容搜索默认关（openAt: never，§4.2）；session-search bundle 默认关（README "ships switched off"）。

（其余域负证据待补。）

本轮补全新增（§5–§7 域，覆盖上行「待补」）：

8. 无 memory/knowledge 包：`packages/` 与 `packages/experimental/` 目录清单实测 ls 无命中；goal/schedule 按 vendor AGENTS.md layout 原句为会话内机制（§5.2）。
9. 无内置跨会话记忆工具；官方路线 = 第三方记忆 MCP 且 default-off（mcp-memory.md L31 "No memory server is present in the shipped composition"；L7 不背书声明）（§5.2）。
10. document 组只做 Office→PDF 渲染，无文本提取/markdown 解析（office-to-pdf README grep `extract|markdown|parse|ingest` 零命中）（§5.3）。
11. 无官方插件市场/registry：plugin-market-bundle README L56 "There is no official market"；plugin-market.md L23 "DSH ships no index source."；publish.md L163 "Publishing to a registry is not required"；boot/plugin-market 默认 `indexes: []`（§6.1/§6.2）。
12. vendor 树与全局 checkout 零 knowledge/wiki/memory/RAG 类插件（精确词边界过滤实测 exit=1；全局 306 个 @deepseek-ai 包皆官方，顶层无第三方 dsh-* bundle）（§6.3）。
13. compaction-tool-result-pruner、compaction-image-offload、storage-sqlite 三包 base/web-app bundle 均未挂载（grep 实测）（§5.1）。
14. 中文搜索运行时限制实测：unicode61 对 CJK 子词查询（2/3/4 字）全零命中；trigram 对 2 字查询零命中（§7.2）。

## 10. 来源清单

已引用（vendor 钉 b830ec95，路径以 vendor/dsh/ 为根）：
- packages/fs/tool-fs-search/{package.json, src/search-core.ts, src/grep.ts, src/glob.ts, src/index.ts}；pnpm-lock.yaml L19336+
- packages/bundle/base/cordis.patch.yml L150-161/L298-301/L454-493；packages/bundle/web-app/cordis.patch.yml L27-30/L507-508/L584-585；bundle/web-app/presets/standard.patch.yml L29-30
- packages/mcp/{README.md, mcp-client/README.md, mcp-resources/src/tools.ts}；packages/acp/acp/src/mcp.ts；docs/user/guide/mcp-memory.md；apps/cli/config/examples/mcp-memory/
- packages/web/{README.md, web-search-deepseek/README.md, web-deepseek-api/README.md, web-fetch-http/README.md, web-fetch-http/src/network.ts, web-fetch-http/src/provider.ts}；packages/util/http-proxy；docs/user/guide/network-proxy.md
- packages/session-query/{README.md, session-query-sqlite/src/schema.ts}；packages/experimental/session-search/{README.md, cordis.patch.yml}；packages/experimental/tool-session-query/{README.md, src/index.ts}；.agents/notes/archived/feature/2026-07-10-sqlite-session-query-provider.md

本地实测：rg --version（§1.2）；dns.lookup + ipaddr.js 分类（§3.3）；node --version = v22.23.1（开工核对）。

本轮补全新增引用（§5–§8，vendor 钉 b830ec95，路径以 vendor/dsh/ 为根）：
- packages/context/{README.md, session-reference/README.md}；packages/compaction/README.md；packages/storage/README.md；packages/spill/README.md；packages/deliverables/README.md
- packages/document/{README.md, office-to-pdf/README.md}；packages/web/tool-web/package.json（turndown 依赖）
- packages/bundle/base/cordis.patch.yml L179-187（storage）/L303-309（agent-instructions、skill）/L351-356（compaction）/L411-414（spill）；packages/bundle/web-app/cordis.patch.yml L94-97/L211-212/L287-291/L357-358；bundle/web-app/presets/standard.patch.yml L19-20/L122
- docs/user/guide/mcp-memory.md L5/L7/L11/L19-21/L31/L55；docs/user/guide/plugin-market.md L23/L34/L39；docs/user/develop/basic/publish.md L163
- apps/plugin-market-generator/README.md L5/L36/L46；packages/experimental/plugin-market-bundle/README.md L12/L46/L56；packages/boot/plugin-market/README.md L12/L27/L31/L58（CJK bigram 搜索原句）
- 根 package.json L8-10（engines.node）；vendor/dsh/AGENTS.md Repository layout（goal/schedule 定位）

本轮本地实测（只读）：
- node --version = v22.23.1（§7.1，与开工核对一致）
- node -e node:sqlite：FTS5 unicode61/trigram 建表+中英文 MATCH 对照、Intl.Segmenter('zh') 分词、预分词入库 MATCH、bm25() 排序（§7.2/§7.3/§8.3；ExperimentalWarning 原文已录 §7.2）
- ls/find + 词边界 grep knowledge 过滤：vendor/dsh/packages 树、全局 checkout `<全局安装 dsh>/node_modules/@deepseek-ai/`（306 包计数）（§6.3）
- grep/sed bundle 挂载点核对（§5.1/§6.1）；packages/ 与 experimental/ 目录 ls（§5.2/§6.3）
