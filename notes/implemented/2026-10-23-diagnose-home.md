# diagnose `--home`：显式只读日用 home

状态：implemented（2026-10-23；P9）

## 决定

1. `tools/diagnose.mjs` 新增 `--home <路径>`：显式读一个**非 dev home** 的会话日志（典型 = 日用 `~/.dsh`，
   Web GUI 的会话就住那里）。只读、不加写；启动时打一行 `⚠ 显式读非 dev home（只读）`。
2. **默认仍拒绝**：不给 `--home` 时照旧走 `requireDevHome`；`DSH_HOME` 缺失或与日用 home 重叠仍然 exit 2。
3. 复用现有链：`pickSessionLog`（zstd 多帧）+ `summarizeSessionEvents` + `redactTokenUrls`，没有第二套读取实现。

## 输掉的方案

- **放宽 `requireDevHome` 让它接受日用 home**：双 home 纪律就没了——日常误读另一个 home 的日志会成为默认行为，
  而且「读错 home 却看起来正常」比 fail-closed 危险。
- **用环境变量 `DIAGNOSE_HOME`**：一次性读日志，旗标比环境变量显式，也不会在 shell 里残留。
- **把日志拷进 dev home 再读**：mutation，且多一份可能过期的副本。

## 后果

- Web GUI（日用 home）的会话现在能被 `pnpm diagnose` 读——此前这条路径是断的（本轮 retro 里手搓 zstd 的动因）。
- 默认路径行为逐字不变（同一 fail-closed 文案与退出码）。

## 验证（真跑）

```text
node tools/diagnose.mjs --home ~/.dsh
#   ⚠ 显式读非 dev home（只读）：/Users/bowhead/.dsh
#   SESSION …/session-5d46214d…；EVENTS total=3353 turns=28 toolErrors=6；FAILURES 逐条列出
DSH_HOME=~/.dsh node tools/diagnose.mjs
#   diagnose: DSH_HOME 与日用 home（/Users/bowhead/.dsh）重叠——拒绝执行（默认路径未放宽）
pnpm test     # 756 passed
pnpm verify   # ALL PASS
```

## 未验

- `--home` 的参数解析没有 keyless 单测（工具是 CLI 入口，判据在 `summarizeSessionEvents` 层已有覆盖）；
  真跑已覆盖两条路径（显式读 / 默认拒）。
