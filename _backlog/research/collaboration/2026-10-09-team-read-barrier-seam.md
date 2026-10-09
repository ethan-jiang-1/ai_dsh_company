---
topic: 协作
intent: "查明两个 Agent Teams teammate 是否能在同一轮成功读取目标后由 driver 共同放行，并记录可通过 CLI Web overlay 挂载的受支持扩展点。"
---

# Team read barrier seam

## 结论

当前 pinned DSH 没有现成的 `wait_agent`、`send_message` 或 shell barrier 能表达“两个 teammate 已成功完成指定 `read`，保持在同一轮，直到 driver 同时释放”的协议。最接近且有维护合同的接入点是工具执行流水线的 post-execute tool-pipeline hook：它在工具 body 返回后、结果继续进入模型前运行，适合由一个新增的插件维护按 teammate/目标读操作登记与 driver release gate。该插件应通过 CLI `--patch` 插入 Web profile；hook证据由下方pinned源码引用给出，driver临时实现另见双成员验收研究。

这不是把 `wait_agent` 当 barrier。Agent Teams 的 `wait_agent` 只观察调用开始后的 roster、mailbox、task 或 live-status 变化；它不会唤醒 inactive member，并且没有活跃 peer 时立即返回 `noProgress`。源码的模型说明明确要求 re-list，必要时先 `send_message` 唤醒成员，再等待：[`packages/experimental/tool-agent-team/src/index.ts`](../../../vendor/dsh/packages/experimental/tool-agent-team/src/index.ts#)。因此它不能代表“read 成功”或 driver 释放。

## 为什么选择 post-execute tool-pipeline hook

工具运行时定义了固定顺序：`pre-execute` → guards → `execute`（around-dispatch）→ post-execute tool-pipeline hook（inspect/replace/attach context）→ finalization → observe-only `result`；只有 `execute` 视图可以替换必填 signal。见 [`packages/core/tools/README.md`](../../../vendor/dsh/packages/core/tools/README.md#understand-the-implementation)。扩展点说明也明确：`pre-execute` 是 allow/deny/ask gate，`execute` 用于 around-dispatch，post-execute tool-pipeline hook 可替换结果、阻止并反馈或附加 context，`result` 只观察不可变最终结果：[`packages/core/tools/README.md`](../../../vendor/dsh/packages/core/tools/README.md#extension-points)。

对目标 `read`，在 post-execute tool-pipeline hook 中可只对 `exec.name === 'read'` 且结果是成功的调用登记完成，然后等待 driver gate；这样 read body 已经返回成功，但模型还没有收到该结果，等待发生在同一工具调用/同一轮内。该顺序是现有 API 的事实；“如何识别目标、如何计数两名 teammate、如何持久化 gate、如何释放”属于新增插件的实现，不是现成 DSH 行为。

不要把 `result` 当等待点：文档把它定义为 observe-only 的 immutable final outcome（同上），所以它没有阻塞或替换结果的职责。也不要依赖 `pre-execute` 做“读完后”屏障；它在 dispatch 前运行，只能决定 allow/deny/ask。

工具取消是协作设计的必要限制：每个 body 收到 caller-owned `exec.signal`，取消前不调用 body，调用后成功结果可变成 `ABORTED`；见 [`packages/core/tools/README.md`](../../../vendor/dsh/packages/core/tools/README.md#execution-and-cancellation)。因此 gate 必须监听 signal/disposal，释放或中止等待，不能无限期遗留执行。

## Agent Teams 可见性与生命周期

Agent Teams bundle 是 opt-in，启用 domain、scoped creation/roster/messaging/interruption/waiting/task-board tools 及 Web UI；普通 subagent controls 被禁用。官方 bundle 文档说明可由 Web Plugins page 启用，CLI Web profile 可执行 `dsh plugin --profile web add @deepseek-ai/dsh-experimental-agent-team-profile`：[`packages/experimental/agent-team-profile/README.md`](../../../vendor/dsh/packages/experimental/agent-team-profile/README.md#)。现有测试 overlay 展示等价的插入方式：禁用四个旧 subagent rows，并 `insert` `agent-team`、`tool-agent-team`、`ui-agent-team` rows：[`apps/web/tests/agent-team-panel.overlay.yml`](../../../vendor/dsh/apps/web/tests/agent-team-panel.overlay.yml#)。

Team tool plugin 在每个成员自己的 Agent scope 注册同一套九个工具；README 明确说 Lead 与每个 teammate 获得相同工具及 policy：[`packages/experimental/tool-agent-team/README.md`](../../../vendor/dsh/packages/experimental/tool-agent-team/README.md#)。因此新增 barrier plugin 若注册到每个 Agent 的 `ctx`，必须采用同样的 Agent-scoped 生命周期；不要用一个只在 Lead scope 可见的 model tool 期待 teammate 调用后被拦截。Team target 是 `spawn_teammate`/`list_agents` 返回的 name，不能从工具结果取得 Session ID：[`packages/experimental/tool-agent-team/README.md`](../../../vendor/dsh/packages/experimental/tool-agent-team/README.md#)。

Teammate 之间的 `send_message` 是 durable mailbox delivery；running target 在最近 step boundary 接收，inactive target 会开始或恢复一轮，成功返回 `accepted`/`queued` 后不能重发：[`packages/experimental/tool-agent-team/README.md`](../../../vendor/dsh/packages/experimental/tool-agent-team/README.md#)。它适合作为 driver 发 release 命令的消息通道，但不是 barrier 本身；发送消息会推动目标继续执行，不能用来保持“已读且暂停”。

Agent Teams 等待与中断也不能满足这个生命周期：`waitForChange` 只等待注册之后的一次状态/mailbox/task/live-status edge 并只报告 timeout；`interrupt` 取消 live teammate 当前 turn、保留 inbox，且不释放 task ownership 或删除 mail：[`packages/experimental/agent-team/README.md`](../../../vendor/dsh/packages/experimental/agent-team/README.md#)。Team service 是 process-local coordination，Lead Session log 是 durable source of truth：[`packages/experimental/agent-team/README.md`](../../../vendor/dsh/packages/experimental/agent-team/README.md#)。若 barrier 需要跨 reload/crash 保持，必须把 gate 状态纳入 durable Team event/owned persistence；一个仅内存 Promise 只能覆盖当前 process，这一点不能被现有 Team durability 文档替换。

## 推荐挂载形状

1. 保持 pinned vendor 不变，在本仓实现一个独立插件包（或现有 company pack 的新插件入口），其 service/provider 维护 barrier registry，consumer 在 post-execute tool-pipeline hook 接线；插件只处理目标 `read` 成功结果，并以 teammate identity 与规范化目标读参数形成 registration key。
2. 通过 CLI Web overlay 的 `insert` 行挂载该插件；overlay 只负责 composition。已知的 overlay 语法与插入示例见 [`apps/web/tests/agent-team-panel.overlay.yml`](../../../vendor/dsh/apps/web/tests/agent-team-panel.overlay.yml#)，而 profile bundle 文档确认 CLI 使用 `--patch`/profile layer 是受支持的配置入口：[`packages/experimental/agent-team-profile/README.md`](../../../vendor/dsh/packages/experimental/agent-team-profile/README.md#)。具体 row 的 `id`/`name` 应以实现包的导出和 profile composition 为准，不在本研究中虚构。
3. 让 driver 通过一个明确的 host/driver-facing API（或一个受控工具）调用 `release(key)`；不要把 release 伪装成 teammate 的 `send_message`。API 应要求两名指定 teammate 都已登记成功 read，并以 signal/disposal 清理未完成 registration。
4. 成功 read 的判据必须来自 post-execute tool-pipeline hook 收到的成功 result，而不是 `read` 调用开始、`result` 观察或 `wait_agent` 返回。若结果发生 error/abort/timeout，registration 不得计为成功。

## 已确认的限制

- Agent Teams 是 experimental、opt-in，shared checkout 无 worktree isolation 或 filesystem lock；bundle README 明确列出这一限制：[`packages/experimental/agent-team-profile/README.md`](../../../vendor/dsh/packages/experimental/agent-team-profile/README.md#)。barrier 只协调读观察，不自动提供 FS snapshot 或跨成员一致视图。
- `send_message` 只能在最近 step boundary steer running target，或启动/恢复 inactive target；它没有“暂停当前 turn直到某个 driver 条件”的语义：[`packages/experimental/tool-agent-team/src/index.ts`](../../../vendor/dsh/packages/experimental/tool-agent-team/src/index.ts#)。
- `wait_agent` 的 timeout 合法范围是 10,000 到 3,600,000 ms，默认 30,000 ms；它只报告 timed out/noProgress，不返回目标 read 结果：[`packages/experimental/tool-agent-team/src/index.ts`](../../../vendor/dsh/packages/experimental/tool-agent-team/src/index.ts#)。
- post-execute tool-pipeline hook 的 gate 会延迟该工具结果的提交/后续模型步骤；它不是已存在的 driver rendezvous API。实现必须提供可取消、可释放、可 disposal 的状态管理，并为这段新增等待补充测试。

## 研究边界

源研究委托阶段仅读 backlog convention、pinned `vendor/dsh` source/README 与现有overlay；随后本轮在研究启发下实现并实跑了[双成员验收研究](2026-10-09-team-read-barrier-acceptance.md)中的实验插件与probe，仍未编辑vendor或生产代码。
