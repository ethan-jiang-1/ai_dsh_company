/**
 * startup settings 的项目 workspace 解析（2026-11-13，BUG-120）。
 *
 * 会话 cwd 优先，但 cwd 必须过危险落点判据；tmpdir/home/根不是项目，回退 boot workspace；
 * boot 也不安全则返回空（只装只读 section，不写派生文件）。
 */
import { startupWorkspace, type StartupAgentLike } from '../../lib/startup-settings.ts'
import { isDangerousRoot } from '../workspace/dangerous-roots.ts'

export function resolveStartupWorkspace(bootWorkspace: string, agent: StartupAgentLike | undefined): string {
  const candidate = startupWorkspace(bootWorkspace, agent)
  if (candidate !== '' && !isDangerousRoot(candidate)) return candidate
  if (bootWorkspace !== '' && !isDangerousRoot(bootWorkspace)) return bootWorkspace
  return ''
}
