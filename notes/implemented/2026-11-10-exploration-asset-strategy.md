# 2026-11-10 · 探索测试的资产策略：运行时面矩阵、证据包与生命周期注入

状态：implemented（2026-11-10 交付；上游 = [bug-hunt 卡 §9](../../_backlog/issues/2026-11-08-workflow-subagent-exploratory-bug-hunt.md) + [资产审计](../../_backlog/research/workflow-subagent-exploration/2026-11-10-asset-first-round.md)）
> 同机制的上游决定：[presets 委派面的模型化重构](./2026-11-09-presets-delegation-model.md)（model 是期望源）、
> [能力面的执行承载](./2026-11-10-capability-surface-enforcement.md)（声明面 ≠ 执行面的两次事故）。
> 本 Note 补的是**验证链的中间一环**：model ↔ YAML 有 keyless 对账，YAML ↔ runtime 此前没有资产。

## 问题

八轮委派面探索（BUG-036–056）里，20 张有效缺陷卡有 **8 张是「声明/可观测面 ≠ 运行时面」**
（037/043/045/046/047/049/051/052），3 张是生命周期（041/044/053）。每次发现都靠真模型跑一次、
再靠人从会话日志里取证；第八轮 20 条 prompt（预算 16）、4 条 UI 对照仍看不到卡、`/req check`
被 `dataBlocked`、质量环跑两次、成员会话只能手解 zstd。**瓶颈不是场景不够，是取证与盲区。**

## 决定

1. **资产 ROI 六条**（后续探索轮按此取舍）：
   ① 补验证链缺口或让新假设更便宜，否则放 `runtime/tmp`；
   ② judge 进 `tools/lib` + spec，live/browser 只采集（judge + thin runner）；
   ③ 先有红证（合成反例或历史 bug）；
   ④ 头注写清「不证明什么」；
   ⑤ 资产有层（keyless/smoke/probe/audit/evidence），不把模型塞进 `pnpm test`；
   ⑥ 同类形状第二次出现、或某 charter 被盲区卡住才建，不预建每 bug 场景。
2. **运行时面矩阵（A1）**：`tools/lib/surface-matrix.mjs` 判据 + `checks/audit/surface-matrix-audit.mjs`
   读盘 + `tests/harness/evidence/surface-matrix.spec.ts` 红绿。入口语义钉死：
   root = Lead（9 个团队工具，support preset 也不判越权）；team member 继承 Lead；
   one-shot child / workflow 分支才按 preset 判 generic/fork/workflow/control；`send_to_subagent`
   在 root/member 是宿主面，不当 preset control。handbook 跟 `handbookSkipPresets()`，
   workflow 合同跟 `workflow` 工具，skill catalog 跟 preset `skills/` + `_shared` + methods。
   审计必须 `--since`（历史日志会被当前模型判成旧状态误报）。
3. **会话证据包（A2）**：`tools/lib/session-evidence.mjs` 纯解析 + `tools/explore-evidence.mjs`
   一条命令出 JSON/markdown（树/header/终态/工具调用/写盘/catalog）；缺首帧显式 `unavailable`，
   不默认 worker/0。3 个 probe 的 `rawHeader` 暂保留（probe 走 `session/page` 的 mode fallback，
   evidence 包走盘上直读；输入面不同，统一另开）。
4. **UI 全文证据（A3）**：`cdp-probe --body-out` / `--html-out`，区分「可见文本」与「在但不可见」。
   B4 实测证明委派卡在 DOM（`data-tool=coo/cfo`、`委派 COO（运营与交付）`、`已交稿`），
   但挂在 `data-step-process-body hidden="until-found"` 下；默认 transcript 不可见是折叠/探针限制，
   不是卡未渲染（修正 OBS-5）。
5. **生命周期注入（B1）**：`probes/team/delegation-lifecycle-probe.mjs --fault cancel|sigterm`：
   cancel 后 root/child `turn/end=aborted`、无残留；SIGTERM → 同 home 重启后
   root/child=`interrupted`。`team-taskbook-probe` 加 `--role coo|cfo`，证角色包不是只对 COO 成立。

## 输掉的方案

- **从真实会话建 replay/snapshot**：replay lane 不加载 company-pack（`replay-smoke` 只跑
  foundation 合成场景），snapshots 又只收合成场景；真实证据进仓违反 [snapshots/README](../../snapshots/README.md)。
- **文档散文漂移门禁**：policy P2 只对「复发 + 可机械判定」加门；OBS-2 复核后只剩两条非漂移注释
  与两处研究材料指针，一次修 + owner 足够。
- **`/req check` 命令宿主夹具**：keyless 已覆盖产品类型解析/checker；live 缺的是 workspace/lease，
  不是产品类型。B5 因此仍未证，不为它建新夹具。
- **每 bug 一个常驻 probe**：修完的 bug 进 keyless judge；live probe 只留模型行为/生命周期/UI 三类。
- **不做入口语义的“朴素矩阵”**：原型未校正指标映射时报 12 条假阳性（root=Lead、control≠宿主
  `send_to_subagent`、旧日志新旧状态混判）；先钉入口/指标映射，再谈矩阵。

## 后果

- 组合/preset/handbook/skill 改动后，可先跑 `checks/audit/surface-matrix-audit.mjs` 看运行时面；
  它**不是门禁**，不进 `pnpm test`，也不证明模型行为/深度拒绝/UI。
- 真跑后的取证从“手解 zstd + 手抄 session id”变成 `tools/explore-evidence.mjs --session <root>`；
  证据包与矩阵都读同一套日志，卡内只留结论与坐标。
- UI 卡默认可见性留给产品决定（折叠策略）；本轮只证“卡在 DOM、默认不可见”，不把 OBS-5 升级成 bug。

## 验证

- `pnpm vitest run tests/harness/evidence/surface-matrix.spec.ts`：14 tests 绿；spec 内含
  worker 带 control / verifier 带 write / CEO 缺 coo / handbook 反置四类红例。
- `node checks/audit/surface-matrix-audit.mjs --home runtime/harness-home --since 2026-11-10T17:00:00+08:00`：
  47 观察（20 root / 19 child / 8 member）、54 个无模型轮跳过、**0 问题**；
  同一 audit 对 `--since 2026-11-09` 旧日志 **exit 1**，报 `worker d1 control=list_subagents,send_to_subagent`
  （BUG-052 同型）与旧 vp-eng 缺 `quality_loop_*` 行——红证在案。
- `pnpm vitest run tests/harness/session/session-evidence.spec.ts`：6 tests 绿；缺首帧 → `unavailable`。
- `node tools/explore-evidence.mjs --session session-2110bd4a… --home runtime/harness-home`：
  root + 2 children（80/71/71 工具、3 轮 completed）。
- B1 cancel：child 的 `bash sleep 120` 起后 cancel → root/child `turn/end=aborted`、无 `sleep 120` 残留；
  B1 sigterm：SIGTERM + 同 home 重启 → root/child=`interrupted`。
- B2 audit（B1/B3/B4 新会话）：15 观察（7 root / 7 child / 1 member）、0 问题。
- B3 `team-taskbook-probe --role cfo`：任务书 + `drafts/cfo.md` + 署名锚 + CFO 角色包全 PASS。
- B4 `--html-out`：DOM 有卡、`hidden="until-found"`；B5 已补：清掉 dev home 陈旧 writer lease（pid 98394）后
  `/req check` 真回执 PASS；同轮发现 BUG-057（命令 slug 越界）/ BUG-058（dataBlocked 丢原因）。
- `pnpm verify` ALL PASS；`pnpm test` 173 files / 1440 tests；`pnpm typecheck` 绿；`pnpm lint` /
  `pnpm dup` 0 警告 / 0 克隆。

## 未验 / 未覆盖

- B5 已补 PASS；GUI picker 的 re-init 未证（BUG-058 的开放面）；B4 的稳定展开路径（step-process 选择器/默认展开策略）。
- B1 的 retry 工具结果 cancel 回执（本次 cancel 先到，工具结果未回；只证 durable 终态）。
- 真实 error/interrupted/lost 注入与 OS 进程终止证明（只证 durable `turn/end`，不证 kill 了 `sleep` 的 OS 进程；实测无残留进程）。
