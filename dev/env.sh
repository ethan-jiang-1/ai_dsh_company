# 开发环境兜底：coding agent 不会自己想起双 home 的区别（docs/design/10-architecture.md §6）。
# 用法：source dev/env.sh
export DSH_HOME="$(cd "$(dirname "${BASH_SOURCE[0]}")/harness-home" && pwd)"
mkdir -p "$DSH_HOME"
echo "DSH_HOME=$DSH_HOME（日用 home ~/.dsh 不受影响）"
