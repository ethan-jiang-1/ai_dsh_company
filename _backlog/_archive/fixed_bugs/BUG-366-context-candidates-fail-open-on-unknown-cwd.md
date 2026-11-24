---
status: 已修
severity: P2
opened: 2026-11-24
---

# BUG-366：培养背景候选按「未知 cwd = 都匹配」放行，别的 workspace 的会话会出现在本工作区的参考背景里

> 严重级别：P2（越界读：`projectContextSessions` 的过滤是 `cwd === undefined || row.cwd === undefined || row.cwd === cwd`——当前会话 cwd 未解析、或候选行没有 cwd 时**一律放行**。用户在 A 项目的会话里挑「参考背景」，可选到 B 项目的会话；选中的 `ref` 会随培养记录写进公司盘并被 host 读回正文）｜发现：2026-11-24｜状态：已修｜审查：agent — 逐条核对已修判定（未知 ≠ 匹配；继承与归一）
>
> **留痕**：Note [2026-11-24-boundary-window-and-bad-shape-batch](../../../notes/implemented/2026-11-24-boundary-window-and-bad-shape-batch.md)（批次 360..369：作用域 fail-closed）

## 症状

[`projectContextSessions`](../../../packages/company-pack/src/client/cultivation/cultivation-context-data.ts#L155-L160)：

```ts
const scope = rows.filter(row => row.blank !== true && (cwd === undefined || row.cwd === undefined || row.cwd === cwd))
```

`cwd === undefined`（当前会话的 cwd 还没解析：刚建会话、清单未就绪）⇒ 条件恒真；`row.cwd === undefined`（子会话经常没有 cwd）⇒ 该行恒进候选。两者都是把「不知道」当成「匹配」。

同一仓对**同类问题**已经有相反口径与教训：[`historyCandidates`](../../../packages/company-pack/src/client/presence/attention-history.ts#L255-L265) 的注释写着「cwd 未解析（会话刚建/清单还没加载）⇒ 不扫：宁可少扫，不可越界」（BUG-323 的修复），而培养背景这条路没有跟上。

## 运行面

- **面 = client**：[`packages/company-pack/src/client/cultivation/cultivation-context-data.ts`](../../../packages/company-pack/src/client/cultivation/cultivation-context-data.ts#L155-L200)；消费方 = [`CultivationContextPicker`](../../../packages/company-pack/src/client/cultivation/CultivationContextPicker.tsx)。

## 复现

```sh
pnpm exec tsx -e "
import { projectContextSessions } from './packages/company-pack/src/client/cultivation/cultivation-context-data.ts';
const row = (id, cwd, extra = {}) => ({ sessionId: id, displayTitle: id, running: false, blank: false, updatedAt: 1, ...(cwd === undefined ? {} : { cwd }), ...extra });
// 当前会话 cwd 未解析
console.log('unknown current cwd ->', projectContextSessions([row('cur', undefined), row('other', '/ws-b')], 'cur').items.map(r => r.sessionId));
// 当前 cwd 已知，但候选行没有 cwd
console.log('unknown row cwd     ->', projectContextSessions([row('cur', '/ws-a'), row('child', undefined, { origin: 'subagent', parentId: 'cur' })], 'cur').items.map(r => r.sessionId));
"
```

实测两种情形都返回了 `['cur','other']` / `['cur','child']`——`other` 来自 `/ws-b`，在 `cur` 的 cwd 未知时被当成同工作区候选。

## 根因与证据

1. 过滤式写成「任一未知即放行」，即 fail-open；`historyCandidates` 用的是 fail-closed。
2. 判据本身也只比原始字符串（`row.cwd === cwd`），没有 canonical 化，`/var/…` 与 `/private/var/…` 这类同一目录的两种写法会互相漏配；但主问题是未知值放行。

## 失败类与同类排查

- **失败类**：作用域过滤把「未知」并入「匹配」（`BUG-323` 的同一根因，另一条消费路径）。
- **同类排查**：`historyCandidates`（已修，作为判据参照）、`client/index.ts` 的 `api-session/added` 对非本 workspace 的 cwd 会 warn 但不阻止——那条是诊断面，不是候选面。

## 修复方案与范围

- **根因修法**：与 `historyCandidates` 同口径——当前会话 cwd 未知时返回「这一轮没有候选」并把原因上报（面板说「还不知道这个会话属于哪个工作区」）；候选行的 cwd 缺失时**排除**（子会话可经 parent 的 cwd 继承，取不到就不进候选）；比较改用 canonical 化后的路径。

## 已修判定

- 上述两种复现都不再出现跨工作区/无 cwd 的候选：`unknown current cwd` 返回空候选且带可读原因；`unknown row cwd` 只剩 `cur`（或经 parent 解析后合法进入）。
- 同工作区正常候选行为不变；`tests/client/cultivation/cultivation-context-data.spec.ts` 增加未知 cwd 用例（旧实现红、新实现绿）。

## 修复证据

- 改动面：`packages/company-pack/src/client/cultivation/cultivation-context-data.ts`、`packages/company-pack/src/client/cultivation/cultivation-copy.ts`、`tests/client/cultivation/cultivation-context-data.spec.ts`
- 红：`pnpm test tests/client/cultivation/cultivation-context-data.spec.ts` —— 还原 fail-open 过滤前 3 failed（跨 workspace/无 cwd 候选混入）
- 绿：`pnpm test tests/client/cultivation/cultivation-context-data.spec.ts` —— 12/12 passed（未知 cwd 零候选 + problem；子会话继承 parent cwd；尾斜杠归一）
- 提交：commit 19b95966
