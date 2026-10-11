---
status: 已结
opened: 2026-10-11
---

# 推敲：阻塞型问询场景固化成 replay——先给重放侧一个答题人

> 立卡：2026-10-11 ｜ 状态：已结 ｜ 类型：Task ｜ 可关闭：是 ｜ 结论日期：2026-10-11
> **结论与去向**：场景已建成并零 diff 复演——[snapshots/replay/human-exits-ask](../../../snapshots/replay/human-exits-ask/)
> （`answerer: browser`：录/放两侧都用真 UI 认领作答，规则 = 第一项）。harness 改动落在 `checks/smoke/replay-smoke.mjs`
> （场景级答题人开关 + 确定性标题 + 按 `session.children` 算期望会话数）。机制依据与实测卡点见文末「落地记录」。
> 来源：Human Exits RFC 批 2 验收「代表场景先固化为 replay/会话断言」的未落地项
> （[毕业 Note](../../../notes/implemented/2026-10-11-human-exits.md) §收口后复核）。

**问题与期望结果：** 批 2 的三类行为证据里，阻塞支只有**真模型探针 + 运行期 RPC 读到的会话事件**，
没有可无 key 重放的固化场景；非阻塞支同理。期望结果 = 阻塞型问询（CEO 首段三件套 + `ask_user_question`）
有一个 `snapshots/replay/` 场景，`replay-smoke` 默认档或 `--scenario` 能零 diff 复演。

**当前情况（2026-10-11 实测，不是推测）：**

1. **ask 是前景等待，没人作答整轮不收口 ⇒ 会话日志不封盘。** 阻塞支探针跑完后，
   `runtime/harness-home/sessions/**/session.vN.jsonl.zstd` 解出来只有 header 一行；
   证据只能靠运行期 `session/page` 读事件再自行落盘（`runtime/human-exits-evidence/`，gitignored）。
   换句话说：**这类场景目前连"事后可复核"都要靠探针自己抄一遍**。
2. **RPC 直答走不通。** `userQuestions/answer` 的 descriptor 是 `{ agentId, callId, answer }`
   （不是 `{request:{…}}`，写错会报 `args fields do not match the descriptor`）；
   但即使形状正确、并在 ask 出现后立刻作答，服务端返回 **`false`（question is no longer continued）**，
   整轮依旧不收口——产品路径是浏览器里**认领卡片**（`attachWait` 流）后作答，RPC 档不认领。
3. **浏览器答题这条路是通的，但需要先连工作区。** `checks/smoke/human-loop-e2e-smoke.mjs`
   就是这条路（开页面 → 找 radio → 点选 + Enter 提交），它成功是因为那场会话的工作区已在页面里连上。
   阻塞支探针照抄该流程时停在「按标题搜会话」——fresh profile 的页面里没有排练场工作区入口，
   会话列表按工作目录过滤 ⇒ 搜不到。探针里的这次尝试是**尽力而为**（失败只打印，不改判据）。
4. **`--record` 的守卫原先写死「≥1 child」**，单轮场景录完必被判失败且不落盘；
   已改成按 `snapshot.yml` 的 `session.children` 声明算期望（`checks/smoke/replay-smoke.mjs`，2026-10-11）。
   改完单轮录制不再被误拒——但第 1 条仍然挡着：录制侧同样需要一个答题人，否则收到的 raw 只有 header。

**未决问题：** 答题人放哪一侧——(a) 只放录制侧（录到封盘的会话，重放侧另想办法）；
(b) 录制与重放两侧都放（重放时按录下来的选择确定性作答，与录制对称）；
(c) 把场景改成「问人前的收口」形态（不真的阻塞），代价是场景不再覆盖 ask 本身。三者互斥，需人拍板。

**下一步：** 先做探针侧的**连工作区 + 真 UI 答题**（不改产品代码，只补自动化），
跑通后阻塞支的会话日志即可封盘、证据可复核；再决定 replay 场景走 (a)/(b)/(c) 哪条。
enable 材料：`cordis.yml` / `cordis.snapshot.yml` 可直接从 r3-delegation 复制（同构，仅注释不同），
任务文本已在 `runtime/human-exits-evidence/*.json` 的事件里存着。

## 范围与排除项

- 只管**测试资产**（replay 场景 + 探针收口），不改产品行为、不改 ask 的等待语义。
- 不把「探针能 PASS」当成场景已固化：判据是 `replay-smoke --scenario <新场景>` 零 diff。

## 已知与未决

- 阻塞支真模型行为样本仍小（有记录的观察：1 通过 / 1 场 `MALFORMED_RESPONSE`）；要谈稳定率得再跑几场。
- 非阻塞支 4/4 通过，但同样没有 replay 场景。

## 关闭条件

场景能被 `replay-smoke` 零 diff 复演并登记进 [snapshots/README](../../../snapshots/README.md)（或用户裁定改走 (c) 形态并写明理由）
⇒ `可关闭：是` 并同次归档。

## 落地记录（2026-10-11，结卡时补）

三个卡点逐个实测解掉：

1. **日志不封盘** = ask 前景等待没人作答。解 = 给驱动装**真 UI 认领作答**（浏览器：连排练场工作区 → 按唯一标题搜会话 → 点选项 + Enter）。
   实测：作答后整轮收口（30–170s），会话日志从 20 行截断变 27 行完整（含 `turn/end: completed`）。
2. **RPC 直答无效**。`userQuestions/answer` 的形状是 `{agentId, callId, answer}`，但对未被 Client 认领的问询返回 `false`、整轮仍不收口 ⇒ 走浏览器。
3. **UI 搜索按名字匹配**，自动兜底标题搜不到（实测 0 结果）。解 = 驱动先 `session/rename` 成一个**确定性**标题
   （带时间戳会写进日志、重放必红——首轮实测 `…场景会话` 前那版用 `Date.now()%100000`，重放报 `48098 vs 25030`）。
4. 顺带：`--record` 守卫原写死「≥1 child」，单轮场景录完必被判失败 ⇒ 改成按 `snapshot.yml` 的 `session.children` 声明算。

验收：`source run/env.sh && node checks/smoke/replay-smoke.mjs --scenario human-exits-ask` → `ALL PASS（无 key 重放，归一化零 diff + 2 sidecar 零 diff，20s）`。
夹具钉住的形态：27 行里含 `ask_user_question`（4 选项）与首段三件套（结论/下一步/拍板），`turn/end` 为完成态。
