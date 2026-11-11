// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderInstallManual } from '../../tools/lib/install-manual.mjs'
import { expectedTag } from './lib/pin.mjs'

// ── 2g. 手动分发手册版本 + 安装形状门禁（2026-09-28 立；2026-11-01 v3 重写）────────
// 为什么：手册是收件人的安装路径；版本对但内容教旧形状（launcher/--workspace/一 home
// 一 workspace/seed）就是装错。现行形状 = Plugins 页默认、`dsh --profile company`、
// 公司状态在 `<workspace>/.dsh-company/`、插件内容在包 `content/`。
// 负例留证：删「Plugins」或写入 `--workspace` → 本门禁红；重跑 export-dist → 绿。
export function run({ root, ok, fail }) {
  const packVersion = JSON.parse(readFileSync(join(root, 'packages/company-pack/package.json'), 'utf8')).version
  const manualPath = join(root, '_dist', '安装手册.md')
  if (!existsSync(manualPath)) {
    fail('dist-manual', '_dist/安装手册.md 缺失——跑 `node tools/export-dist.mjs` 生成（tracked 生成物，随版本变更同 diff 重导）')
    return
  }
  const manual = readFileSync(manualPath, 'utf8')
  const header = manual.split('| 版本 |')[1]?.split('|')[0]?.trim()
  const problems = []
  if (header !== packVersion) {
    problems.push(`表头版本（${header ?? '解析不到'}）≠ pack package.json（${packVersion}）——重跑 \`node tools/export-dist.mjs\` 再提交，别手改手册`)
  }
  const required = ['Plugins', 'dsh --profile company', '.dsh-company/bundle.json', 'content/', 'kb/',
    'deliverables/', 'exports', 'company/ledger', 'sha256', 'DSH', 'dsh --version', '卸载', '回退',
    'DSH_COMPANY_BROWSER', 'dsh-web-app', '仅 `dsh web`', '三个成功', 'pnpm', 'Desktop', 'npm CLI']
  const missing = required.filter(phrase => !manual.includes(phrase))
  if (missing.length > 0) problems.push(`手册缺安装形状/契约关键句：${missing.join(' / ')}`)
  const forbidden = ['--workspace', '--profile desktop', 'bin/dsh-company', 'seed-consent',
    'handbookTarget', '一次安装 = 一个 DSH home', '换项目 = 新建一个 home']
  const found = forbidden.filter(phrase => manual.includes(phrase))
  if (found.length > 0) problems.push(`手册仍教旧形状：${found.join(' / ')}（以 .dsh-company/ 与 named profile 为准）`)
  if (!/Plugins/.test(manual)) problems.push('手册缺应用内 Plugins 页默认安装路径')
  if (!/Desktop.*自带|自带.*pnpm/.test(manual)) problems.push('手册应写 Desktop 自带 Node/pnpm')
  if (!/npm CLI|`dsh web`/.test(manual) || !/PATH/.test(manual)) problems.push('手册应写 npm CLI / dsh web 需要 pnpm 在 PATH')
  if (!/仅 `dsh web`/.test(manual)) problems.push('手册的 CLI 段缺「仅 `dsh web`」边界')
  if (!manual.includes(expectedTag)) problems.push(`手册缺验证基线 \`${expectedTag}\`（pin 漂了或没重导）`)
  const manualHash = /[0-9a-f]{64}/.exec(manual)?.[0]
  if (manualHash === undefined) problems.push('手册缺 tgz 的 sha256（64 位十六进制）——重跑 `node tools/export-dist.mjs`')
  const tarball = join(root, '_dist', `dsh-company-pack-${packVersion}.tgz`)
  if (existsSync(tarball) && manualHash !== undefined) {
    const digest = createHash('sha256').update(readFileSync(tarball)).digest('hex')
    if (digest !== manualHash) problems.push(`手册 sha256（${manualHash}）≠ tgz 本体（${digest}）——重跑 \`node tools/export-dist.mjs\``)
    const sidecar = `${tarball}.sha256`
    if (!existsSync(sidecar)) problems.push('_dist 缺 tgz 的 .sha256 旁文件——重跑 `node tools/export-dist.mjs`')
    else if (!readFileSync(sidecar, 'utf8').trim().startsWith(digest)) problems.push('_dist 的 .sha256 旁文件与 tgz 本体不一致——重跑 `node tools/export-dist.mjs`')
  }
  // 2026-11-11 接手 gap：pack README 随 tarball/npm 分发，指向仓库内相对 `_dist/安装手册.md`
  // 在包外不可达；必须有绝对仓库 URL（tarball 与手册仍为两件套）。负例留证 2026-11-11：
  // 把 README 的 URL 改回 `_dist/安装手册.md` → 本门禁红；还原 → 绿。
  const packReadmePath = join(root, 'packages/company-pack/README.md')
  if (!existsSync(packReadmePath)) {
    problems.push('pack README 缺失——无法核对安装手册指针')
  } else {
    const packReadme = readFileSync(packReadmePath, 'utf8')
    const manualUrl = 'https://github.com/ethan-jiang-1/ai_dsh_company/blob/master/_dist/安装手册.md'
    if (!packReadme.includes(manualUrl)) {
      problems.push('pack README 缺指向仓库绝对 URL 的《安装手册》指针（相对 `_dist/安装手册.md` 在包外不可达）')
    }
  }
  // 2026-11-03（第六轮 D4-3）：tracked 手册必须**就是当前模板的产物**。此前只查版本/sha/关键句，
  // 模板改了（例如卸载清单）而手册没重生成，verify 仍绿——本轮实测存在过一次。
  // 渲染输入从手册自身读回（版本/包名/sha/日期）+ pin，可脱离本地 manifest 复核（fresh clone 也成立）。
  const headerCell = (label) => {
    const line = manual.split('\n').find(candidate => candidate.startsWith(`| ${label} |`))
    if (line === undefined) return undefined
    const raw = line.split('|').slice(2, -1).join('|').trim()
    return /`([^`]+)`/.exec(raw)?.[1]?.trim() ?? raw
  }
  const tarballName = headerCell('安装包')
  const manualDigest = headerCell('校验（sha256）')
  const manualDate = headerCell('打包日期')
  if (tarballName !== undefined && manualDigest !== undefined && manualDate !== undefined) {
    const rendered = renderInstallManual({
      version: packVersion,
      tarballName,
      digest: manualDigest,
      date: manualDate,
      expectedTag,
      entries: 0,
    })
    if (rendered !== manual) {
      let at = 0
      while (at < rendered.length && at < manual.length && rendered[at] === manual[at]) at += 1
      const around = (text) => JSON.stringify(text.slice(Math.max(0, at - 40), at + 60))
      problems.push(`手册不是当前模板的产物（${'tools/lib/install-manual.mjs'} 改了而手册没重生成）：`
        + `首处差异 @${String(at)} 模板=${around(rendered)} 手册=${around(manual)}——重跑 \`node tools/export-dist.mjs\`（或 release --prepare）`)
    }
  } else {
    problems.push('手册头部缺「安装包 / 校验（sha256）/ 打包日期」行——无法复核是否为当前模板产物（重跑 export-dist 再提交）')
  }
  problems.length === 0
    ? ok(`dist-manual（版本 ${packVersion} + DSH 安装形状 + sha256 + 模板同源 + pin ${expectedTag}）`)
    : fail('dist-manual', problems.join('；'))
}
