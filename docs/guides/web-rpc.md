# web-rpc：驱动 Web 面会话（HTTP RPC）

> 性质：指南层 runbook——脚本化建会话、发 prompt、列会话与读会话日志的 HTTP RPC 面。
> 何时读：验证角色行为（preset 只在 Web 面挂载，见 [debugging](./run-ops.md)）、自动化建会话/发动议、或 UI 静默失败需取真实错误时。

preset 只在 Web 面挂载（[debugging §3.6](./run-ops.md) 的层），所以**验证角色行为必须驱动 Web 面**：

```sh
# ① token → cookie（cookie 按 origin 隔离：换端口/换实例都要重新换一次；3081 = 示例值，端口是环境状态、从启动横幅读）
#    从响应头抓 set-cookie 显式带上——`curl -c jar` 抓不稳，别用（脚本同法 = harvest-probe 的 getSetCookie）
COOKIE=$(curl -s -D - -o /dev/null "http://127.0.0.1:3081/?token=<TOKEN>" | grep -i '^set-cookie:' | head -1 | cut -d' ' -f2 | cut -d';' -f1)

# ② 建会话（带 agentPreset 即挂角色 preset）／ ③ 发动议
curl -s -X POST "http://127.0.0.1:3081/api/session/create" -H 'Content-Type: application/json' -H "Cookie: $COOKIE" \
  -d '{"type":"client-request","rpcId":"c1","method":"session/create","payload":{"args":{"request":{"cwd":"<绝对 cwd>","agentPreset":"ceo"}}}}'
curl -s -X POST "http://127.0.0.1:3081/api/session/prompt" -H 'Content-Type: application/json' -H "Cookie: $COOKIE" \
  -d '{"type":"client-request","rpcId":"p1","method":"session/prompt","payload":{"args":{"request":{"requestId":"r-1","sessionId":"<sid>","mode":"queue","content":[{"type":"text","text":"<动议>"}]}}}}'
```

规则（都是实证踩出来的）：

- **endpoint 命名**：格式为 `<namespace>/<method>`（斜杠不是点；gateway `claimsEndpoint` 两段校验），namespace 来自服务键（`session-controller` → `session`，`agent-presets` → `agentPresets`）。常用：`session/create`、`session/prompt`、`session/list`、`agentPresets/list`。
- **请求信封**：固定 `{"type":"client-request","rpcId":…,"method":…,"payload":{"args":{…}}}`；`args` 是位置参数的具名对象，字段名与源码参数名一致（`create(request)` → `args.request`；`list(_request, signal)` → 连下划线照写）。
- **`ask_user_question` 应答形态**：六角色 preset 已钉 `mode: timed`（窗口过后转 `continued`，RPC 与 UI 都能答；vendor 默认 `legacy` 在脚本驱动下会挂住）。应答配方见 [BUG-021 Note](../../notes/archived/2026-10-18-bug021-timed-user-question.md)，驱动停点守则见 [BUG-022 Note](../../notes/archived/2026-10-18-bug022-question-stop-guard.md)。
- **读会话日志**：用 `tools/lib/session/session-log.mjs`（共用实现）。注意 `throughSeq` 须为有效 seq（`-1` 返回 0 条），完成信号取持久事件 `turn/end`（`session/list.running` 在 idle 时仍为 true，不可用作完成判据）。
