// 工作树文件清单（门禁共享）：tracked + untracked 非 ignored。
//
// 为什么不是 `git ls-files`：本地收尾常见顺序是「先 verify、再 git add/commit」。
// 只扫 tracked 会让新文件在 verify 时不可见，commit 后才变红（2026-11-11 实测：
// Note 的绝对 home 路径在 untracked 时 verify 全绿，commit 后 tracked-portability 红）。
// `--exclude-standard` 仍排除 .gitignore 的产物（lib/、runtime/、node_modules/ 等），
// 所以不会把构建残留当源码扫；CI/fresh clone 下与 `git ls-files` 等价。
import { execFileSync } from 'node:child_process'

export function worktreeFiles(root) {
  return execFileSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  }).split('\0').filter(Boolean)
}

/**
 * 索引面（tracked + staged）文件：file-size 用这个，避免把本地未提交的大件当仓库资产。
 * 安全/portability 门禁仍用 `worktreeFiles`，因为它们要看“即将提交/可能误提交”的内容。
 */
export function indexFiles(root) {
  return execFileSync('git', ['ls-files', '-cz'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  }).split('\0').filter(Boolean)
}
