# 2026-10-04 · E2E 六：双 home 并发演练（renewal-w-2026，迁移清单首验）

状态：已交付（用户令「再跑一轮，挑没把握的方向」；判据 9 点预注册于 `dev/harness-home/tmp/e2e-dualhome.mjs` 头注）

## 为什么是这张迁移清单

spawn 模式 / 三扇门 / 互审返工拒签都已实测后，**multi-human.md §5 迁移清单是剩余最大块从未实测的
论断集**：每家装 pack、审计每家跑一遍、会话库不搬、消息跨 home 无寻址——它直接通向真多人部署。
本回合用**同机双 home**（dev/harness-home + 新建 dev/harness-home-b）做服装演练：网络层不在射程，
状态/bucket/审计隔离全在射程。

## 动议与形态

renewal-w-2026（微动议：存量客户 W 问续约报价口径——机制为主、实质从简）：home-A CEO 门派活
（不 spawn）→ **home-B**（全新 bootstrap）CFO 门出稿 + journal → home-A CEO 读共享盘上的稿
收口 + present。真模型三段，全程约 5 分钟。

## 判据考核（9 点全绿）

| # | 观察点 | 判 | 证据 |
|---|---|---|---|
| ① | 新 home bootstrap 两步走通 | ✅ | 凭据拷贝 + `plugin --profile web add link:`（dump-config 计数 9 = home-A 持平）；构建产物确认 repo 级共享、home 无关 |
| ② | home-B 会话在共享盘产出 | ✅ | drafts/cfo.md（署名行 ✓）+ journal 落真盘——文件协作跨 home 无感 |
| ③ | home-A audit：home-B 稿不可考 | ✅ | `？ cfo.md｜署名=cfo｜写入者不可考` |
| ④ | home-B audit：同稿一致 | ✅ | `✓ cfo.md｜写入=cfo` |
| ⑤ | journal-audit 覆盖洞 | ✅ | home-A 只有 CEO 行（home-B 的 cfo 会话整场不可见）；home-B 只有 CFO 行——**各见半张** |
| ⑥ | 跨 home 合稿 present | ✅ | home-A CEO 读 home-B 的稿 → final + present ×1 |
| ⑦ | check 违规 0 | ✅ | home-A 视角 ALL PASS（cfo.md 不可考是观察档不判红） |
| ⑧ | bucket 隔离 | ✅ | 同 bucket 名（同 cwd 映射）、内容各存各的：cfo 会话 home-A=false / home-B=true |
| ⑨ | 门禁全绿 | ✅ | verify ALL PASS / 277 |

## 比文档论断多走出的一步（新洞见）

§5 只说「审计每家跑一遍，只跑一家会漏」——实测发现**跑了每一家也只得到半张归属图**：
home-A 视角 ceo ✓/cfo 不可考，home-B 视角 cfo ✓/ceo 不可考，**镜像对称**。单场跨 home 动议的
完整归属图不存在于任何单一 home ⇒ **审双 home 动议 = 两家 audit 各跑再人工拼图**（或归档明文
日志合并后审）。这条已写进快照 -5 的 README。

## 过程新发现（机制面 + 我的脚本债）

1. **bootstrap 出奇地顺**：两步配方（凭据 + link 装 pack）一次通过、零坑——§5 ①的论断直接升级
   为实测事实。
2. **journal-audit 退出码 1 = 有缺席是预期态**：一次性脚本调它必须接住 exit 1 照收输出（本轮
   首跑就栽在这——错误处理修后续跑）。
3. **dev/harness-home-b 成为常设资产**（gitignored）：后续双 home 回归（升 pin/审计改动）可直接复用。
4. 仍未实测：真网络/真多机、跨 home 消息无寻址论断（③）、owners.md 真名替换——挂账迁移清单。

## 收敛（T-1 五步，第五次执行）

meta（CEO 全自填：结果=已采纳/一句话结论可直接对客念）→ 台账行 → CHARTER ×2 → 快照
`snapshots/memory-convergence-2026-10-04-5/` → 归档（fs mv——未中途提交）+ 清 live。
收敛后：check 违规 0 / verify ALL PASS / 277 全绿。
