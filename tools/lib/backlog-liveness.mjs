// 背压活状态检查（2026-10-10 从 checks/run-gates.mjs 原样挪入；卡「两处重复收成模块」）。
// 状态：常驻
// 何时跑：改 `_backlog/` 制度目录、卡头、索引，或改本文件后 → `node checks/run-gates.mjs`
//   （门禁行 `backlog-liveness（…）`）+ `npx vitest run tests/harness/backlog-liveness.spec.ts`。
//
// 为什么从门禁文件里挪出来：这道检查只有两个调用方——门禁**运行**它、spec **断言**它；原先 spec 靠
//   切 `checks/run-gates.mjs` 的源码字符串 + `vm` 求值来拿到函数，改一处注释就会让 spec 假红（实测
//   边界字符串 `// Runner stays in the owning gate;` 一改就抛 "function boundary missing"）。
//   挪进 lib 后 spec 直接 import，判据仍在同一个函数里（没有第二份实现）。
//
// 函数体逐字是门禁里的原文（含原有的「为什么」注释）——本卡只搬位置，不改判据、不改问题句。
// 2026-10-12（借鉴卡 _backlog/issues/2026-10-12-backlog-process-made-explicit.md 落地）：修订判据——
//   ① 缺陷轨「活跃」改名「调查中」并扩到四活跃值（修复就绪/修复已落地/等人拍板）；② 新增状态行↔
//   frontmatter 镜像互查；③ 问题卡状态行「毕业：」封闭头。制度唯一家 = _backlog/README.md
//   「双轨状态生命周期」「缺陷的通道」；负例留证见新增块注释。
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { markdownLinkTargets } from './markdown-links.mjs'

// Reuse a declared parser from the pinned vendor; member fallback covers root-workspace CI installs.
// （沿用原门禁的声明式解析器与同一条 fallback 链，不新增第二份 YAML 读取方式。）
const loadYaml = (() => {
  for (const base of ['../../vendor/dsh/package.json', '../../vendor/dsh/packages/preset/agent-preset/package.json']) {
    try {
      const yaml = createRequire(new URL(base, import.meta.url))('js-yaml')
      return text => yaml.load(text, { schema: yaml.CORE_SCHEMA })
    } catch { /* next declared owner */ }
  }
  throw new Error('js-yaml 缺失：先按 bootstrap 安装 workspace 依赖')
})()

export function backlogLivenessProblems(backlogRoot) {
  const problems = []
  const effectiveDate = '2026-10-09'
  const pools = ['issues', 'bugs', 'research', 'methods', '_archive/settled_issues',
    '_archive/suspended_issues', '_archive/fixed_bugs', '_archive/suspended_bugs',
    '_archive/research', '_archive/legacy']
  const isDir = path => existsSync(path) && lstatSync(path).isDirectory()
  const isFile = path => existsSync(path) && lstatSync(path).isFile()
  for (const dir of ['', '_archive', ...pools]) {
    const full = join(backlogRoot, dir)
    const where = `_backlog${dir ? `/${dir}` : ''}`
    if (!isDir(full)) problems.push(`${where} 制度目录缺失或不是目录`)
    if (!isFile(join(full, 'README.md'))) problems.push(`${where}/README.md 必需索引缺失或不是文件`)
  }
  const markdownFiles = (dir, prefix = '') => readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (entry.isDirectory()) return markdownFiles(join(dir, entry.name), join(prefix, entry.name))
    return entry.isFile() && entry.name.endsWith('.md') ? [join(prefix, entry.name)] : []
  })
  const statuses = {
    issues: ['推敲中', '等人拍板'],
    // 2026-10-12（借鉴卡落地）：缺陷轨四活跃值——「活跃」改名「调查中」（与目录「活跃清单」撞词），
    //   修复就绪 = 门票且授权的翻转点，修复已落地 = 修复落树、验收未满，等人拍板 = 通道/用户选择。
    bugs: ['调查中', '修复就绪', '修复已落地', '等人拍板'],
    '_archive/settled_issues': ['已结'], '_archive/suspended_issues': ['叫停'],
    '_archive/fixed_bugs': ['已修'], '_archive/suspended_bugs': ['待修'],
  }
  const topicByDir = { positioning: '定位', upstream: '上游', 'tech-exploration': '技术' }
  const isFresh = (name, undated = true) => {
    // Both the existing YYYY-MM-DD filenames and the borrowed YYMMDD card names are accepted.
    const long = /^(\d{4}-\d{2}-\d{2})-/.exec(basename(name))
    const short = /^(\d{2})(\d{2})(\d{2})-/.exec(basename(name))
    const date = long?.[1] ?? (short ? `20${short[1]}-${short[2]}-${short[3]}` : undefined)
    // Undated new material cannot use the historical exemption.
    return date === undefined ? undated : date >= effectiveDate
  }
  const frontmatter = (text, where) => {
    const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text)
    if (!match) { problems.push(`${where}:1 缺 frontmatter`); return }
    let data
    try { data = loadYaml(match[1]) } catch (error) {
      problems.push(`${where}:1 frontmatter YAML 不可解析：${String(error).split('\n')[0]}`)
      return
    }
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      problems.push(`${where}:1 frontmatter 须为字段映射`)
      return
    }
    return data
  }
  // Source graduation checks inspect only the first 12 lines: historical discussion is not a verdict.
  const closureSignals = [
    /可关闭\s*[：:=＝]\s*是\s*(?=[｜|\n（(]|$)/,
    /关闭条件(?:判断)?\s*[：:=＝]\s*(?:已满足|已通过|已过)\s*(?=[｜|\n（(]|$)/,
    /毕业门(?:判断)?\s*[=＝]\s*(?:已过|已通过|已毕业)/,
    /状态：\s*(?:已全部实施|已消化|已毕业|已完成|已实施)/,
    /状态：\s*[^｜|\n]*已交付\s*(?=｜|$)/,
  ]
  for (const pool of pools) {
    const fullDir = join(backlogRoot, pool)
    if (!isDir(fullDir)) continue
    const files = markdownFiles(fullDir)
    // ── 研究题模型（2026-10-30）：索引 → 题名页 → 材料两级所有权 ─────────────────────
    // 规则正本 = _backlog/research/README.md「一个研究题长什么样」与 _archive/research/README.md「归档规则」。
    // 为什么：研究按"研究题目录 + 题名页 README.md"组织；shelf 索引一题一行（链题名页），材料由题名页
    //   逐份点名。旧判据是"每份 .md 直接进 shelf 索引"，加题名页后会把索引变成逐文件清单（与
    //   "一处事实一个家"冲突，_archive/README.md 曾因此把研究列两遍）。
    // 判据（只证形状，不证证据质量）：题名页在场；`> 问题` / `> 消费者` / `> 产出的卡` 三行在场；归档
    //   题名页另有 `> 归档：YYYY-MM-DD`；题名页被 shelf 索引按解析后路径链接；材料被自己题名页按解析后
    //   路径链接（散文点名不算，与其它桶反 prose 口径一致）；shelf 根不落平铺材料。
    // 题从盘上 `.md` 材料反推（git 不跟踪空目录）：只有资产、没有任何 `.md` 的题目录不产生检查对象。
    // 负例留证 2026-10-30（真树植入，`pnpm verify` 原话；逐条还原即绿）：
    //   ① 删 `_archive/research/collaboration/README.md` → `… 缺题名页——研究题必须有题名页（问题 / 消费者 / 产出的卡 / 材料）`；
    //   ② 删 agent-cultivation 题名页的「> 产出的卡：」行 → `…:1 缺「> 产出的卡：」行——题名页要回答研究什么、服务谁、产出了什么`；
    //   ③ notes-consistency 材料链接改成散文 → `… 未在题名页 notes-consistency/README.md 中被点名——材料清单必须与盘上一致`；
    //   ④ 归档索引删掉 repo-hygiene 行 → `… 未被 _archive/research/README.md 索引链接点名——索引按题名页一行登记，不按文件`；
    //   ⑤ 删 run-bundle 题名页的「> 归档：」行 → `…:1 缺「> 归档：YYYY-MM-DD」行——归档题名页要记下归档日`；
    //   ⑥ 材料移回 shelf 根 → `… 平铺在 shelf 根——研究材料必须住进题名目录（_backlog/_archive/research/<slug>/）`。
    //   spec 夹具 = tests/harness/backlog-liveness.spec.ts 的研究题三例（缺题名页/三行/归档日、散件与索引、两级反散文）。
    const researchPool = pool.endsWith('research')
    const indexPath = researchPool ? `${pool}/README.md`
      : pool.startsWith('_archive/') ? '_archive/README.md' : `${pool}/README.md`
    const indexFile = join(backlogRoot, indexPath)
    const indexed = isFile(indexFile) ? markdownLinkTargets(indexFile) : new Set()
    if (researchPool && isFile(indexFile)) {
      // 题名页三行 = 名头的形状；缺一行就是没交代清楚（问题 / 服务谁 / 长出了什么）。
      const topics = new Set(files.filter(name => name.includes('/')).map(name => name.split('/')[0]))
      for (const topic of topics) {
        const bannerFull = join(fullDir, topic, 'README.md')
        const bannerWhere = `_backlog/${pool}/${topic}/README.md`
        if (!isFile(bannerFull)) {
          problems.push(`${bannerWhere} 缺题名页——研究题必须有题名页（问题 / 消费者 / 产出的卡 / 材料）`)
          continue
        }
        const banner = readFileSync(bannerFull, 'utf8')
        for (const field of ['问题', '消费者', '产出的卡']) {
          if (!new RegExp(`^>\\s*${field}[：:]`, 'm').test(banner))
            problems.push(`${bannerWhere}:1 缺「> ${field}：」行——题名页要回答研究什么、服务谁、产出了什么`)
        }
        if (pool.startsWith('_archive/') && !/^>\s*归档[：:]\s*\d{4}-\d{2}-\d{2}/m.test(banner))
          problems.push(`${bannerWhere}:1 缺「> 归档：YYYY-MM-DD」行——归档题名页要记下归档日`)
        if (!indexed.has(resolve(bannerFull)))
          problems.push(`${bannerWhere} 未被 ${indexPath} 索引链接点名——索引按题名页一行登记，不按文件`)
        const materialLinks = markdownLinkTargets(bannerFull, banner)
        for (const name of files) {
          if (name.split('/')[0] !== topic || basename(name) === 'README.md') continue
          if (!materialLinks.has(resolve(fullDir, name)))
            problems.push(`_backlog/${pool}/${name} 未在题名页 ${topic}/README.md 中被点名——材料清单必须与盘上一致`)
        }
      }
      // shelf 根只放索引；材料一律住题名目录（散件会让"题"这个概念失效）。
      for (const name of files) {
        if (name.includes('/') || basename(name) === 'README.md') continue
        problems.push(`_backlog/${pool}/${name} 平铺在 shelf 根——研究材料必须住进题名目录（_backlog/${pool}/<slug>/）`)
      }
    }
    for (const name of files.filter(name => basename(name) !== 'README.md')) {
      const full = join(fullDir, name)
      const where = `_backlog/${pool}/${name}`
      if (!researchPool && !indexed.has(resolve(full))) problems.push(`${where} 未被 ${indexPath} 索引链接点名`)
      const text = readFileSync(full, 'utf8')
      if (pool === 'issues' || pool === 'bugs') {
        const head = text.split('\n').slice(0, 12).join('\n').replaceAll('**', '')
        if (closureSignals.some(signal => signal.test(head))) {
          problems.push(`${where}:1 声明可关闭/关闭条件已满足却仍在活跃区；移至 _archive/${pool === 'issues' ? 'settled_issues' : 'fixed_bugs'}/ 并同步索引`)
        }
      }
      if (pool === '_archive/legacy') continue
      const hasHead = text.startsWith('---\n') || text.startsWith('---\r\n')
      // Active issue/bug headers are migrated now; old archived prose and research keep their text.
      if (pool !== 'issues' && pool !== 'bugs' && pool !== 'methods' && !hasHead && !isFresh(name, !pool.startsWith('_archive/'))) continue
      const data = frontmatter(text, where)
      if (!data) continue
      const keys = Object.keys(data)
      if (statuses[pool]) {
        if (keys[0] !== 'status') problems.push(`${where}:2 frontmatter 首字段须为 status`)
        else if (!statuses[pool].includes(String(data.status))) problems.push(`${where}:2 status ${JSON.stringify(data.status)} 不属于此桶`)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data.opened ?? ''))) problems.push(`${where}:1 缺 opened: YYYY-MM-DD`)
        if (pool.endsWith('bugs') && !['P0', 'P1', 'P2'].includes(data.severity)) problems.push(`${where}:1 缺 severity: P0/P1/P2`)
      }
      // 2026-10-25（交接契约）：归档「毕业：做」卡（opened ≥ 2026-10-25）首 12 行须有 durable 去向
      //   （`> **结论/去向**` 块；RFC/Note 路径或 `用户（YYYY-MM-DD）`）。老卡祖父豁免——归档区默认不读，
      //   没有去向的「做」卡会把「用户是队列」的请求变成死信。反证 = spec 的 no-destination fixture 红；
      //   with-destination fixture 绿；2026-10-24 老卡不红。
      if (pool === '_archive/settled_issues' && String(data.opened) >= '2026-10-25') {
        const statusLine = text.split('\n').slice(0, 12).find(line => line.trimStart().startsWith('>') && line.includes('状态：')) ?? ''
        const head = text.split('\n').slice(0, 12).join('\n').replaceAll('**', '')
        if (/毕业：\s*做/.test(statusLine.replaceAll('**', '')) && !/去向\s*[:：=＝]\s*\S/.test(head)) {
          problems.push(`${where}:1 归档「毕业：做」卡缺去向（卡顶写 \`> **结论/去向**：...\`；RFC/Note 路径或 \`用户（YYYY-MM-DD）\`）`)
        }
      }
      // 2026-10-12 立（借鉴卡落地）：状态行↔frontmatter 镜像互查 + 问题卡「毕业：」封闭头。
      // 为什么：frontmatter `status` 是当前阶段的唯一家，状态行是它的镜像 + 历史（章程「双轨状态
      //   生命周期」的分工）——两处不一致 = 读者与门禁各信一份。只查活跃区（issues/bugs）：归档区
      //   离场时按关闭法在状态行补结论与去向，历史卡不回填。🔒 后缀放行（仅用户可判触发的标记）。
      // 「毕业：」封闭头 未定|做|以后做|不做|消化 = 章程关闭条件四结论的倾向词——逼门早命名；它是
      //   倾向不是状态，frontmatter 仍是状态的唯一家。
      // 负例留证 2026-10-12（真树植入，实跑原话，还原即绿；全录见毕业 Note 验证节）：
      //   ① 问题卡 frontmatter 推敲中 + 状态行「状态：等人拍板」→ `状态行「等人拍板」与 frontmatter「推敲中」不一致（镜像互查）` 红；
      //   ② 状态行「毕业：马上做」→ `「毕业：马上做」头不在封闭集（未定|做|以后做|不做|消化）` 红；
      //   ③ 活跃卡无 > 状态行 → `缺状态行（> … ｜ 状态：<frontmatter 值> ｜ …）` 红；
      //   ④ 缺陷卡 frontmatter 旧值 活跃 → `status "活跃" 不属于此桶` 红；
      //   ⑤ 修复就绪卡缺 ## 已修判定 → 不报警（验收在场检查族按用户裁定延后，记承压候选——如实不查）。
      if (pool === 'issues' || pool === 'bugs') {
        const statusLine = text.split('\n').slice(0, 12).find(line => line.trimStart().startsWith('>') && line.includes('状态：'))
        if (!statusLine) problems.push(`${where}:1 缺状态行（> … ｜ 状态：<frontmatter 值> ｜ …）`)
        else {
          const token = (/状态：\s*([^｜|\n]+)/.exec(statusLine)?.[1] ?? '').replace(/🔒/g, '').trim()
          if (token !== String(data.status)) problems.push(`${where}:1 状态行「${token}」与 frontmatter「${data.status}」不一致（镜像互查）`)
          if (pool === 'issues') {
            const graduation = /毕业：\s*([^｜|\n]+)/.exec(statusLine)?.[1]?.trim() ?? ''
            if (!graduation) problems.push(`${where}:1 状态行缺「毕业：」字段（封闭头：未定|做|以后做|不做|消化）`)
            else if (!['以后做', '不做', '消化', '未定', '做'].some(head => graduation.startsWith(head)))
              problems.push(`${where}:1 「毕业：${graduation}」头不在封闭集（未定|做|以后做|不做|消化）`)
          }
        }
      } else if (pool.endsWith('research')) {
        if (keys[0] !== 'topic' || typeof data.topic !== 'string' || !data.topic.trim()) problems.push(`${where}:2 frontmatter 首字段须为非空 topic`)
        const topic = topicByDir[name.split('/')[0]]
        if (topic !== undefined && data.topic !== topic) problems.push(`${where}:2 topic 应与子目录匹配（${topic}）`)
        if (typeof data.intent !== 'string' || !data.intent.trim() || /[\r\n]/.test(data.intent)) problems.push(`${where}:1 缺单行非空 intent`)
      } else if (pool === 'methods') {
        if (data.name !== basename(name, '.md')) problems.push(`${where}:2 name 须匹配文件名 ${basename(name, '.md')}`)
        for (const key of ['description', 'whenToUse']) {
          if (typeof data[key] !== 'string' || !data[key].trim()) problems.push(`${where}:1 缺非空 ${key}`)
        }
      }
    }
  }
  return problems
}
