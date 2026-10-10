# 探针 web 启动收成模块 + 背压活状态检查搬家（行为不变重构）

状态：已交付（2026-10-10；授权 = 用户点名实施
[_backlog/issues/2026-10-10-extract-without-behavior-change.md](../../_backlog/_archive/settled_issues/2026-10-10-extract-without-behavior-change.md)，
决定已随本次变更落地 ⇒ 本 Note 直落 `implemented/`，未从 `proposed/` 起——那是给未实施提案的）。

## 决定

两处重复各收成一个可调用模块，**调用方观察到的行为不变**是唯一验收轴：

1. **`tools/lib/probe-web.mjs`（新）**：探针 web 启动块的共用层，按现有分叉切三刀——
   `startWeb`（起进程 + 等 banner；`patch` 参数供 team-concurrency 的读屏障 overlay）、
   `companyCookie`（15s token 交换）、`companyRpc`（`prefix` / `errorFallback` / 共享 `counter` 全由调用方传）。
   **`spawn` / `fetch` 一律注入、模块零 import**——不是妥协，是被两件事共同逼出来的正确形状：
   `tests/harness/layering.spec.ts` 把 `tools/lib/` 定为 keyless 纯逻辑缝（禁 child_process / spawn / fetch），
   而卡又要求 keyless spec 住在 `tests/harness/` 并直接 import 帮助函数（layering 只放行 `tools/lib/`）。
   **25 个探针**（probes/ 下全部起 web 的文件）全部迁入；`checks/smoke/*` 不在本卡范围。
2. **`tools/lib/backlog-liveness.mjs`（新）**：`backlogLivenessProblems` 从 `checks/run-gates.mjs`
   **逐字节原样**挪入（`diff` 验证函数体与门禁原文完全一致）；门禁留下调用 + 「为什么」注释；
   `tests/harness/backlog-liveness.spec.ts` 从「切源码 + `vm` 求值」改为直接 import，期望字符串一字未动。

## 输掉的方案

- **留在探针里各抄一份（现状）。** 改一处 banner 正则要爬 25 遍；已经出现 5 种 boot 错误文案变体。
- **模块放 `tools/drivers/`、真 spawn/fetch 做默认值。** layering 守卫禁 tests/ import tools/drivers，
  卡要求的 keyless spec 就没地方住 ⇒ 反证出「注入式纯逻辑」是唯一同时满足两个约束的形状。
- **按文件名推导 rpcId 前缀。** 会改现有 id：`mip-` 归 member-inquiry/member-interrupt 两个文件，
  `tcp-` 归 time-context/team-concurrency 两个文件——推导即改调用方可观察的请求。
- **统一 8 个探针的 `'?'` 错误回退文案。** 错误路径文本也是行为；收成参数（`errorFallback`）而非统一。
- **给 RPC 默认加超时信号。** 只有 member-stale-write 有逐调用 30s；加默认 = 改另外 24 个的请求形状。
- **team-recovery 起两次 web 用进程级单例。** 卡明说不做；两次 `startWeb` 调用 + 共享 `counter` 对象。
- **重跑 25 个真模型探针当回归。** 贵（真模型 ≈$2–4/个），且绿了也证明不了请求体没变；
  改用「形状 spec + 一次真 banner + 全量 diff 审计」（见下）。

## 后果与边界

- **真发生的文本变化只有一处**：boot 失败路径的错误消息统一为模块文案（个别探针原先内嵌
  `output.slice(-800)` 输出转储）。**退出码不变**（仍 2）、清理路径不变（finally 照旧杀进程）。
- 5 个探针（team-atomicity / team-claim-loser / member-stale-write / fs-guard / taskboard-scope）
  的 `finally` 未防护引用 `child` ⇒ 用 **spawn 捕获适配器**（`spawn: (...a) => (child = spawn(...a))`）
  保住「boot 失败 → child 已捕获 → finally 杀进程 → exit 2」的原语义。
- 探针在**真模型下判对与否本轮未验**（卡明说不重跑）；本轮证明的是启动/请求形状不变。
- `checks/smoke/*` 的启动块未动（卡外；probe-smoke 被卡点名排除）——如要迁，另立卡。

## 验证（全部实跑；红/绿形态如下）

| # | 命令 | 断言 | 红长什么样 |
|---|---|---|---|
| 1 | 先写 `tests/harness/probe-web.spec.ts` 再建模块（TDD 顺序按卡） | 模块不存在 ⇒ spec 必须先红 | `Error: Cannot find module '../../tools/lib/probe-web.mjs'`（实跑得到） |
| 2 | `npx vitest run tests/harness/probe-web.spec.ts` | 10/10 绿：argv/env/banner 正则/cookie 拼接/请求体/无默认 signal/errorFallback 两种/共享 counter/--patch 插入位置 | 任何自行推导前缀、默认加 signal、改 cookie 拼接 → 对应用例红 |
| 3 | `npx vitest run tests/harness/backlog-liveness.spec.ts` | 22/22 绿且 spec diff 只有加载方式（git diff 逐行核对，期望字符串零改动） | 挪函数时改一句问题文本 → spec 红；修法是改回文本不是改期望 |
| 4 | `node checks/run-gates.mjs \| grep backlog-liveness` | PASS 行逐字 = `backlog-liveness（制度目录/README、卡头、关闭判断、method 形状、递归索引）`，退出码 0 | 注入真缺陷（卡 frontmatter 重复 status 键）→ 实跑得 `FAIL … frontmatter YAML 不可解析：YAMLException: duplicated mapping key`；还原后 PASS（红→绿已实跑） |
| 5 | 改掉门禁边界注释再跑 #3 | 22/22 仍绿 ⇒ 证明拆掉了「改注释就假红」的旧脆性 | 旧实现同操作抛 `backlog-liveness function boundary missing`（此为拆除动机，非本轮红） |
| 6 | 真 banner 验收脚本（真起 `web --port 0`，拿到即杀） | `startWeb` 解析出 port=58268/token 长度 43，退出码 0 | banner 正则与真输出差一字符 → 退出码 2 |
| 7 | `node --check` × 25 探针 + 全部 `probes/*/*.mjs` | 全部解析通过；`grep "bin.ts', 'web'" probes/` 零残留 | — |
| 8 | `git diff probes/` 全量行审计 | 被删行 100% 启动块代码（中文行仅 boot 错误文案）；新增行仅 import/注释/模块调用/2 个 `banner.token→token` 改名 | diff 出现提示词/判据/PASS-FAIL 文本 → 该 hunk 退回 |
| 9 | `pnpm test` | 45 文件 / 462 测试全绿（含 layering 守卫 + 新 spec） | tools/lib 出现 spawn/fetch/child_process → layering 红（**本轮实跑红过一次**：模块初版带 spawn 默认值，被守卫抓到后改为注入式——这正是守卫的存在意义） |
| 10 | `pnpm verify` | ALL PASS（含 vendor-clean / backlog-liveness / guard-red-record ×5） | — |

## 指针

- 卡：[_backlog/issues/2026-10-10-extract-without-behavior-change.md](../../_backlog/_archive/settled_issues/2026-10-10-extract-without-behavior-change.md)（实施后按其关闭条件归档）
- keyless 缝规则：[tests/harness/layering.spec.ts](../../tests/harness/layering.spec.ts)
- 形状 spec：[tests/harness/probe-web.spec.ts](../../tests/harness/probe-web.spec.ts)
