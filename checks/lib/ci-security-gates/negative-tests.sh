#!/usr/bin/env bash
# negative-tests.sh — 负向测试驱动：真违规用例实跑 + 恒过反查 + 确定性自查
#
# 判据（本卡硬标准）：凡声称“能跑”的闸门，必须在**真违规输入**下给出**非 0**；
#   且必须在**干净输入**下给出 0 —— 两个输入给相反退出码才算有区分度（≠ 恒过）。
# 写盘：只写本目录下 evidence/（--target 之外的写盘 = 0；被扫目录只读）
# 用法：bash negative-tests.sh [--quiet]
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE"
EVID="$HERE/evidence"
mkdir -p "$EVID"
QUIET="${1:-}"

FAIL=0
TOTAL=0
OKN=0

hr() { printf '%s\n' "------------------------------------------------------------------------"; }

run_case() {
  local id="$1" expect="$2" desc="$3" cmd="$4"
  TOTAL=$((TOTAL + 1))
  hr
  printf 'CASE %s  %s\n' "$id" "$desc"
  printf 'CMD  %s\n' "$cmd"
  local out code
  out="$(bash -c "$cmd" 2>&1)"
  code=$?
  printf 'EXIT %s   EXPECT %s   => ' "$code" "$expect"
  if [ "$code" = "$expect" ]; then printf 'OK\n'; OKN=$((OKN + 1)); else printf 'MISMATCH\n'; FAIL=$((FAIL + 1)); fi
  printf '%s\n' "$out" | grep -E '^(HIT|ADVISORY|GATE|SUMMARY|CMD|TRACE|MALFORMED|NOTE)' | sed 's/^/OUT  /'
  printf 'OUT  (以上为关键行；完整输出见 evidence/negative-tests.txt)\n'
}

echo "==================== 负向测试 · ai-coding-security-2026-v2 · T1 ===================="
echo "运行位置: $HERE"
echo "说明: 全部实跑；EXPECT 列为设计预期退出码；MISMATCH 行 = 与设计不符（必须如实上稿）"
echo

echo "## 一、真违规用例（≥3，判据：必须非 0）"
# NV-1 真机面凭据可达（真违规，非夹具）
run_case "NV-1" 2 "凭据可达：本机 agent 权限面可读私钥（真机面）" "node g-a1-cred-reach.mjs --live-creds"
# NV-2 私钥放进被跟踪路径
run_case "NV-2" 2 "私钥材料出现在被跟踪路径（+ --tracked-only 显式跟踪面）" "node g-a2-secret-scan.mjs --target fixtures/violations/a2-key-in-tracked-path --tracked-only --tracked-list fixtures/violations/a2-key-in-tracked-path/.tracked-list"
# NV-3 提交/配置里塞高熵凭据串
run_case "NV-3" 2 "高熵凭据串 + 已知前缀（AKIA/ghp_）入面" "node g-a2-secret-scan.mjs --target fixtures/violations/a2-high-entropy-secret"
# NV-4 不可信第三方件未登记且含注入说明
run_case "NV-4" 2 "不可信件：未登记 + 注入说明 + 未声明出网" "node g-b1-artifact.mjs --target fixtures/violations/b1-unregistered-untrusted"
# NV-5 高危命令（执行前闸）
run_case "NV-5" 2 "执行前闸：下载管道进 shell / 读私钥 / 强删 / 推远端" "node g-b2-preexec.mjs --target fixtures/violations/b2-dangerous-commands"
# NV-6 读不可信内容后触达网络 + 读凭据
run_case "NV-6" 2 "动作迹：读不可信内容 → 出网/执行/读凭据" "node g-b3-trace.mjs --target fixtures/violations/b3-taint-trace"
# NV-7 聚合入口（契约件）在违规面上必须非 0
run_case "NV-7" 2 "契约入口：聚合跑违规面（机器可调用的单命令）" "node run-gates.mjs --target fixtures/violations/b2-dangerous-commands"
echo

echo "## 二、阴性对照与三态与策略边界 + 三态与策略边界（判据：干净=0；空面=3；策略开关给相反码）"
run_case "NC-1" 0 "干净面（有输入面、无违规）—— 真正的阴性对照" "node run-gates.mjs --target fixtures/clean"
run_case "NC-2" 3 "空目录：无输入面 ⇒ 不可判(3)，不得读作通过" "node run-gates.mjs --target fixtures/boundary/no-surface"
run_case "NC-3" 4 "用法错（缺 --target）⇒ 4=用法错，与 3=不可判 分开" "node run-gates.mjs"
# 取证面演示必须用 /tmp 金丝雀副本：面分类现在**锚在闸门自身目录**（修 2026-10-12），
# 凡 gates/fixtures/** 与 gates/evidence/** 一律判夹具面（默认 block）⇒ 在树内无法演示 sources 面策略。
# 金丝雀只落临时目录、跑完即删（与 CEO 复跑同法）。
TMPD="$(mktemp -d)"
mkdir -p "$TMPD/drafts/sources"
cp fixtures/boundary/a2-sources-only/drafts/sources/example-fetched-page.txt "$TMPD/drafts/sources/"
run_case "NC-4" 0 "取证面默认 report（a2 单闸门级：不淹门；金丝雀副本在 /tmp）" "node g-a2-secret-scan.mjs --target $TMPD"
run_case "NC-5" 2 "同一输入 + --sources-policy=block ⇒ 相反退出码（a2 单闸门级）" "node g-a2-secret-scan.mjs --target $TMPD --sources-policy=block"
rm -rf "$TMPD"
# 注：原 NC-6（对 boundary 夹具跑聚合期望 3）在锚点修复后不再成立——该文件现判夹具面（block）⇒ 2。
# 聚合"只有不可判 ⇒ 3"这一格由 CF-5（空目录）承接，此处不重复。
echo

echo "## 三、偏离用例（我自己找闸门的漏，如实申报；本段不计入“通过”）"
run_case "EV-1" 0 "漏检-1：低熵密码（低于默认熵阈值）" "node g-a2-secret-scan.mjs --target fixtures/evasion/a2-low-entropy"
run_case "EV-2" 0 "漏检-2：无 armor 头的裸 base64 私钥体" "node g-a2-secret-scan.mjs --target fixtures/evasion/a2-headerless"
run_case "EV-3" 2 "漏检-3：混淆命令（3 条中 1 条漏，见 OUT 行 class/verdict）" "node g-b2-preexec.mjs --target fixtures/evasion/b2-obfuscated"
echo

echo "## 三之二、CEO 独立复跑发现的并入（CEO 读数出处 = drafts/ceo-meta-check.md；以下为我这边逐条实跑核过）"
run_case "CF-1" 4 "未知参数不许静默忽略：--bogus-flag ⇒ 4（修前 = 2，看似有效结论）" "node run-gates.mjs --target fixtures/clean --bogus-flag"
run_case "CF-2" 4 "把策略参数拼错一个字母 ⇒ 4（修前静默退回默认策略）" "node run-gates.mjs --target fixtures/clean --fixture-policyy=report"
run_case "CF-3" 2 "自扫自（默认参数）：--target fixtures --only a2 ⇒ 2，命中全在本目录 fixtures" "node run-gates.mjs --target fixtures --only a2"
run_case "CF-4" 0 "同输入 + --fixture-policy=report ⇒ 0（6→0 的差异全部来自这一个参数）" "node run-gates.mjs --target fixtures --only a2 --fixture-policy=report"
run_case "CF-5" 3 "聚合退出码·只有不可判 ⇒ 3" "node run-gates.mjs --target fixtures/boundary/no-surface"
run_case "CF-6" 2 "聚合退出码·含违规（即便同时有不可判）⇒ 2（优先级 2>3>0）" "node run-gates.mjs --target fixtures/violations/b3-taint-trace"
run_case "CF-7" 2 "全文判形（修前只看前 4KB ⇒ 漏）：密钥头埋在 7736 字节处" "node g-a2-secret-scan.mjs --target fixtures/evasion/a2-header-deep"
echo

echo "## 三之三、跨 cwd 一致性（同一入口绝对路径、同一 target 绝对路径、两个工作目录 ⇒ 结论必须相同）"
# 自纠登记：本用例第一版写成 `node run-gates.mjs`（相对入口）+ 切 cwd ⇒ 入口找不到（MODULE_NOT_FOUND）⇒ 假报 identical=NO。
# 那是**我的测试缺陷**、不是闸门缺陷。改为入口也用绝对路径后重跑。
if diff <(cd "$HERE" && node "$HERE/run-gates.mjs" --target "$HERE/fixtures/clean" 2>&1) \
        <(cd ../.. && node "$HERE/run-gates.mjs" --target "$HERE/fixtures/clean" 2>&1) >/dev/null; then
  printf 'CWD-INDEPENDENCE entry=absolute target=absolute identical=yes\n'
else
  printf 'CWD-INDEPENDENCE identical=NO\n'; FAIL=$((FAIL + 1))
fi
echo

echo "## 四、恒过反查（判据：同一闸门在干净面与违规面给出相反退出码）"
check_pair() {
  local gate="$1" cleanCmd="$2" violCmd="$3"
  local c v
  bash -c "$cleanCmd" >/dev/null 2>&1; c=$?
  bash -c "$violCmd" >/dev/null 2>&1; v=$?
  local verdict="discriminating=yes"
  if [ "$c" = "$v" ]; then verdict="discriminating=NO(恒过)"; fi
  printf 'ALWAYS-PASS-CHECK gate=%s clean=%s violation=%s %s\n' "$gate" "$c" "$v" "$verdict"
  [ "$c" = "$v" ] && FAIL=$((FAIL + 1))
  return 0
}
check_pair "a1" "node g-a1-cred-reach.mjs --cred-root fixtures/clean/home/.ssh" "node g-a1-cred-reach.mjs --cred-root fixtures/violations/a1-cred-reachable/home/.ssh"
check_pair "a2" "node g-a2-secret-scan.mjs --target fixtures/clean" "node g-a2-secret-scan.mjs --target fixtures/violations/a2-high-entropy-secret"
check_pair "b1" "node g-b1-artifact.mjs --target fixtures/clean" "node g-b1-artifact.mjs --target fixtures/violations/b1-unregistered-untrusted"
check_pair "b2" "node g-b2-preexec.mjs --target fixtures/clean" "node g-b2-preexec.mjs --target fixtures/violations/b2-dangerous-commands"
check_pair "b3" "node g-b3-trace.mjs --target fixtures/clean" "node g-b3-trace.mjs --target fixtures/violations/b3-taint-trace"
echo

echo "## 五、确定性自查（同输入两次运行，输出逐字节比对）"
for t in fixtures/clean fixtures/violations/b2-dangerous-commands fixtures/violations/b3-taint-trace; do
  if diff <(node run-gates.mjs --target "$t" 2>&1) <(node run-gates.mjs --target "$t" 2>&1) >/dev/null; then
    printf 'DETERMINISM target=%s identical=yes\n' "$t"
  else
    printf 'DETERMINISM target=%s identical=NO\n' "$t"; FAIL=$((FAIL + 1))
  fi
done
echo

hr
printf 'RESULT cases=%s expectation_ok=%s mismatches=%s\n' "$TOTAL" "$OKN" "$FAIL"
if [ "$FAIL" = "0" ]; then echo "VERDICT 全部预期成立（含所有恒过反查 = discriminating）"; else echo "VERDICT 有 $FAIL 处与设计不符 —— 必须逐条上稿，不得隐去"; fi
exit 0
