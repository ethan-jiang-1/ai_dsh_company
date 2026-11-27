// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// ── 文档命令引用门（command-refs，2026-11-03 第六轮 D4）────────────────────────────
// 为什么：文档里的 `pnpm <script>` 与 `node <仓内路径>` 此前与实现**零机械联系**。实测：
//   ① 往 `docs/guides/orient.md` 加「`pnpm nonexistent-script`」→ `verify` 全绿；
//   ② 把 `package.json` 的 `orient` 改名 → `verify` 仍全绿（命令表却还在教旧名）。
//   `bare-path` 不认命令、`md-links` 不认代码块——命令漂移是 D4 里最安静的一条（D4-2）。
// 规则：活跃文档的**反引号片段与代码围栏**里的
//   `pnpm <token>`：token 必须是 package.json scripts 或 pnpm 内建命令；`pnpm run <x>` 校验 x；
//   `node <tools|checks|probes 路径>`：路径必须存在。
// 不查：`vendor/` 路径（DSH 上游自己的命令；本仓不拥有）、`dsh`/`npx`/`npm` 等其他启动器、
//   纯散文里的 "pnpm exit 0"（不在反引号/围栏里，不是命令引用）。
// 不查 notes/（2026-11-16 取证）：notes 是决策记忆，正文允许过去时（"当时的 `pnpm standalone`"）
//   与负例（"改坏成 `pnpm bundle-init` → 红"）——实测扩扫得 27 命中，全部是历史/负例/`pnpm vitest`
//   这类合法二进制快捷，无一真 stale（唯一像的两条是被否方案与被禁形状的原文）。可执行事实的家 =
//   docs/ + README + .agents/（本门覆盖）；notes 的路径类引用由 bare-path 门守。
// 2026-11-27（16 文件标准骨架）：升级为双向校验——不仅检验活跃文档里的 `pnpm <script>` 在
//   package.json 存在，还要求根 package.json 的每条 script 均在 `docs/reference/commands.md`
//   有记录（新加脚本漏记命令表即红），并纳入 `packages/company-pack/AGENTS.md` 与 `checks/AGENTS.md`。
// 负例留证 2026-11-03（实地造红→还原→绿）：① 在 `docs/orient.md` 加围栏 `pnpm nonexistent-script`
//   → `FAIL command-refs: docs/orient.md:N → pnpm nonexistent-script 不是本仓脚本…`；② 加
//   `` `node tools/nonexistent-tool.mjs` `` → `… node tools/nonexistent-tool.mjs 指向不存在的文件`。
//   两例还原即绿；把 package.json 的 orient 改名后本门在「pnpm orient」处红（同轮已验）。
// 负例留证 2026-11-27：在 `docs/reference/commands.md` 删掉 `pnpm gen:catalog` 行 →
//   `FAIL command-refs: package.json 脚本未登记在 docs/reference/commands.md：gen:catalog`；还原即绿。
const PNPM_BUILTIN = new Set(['install', 'i', 'add', 'remove', 'rm', 'uninstall', 'update', 'up', 'upgrade', 'link',
  'unlink', 'import', 'rebuild', 'prune', 'exec', 'dlx', 'create', 'init', 'publish', 'pack', 'deploy', 'list', 'ls',
  'll', 'la', 'outdated', 'why', 'licenses', 'audit', 'bin', 'root', 'store', 'config', 'setup', 'help', 'env', 'node',
  'patch', 'patch-commit', 'patch-remove', 'server', 'fetch', 'install-test', 'dedupe', 'doctor', 'self-update'])
/** 本仓文档会引用 DSH 源码树自己的脚本（不属于本仓 package.json）；只放行这两个已知上游命令。 */
const UPSTREAM_SCRIPTS = new Set(['gen-client-catalog', 'build'])

function activeDocs(root) {
  const files = ['AGENTS.md', 'README.md', 'tests/README.md', 'checks/README.md', 'checks/AGENTS.md',
    'run/README.md', 'runtime/README.md', 'packages/company-pack/README.md', 'packages/company-pack/AGENTS.md']
  const walk = (rel) => {
    const dir = join(root, rel)
    if (!existsSync(dir)) return
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const child = `${rel}/${entry.name}`
      if (entry.isDirectory()) walk(child)
      else if (entry.name.endsWith('.md')) files.push(child)
    }
  }
  walk('docs')
  // 2026-11-15：skills 是 live 指令（模型会照做），工具面重排后 close-out-definition 里一条旧
  // 发布检查命令就是这么漏掉的（verify 全绿、照做即 MODULE_NOT_FOUND）。
  walk('.agents')
  return files.filter(rel => existsSync(join(root, rel)))
}

/** 抽出「被当作命令的文本」：代码围栏整行 + 行内反引号片段（带行号）。 */
function commandSpans(text) {
  const spans = []
  let fenced = false
  text.split('\n').forEach((line, index) => {
    if (/^\s*```/.test(line)) { fenced = !fenced; return }
    if (fenced) spans.push({ text: line, line: index + 1 })
    else for (const match of line.matchAll(/`([^`]+)`/g)) spans.push({ text: match[1], line: index + 1 })
  })
  return spans
}

export function run({ root, ok, fail }) {
  const scripts = new Set(Object.keys(JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).scripts ?? {}))
  const problems = []
  let checked = 0
  const commandsDocScripts = new Set()
  for (const rel of activeDocs(root)) {
    for (const span of commandSpans(readFileSync(join(root, rel), 'utf8'))) {
      for (const match of span.text.matchAll(/(?:^|[\s$;&|(])pnpm\s+([a-z][\w:-]*)/g)) {
        const token = match[1]
        checked++
        if (token === 'run') {
          const inner = /pnpm\s+run\s+([\w:-]+)/.exec(span.text)?.[1]
          if (inner !== undefined && !scripts.has(inner) && !UPSTREAM_SCRIPTS.has(inner)) {
            problems.push(`${rel}:${String(span.line)} → pnpm run ${inner} 不是本仓脚本（scripts: ${[...scripts].join(', ')}）`)
          } else if (rel === 'docs/reference/commands.md' && inner !== undefined) {
            commandsDocScripts.add(inner)
          }
          continue
        }
        if (rel === 'docs/reference/commands.md') commandsDocScripts.add(token)
        if (PNPM_BUILTIN.has(token) || scripts.has(token) || UPSTREAM_SCRIPTS.has(token)) continue
        problems.push(`${rel}:${String(span.line)} → pnpm ${token} 不是本仓脚本（改脚本名/删除命令，或加到 package.json scripts）`)
      }
      for (const match of span.text.matchAll(/(?:^|[\s$;&|(])node\s+((?:tools|checks|probes)\/[\w./-]+\.(?:mjs|ts))/g)) {
        checked++
        const path = match[1]
        if (!existsSync(join(root, path))) {
          problems.push(`${rel}:${String(span.line)} → node ${path} 指向不存在的文件`)
        }
      }
    }
  }
  const commandsDocPath = join(root, 'docs/reference/commands.md')
  if (!existsSync(commandsDocPath)) {
    problems.push('docs/reference/commands.md 缺失——根 package.json 脚本须在命令参考表双向登记')
  } else {
    const missing = [...scripts].filter(name => !commandsDocScripts.has(name)).sort()
    if (missing.length > 0) {
      problems.push(`package.json 脚本未登记在 docs/reference/commands.md：${missing.join('、')}`)
    }
  }
  problems.length === 0
    ? ok(`command-refs ×${String(checked)}（文档命令存在 + docs/reference/commands.md 与 package.json ${String(scripts.size)} 条脚本双向对齐）`)
    : fail('command-refs', problems.join('；'))
}
