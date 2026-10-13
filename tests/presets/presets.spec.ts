import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const PACK = join(ROOT, 'packages/company-pack')
const PRESETS_DIR = join(PACK, 'presets')

/** 一个 preset 目录里声明的行插件名（`name: '@deepseek-ai/...'`），按包名归一（去 subpath）。 */
function rowPlugins(role: string): string[] {
  const text = readFileSync(join(PRESETS_DIR, role, 'agent.cordis.yml'), 'utf8')
  // 行名可带 subpath（`@scope/pkg/sub`，如 tool-subagent-control/list-agents）；
  // dependencies 里登记的是包名，所以按 `@scope/name` 归一后再比对（R3 实证）。
  return [...text.matchAll(/name:\s*'(@deepseek-ai\/[^']+)'/g)]
    .map(m => /^(@[^/]+\/[^/]+)/.exec(m[1] as string)?.[1] ?? (m[1] as string))
}

describe('company roster（R1 回归：preset 必须可挂载）', () => {
  it('五个角色各声明一个 dsh-agent-preset 行，且都列进 dsh.bundle.patch 数组（0.1.7 声明模型）', () => {
    const patch = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8')).dsh.bundle.patch as string[]
    expect(Array.isArray(patch), '0.1.7 起 dsh.bundle.patch 为数组（registry 一行 + 每预设一行）').toBe(true)
    for (const role of ['ceo', 'vp-eng', 'vp-sales', 'coo', 'cfo']) {
      const rel = `./presets/${role}/agent.cordis.yml`
      expect(patch, `${role} 未列进 dsh.bundle.patch`).toContain(rel)
      const text = readFileSync(join(PRESETS_DIR, role, 'agent.cordis.yml'), 'utf8')
      expect(text, `${role} 缺 preset-${role} 声明行`).toMatch(new RegExp(`^\\s+- id: preset-${role}$`, 'm'))
      expect(text, `${role} 的 config.id 必须等于角色 id`).toMatch(new RegExp(`^\\s+id: ${role}$`, 'm'))
      expect(text, `${role} 缺 config.plugins`).toMatch(/^\s+plugins:$/m)
      // 真正"挂得上"的完成定义在 preset-smoke（真 web 逐角色建会话）——这里只守声明形状。
    }
  })

  it('preset 行引用的插件都在 pack 依赖声明里（DSH verify-cordis-config 同构；R5a 起 deps ∪ peers）', () => {
    const manifest = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8')) as { dependencies?: Record<string, string>, peerDependencies?: Record<string, string> }
    // R5a 起 runtime 依赖 = peerDependencies（docs/release.md：不精确钉死）；本断言按包名归一，
    // 两种声明都算"在列"——与 checks/run-gates.mjs §7 的门禁同口径。
    const deps = new Set([...Object.keys(manifest.dependencies ?? {}), ...Object.keys(manifest.peerDependencies ?? {})])
    const missing = [...new Set(['ceo', 'vp-eng', 'vp-sales', 'coo', 'cfo'].flatMap(rowPlugins))].filter(name => !deps.has(name))
    expect(missing).toEqual([])
  })

  it('五角色文案定稿（R1 两角色守卫扩展），skill 目录名与 frontmatter 一致', () => {
    for (const role of ['ceo', 'vp-eng', 'vp-sales', 'coo', 'cfo']) {
      const decl = readFileSync(join(PRESETS_DIR, role, 'agent.cordis.yml'), 'utf8')
      expect(decl, `${role} persona 仍是占位`).not.toContain('占位')
      expect(/^ {8}description:\s*\S/m.test(decl), `${role} 行内缺 description（原 preset.yml 字段已内联）`).toBe(true)
      const skills = readdirSync(join(PRESETS_DIR, role, 'skills'), { withFileTypes: true }).filter(e => e.isDirectory())
      expect(skills.length, `${role} 至少 1 个 skill`).toBeGreaterThan(0)
      for (const skill of skills) {
        expect(readFileSync(join(PRESETS_DIR, role, 'skills', skill.name, 'SKILL.md'), 'utf8')).toContain(`name: ${skill.name}`)
      }
    }
  })

  it('五角色必须声明基础工具行（preset 自包含；R1 首跑：无工具行 → 读不了文件、写不出交付物）', () => {
    const required = ['tool-fs', 'tool-fs-search', 'tool-skill', 'tool-todo', 'tool-present']
    for (const role of ['ceo', 'vp-eng', 'vp-sales', 'coo', 'cfo']) {
      const composition = readFileSync(join(PRESETS_DIR, role, 'agent.cordis.yml'), 'utf8')
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
    for (const role of ['ceo', 'vp-eng', 'vp-sales', 'coo', 'cfo']) {
      const text = readFileSync(join(PRESETS_DIR, role, 'agent.cordis.yml'), 'utf8')
      for (const [row, fields] of Object.entries(requiredConfig)) {
        if (!new RegExp(`^\\s+- id: ${row}$`, 'm').test(text)) continue
        for (const field of fields) {
          expect(text, `${role} 的 ${row} 缺必填 ${field}（preset 会挂载失败）`).toContain(field)
        }
      }
    }
  })

  it('五角色显示名共用公司前缀（D14 系列命名，R2 补角色时不许忘）', () => {
    const names = ['ceo', 'vp-eng', 'vp-sales', 'coo', 'cfo'].map(role => {
      const match = /^ {8}name:\s*(.+)$/m.exec(readFileSync(join(PRESETS_DIR, role, 'agent.cordis.yml'), 'utf8'))
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

  it('CEO 汇报线（R3）：命名委托工具是 one-shot 前台；续驶控制行不得回填（team shadow 实证）', () => {
    const ceo = readFileSync(join(PRESETS_DIR, 'ceo', 'agent.cordis.yml'), 'utf8')
    // 每个直接汇报对象一个 distinct toolName（per-instance persona 教义）。
    for (const tool of ['vp_eng', 'vp_sales']) {
      const match = new RegExp(`toolName: ${tool}([\\s\\S]*?)(?=\\n\\s*- id: |$)`).exec(ceo)
      expect(match, `CEO 缺命名委托工具 ${tool}`).not.toBeNull()
      const block = (match as RegExpExecArray)[1] as string
      // R3 实证：CEO 会话从第一帧起就是 team-scoped，团队版 send_message/list_agents/
      // interrupt_agent 按成员**名字**寻址 ⇒ subagent child 无法被续驶。所以命名委托必须是
      // one-shot 前台（拿结果），不能是 continuable（会生出管不了的孤儿 child）。
      expect(block, `${tool} 必须 one-shot（continuable 的续驶在 CEO 会话里不可用）`).toContain('backgroundMode: one-shot')
      expect(block, `${tool} 必须关掉 run_in_background（没有 job_output 工具可收后台 one-shot）`).toContain('enableRunInBackground: false')
      expect(block, `${tool} 缺 per-instance persona`).toContain('persona: |-')
      expect(block, `${tool} 缺 maxDepth（禁止 VP→VP 平级派活）`).toContain('maxDepth: 1')
    }
    // 反向守卫：这两个控制行在 CEO 会话里会被团队版 shadow（是死行），别再"修"回来。
    expect(ceo, 'tool-subagent-control 在 CEO 会话被 team shadow，是死行（见 docs/delegation.md）')
      .not.toMatch(/^\s*- id: tool-subagent-control$/m)
    expect(ceo, 'list-agents 同理是死行')
      .not.toMatch(/^\s*- id: tool-subagent-list-agents$/m)
  })

  it('续驶控制面与 subagent 成对（R4 关闭 footgun）：职能 preset 必须有，CEO preset 必须没有', () => {
    // 机制（vendor 实证）：`tool-agent-team` 的 maybeInstall 只在
    // `ctx.agentTeams.tryMembership(agent) !== undefined`（= 团队成员）时才装**团队版**控制名
    // （vendor/dsh/packages/experimental/tool-agent-team/src/index.ts:397-402）。
    //   - 职能**根**会话不是团队成员 ⇒ 团队版不会装；若 preset 自己也不声明全局版，会话里就
    //     既没有团队版也没有全局版 ⇒ `subagent`(continuable) 生出来的 child 失联
    //     （既发不了消息、也中断不了、也列不出来）——这正是 R3→R4 的轮间待办。
    //   - 上游 standard / ptc / cordis 三个 preset 都是**成对**声明这两行 + tool-subagent。
    //   - CEO preset 反过来不能有：CEO 从第一帧起就是 team-scoped（Lead 自己是成员），
    //     这两行在那里被团队版 shadow 成死行（R3 实证，见 docs/delegation.md §2）。
    const controlRows = ['tool-subagent-control', 'tool-subagent-list-agents']
    for (const role of ['vp-eng', 'vp-sales', 'coo', 'cfo']) {
      const text = readFileSync(join(PRESETS_DIR, role, 'agent.cordis.yml'), 'utf8')
      for (const row of controlRows) {
        expect(text, `${role} 缺 ${row}：它的根会话不是团队成员，团队版控制名不会装，continuable child 会失联`)
          .toMatch(new RegExp(`^\\s*- id: ${row}$`, 'm'))
      }
      expect(text, `${role} 的 subagent 是 continuable，却没有控制面——要么补控制行，要么改 one-shot`)
        .toContain('backgroundMode: continuable')
    }
    const ceo = readFileSync(join(PRESETS_DIR, 'ceo', 'agent.cordis.yml'), 'utf8')
    for (const row of controlRows) {
      expect(ceo, `CEO 会话里 ${row} 被团队版 shadow，是死行（别修回来）`)
        .not.toMatch(new RegExp(`^\\s*- id: ${row}$`, 'm'))
    }
  })

  it('公司手册（模型可见）覆盖五角色职责边界、路由与升级规则——不随内容改动悄悄失效', () => {
    const handbook = readFileSync(join(ROOT, 'company-workspace/AGENTS.md'), 'utf8')
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
    const handbook = readFileSync(join(ROOT, 'company-workspace/AGENTS.md'), 'utf8')
    // 三态的字面形状必须与判据实现一致（tools/lib/deliverables.mjs 的 FINAL_BASENAME / DRAFTS_DIRNAME）
    expect(handbook, '三态必须点明成品路径').toContain('deliverables/<slug>/final.md')
    expect(handbook, '三态必须点明过程稿路径').toContain('deliverables/<slug>/drafts/<角色>.md')
    expect(handbook, '必须写明成品只归 CEO').toMatch(/只有 CEO/)
    // 判据必须可被模型自行跑（发现权在代理一侧，D15）
    expect(handbook, '三态要指向机器判据入口').toContain('checks/audit/deliverables-check.mjs')

    const presetGuide = readFileSync(join(ROOT, 'docs/presets.md'), 'utf8')
    expect(presetGuide, 'COO 运营核查必须路由到 COO 专用模板').toContain('产出=运营方案 + 预算核查（`templates/ops-review-note.md`）')
    for (const template of ['prd.md', 'weekly-report.md', 'review-note.md', 'decision-memo.md', 'ops-review-note.md']) {
      const body = readFileSync(join(ROOT, 'company-workspace/templates', template), 'utf8')
      expect(body, `${template} 仍是占位（模板即流程：写作类工作流的第一版就是它）`).not.toContain('占位')
      expect(body.length, `${template} 太短，像没写完`).toBeGreaterThan(300)
    }
  })

  it('CEO 人话出口规则必须覆盖阻塞、非阻塞和取证表达', () => {
    const ceo = readFileSync(join(PRESETS_DIR, 'ceo', 'agent.cordis.yml'), 'utf8')
    const chairing = readFileSync(join(PRESETS_DIR, 'ceo/skills/chairing-staff-meeting/SKILL.md'), 'utf8')
    expect(ceo, 'CEO prefix 必须说明阻塞选择用 ask_user_question').toContain('阻塞型选择')
    expect(ceo, 'CEO prefix 必须说明非阻塞缺口带假设继续').toContain('非阻塞')
    expect(chairing, '收口规则必须保留三件套').toContain('结论（≤3 条业务语言）')
    expect(chairing, '规则必须说明比较结构按场景选择').toMatch(/GFM 表格|短列表/)
    expect(chairing, '规则必须说明关键数字取证入口').toMatch(/行号锚|文件行锚|关键数字/)
    expect(chairing, '规则必须保护 Agent 间内部密度').toMatch(/drafts|任务书|成员消息/)
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
    const handbook = readFileSync(join(ROOT, 'company-workspace/AGENTS.md'), 'utf8')
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
    const handbook = readFileSync(join(ROOT, 'company-workspace', 'AGENTS.md'), 'utf8')
    expect(handbook, '缺成员「域内核对」义务（收到分派先答：我的域？判据给我了吗？）')
      .toMatch(/域内核对/)
    expect(handbook, '打回缺三件套形状（为什么不是我 / 缺什么 / 建议谁接）')
      .toMatch(/建议谁接|为什么不是我/)
    expect(handbook, '打回缺不追责句（andon：纠错贡献不是冒犯）').toMatch(/不追责|纠错贡献|不是冒犯/)
  })
})
