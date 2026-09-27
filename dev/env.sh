# 开发环境兜底：coding agent 不会自己想起双 home / 双 DSH 的区别（docs/guides/dev-loop.md §6）。
# 用法：source dev/env.sh
export DSH_HOME="$(cd "$(dirname "${BASH_SOURCE[0]}")/harness-home" && pwd)"
mkdir -p "$DSH_HOME"

# 裸 dsh 拦截（代码层）：PATH 里的 dsh 是日用全局安装，与本 repo 开发基线（vendor/dsh
# 钉 tag）是两个实体，版本会随全局升级漂移。DSH_HOME 只护数据层护不住代码层——
# source 过本文件后裸 dsh 虽落在 dev home，跑的仍是全局代码。验证一律 `pnpm dsh`。
dsh() {
  echo "本 repo 内请用 'pnpm dsh'（vendor/dsh 钉住 tag 的源码基线 + dev home）。" >&2
  echo "裸 dsh = 日用全局安装，不作开发验证；确要日用：command dsh …（或另开未 source 本文件的终端）。" >&2
  return 1
}

# pre-push 门禁接线（enforcement 通道，2026-09-27）：push 前强制跑全量结构门禁（.githooks/pre-push）。
# core.hooksPath 是本地 git config（不随 clone 走），故在此幂等设置——一切会话先 source 本文件，
# 「push 前跑 verify」从此不依赖自觉（DSH 立场：gates over prose）。bypass = git push --no-verify（用后留 Note 说明）。
_repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
git -C "$_repo_root" config core.hooksPath "$_repo_root/.githooks" \
  || echo "warn: pre-push hook 接线失败（enforcement 通道未生效）" >&2
unset _repo_root

echo "DSH_HOME=$DSH_HOME（日用 home ~/.dsh 不受影响）；验证用 pnpm dsh（vendor 基线），裸 dsh 已拦截。"
