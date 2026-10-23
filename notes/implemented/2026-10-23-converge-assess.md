# converge 判据收进 assess：计划与执行共用一份「可收敛」

状态：implemented（2026-10-23；用户令「按架构评审头号推荐推进落地」；上游勘察 = 架构评审报告候选 1
（报告在 OS 临时目录、不入库；本仓可复核的部分 = `tools/converge.mjs` 与 `converge-rules.mjs` 的现状与本文验证节））

## 决定

1. **`assess(state, flags)` 住 [converge-rules.mjs](../../tools/lib/converge-rules.mjs)，纯函数、不做 I/O。**
   state = 可观察事实（`closed` / `conclusion` / `hasFinal` / `archived` / `journals` / `findings`），
   flags 只认 `allowNoJournal` / `allowOpenFindings`。返回 `{ ready, reasons, blocking, accepted }`：
   `reasons` 给计划档逐条展示，`blocking` 决定 ready，`accepted` 记录被旗标放行的闸。
2. **计划模式 `scanSlugs` 与单 slug `converge()` 共用它**，三份重复闸表删到只剩一份。
   `scanSlugs` 现在接收 `FLAGS`——**放行旗标在计划档也生效**（此前计划说「未备」而带旗标执行却能收）。
3. **惰性保持**：`hasFinal === false` 时 `findings` 可缺席，驱动层不调审计（审计起子进程且 fail-closed，
   计划档不该为此付代价）。
4. **resume 不并入 assess**：它问的是「半态续跑还是正常收敛」，不是「六道闸是否放行」；
   保留 `convergenceResume` 与它的三态 reason（`ok` / `still-active` / `directions-missing`）。

## 输掉的方案

- **把 resume 也塞进 assess**：两种问题不同构，硬合并会造出 `mode` 参数与一批不适用字段
  （`closed` / `conclusion` / `archived` 对续跑无意义），是拿抽象换重复。
- **判据留在 converge.mjs 里做纯函数**：脚本层读盘、起子进程、`process.exit`，回归层测不到
  （layering 守卫禁止 tests 起子进程）。
- **用 `mode: 'plan' | 'execute'` 区分两处**：同一判据不该有模式；差异只在「打印还是执行」。
- **保留两套旧文案**：统一后 `--slug` 拒绝文案变短，另打一行「现场：final/closed/结论」补回诊断值；
  文案无外部断言（已 grep tests/checks/probes），可安全改。

## 后果

- `tests/company/converge-rules.spec.ts` +12 用例（六闸单失败 / 两个放行面 / 放行不掩盖其他闸 /
  计划与执行同判据 / 无 final 不要求审计）。`pnpm test` = **739**（原 727）。
- 活盘计划输出**逐行不变**（`diff` 为空）；`--slug <未闭合 slug>` 退出码仍为 1，文案改为
  `不可收敛——无 final` + 现场行。
- 副作用步骤（归档 / 清 journal / 台账 / 索引）一行未动——`steps()` 留作下一刀。

## 验证（真跑）

```text
# 红（实现前）
npx vitest run tests/company/converge-rules.spec.ts
#   12 failed（TypeError: assess is not a function）+ 35 passed

# 绿
npx vitest run tests/company/converge-rules.spec.ts     # 47 passed
pnpm test                                                # 739 passed
pnpm verify                                              # ALL PASS

# 行为基线
node tools/converge.mjs > /tmp/converge-baseline.txt     # 改动前
node tools/converge.mjs > /tmp/converge-after.txt        # 改动后
diff /tmp/converge-baseline.txt /tmp/converge-after.txt  # 空（逐行一致）
node tools/converge.mjs --allow-no-journal               # exit 0；输出同基线（活盘 slug 卡在无 final）
node tools/converge.mjs --slug 2026-10-12-ai-coding-security-2026-light
#   ✗ …: 不可收敛——无 final / 现场：final=false closed=2026-10-20 结论=有
#   exit=1
```

## 未验

- 活盘上**没有**「只差 zero-journal」的 slug，所以「计划档带旗标翻成可收敛」只在纯函数层被钉住
  （`assess(state, {})` false → `assess(state, { allowNoJournal: true })` true），没在真盘端到端看到。
  要端到端看，得造一个「有 final + 已闭合 + 零 journal」的夹具工作区；不值得为它污染真盘。
