# 审计判词结构化：一份 verdict，人读报告是它的 formatter

状态：implemented（2026-10-23；架构评审候选 4；用户令「P1→P9 全做」）

## 决定

1. **判词对象唯一**：`deliverables-check --json` 末行 = `{ assessed, workspace, sessions, finals, presented,
   violations:[{code,path,detail}], warnings:[{code,path,detail}] }`。此前 violations 只有 `{code,path}`（detail 被丢）、
   warnings 只剩 code——而 converge 恰恰需要 detail，于是它去正则扫人读报告。
2. **人读报告是同一对象的 formatter**：观察项/违规两段直接遍历 `verdict.warnings` / `verdict.violations` 打印。
3. **无法判定 = exit 2 + `assessed:false` + reason**：工作区缺失走这条；判词里说清原因，消费者不再嗅 stderr 词。
4. **解析器唯一**：[audit-verdict.mjs](../../tools/lib/audit-verdict.mjs) 的 `parseAuditVerdict(stdout)`；
   converge 与 deliverables-index 同 diff 改用它，各自的正则/前缀扫描删除。

## 输掉的方案

- **只给 violations 补 detail、warnings 维持 codes**：converge 判「有未结发现」要 detail 措辞，半份判词等于没修。
- **判词走 stderr、人读走 stdout**：现有调用方都只抓 stdout；分两条流会让「一次调用拿两样」变成两次解析。
- **把审计逻辑 import 进 converge**：审计要起 zstd、读 DSH_HOME、跑进程，属于运行场入口；纯逻辑已在
  `tools/lib/deliverables*.mjs`，这边只需要判词。

## 后果

- converge 的 `checkSlugFindings` 改读结构：`--json` 加进 spawn，`r.status === 0` 判绿，detail 从 violations 拼。
- index 的 `presentedSlugs` 走同一解析器；`assessed:false` 与无判词一样落 null（未核，不冒充）。
- 人读输出与退出码不变（0/1），新增 2 = 无法判定。

## 验证（真跑）

```text
npx vitest run tests/harness/audit-verdict.spec.ts   # 3 passed（机器行 / 缺行坏 JSON / assessed:false）
source run/env.sh && node checks/audit/deliverables-check.mjs --json --only ai-coding-security-2026-light
#   exit=0；末行判词含 warnings:[{code,detail}]（此前只有 code）
pnpm test     # 753 passed
pnpm verify   # ALL PASS
```

## 未验

- converge 的「有未结发现 → 拒收」真跑未覆盖：活盘没有 ready 且带违规的 slug（需夹具）；该分支现由
  `parseAuditVerdict` 的 null/assessed:false 与 exit code 共同兜底，结构上与原正则等价。
- `deliverables-index` 的真跑未复跑（下次收敛会走到）。
