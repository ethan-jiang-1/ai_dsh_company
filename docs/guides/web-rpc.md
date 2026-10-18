# web-rpc：驱动 Web 面会话（RPC；R1 实证）

> 性质：指南层 runbook——脚本化建会话、发 prompt、列会话与读会话日志的 HTTP RPC 面。
> 何时读：验证角色行为（preset 只在 Web 面挂载，dev-loop §2 第 3.6 层）、自动化建会话/发动议、
> 或 UI 静默失败要拿真实错误时。2026-10-12 自 dev-loop §8 整节迁出（常驻层瘦身轮；dev-loop §8
> 留指针、节号防断链）。

preset 只在 Web 面挂载（§2 第 3.6 层），所以**验证角色行为必须驱动 Web 面**。Web 面有 HTTP RPC，
可以脚本化建会话、发 prompt、列会话：

```sh
# ① token → cookie（cookie 按 origin 隔离：换端口/换实例都要重新换一次；3081 = 示例值，端口是环境状态、从启动横幅读）
#    从响应头抓 set-cookie 显式带上——`curl -c jar` 抓不稳，别用（脚本同法 = [harvest-probe.mjs](../../tools/archive/harvest-probe.mjs) 的 getSetCookie）
COOKIE=$(curl -s -D - -o /dev/null "http://127.0.0.1:3081/?token=<TOKEN>" | grep -i '^set-cookie:' | head -1 | cut -d' ' -f2 | cut -d';' -f1)

# ② 建会话（带 agentPreset 即挂角色 preset）
curl -s -X POST "http://127.0.0.1:3081/api/session/create" \
  -H 'Content-Type: application/json' -H "Cookie: $COOKIE" \
  -d '{"type":"client-request","rpcId":"c1","method":"session/create",
       "payload":{"args":{"request":{"cwd":"<绝对 cwd>","agentPreset":"ceo"}}}}'

# ③ 发动议
curl -s -X POST "http://127.0.0.1:3081/api/session/prompt" \
  -H 'Content-Type: application/json' -H "Cookie: $COOKIE" \
  -d '{"type":"client-request","rpcId":"p1","method":"session/prompt",
       "payload":{"args":{"request":{"requestId":"r-1","sessionId":"<sid>","mode":"queue",
                                    "content":[{"type":"text","text":"<动议>"}]}}}}'
```

规则（都是实证踩出来的）：

- **endpoint = `<namespace>/<method>`**（斜杠，不是点；见 gateway `claimsEndpoint` 的两段校验）。
  namespace 来自服务键：`session-controller` → `session`，`agent-presets` → `agentPresets`。
- **信封固定** `{"type":"client-request","rpcId":…,"method":…,"payload":{"args":{…}}}`。
- **`args` 是位置参数的具名对象**，名字取自源码参数名：`create(request)` → `args.request`；
  `list(_request, signal)` → **`args._request`**（占位参数的下划线也要照写）。
- 常用：`session/create`、`session/prompt`、`session/list`、`agentPresets/list`。
- **`ask_user_question` 的应答能力取决于工具形态**（2026-10-18 改正；原句「回答不走 RPC」不准确）：vendor 默认的
  `legacy` 形态前台窗口无界，问询停 `'open'` 而 `userQuestions/answer` 只吃 `'continued'` ⇒ 脚本化驱动会永久挂住；
  本包五角色 preset 已钉 `mode: timed`（窗口过后转 `continued`，RPC 与 UI 都能答）。应答配方与判据 =
  [BUG-021 毕业 Note](../../notes/implemented/2026-10-18-bug021-timed-user-question.md)。 **驱动侧停点守则**（看到无界问询就停并报，别干等）= `tools/lib/question-stop.mjs`，用法见 [BUG-022 毕业 Note](../../notes/implemented/2026-10-18-bug022-question-stop-guard.md)。
- 这条通道也是 R5a「web 快照 lane」的雏形。


- **读会话日志**用 `tools/lib/session-log.mjs`（page 与事件解析的共用实现）。两个坑：`session/page`
  的 `throughSeq` 必须是**有效 seq**（`-1` 实测返回 0 条；当前游标可从越界报错 `… is past cursor N` 取），
  完成信号取**持久事件 `turn/end`**（`session/list.running` 是“会话有活着的 agent”，idle 也为 true；用它等会假超时）。
