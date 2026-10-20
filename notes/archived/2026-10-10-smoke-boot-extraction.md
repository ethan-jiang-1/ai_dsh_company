# 下游收成：checks/smoke 十个 web 启动块迁 probe-web 模块

状态：已交付（2026-10-10；授权 = 用户单选「下游卡」，上游卡 =
[2026-10-10-extract-without-behavior-change](../../_backlog/_archive/settled_issues/2026-10-10-extract-without-behavior-change.md)
的下游申请，交付 0a7977f + ba38ca2 + 本轮）。

## 决定

`checks/smoke/` 下全部 10 个起 `bin.ts web` 的脚本迁入 `tools/lib/probe-web.mjs`（探针面 25 个
之后的第二批）。为此模块扩了四项能力、收了三处健壮性：

- **`patch: string | string[]`**——`--patch` 可重复；replay 的场景 patch + 五个角色预设组合走数组形态。
- **`onEmptyCookie: 'join' | 'throw'`**——默认 `'join'`（探针面现状，25 个已迁探针零扰动）；
  delegation/handbook/preset/probe 四个既有「空 cookie 立即抛」形态传 `'throw'`。
- **`dumpBodyOnError`**——message 缺失时回退转储 `JSON.stringify(body).slice(0, 200)`
  （preset/probe/handbook/delegation/presence-e2e/entry-probe/replay 七个的既有形态）。
- **boot 健壮性三处收进模块**（entry-probe 既有防护，全部失败/清理路径，35 个调用方同沾）：
  `child.once('error')` 接住 spawn 失败（原探针面会变成未处理异常）、输出上限 16000 字符
  （防失败路径无界累积）、banner 解析后 `clearTimeout`（原部分调用方有 120s 定时器悬挂）。

形态适配（全部保调用点一字不动）：4 个 `rpc(base, cookie, endpoint, args)` 调用形状的 smoke 用
一行包装；probe/delegation 的 rpc 被顶层助手引用 ⇒ 工厂提升到模块作用域、try 内赋值；
entry-probe/replay 的 `catch { child.kill }` 未防护引用 ⇒ spawn 捕获适配器（team-concurrency 先例）。

## 输掉的方案

- **把动态 body 转储统一成静态文案。** 转储带诊断信息（失败时响应体是唯一线索），不是措辞——
  当参数（`dumpBodyOnError`）收下，与上游 `errorFallback` 参数同性质。
- **给「`${endpoint} 失败:`」措辞加参数。** 4 个文件的一处诊断后缀，参数化是第六个参数；
  统一为模块的 `${endpoint}:`（本卡第三处文本统一，见后果）。
- **把 4 个 smoke 的调用点改成 `(endpoint, args)` 两参。** 调用点是业务面；一行包装比改写 30+ 调用点安全。
- **重构 replay 的 `PRESET_PATCHES` 常量。** 它与明令不碰的 spawnSync lane 共享；改为 web 启动处
  `filter((_, i) => i % 2 === 1)` 取路径项（argv 等价性已证：新旧片段逐字节一致）。
- **连 entry-probe 的 token 交换也迁。** 它的空 cookie 报文是 `认证缺 cookie`，不在卡内批准的
  统一清单里——留 3 行本地块，是本轮**唯一**没收成的启动块。
- **本轮重跑全部真模型 smoke。** 沿上游立场：形状 spec + 真 banner + diff 审计（但见验证第 7 条的
  顺带真入口对照）。

## 后果与边界

- **三处文本/时机统一**（全部只在失败路径，判据标签与退出码不变）：boot 错误文案（含丢失
  output 转储）、token 交换统一 15s 超时（6 个原本无信号）、rpc 错误 `失败:` → `:`（4 个）。
  另 replay 的 boot 输出上限 600 → 模块的 16000。
- **模块健壮性修复改变了 25 个探针的失败路径行为**（崩溃→干净拒绝、无界→封顶、定时器泄漏→清理）——
  严格改进，成功路径零影响。
- entry-probe 的 `DSH_PERMISSION_MODE: 'read-only'` 钉值与 `--patch run/entry-probe.patch.yml`
  **逐字节未动**（diff 核对：env 键集与值一致）；replay 的 `workspace-write` 死代码钉值（:238）与
  spawnSync lanes 未动（diff 零命中）。
- `checks/smoke/` 的判据/提示词/证据函数/退出码/PASS-FAIL 标签全量 diff 审计：被删行 100% 启动块
  代码，加行 100% 模块调用/包装/注释（+2 个 `banner.token→token` goto 改名，值相同）。

## 验证（全部实跑）

| # | 命令 | 断言 | 红/绿形态 |
|---|---|---|---|
| 1 | 新 spec 用例先行（`dumpBodyOnError`、error 事件/定时器清理） | 模块尚无该能力 ⇒ 必须先红 | 实跑 2 failed（`dumpBodyOnError` 用例 + error/定时器用例）→ 扩模块后 18/18 绿 |
| 2 | `npx vitest run tests/harness/probe-web.spec.ts tests/harness/layering.spec.ts` | 18/18：argv/patch 数组/onEmptyCookie 两态/dumpBody 两序/共享 counter/无默认 signal | 任何自行推导前缀或默认加 signal → 对应用例红 |
| 3 | `node --check` ×10 smoke + `pnpm verify`（pipefail） | 全过；ALL PASS；script-port 门禁全 0 | — |
| 4 | `pnpm test`（pipefail） | 45 文件 / 466 测试全绿 | — |
| 5 | `git diff --exit-code -- probes/` | 25 个已迁探针零扰动 | 空 |
| 6 | 真 banner 两种形态（无 patch / patch 数组） | port/token 解析 PASS，退出码 0 | 正则与真输出差一字 → 退出码 2 |
| 7 | replay r3 lane 迁移前后真入口对照（keyless） | PASS/FAIL 集合逐项一致（5 个失败为本机 env 与夹具内容漂移，非迁移所致——env.sh 落 danger-full-access vs 录制时 workspace-write、persona 与工具 schema 漂移） | 若迁移改行为 → 集合出现差异 |
| 8 | `PRESET_PATCHES` 过滤等价性 | 新旧 argv 片段逐字节一致（node 脚本证明） | — |
| 9 | 两处铁律钉值 diff 核对 | entry-probe read-only 与 replay workspace-write 均零变更 | — |
| 10 | 全量行审计（31dcd05→工作树） | 被删/加行形态分布 100% 启动块相关 | 判据文本入 diff → 该 hunk 退回 |

## 指针

- 卡：[_backlog/issues/2026-10-10-smoke-boot-extraction.md](../../_backlog/_archive/settled_issues/2026-10-10-smoke-boot-extraction.md)（实施后归档）
- 模块与形状 spec：[tools/lib/probe-web.mjs](../../tools/lib/probe-web.mjs) / [tests/harness/probe-web.spec.ts](../../tests/harness/probe-web.spec.ts)
- 上游卡与 Note：见状态行引用
