---
status: 调查中
severity: P2
opened: 2026-11-20
---

# BUG-290：空白页里敲 `/req check …` 没有任何反馈——不报错、不建会话、不显示结果

> 严重级别：P2（次要偏重：核心操作员命令在首屏静默失效，用户会以为「按了没反应」）｜发现：2026-11-20（端到端验收第二轮）｜状态：调查中（已排除「回车不生效」，根因未定）
>
> **留痕**：端到端验收轮（2026-11-20）。

## 症状

新开观察窗（无会话）后，在输入框键入 `/req check no-such-dir` 并回车：

- 输入框被清空；
- 页面上**没有任何**新增文本（无错误提示、无「用法」、无结果、也没有新建会话）；
- `document.body.innerText` 仍是 726 字节的空壳（只有侧栏 + 指南条 + 输入框）。

同一次会话里，`/company-settings` 回车后**能**打开右侧「策略」面板并渲染内容——所以回车提交本身是通的。

## 复现

```sh
source run/env.sh
node tools/dev/company.mjs --home runtime/e2e-home4 --workspace runtime/e2e-ws4 --no-open   # 取横幅 URL
cat > /tmp/steps.json <<'JSON'
[{"typeText":["[data-composer-input='true']","/req check no-such-dir"]},{"pressKey":"Enter"}]
JSON
node probes/browser-visual/cdp-probe.mjs '<横幅URL>' --steps /tmp/steps.json --body-out /tmp/body.txt
```
`/tmp/body.txt` 只有空壳；把命令换成 `/company-settings`，同一路径能开出策略面板。

## 已排除

- **回车不生效**：同一实例 `/company-settings` 回车 → 策略面板出现（本轮实测，`pressKey` 走 CDP `Input.dispatchKeyEvent`，是真键盘事件）。
- **命令不存在**：`packages/company-pack/src/host/commands/req-command.ts:197` 注册了 `req`，`input.hint = 'check <deliverables 目录名>'`；`delivery-command.ts:84` 同族。
- **空 workspace 就直接报错**：handler 的 `parsed.ok === false` 分支会返回 `{ kind: 'error', text }`（req-command.ts:214 附近），文案本该可见。

## 待查（根因假设，未证）

1. **客户端丢弃无会话时的命令结果**：文本型命令要落进 transcript，若当前没有 session，client 可能直接忽略返回值（而 `/company-settings` 因为是 UI 动作所以生效）；
2. **host 侧 admission 未把命令挂到会话**：没有 session 就没有 `command/run` 事件可依附；
3. **命令结果渲染成瞬时提示**，在探针截取 body 前已消失（需看 DOM/控制台验证，而不是只看 innerText）。

判据：在空白页发命令后抓 `/json` 网络请求与 console，确认 handler 是否被调用、返回什么、client 如何处理。

## 失败类与同类排查

**失败类 = 静默失败（无反馈）——「点了没反应」类。** 同类：`/delivery check`、以及其他文本型命令在无会话首屏大概率同病；`/company-settings` 这类有 UI 副作用的命令不受影响。修法方向 = 要么在无会话时给出统一「先建会话」提示，要么由 client 自动建会话承载命令结果——二选一，不要靠用户猜。
