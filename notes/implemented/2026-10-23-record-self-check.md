# 录制自证可回放：`--record` 自检 + 有限重试（修 BUG-032）

状态：implemented（2026-10-23；BUG-032 修复；用户令「BUG 一定要都修好」）

## 决定

1. **`--record` 录完立即自检**：子进程跑本文件的 keyless replay 档（不带 `--record`，不会递归），
   绿才收工；红则**重录**，最多 3 次；3 次都红则如实失败并保留最后一次现场。
2. **不在重放侧做宽容**：不给「script 用尽就收尾」开绿灯——那会把「多出一步」掩盖成正常，
   而这正是本卡要抓的东西。

## 根因

委派在 rc.2 是 activation：child 的完成通知可能落在 lead 的**轮内**（并进最后一步，录成 3 次模型调用）
或**轮后**（另起一轮，录成 4 次）。重放侧通知到达时机若与录制相反，`llm-replay` 报
`script exhausted — session requested model call #4 but its script has only 3`。
同一份代码前三次重录全红、第四次一次就绿——是录制形状的运气，不是 adapter/组合缺陷。

## 输掉的方案

- **重放宽容 script 用尽**：把一次真实的多余模型调用从判据里抹掉；红会被掩盖成绿。
- **改场景为 team + wait_agent**：能消除竞态，但 r3 锁的是「单职能委派 + 完成通知」这条通道，换掉就不再是同一个回归。
- **只写文档让人“红就重录”**：BUG-032 之前就是这么活的——命令本身不保证产出可回放 fixture。

## 后果

- `--record` 的完成语义从「录完」变成「录完且可回放」；返工成本封顶 3 次录制（每次 ~30s）。
- 连续两次 `--record`（2026-10-23）都是第 1 次自检即绿；**重试分支本身未被实测触发**（如实登记）。

## 验证（真跑）

```text
node checks/smoke/replay-smoke.mjs --scenario r3-delegation --record
#   第 1/3 次 → 录制完成（lead 55 行）→ 自检重放… → 自检通过
#   再跑一次 → 录制完成（lead 46 行）→ 自检通过
node checks/smoke/replay-smoke.mjs --scenario r3-delegation --ui --refresh-ui && … --ui
#   双 lane ALL PASS（金样与 session 同代）
pnpm verify   # ALL PASS
```

## 未验

- 重试分支未在真实竞态下触发过（两次都第一次就绿）——代码路径存在，等待下一次坏运气验证。
- `--record` 的成本从一次变最多三次（真模型）；头注成本声明未改，按实际取上限更诚实。
