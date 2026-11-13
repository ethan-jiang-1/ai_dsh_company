---
topic: wiki-knowledge-map
intent: 零新依赖中文全文搜索的实跑探针——node:sqlite FTS5 + Intl.Segmenter 在本仓真实语料上的可行性与局限证据
---

# 自建 FTS 探针：node:sqlite FTS5 + Intl.Segmenter（零新依赖）

> 研究日期 = 2026-11-12；执行 = 父会话亲自实跑（非子代理转述）。探针脚本 = `runtime/wiki-search-probe/probe.mjs`（gitignored 抛弃型工具区，全文附 §5 以便复现）。
> 问题：用户倾向自建、零/轻依赖——「不引任何 npm 包，能否给中文 markdown wiki 做像样的全文搜索？」本探针用**本仓真实中文语料**回答，不用玩具数据。

## 1. 实验设置【事实】

- 运行时：Node v22.23.1（本仓开发运行时）；`node:sqlite` **无 flag 可用**，带 `ExperimentalWarning: SQLite is an experimental feature`（stderr，不影响功能）。
- 语料：`packages/company-pack/content/` + `docs/` + `notes/` 全部 `.md` = **404 文件 / 2,185,397 字节**（约 2.1MB，中文为主）。
- 索引：`CREATE VIRTUAL TABLE pages USING fts5(path UNINDEXED, title, body, tokenize='unicode61')`；入库前用 `new Intl.Segmenter('zh', { granularity: 'word' })` 预分词（`isWordLike` 过滤，词间空格连接）；title 取文件首个 H1。
- 查询：查询串同样预分词后 `OR` 连接（或加引号作短语）；排序 `bm25(pages, 0, 5.0, 1.0)`（title 权重 5、body 权重 1）；`snippet()` 取命中片段。

## 2. 结果【事实】（命令与输出实跑）

| 指标 | 值 |
|---|---|
| 全量索引构建 | **1367ms**（404 文件一次性） |
| 索引库体积 | 3.76MB（`index.db`，约为语料 1.7 倍） |
| 查询延迟 | **0.05–1.7ms**（8 组查询，含短语） |

8 组查询的 top 命中（节选，完整输出见探针脚本重跑）：

| 查询 | top 命中 | 相关性目检 |
|---|---|---|
| `知识地图 wiki` | docs/index.md、notes/…roles-isolation-rationale.md | 相关（「地图」「知识」命中） |
| `角色 委派 合同` | notes/…delegation-contract-truth.md 等三篇委派 Note | **精确** |
| `门禁 预算` | notes/…snapshots-budget-coverage.md 等 | **精确** |
| `缺陷 修复 授权` | notes/…backlog-process-made-explicit.md 等 | **精确** |
| `双语 中文 启动` | notes/proposed/2026-11-12-bilingual-company.md | **精确**（但见 §3.1 分词） |
| `培养 方法 SKILL` | docs/contracts/cultivation.md 等 | **精确** |
| `"修复 授权"`（短语） | backlog-auth-single-source.md 等 2 篇 | 短语机制成立 |
| `handbook override`（英文） | content/README.md、handbook-worker-family.md | **精确** |

**反证留痕**：首轮 `"知识 地图"` 短语查询 0 命中，疑似分词不一致——复核 `grep -rn 知识地图 docs/ notes/ content/` **零命中**（该词只存在于 _backlog 研究材料，不在语料三目录内），0 命中是**真阴性**；换语料内真实存在的二元组 `"修复 授权"`/`"缺陷 通道"` 均正确命中。短语机制本身无 bug。

## 3. 局限【事实+推论】

1. **分词词典缺口**：`Intl.Segmenter('zh')` 把「双语」切成 `双|语`（「双语公司」→ `双|语|公司`），复合词覆盖不全；「知识地图」→ `知识|地图` 则上下文稳定。【推论】召回不受损（OR 查询仍命中），精度略降；缓解 = 领域小词典补词、或索引侧同时入「词级 + 字级 bigram」双通道、或查询侧短语兜底（qmd 的 per-character 策略即此思路的极端版，见姊妹材料 oss-search-landscape）。
2. **snippet 显示的是分词后文本**（词间有空格）——产品化需另存原文列（UNINDEXED）按偏移回取，或前端去空格；探针未做。
3. **node:sqlite 实验性**：API 带 ExperimentalWarning，Node 大版本间可能变；【推论】 pin 住运行时（本仓已 pin Node 22）则风险可控，但要在 Note 里登记此依赖面。
4. **无增量/watcher**：探针是全量重建；1.4s/404 文件的规模下「每次查询前按需重建」都可行，规模上去再做增量（mtime 比对即可，无需 watcher）。
5. **并发写**：SQLite 单写者；wiki 索引是「读多写少 + 可再生」，【推论】重建式更新天然回避并发写问题。
6. 本探针只证**机制可行与量级**，不证产品化完成度（无 UI、无持久化服务、无查询语言设计）。

## 4. 对搜索阶梯的含义

- **【推论】** L1（自建 FTS）在「数百页中文 wiki」规模**零新依赖成立**：构建秒级、查询亚毫秒、bm25 排序 + 短语 + 中英混合都可用；AK gist 的「~100 来源 index 足够」之上，这是第一级不引外部件的升级。
- **【建议】** 若落地，形状 = 一个纯 Node 脚本/小模块（host 侧或 bash 可调 CLI），索引落 `.dsh-company/` gitignored 区，wiki 页变更时重建；agent 经 bash 调它拿 top-k 路径再 read 钻页——与「index 先行」同构，只是 index 之外多了个「关键词→页」的旁路。
- **【推论】** 与 L0（index+grep）不是替代关系：index 管「浏览与语义路由」，FTS 管「关键词召回」，LLM 管「判断与综合」——三层各司其职，正是「靠语言模型能力更好搜索」的轻依赖实现。

## 5. 复现（探针脚本全文）

跑法：`node runtime/wiki-search-probe/probe.mjs`（cwd = 仓库根；输出 JSON）。脚本全文：

```js
import { DatabaseSync } from 'node:sqlite'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, extname } from 'node:path'

const ROOT = process.cwd()
const CORPUS_DIRS = ['packages/company-pack/content', 'docs', 'notes']
const seg = new Intl.Segmenter('zh', { granularity: 'word' })
const tokenize = (text) => [...seg.segment(text)].filter(s => s.isWordLike).map(s => s.segment).join(' ')

function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) yield* walk(p)
    else if (extname(e.name) === '.md') yield p
  }
}

const files = []
for (const d of CORPUS_DIRS) {
  try { for (const p of walk(join(ROOT, d))) files.push(p) } catch {}
}

const dbPath = join(ROOT, 'runtime/wiki-search-probe/index.db')
const db = new DatabaseSync(dbPath)
db.exec('DROP TABLE IF EXISTS pages')
db.exec("CREATE VIRTUAL TABLE pages USING fts5(path UNINDEXED, title, body, tokenize='unicode61')")

const t0 = performance.now()
const ins = db.prepare('INSERT INTO pages(path, title, body) VALUES (?, ?, ?)')
let totalBytes = 0
for (const p of files) {
  const raw = readFileSync(p, 'utf8')
  totalBytes += Buffer.byteLength(raw)
  const title = (raw.match(/^#\s+(.+)$/m) || [, relative(ROOT, p)])[1]
  ins.run(relative(ROOT, p), tokenize(title), tokenize(raw))
}
const buildMs = performance.now() - t0

const q = db.prepare("SELECT path, bm25(pages, 0, 5.0, 1.0) AS rank, snippet(pages, 2, '[', ']', '…', 10) AS snip FROM pages WHERE pages MATCH ? ORDER BY rank LIMIT 3")
const queries = [
  ['OR 查询', '知识地图 wiki'], ['OR 查询', '角色 委派 合同'],
  ['OR 查询', '门禁 预算'], ['OR 查询', '缺陷 修复 授权'],
  ['OR 查询', '双语 中文 启动'], ['OR 查询', '培养 方法 SKILL'],
  ['短语查询', '"知识 地图"'], ['英文混合', 'handbook override'],
]
const results = []
for (const [kind, query] of queries) {
  const match = kind === '短语查询' ? query : tokenize(query).split(' ').join(' OR ')
  const qt0 = performance.now()
  const rows = q.all(match)
  results.push({ kind, query, match, ms: +(performance.now() - qt0).toFixed(2), hits: rows.length, rows })
}
console.log(JSON.stringify({ node: process.version, files: files.length, totalBytes, buildMs: +buildMs.toFixed(1), dbBytes: statSync(dbPath).size, results }, null, 2))
```

## 6. 来源清单

- 本地实测：上述脚本两次实跑（2026-11-12，输出 JSON 关键值已录 §2）；分词敏感性测试 `node -e`（双语/知识地图 五组）；短语真阴性复核 `grep -rn`。
- 机制背景：node:sqlite 为 Node 内置模块（Node 22.5+ 引入，本运行时 22.23.1 无 flag 可用、带实验警告——警告原文已录 §1）；FTS5/bm25/snippet 为 SQLite 内置。
- 关联材料：[主材料](2026-11-12-wiki-knowledge-map.md) §5（形状 A/B/C）、[oss-search-landscape](2026-11-12-oss-search-landscape.md)（qmd 与各库对照，子代理撰写中）。
