---
status: 调查中
severity: P1
opened: 2026-11-21
---

# BUG-293：命令作用域提示一渲染就崩——注入的 `list` 是 `undefined`，composer 槽每次加载都报错

> 严重级别：P1（重要：BUG-290 的用户可见缓解 100% 失效，且每个页面在 composer 槽产生一次 TypeError）｜发现：2026-11-21（E2E 设计轮）｜状态：调查中
>
> **留痕**：待定（本轮只立卡，不修——用户 2026-11-21 指令「发现问题直接报 bug，别急着修」）。

## 症状

隔离 home 起真实例后，**任何页面**（落地页 / 空白会话 / 已有会话）的 composer 槽都报：

```
TypeError: Cannot read properties of undefined (reading 'subscribe')
slot entry crashed in 'conversation.input.left': TypeError: Cannot read properties of undefined (reading 'subscribe')
```

DOM 里 `.wk-command-scope-hint` 计数恒为 0——BUG-290 想加的「斜杠命令要等会话开始后才回话」从未出现。`conversation.input.left` 的其它条目（「策略」按钮）仍在，说明槽级错误被隔离，但这条提示已经彻底死掉。

## 运行面

- **面 = client**：`packages/company-pack/src/client/startup/CommandScopeHint.tsx` 的注册体 + `packages/company-pack/src/client/index.ts` 的调用点。
- DSH 载体 = client 槽 `conversation.input.left`（keyed slot 的 inject 面）。

## 复现

先确保 client 产物是最新源码（本卡的关键前提，见 [BUG-296](BUG-296-real-page-lanes-stale-client-bundle.md)）：

```sh
node_modules/.bin/tsc -b packages/company-pack && (cd packages/company-pack && ../../node_modules/.bin/tsdown)
node checks/lanes/ui-scene.entry.mjs --isolated
```

期望：exit 0。实际：exit 1，`consoleProblems` 里就是上面两条；所有 10 个公司页签仍能开（所以只看「页签在不在」会漏掉它）。

单元层同时是**绿**的，说明 gap 在注入面：

```sh
npx vitest run tests/client/startup/command-scope-hint.spec.ts
# 4 passed
```

证据（原型 E2E 轮，gitignored）：`runtime/tmp/e2e-evidence/2026-11-21T15-17-26/02-blank-session.png`、`verdict.json`；官方车道证据：`runtime/harness-home/diagnosis/cdp-probe-2026-11-21T15-31-00-953Z/{verdict.json,console.log,page.png}`。

## 根因与证据

1. `CommandScopeHint` 在渲染期无条件解引用 `list`：
   - `packages/company-pack/src/client/startup/CommandScopeHint.tsx:40`：`list.subscribe.bind(list)`
   - 同文件 `:41`：`list.getSnapshot()`
2. 注册体的 inject 把 `list` 写死成 `undefined`：
   - `packages/company-pack/src/client/startup/CommandScopeHint.tsx:72`：`inject: (sessionId) => ({ sessionId, list: undefined as never, t })`
3. 调用点只传了 `slots` 与 `t`，没有把 `scoped.sessions.list` 带进去：
   - `packages/company-pack/src/client/index.ts:228-233`
4. 这是**重构回归**，不是 BUG-290 原始实现：
   - `git show ad4481be -- packages/company-pack/src/client/index.ts` 里原始注册是 `list: scoped.sessions.list`；
   - `git show 28b19a52 -- packages/company-pack/src/client/startup/CommandScopeHint.tsx` 把注册搬进 `registerCommandScopeHint` 时改成了 `undefined as never`。
5. 单测为什么绿：`tests/client/startup/command-scope-hint.spec.ts` 的注册体用例只断言 `inject(...).sessionId` 与 `id/order`，**没有断言 `list` 是会话列表面**；组件用例则手工传了正确的 `listFace`。于是「组件本身能用」与「真实注册注入的面」两半各自绿，拼起来是崩的。

## 失败类与同类排查

**失败类 = 接线丢失 / 注入面只测形状不测真值**（`tests/failure-classes.md`）。同类扫描：

```sh
grep -rn "undefined as never" packages/company-pack/src/client
```

只命中这一处（`CommandScopeHint.tsx:72`）；`inject: (sessionId` 的其它注册点（`client/index.ts:218` 的「策略」按钮）都直接闭包引用真实依赖。因此不是一族大面积缺口，但「注册体单测只断言 id/order/sessionId」这个模式仍可能复现在下一个槽注册上。

## 修复方案与范围

- **根因修法**：把会话列表快照面从调用点传进 `registerCommandScopeHint`（第三参，或在 `CommandScopeHintScope` 上暴露 `sessions`），inject 返回真实的 `list`；不在组件里加 `?.` 把缺失吞掉——那会让提示永久静默。
- **判据补强**：注册体用例渲染 `inject('session-1')` 的真实产物（用 `CommandScopeHint` + `blank=true` 的 list 面），断言提示文本出现；`blank=false` 时不出现。这样「注入面 + 组件」在同一条断言里闭合。
- **不改**：vendor 槽实现、`conversation.input.left` 的 order/策略按钮、BUG-290 的文案与 tooltip。
- **材料性**：client 公开行为（用户可见提示）；修复需用户授权/留痕裁决，本轮不修。

## 已修判定

- 同一条 `node checks/lanes/ui-scene.entry.mjs --isolated`：`consoleProblems`/`exceptions`/`clientErrors` 为空，且 `.wk-command-scope-hint` 在空白会话出现、首条消息后消失；
- `npx vitest run tests/client/startup/command-scope-hint.spec.ts` 覆盖「真实 inject 产物 → 组件渲染」两态；
- 不靠旧 `lib/client.js` 产物：真实页面车道必须先过 [BUG-296](BUG-296-real-page-lanes-stale-client-bundle.md) 的新鲜度判据。
