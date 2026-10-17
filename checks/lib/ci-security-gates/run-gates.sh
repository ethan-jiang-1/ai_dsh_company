#!/usr/bin/env bash
# run-gates.sh — 入口包装（壳入口；等价于 node run-gates.mjs "$@"）
# 用法：./run-gates.sh --target <目录> [选项]     或   GATE_TARGET=<目录> ./run-gates.sh
# 退出码：0=通过 2=发现违规 3=无法判定 4=用法错（与 README 一致）
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "$HERE/run-gates.mjs" "$@"
