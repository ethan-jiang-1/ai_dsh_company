import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const PACK = join(ROOT, 'packages/company-pack')
const PRESETS_DIR = join(PACK, 'presets')

/** 公司五角色（本文件持独立字面量 = 独立事实源：与 presets/ 目录内容互相印证——若改为 import
 * 共享常量，常量被误删一角时本文件会静默跳过该角色的全部断言，守卫即失效）。 */
const ROLES = ['ceo', 'vp-eng', 'vp-sales', 'coo', 'cfo'] as const

/** 读一个角色的 preset 声明文件（本文件各断言共用的唯一读盘入口）。 */
const roleYml = (role: string): string => readFileSync(join(PRESETS_DIR, role, 'agent.cordis.yml'), 'utf8')

/** 一个 preset 目录里声明的行插件名（`name: '@deepseek-ai/...'`），按包名归一（去 subpath）。 */
function rowPlugins(role: string): string[] {
  const text = roleYml(role)
  // 行名可带 subpath（`@scope/pkg/sub`，如 tool-subagent-control/list-agents）；
  // dependencies 里登记的是包名，所以按 `@scope/name` 归一后再比对（R3 实证）。
  return [...text.matchAll(/name:\s*'(@deepseek-ai\/[^']+)'/g)]
    .map(m => /^(@[^/]+\/[^/]+)/.exec(m[1] as string)?.[1] ?? (m[1] as string))
}

/**
 * 取一行插件在 preset 里的声明块（从 `- id: <rowId>` 到下一个同级 `- id:` 或 EOF）。
 * 为什么需要它：config 是**行的属性**——用全文 includes 会把别行的 config 误算进来。
 */
function rowBlock(role: string, rowId: string): string {
  const lines = roleYml(role).split('\n')
  const start = lines.findIndex(line => new RegExp(`^\\s+- id: ${rowId}$`).test(line))
  if (start === -1) return ''
  const indent = /^(\s*)/.exec(lines[start] as string)?.[1]?.length ?? 0
  const out = [lines[start] as string]
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i] as string
    if (new RegExp(`^\\s{${String(indent)}}- id: `).test(line)) break
    out.push(line)
  }
  return out.join('\n')
}

describe('company roster（R1 回归：preset 必须可挂载）', () => {
  it('五个角色各声明一个 dsh-agent-preset 行，且都列进 dsh.bundle.patch 数组（0.1.7 声明模型）', () => {
    const patch = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8')).dsh.bundle.patch as string[]
    expect(Array.isArray(patch), '0.1.7 起 dsh.bundle.patch 为数组（registry 一行 + 每预设一行）').toBe(true)
    for (const role of ROLES) {
      const rel = `./presets/${role}/agent.cordis.yml`
      expect(patch, `${role} 未列进 dsh.bundle.patch`).toContain(rel)
      const text = roleYml(role)
      expect(text, `${role} 缺 preset-${role} 声明行`).toMatch(new RegExp(`^\\s+- id: preset-${role}$`, 'm'))
      expect(text, `${role} 的 config.id 必须等于角色 id`).toMatch(new RegExp(`^\\s+id: ${role}$`, 'm'))
      expect(text, `${role} 缺 config.plugins`).toMatch(/^\s+plugins:$/m)
      // 真正"挂得上"的完成定义在 preset-smoke（真 web 逐角色建会话）——这里只守声明形状。
    }
  })

  it('preset 定义不携带公司数据（FAQ 24 D 平面）：样本公司事实只在 kb/company.md / kb/org.md', () => {
    for (const role of [...ROLES, 'researcher']) {
      const text = roleYml(role)
      expect(text, `${role} persona 写死了样本公司事实`).not.toMatch(/这家公司（梦之队）|梦之队 是高科技|三类业务|全员 50 人|梦之队的调研手/)
      expect(text, `${role} persona 应指向部署身份/编制`).toMatch(/kb\/(company|org)\.md/)
      const personaAt = text.indexOf('prefix: |-')
      expect(personaAt, `${role} 缺 persona prefix`).toBeGreaterThan(-1)
      expect(text.slice(personaAt), `${role} persona 不应写公司名`).not.toContain('梦之队')
    }
  })

  it('catalog 未注入模型指令面（T4：workspace 文件仍可被 fs 读取，故不声称不可见）', () => {
    // 2026-10-28 数据设计硬化 M1：catalog 在 workspace 内，模型可经 fs 读到；这里只能断言
    // “没有把它写进指令面”，不能断言“模型不可见”（可见性见 docs/data-model.md 数据卡）。
    const agents = readFileSync(join(PACK, 'workspace/AGENTS.md'), 'utf8')
    expect(agents).not.toContain('deliverables-index')
    for (const role of [...ROLES, 'researcher']) expect(roleYml(role)).not.toContain('deliverables-index')
  })

  it('preset 行引用的插件都在 pack 依赖声明里（DSH verify-cordis-config 同构；R5a 起 deps ∪ peers）', () => {
    const manifest = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8')) as { dependencies?: Record<string, string>, peerDependencies?: Record<string, string> }
    // R5a 起 runtime 依赖 = peerDependencies（docs/release.md：不精确钉死）；本断言按包名归一，
    // 两种声明都算"在列"——与 checks/gates/preset-row-deps.mjs 的门禁同口径。
    const deps = new Set([...Object.keys(manifest.dependencies ?? {}), ...Object.keys(manifest.peerDependencies ?? {})])
    const missing = [...new Set(ROLES.flatMap(rowPlugins))].filter(name => !deps.has(name))
    expect(missing).toEqual([])
  })

  it('五角色文案定稿（R1 两角色守卫扩展），skill 目录名与 frontmatter 一致', () => {
    for (const role of ROLES) {
      const decl = roleYml(role)
      expect(decl, `${role} persona 仍是占位`).not.toContain('占位')
      expect(/^ {8}description:\s*\S/m.test(decl), `${role} 行内缺 description（原 preset.yml 字段已内联）`).toBe(true)
      const skills = readdirSync(join(PRESETS_DIR, role, 'skills'), { withFileTypes: true }).filter(e => e.isDirectory())
      expect(skills.length, `${role} 至少 1 个 skill`).toBeGreaterThan(0)
      for (const skill of skills) {
        expect(readFileSync(join(PRESETS_DIR, role, 'skills', skill.name, 'SKILL.md'), 'utf8')).toContain(`name: ${skill.name}`)
      }
      // 2026-10-28 M3：第二 skill 根 = 公司级方法层（<DSH_HOME>/company/methods/<role>/）；
      // 旧 profile 路径只读留一版，host 启动迁移。分身在 workspace 沙箱外不可写（workspace-write）。
      const compose = roleYml(role)
      expect(
        compose.includes(`../../company/methods/${role}/`),
        `${role} preset 声明公司级方法层根（../../company/methods/${role}/）`,
      ).toBe(true)
    }
  })

  it('五角色必须声明基础工具行（preset 自包含；R1 首跑：无工具行 → 读不了文件、写不出交付物）', () => {
    const required = ['tool-fs', 'tool-fs-search', 'tool-skill', 'tool-todo', 'tool-present']
    for (const role of ROLES) {
      const composition = roleYml(role)
      const declared = new Set([...composition.matchAll(/^\s+- id:\s*([a-z0-9-]+)$/gm)].map(m => m[1] as string))
      const missing = required.filter(row => !declared.has(row))
      expect(missing, `${role} 缺工具行：${missing.join(', ')}（preset 是自包含组合，DSH 无 patch 继承）`).toEqual([])
      expect(composition, `${role} 必须挂 skill-filesystem`).toMatch(/^\s+- id: skill-filesystem$/m)
      expect(composition, `${role} 必须挂 persona`).toMatch(/^\s+- id: persona$/m)
    }
  })

  it('带必填 config 的工具行必须给出配置（R1 实证：抄行名不抄 config → preset 挂载失败、UI 静默）', () => {
    // 防线一：快、进 pnpm test。字段名来自 shipped standard preset（其 Config schema 无默认值）。
    const requiredConfig: Record<string, string[]> = {
      'tool-fs-search': ['sampleOverCapGlobResults'],
      'tool-todo': ['allowParallelInProgress'],
    }
    for (const role of ROLES) {
      const text = roleYml(role)
      for (const [row, fields] of Object.entries(requiredConfig)) {
        if (!new RegExp(`^\\s+- id: ${row}$`, 'm').test(text)) continue
        for (const field of fields) {
          expect(text, `${role} 的 ${row} 缺必填 ${field}（preset 会挂载失败）`).toContain(field)
        }
      }
    }
  })

  it('researcher preset（0.2.1）：只读工具面、无职责边界、进 bundle 数组——委托 child 的人格载体', () => {
    // 为什么需要它：0.2.1 起委托 child 的人格只能由 agentPreset 给；CEO 的通用委托行不钉 preset
    // 就会生出"迷你 CEO"。researcher 是**手**不是第五个职能 ⇒ 它不该有写盘工具、不该有 journal 义务。
    const patch = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8')).dsh.bundle.patch as string[]
    expect(patch, 'researcher/preset 未列进 dsh.bundle.patch（真挂载会缺这个 preset）')
      .toContain('./presets/researcher/agent.cordis.yml')
    const text = roleYml('researcher')
    expect(text, 'researcher 缺 preset-researcher 声明行').toMatch(/^\s+- id: preset-researcher$/m)
    expect(text, 'researcher 的 config.id 必须等于 researcher').toMatch(/^\s+id: researcher$/m)
    // 「只读」不能只写在 persona 里：tool-fs 行必须显式关掉 write/edit（vendor Config 的开关）。
    const fsRow = rowBlock('researcher', 'tool-fs')
    expect(fsRow, 'researcher 缺 tool-fs 行（读盘面）').not.toBe('')
    expect(fsRow, 'researcher 的 tool-fs 必须 write: false（只读手的写能力面）').toContain('write: false')
    expect(fsRow, 'researcher 的 tool-fs 必须 edit: false').toContain('edit: false')
    for (const row of ['tool-fs-search', 'tool-web', 'tool-todo']) {
      expect(text, `researcher 缺 ${row}（调研手没有检索面就等于没有手）`).toMatch(new RegExp(`^\\s+- id: ${row}$`, 'm'))
    }
    // 它是手不是职能：不能带角色职责（journal 纪要义务、CHARTER 开场）。注释里解释"没有这些义务"不算。
    const personaRow = rowBlock('researcher', 'persona')
    expect(personaRow, 'researcher 的 persona 不得给 journal 纪要义务').not.toMatch(/journal/i)
    expect(personaRow, 'researcher 的 persona 不得给 CHARTER 开场仪式').not.toMatch(/CHARTER/)
  })

  it('五角色显示名共用公司前缀（D14 系列命名，R2 补角色时不许忘）', () => {
    const names = ROLES.map(role => {
      const match = /^ {8}name:\s*(.+)$/m.exec(roleYml(role))
      expect(match, `${role} 行内 config.name 缺失`).not.toBeNull()
      return (match as RegExpExecArray)[1]!.trim()
    })
    expect(names.every(name => name.startsWith('梦之队 ')), `显示名未共用 梦之队 前缀：${names.join(' / ')}`).toBe(true)
  })

  it('bundle 行：agent-preset-registry 用替换语义（覆盖 web-app 出厂行 default），其余新增走 insert', () => {
    const patch = readFileSync(join(PACK, 'cordis.patch.yml'), 'utf8')
    expect(patch).toMatch(/^- id: agent-preset-registry$/m)
    expect(patch).toMatch(/^\s+default: ceo$/m)
    expect(patch).toMatch(/^- insert:$/m)
    for (const row of ['tool-present', 'agent-team', 'tool-agent-team']) {
      expect(patch).toMatch(new RegExp(`^\\s+- id: ${row}$`, 'm'))
    }
  })

  it('全仓不再引用已拆分的 @deepseek-ai/dsh-agent-presets（0.1.7 起 = agent-preset + registry）', () => {
    const files = [
      join(PACK, 'cordis.patch.yml'),
      join(PACK, 'package.json'),
      join(ROOT, 'package.json'),
      join(ROOT, 'run/company.overlay.yml'),
    ]
    for (const file of files) {
      const text = readFileSync(file, 'utf8')
      // 只查"真引用"（插件行名 / 依赖声明键），注释里解释历史不算引用。
      expect(text, `${file} 仍有插件行引用已拆除的 agent-presets`).not.toMatch(/name:\s*'@deepseek-ai\/dsh-agent-presets'/)
      expect(text, `${file} 仍有依赖声明引用已拆除的 agent-presets`).not.toMatch(/"@deepseek-ai\/dsh-agent-presets":/)
    }
  })

  it('CEO 汇报线（R3；0.2.1 重校）：命名委托走 activation + agentPreset；per-tool persona / one-shot 配置位已不存在', () => {
    const ceo = roleYml('ceo')
    // 0.2.1 机制（vendor 升档指南 subagent-activations + subagent-preset-composition）：
    // `backgroundMode` / `enableRunInBackground` / `persona` / `toolFilter` 被 Config 硬拒
    // （"tool-subagent: persona is no longer supported"），child 的人格只能由 agentPreset 选。
    // ⇒ 每个直接汇报对象仍是一个 distinct toolName，但贴身配置 = provider + toolName + maxDepth + agentPreset。
    for (const [tool, preset] of [['vp_eng', 'vp-eng'], ['vp_sales', 'vp-sales']] as const) {
      const match = new RegExp(`toolName: ${tool}([\\s\\S]*?)(?=\\n\\s*- id: |$)`).exec(ceo)
      expect(match, `CEO 缺命名委托工具 ${tool}`).not.toBeNull()
      const block = (match as RegExpExecArray)[1] as string
      expect(block, `${tool} 必须用角色 preset 给人格（per-tool persona 已删）`).toContain(`agentPreset: ${preset}`)
      expect(block, `${tool} 缺 maxDepth（禁止 VP→VP 平级派活）`).toContain('maxDepth: 1')
      // 反向守卫：这些位在 0.2.1 会把 preset 标 broken，别再"修"回来。
      expect(block, `${tool} 仍有 0.2.1 已删除的配置位（preset 会被标 broken）`).not.toMatch(/^\s+(backgroundMode|enableRunInBackground|persona|toolFilter):/m)
    }
    // 通用委托：必须钉 agentPreset（否则 spawn 继承 CEO preset），且工具名即语义。
    const generic = /toolName: subagent_research([\s\S]*?)(?=\n\s*- id: |$)/.exec(ceo)?.[1] ?? ''
    expect(generic, 'CEO 通用委托的 child 必须钉 researcher 人格（spawn 不钉会继承 CEO）').toContain('agentPreset: researcher')
    // 反向守卫：两个续驶控制行在 CEO 会话里被团队版 shadow（是死行），别再"修"回来。
    for (const row of ['tool-subagent-control', 'tool-subagent-list-agents']) {
      expect(ceo, `${row} 在 CEO 会话被 team shadow，是死行（见 docs/delegation.md）`)
        .not.toMatch(new RegExp(`^\\s*- id: ${row}$`, 'm'))
    }
  })

  it('委托控制面（R4；0.2.1 不动机制）：职能 preset 声明控制行，CEO 不声明', () => {
    // 机制（vendor 实证）：`tool-agent-team` 的 maybeInstall 只在 `ctx.agentTeams.tryMembership(agent)`
    // 命中（= 团队成员）时才装**团队版**控制名。职能**根**会话不是团队成员 ⇒ 必须自己声明全局版，
    // 否则 0.2.1 的 activation child 在职能会话里既发不了消息、也中断不了、也列不出来。
    // 0.2.1 删的是 `backgroundMode` 配置位，不删这条机制（控制面仍是"可续 child"的唯一入口）。
    const controlRows = ['tool-subagent-control', 'tool-subagent-list-agents']
    for (const role of ['vp-eng', 'vp-sales', 'coo', 'cfo']) {
      const text = roleYml(role)
      for (const row of controlRows) {
        expect(text, `${role} 缺 ${row}：它的根会话不是团队成员，团队版控制名不会装，activation child 会失联`)
          .toMatch(new RegExp(`^\\s*- id: ${row}$`, 'm'))
      }
      expect(text, `${role} 的委托 child 现在只能走 activation + 完成通知——别再写回 0.2.1 已删除的 backgroundMode`)
        .not.toMatch(/^\s+(backgroundMode|enableRunInBackground):/m)
    }
    const ceo = roleYml('ceo')
    for (const row of controlRows) {
      expect(ceo, `CEO 会话里 ${row} 被团队版 shadow，是死行（别修回来）`)
        .not.toMatch(new RegExp(`^\\s*- id: ${row}$`, 'm'))
    }
  })

  it('时钟与节律（0.2.1：schedule-bundle 退役 ⇒ preset 自持 time-context + tool-schedule）', () => {
    // 上游升档指南 schedule-bundle-retired：宿主 schedule 服务由 web-app 挂，time-context 与
    // tool-schedule 变成 preset 行所有权。persona 点名 schedule_create 的角色，preset 里就必须有工具，
    // 否则是"标志面谎报"。组合层不再替换/插入 time-context（旧替换行已删）。
    for (const role of ['ceo', 'vp-eng', 'vp-sales', 'coo', 'cfo']) {
      const text = roleYml(role)
      expect(text, `${role} 缺 time-context 行（0.2.1 起归 preset 所有）`).toMatch(/^\s*- id: time-context$/m)
      expect(text, `${role} 的 time-context 必须钉住 Asia/Shanghai（回落不依赖进程时区）`).toContain('timeZone: Asia/Shanghai')
      expect(text, `${role} 缺 tool-schedule 行`).toMatch(/^\s*- id: tool-schedule$/m)
    }
    const patch = readFileSync(join(ROOT, 'packages/company-pack/cordis.patch.yml'), 'utf8')
    expect(patch, '组合层不得再拥有 time-context 行（与 preset 行撞重复 id）')
      .not.toMatch(/^\s*- id: time-context$/m)
    expect(patch, '组合层不得再引用退役的 schedule-bundle')
      .not.toMatch(/dsh-experimental-schedule-bundle/)
  })

  it('公司手册（模型可见）覆盖五角色职责边界、路由与升级规则——不随内容改动悄悄失效', () => {
    const handbook = readFileSync(join(ROOT, 'packages/company-pack/workspace/AGENTS.md'), 'utf8')
    for (const role of ['CEO', 'CFO', 'VP-Sales', 'VP-Eng', 'COO']) {
      expect(handbook, `手册缺 ${role} 的职责边界`).toContain(role)
    }
    for (const section of ['职责边界', '这事问谁', '冲突与升级', '承诺权', '交付物三态']) {
      expect(handbook, `手册缺「${section}」节`).toContain(section)
    }
    // 路由必须回答高频冲突：数字口径（毛利/成本）与排期/交付日期该找谁
    expect(handbook).toMatch(/毛利/)
    expect(handbook).toMatch(/交付日期|排期/)
  })

  it('交付物三态（R4）：手册写清成品归 CEO、职能写 drafts；模板不再是占位', () => {
    const handbook = readFileSync(join(ROOT, 'packages/company-pack/workspace/AGENTS.md'), 'utf8')
    // 三态的字面形状必须与产品内词表一致（src/lib/deliverables-catalog.ts 的 META_TYPES/META_RESULTS）
    expect(handbook, '三态必须点明成品路径').toContain('deliverables/<日期>-<slug>/final.md')
    expect(handbook, '三态必须点明过程稿路径').toContain('deliverables/<日期>-<slug>/drafts/<角色>.md')
    expect(handbook, '必须写明成品只归 CEO').toMatch(/只有 CEO/)
    // 安装后的公司没有维护者仓库：核对入口必须是人/操作员，不是仓库审计脚本（D15 发现权随部署走）
    expect(handbook, '三态要指向操作员核对入口').toContain('操作员在会话外核对')
    expect(handbook, '注入内容不得再引用仓库审计脚本').not.toContain('checks/audit/')

    const presetGuide = readFileSync(join(ROOT, 'docs/presets.md'), 'utf8')
    expect(presetGuide, 'COO 运营核查必须路由到 COO 专用模板').toContain('产出=运营方案 + 预算核查（`templates/ops-review-note.md`）')
    for (const template of ['prd.md', 'weekly-report.md', 'review-note.md', 'decision-memo.md', 'ops-review-note.md']) {
      const body = readFileSync(join(ROOT, 'packages/company-pack/workspace/templates', template), 'utf8')
      expect(body, `${template} 仍是占位（模板即流程：写作类工作流的第一版就是它）`).not.toContain('占位')
      expect(body.length, `${template} 太短，像没写完`).toBeGreaterThan(300)
    }
  })

  it('CEO 人话出口规则必须覆盖阻塞、非阻塞和取证表达', () => {
    const ceo = roleYml('ceo')
    const chairing = readFileSync(join(PRESETS_DIR, 'ceo/skills/chairing-staff-meeting/SKILL.md'), 'utf8')
    expect(ceo, 'CEO prefix 必须说明阻塞选择用 ask_user_question').toContain('阻塞型选择')
    expect(ceo, 'CEO prefix 必须说明非阻塞缺口带假设继续').toContain('非阻塞')
    expect(chairing, '收口规则必须保留三件套').toContain('结论（≤3 条业务语言）')
    expect(chairing, '规则必须说明比较结构按场景选择').toMatch(/GFM 表格|短列表/)
    expect(chairing, '规则必须说明关键数字取证入口').toMatch(/行号锚|文件行锚|关键数字/)
    expect(chairing, '规则必须保护 Agent 间内部密度').toMatch(/drafts|任务书|成员消息/)
  })

  it('CEO 收口必须教「先 present、后标已完成」（2026-10-16 立，事故 = all-in-ai-2026 跳步收口）', () => {
    // 事故：那次收口会话把 final.md 写进盘、把 meta「结果」标成已完成，**95 次工具调用里没有 present**
    //（present 当时就在工具表里）⇒ 审计判 final-not-presented，真凶是跳步。skill 原本只写「用 present
    // 声明交付」，没有把顺序与「没 present 就没有已完成」写成硬约束 ⇒ 补钉子，防措辞被改回去。
    const chairing = readFileSync(join(PRESETS_DIR, 'ceo/skills/chairing-staff-meeting/SKILL.md'), 'utf8')
    expect(chairing, '收口步必须点名 present 工具').toContain('present')
    expect(chairing, '必须钉住顺序：先 present、后标终态（缺 present 不得标「已完成」）').toMatch(/present[^\n]{0,40}(先|前)[^\n]{0,20}(标|改)[^\n]{0,20}(已完成|终态)|没有 present/)
  })

  it('任务依赖必须教"两拍落"（板面 id 由板子发号；2026-10-13 实证：同批并行建任务时猜 id）', () => {
    /**
     * 现场（2026-10-13，会话 session-663ff4b6 / turn1 step9）：CEO 在同一批并行里建 T1–T4，
     * T4 的 `blocked_by` 写了 `["3","1","2"]`（自己的纸面 T 号）⇒ 板子精确匹配失败：
     * `blocker task "3" not found`（vendor agent-team task-board.ts:226，TEAM_TASK_NOT_FOUND）；
     * T3 的依赖更因同批无处可取 id 而**静默缺边**（subject 写"依赖 T1,T2"，板面 blockedBy 一直 = []）。
     * 反证：把 skill 里的 `blocked_by` 改回驼峰 `blockedBy`（或删掉 set_dependencies 两句）⇒ 本测试红。
     */
    const chairing = readFileSync(join(PRESETS_DIR, 'ceo/skills/chairing-staff-meeting/SKILL.md'), 'utf8')
    expect(chairing, '必须写工具真参数名 blocked_by（驼峰 blockedBy 不是板子的参数）').toContain('blocked_by')
    expect(chairing, '不许再出现驼峰 blockedBy（真缺陷原形）').not.toContain('blockedBy')
    expect(chairing, '必须教第二拍 = team_task_update 的 set_dependencies').toContain('set_dependencies')
    expect(chairing, '必须说明板面 id 形状 task-N').toContain('task-N')
    expect(chairing, '必须点破"同批建的还没有 id、不许猜"').toMatch(/不许猜|还没有 id/)
    expect(chairing, '必须区分纸面号与板面 id').toContain('纸面号')
    const handbook = readFileSync(join(ROOT, 'packages/company-pack/workspace/AGENTS.md'), 'utf8')
    expect(handbook, '派活行格式 owner（手册）必须点明 T 号是纸面号').toMatch(/`T<N>` 是纸面号/)
  })

  it('职能 preset 一律指向 drafts/，不许自己写 final.md（成品是对外承诺，归 CEO）', () => {
    for (const role of ['vp-eng', 'vp-sales', 'coo', 'cfo']) {
      const dir = join(PRESETS_DIR, role)
      const files = [join(dir, 'agent.cordis.yml')]
      for (const skill of readdirSync(join(dir, 'skills'), { withFileTypes: true })) {
        if (skill.isDirectory()) files.push(join(dir, 'skills', skill.name, 'SKILL.md'))
      }
      for (const file of files) {
        const text = readFileSync(file, 'utf8')
        expect(text, `${file} 引用了 deliverables/ 直落（应写 <slug>/drafts/<角色>.md）`).not.toMatch(/deliverables\/`?(?![<])/)
        expect(text, `${file} 让职能写 final.md（越权）`).not.toContain('/final.md')
      }
    }
  })
})

describe('组队健壮性三层防御（2026-10-12 用户裁定；issue 2026-10-12-ceo-minimal-assembly）', () => {
  it('B3 · CEO 组队技能带结构性硬条款（最小在屋起步 / 菜单算术 / 字段≠入屋 / 收打回=纠错）', () => {
    const skill = readFileSync(join(PRESETS_DIR, 'ceo', 'skills', 'assembling-the-team', 'SKILL.md'), 'utf8')
    expect(skill, '缺「最小在屋起步」硬条款——单 owner 起步为推荐默认（负例：17 场 ~15 场四职起手）')
      .toMatch(/最小在屋|单 owner 起步/)
    expect(skill, '缺「菜单算术一致性」——选项名单 = 工作项 owner 全集，spawn ⊆ 选中名单')
      .toMatch(/菜单算术|在屋名单.*全集|spawn ⊆/)
    expect(skill, '缺「验收字段 ≠ 入屋理由」——跨域字段初稿 + 待确认，不为字段拉人')
      .toMatch(/字段.{0,6}入屋|待.{0,3}确认/)
    expect(skill, '缺「收打回 = 纠错信号」处理句（andon：不追责）').toMatch(/打回.{0,12}(纠错|响应|不追责|三选一)/)
  })

  it('B3 · 成员侧打回规范在场（手册：域内核对义务 + 打回三件套 + 不追责）', () => {
    const handbook = readFileSync(join(ROOT, 'packages/company-pack/workspace', 'AGENTS.md'), 'utf8')
    expect(handbook, '缺成员「域内核对」义务（收到分派先答：我的域？判据给我了吗？）')
      .toMatch(/域内核对/)
    expect(handbook, '打回缺三件套形状（为什么不是我 / 缺什么 / 建议谁接）')
      .toMatch(/建议谁接|为什么不是我/)
    expect(handbook, '打回缺不追责句（andon：纠错贡献不是冒犯）').toMatch(/不追责|纠错贡献|不是冒犯/)
  })
})

// 负例留证 2026-10-18：BUG-021——五角色 preset 未加 `mode: timed` 时本断言实跑红
//   （`pnpm exec vitest run tests/presets` → 1 failed / 18 passed，失败文案「…的 ask_user_question 仍是 legacy：
//   前台窗口无界 ⇒ 脚本化驱动会永久挂在问询上（BUG-021）」）；补配置后复跑绿（19/19）。还原配方 = 删任一行 config。
describe('BUG-021：问询必须能自行收口（timed 形态）', () => {
  // 根因（卡上「修复就绪」节）：`tool-ask-user` 默认 `mode: legacy` = 无限期前台阻塞，
  // 'open' 态只能前台答、`userQuestions/answer` 只吃 'continued' ⇒ 无 UI 认领的环境里问询永停 open
  // （现场：一场跑到 26 步的动议挂 40 分钟后掉线）。timed 形态让窗口有界：超时后工具返回 pending、
  // 问询转 continued（RPC 可答），前台 UI 的卡片也仍在（"已继续工作，仍可回答"）。
  it('五角色的 ask_user_question 都钉 timed 形态 + 显式 timeout', () => {
    for (const role of ROLES) {
      const block = rowBlock(role, 'tool-ask-user')
      expect(block, `${role} preset 缺 tool-ask-user 行`).not.toBe('')
      expect(
        block,
        `${role} 的 ask_user_question 仍是 legacy：前台窗口无界 ⇒ 脚本化驱动会永久挂在问询上（BUG-021）`,
      ).toMatch(/^\s+mode: timed$/m)
      const timeout = /^\s+timeout: (\d+)$/m.exec(block)?.[1]
      expect(timeout, `${role} 缺显式 timeout（上游默认值不许静默漂进本仓）`).toBeDefined()
      expect(Number(timeout), `${role} timeout 必须是正整数（秒）`).toBeGreaterThan(0)
    }
  })
})
