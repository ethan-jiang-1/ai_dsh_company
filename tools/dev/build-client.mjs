#!/usr/bin/env node
// 状态：常驻
// 何时跑：改了 `packages/company-pack/src/client/**` 或 `src/lib/**`、要跑真页面车道（ui-scene / client-load /
//   client-error-chain）之前；三条车道启动时会比对构建指纹，不一致直接 fail-loud 叫你来跑这条。
// 为什么存在（BUG-296，2026-11-21）：真页面车道此前只查 `lib/client.js` 存在，源码改了不重建也能「绿」——
//   2026-11-21 的 BUG-293（槽崩溃）就是这样被旧字节藏了一整个提交。本脚本 = 构建 + 写指纹，
//   车道侧判据住 `tools/lib/core/client-bundle.mjs`（输入集是目录级的，新增文件自动纳入）。
// 退出码：0 = 构建成功且指纹已写；2 = 构建失败（不写指纹，旧指纹自然过期 ⇒ 车道会继续红，不假装成功）。
import { spawnSync } from 'node:child_process'
import { repositoryRoot as ROOT } from '../lib/core/repository-layout.mjs'
import { writeClientBuildFingerprint } from '../lib/core/client-bundle.mjs'

const run = (args, cwd) => {
  const result = spawnSync(args[0], args.slice(1), { cwd, stdio: 'inherit' })
  if (result.status !== 0) {
    console.error(`build-client: 构建失败（${args.join(' ')}，exit ${String(result.status)}）——指纹未写，旧产物继续被判过期`)
    process.exit(2)
  }
}

run([process.execPath, './node_modules/typescript/bin/tsc', '-b', 'packages/company-pack'], ROOT)
// tsdown 的 bin 是带 shebang 的可执行脚本（不是 JS 入口）：直接执行，cwd = 包目录（与手工命令同形）。
run([`${ROOT}/node_modules/.bin/tsdown`], `${ROOT}/packages/company-pack`)
const fingerprint = writeClientBuildFingerprint(ROOT)
console.log(`build-client: 已构建并写指纹 ${fingerprint.slice(0, 12)}…（packages/company-pack/lib/.build-fingerprint）`)
