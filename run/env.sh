# 开发环境兜底：coding agent 不会自己想起双 home / 双 DSH 的区别（docs/guides/dev-loop.md §6）。
# 用法：source run/env.sh
_repo_root_dev="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export DSH_HOME="$_repo_root_dev/runtime/harness-home"
mkdir -p "$DSH_HOME"

# dev run bundle 的 workspace（2026-10-24 RFC run-bundle-install-unit）：
# company-workspace 整树 gitignored，是会话 cwd；制度件符号链接指回 pack。首启时 pack 会写
# runtime/harness-home/bundle.json（bundle 身份 + 骨架指纹）。fresh clone 先 `pnpm bundle:init`。
export DSH_COMPANY_HOME="$_repo_root_dev/company-workspace"
if [ ! -d "$DSH_COMPANY_HOME" ]; then
  echo "⚠ 未发现 dev run bundle workspace：$DSH_COMPANY_HOME" >&2
  echo "  先跑 'pnpm bundle:init'（建骨架 + 制度件符号链接；已有盘一个字节都不动）。" >&2
fi
unset _repo_root_dev

# 裸 dsh 拦截（代码层）：PATH 里的 dsh 是日用全局安装，与本 repo 开发基线（vendor/dsh
# 钉 tag）是两个实体，版本会随全局升级漂移。DSH_HOME 只护数据层护不住代码层——
# source 过本文件后裸 dsh 虽落在 dev home，跑的仍是全局代码。验证一律 `pnpm dsh`。
dsh() {
  echo "本 repo 内请用 'pnpm dsh'（vendor/dsh 钉住 tag 的源码基线 + dev home）。" >&2
  echo "裸 dsh = 日用全局安装，不作开发验证；确要日用：command dsh …（或另开未 source 本文件的终端）。" >&2
  return 1
}

# 沙箱后端探测（2026-10-10）：本机 Seatbelt 不可用时自动落到 danger-full-access。
# 为什么需要：`workspace-write` 依赖 `sandbox-exec` 真正能建围栏。macOS 26 在本机把它禁掉了
#   （`sandbox-exec -p … /bin/true` → "sandbox_apply: Operation not permitted"，exit 71；
#   osascript 绕开 harness 同样 71 ⇒ 与 DSH 无关，是全机范围的限制）。
#   DSH 对此是 fail-closed（vendor `SandboxUnavailableError`：refusing to run the command
#   unconfined），于是**每条 bash 都退化成「请求升级」**——连 ls/pwd 这类纯读命令也一样；
#   批准一次只买通一条命令（allowed-once），下条照问。这正是观察窗「步步要批准」的来源。
#   上游指定的处方就写在同一条错误信息里：otherwise switch the consumer to danger-full-access。
#   danger-full-access 在 base bundle 里同时把审批策略推成 never ⇒ 两个轴一起解决。
# 探测而非硬编码：后端哪天恢复了就自动回到 workspace-write（围栏优先）。失败是**明示**的——
#   本文件一切判断都打印一行，因为这里的坑与双 home 同形：不报错、只是行为悄悄变糟。
# 逃生阀：已显式设过 DSH_PERMISSION_MODE 则尊重它；DSH_SKIP_SANDBOX_PROBE=1 可跳过探测。
if [ -n "${DSH_PERMISSION_MODE:-}" ]; then
  echo "沙箱：沿用已设的 DSH_PERMISSION_MODE=$DSH_PERMISSION_MODE（跳过探测）。"
elif [ "${DSH_SKIP_SANDBOX_PROBE:-}" = "1" ]; then
  echo "沙箱：DSH_SKIP_SANDBOX_PROBE=1，跳过探测（将按上游默认 workspace-write 起，后端不可用时又会步步要批准）。"
elif [ "$(uname -s)" != "Darwin" ]; then
  echo "沙箱：非 macOS，交给上游链自动选后端（Linux 走 bwrap/landlock）。"
elif /usr/bin/sandbox-exec -p '(version 1)(allow default)' /usr/bin/true 2>/dev/null; then
  echo "沙箱：sandbox-exec 可用 ⇒ 保持 workspace-write（真围栏）。"
else
  export DSH_PERMISSION_MODE=danger-full-access
  echo "沙箱：⚠ 本机 sandbox-exec 不可用（Seatbelt 被禁）⇒ 已导出 DSH_PERMISSION_MODE=danger-full-access，bash 不再逐条请求批准。" >&2
  echo "      取舍：不再有围栏（审批策略随之变 never）。这是上游对该错误的指定处方；本机围栏本就不存在，" >&2
  echo "      此前每次 allowed-once 事实上已在给全权。要恢复围栏：修好 Seatbelt 或改用 Linux/WSL，然后重开本文件。" >&2
fi

# pre-push 门禁接线（enforcement 通道，2026-09-27）：push 前强制跑全量结构门禁（.githooks/pre-push）。
# core.hooksPath 是本地 git config（不随 clone 走），故在此幂等设置——一切会话先 source 本文件，
# 「push 前跑 verify」从此不依赖自觉（DSH 立场：gates over prose）。bypass = git push --no-verify（用后留 Note 说明）。
_repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
git -C "$_repo_root" config core.hooksPath "$_repo_root/.githooks" \
  || echo "warn: pre-push hook 接线失败（enforcement 通道未生效）" >&2
unset _repo_root

echo "DSH_HOME=$DSH_HOME（日用 home ~/.dsh 不受影响）；验证用 pnpm dsh（vendor 基线），裸 dsh 已拦截。"

# 浏览器可选面（2026-10-26）：npm 发布的 DSH meta package 不含 browser-use 两包；本仓 dev 用
# vendor 源码树，两包在安装侧可解析，但 preset 的自动探测从 profile 看，故这里显式开。
export DSH_COMPANY_BROWSER=on

# 出厂骨架首启自举（2026-10-13）：本仓的 workspace 由 `pnpm bundle:init` 建（制度件符号链接指回 pack），
# 不需要插件在 DSH_HOME 下再复制一份 ⇒ 关掉；模拟安装（release-smoke）会自己把它翻回 if-missing。
# 注意：关的是“复制骨架”，不是 bundle 身份——pack 仍会在 workspace 在场时写 bundle.json。
export DSH_COMPANY_BOOTSTRAP=off
