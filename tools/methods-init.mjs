// 状态：常驻
// 何时跑：首次装 pack / 需要把 starter 质量环方法包放进方法层时；幂等，已存在不覆盖。
// 形状：pack `content/methods/<side>/<pack>/SKILL.md` → `<DSH_HOME>/company/methods/<side>/<pack>/SKILL.md`。
// 为什么不自动：方法层是「人拥有」的合同；复制后人可以改/换/删，pack 升级不擦。
import { join } from 'node:path'
import { repositoryRoot } from './lib/repository-layout.mjs'
import { seedMethods } from './lib/methods-init.mjs'

const dshHome = process.env.DSH_HOME
if (dshHome === undefined || dshHome === '') {
  console.error('methods:init 需要 DSH_HOME；先 `source run/env.sh`（dev）或按部署设置 DSH_HOME')
  process.exit(1)
}

const contentDir = join(repositoryRoot, 'packages/company-pack/content')
const methodsRoot = join(dshHome, 'company/methods')
const result = seedMethods({ contentDir, methodsRoot })
for (const path of result.copied) console.log(`copied ${path}`)
for (const item of result.skipped) console.log(`skip   ${item.path}（${item.reason}）`)
console.log(`methods:init 完成——copied ${String(result.copied.length)} / skipped ${String(result.skipped.length)}；根 = ${methodsRoot}`)
