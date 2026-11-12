import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
export function zzProbe(workspace: string): void {
  writeFileSync(join(workspace, '.dsh-company', 'probe.txt'), 'x')
}
