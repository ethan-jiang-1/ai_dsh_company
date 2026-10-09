# 2026-10-05 · 入口与运行态地图——人与 Coding Agent 共用的首屏（steerability 毕业拆分 1/6，已实施）

状态：已消化（2026-10-05 实施完成，终局 fresh-agent 五问走查验收通过；来源 = 推敲卡 [repository-steerability](../../_backlog/_archive/settled_issues/2026-10-05-repository-steerability.md) 毕业拆分第 1 条——steerability 系列六条 RFC 至此全部实施完毕）

## 交付（现在时）

- **[docs/runtime-map.md](../../docs/runtime-map.md) 立**（时序与状态轴唯一家）：完整 Web 链时序图（repo → profile boot → 组合层 → pack → host/client → 连工作区 → session/create → preset → vendor agent loop → 会话日志 → workspace 产物 → 证据）；三种面并列（headless ≠ 公司 / Web 观察窗 / 会话四形态——名字像 VP-Eng ≠ 加载该 preset）；**四条状态轴表**（权威位置 / 生命周期 / 不能从这里推断什么）+ 补充轴如实登记（排练盘 / 浏览器 origin 记忆 / 系统 tmp）；错误入口四条（headless 只证 CLI / 日用 home 同名 web profile 陷阱 / 退役 profile 非权威 / 进程 cwd ≠ 会话 cwd + 启动 ≠ 装配）；五问直达表。
- **根 [README](../../README.md) 扩为首屏**：四轴一句话版、最小启动两路径（Web = 完整公司面；headless 只证通用 CLI）、首跑验收 + 最窄检查表指针；既有入口 / 安装 / 纪律行保持。
- **AGENTS 入口路由收紧**（94/105 预算内同位数）：初入 = 项目地图（空间）+ 运行态地图（时序与四轴）；变更 = dev-loop §0.5/§1；验证 = 测试宪法 + tests/README + 脚本索引；首跑验收指针。
- **[project-map](../../docs/project-map.md) 首屏重排**：快读 happy path 行；按任务进入表 +2 行（查运行态与时序 → runtime-map；选择验证 → tests/README）；「三位置」段升为**四轴引用**（唯一家 = runtime-map §二）。
- **[run/README](../../run/README.md) 对 runtime-map 的前向引用转正链**。
- 交叉链接：三首屏互链各答其一；四轴表唯一家在 runtime-map，README 只有一句话版。

## 验证记录（判据先行 = 走查判据）

- **终局 fresh-agent 五问走查**（独立子代理、无本任务上下文、纯读三首屏 + 一步链接）：五问（启动 / 改 persona·skill / client 局部验证 / 卡点排查 / 产物与证据）+ 四轴附加题**全部在三文件内闭环定位到节**；三文件口径一致无矛盾（headless 边界、同名 web profile 陷阱、preset-smoke 完成定义三处互相印证）；关键链接目标（demo §前置、tests/README 最窄检查表、pack owner 表）实测存在且内容相符。**判定：验收通过。**
- 走查缺口回流（如实记录）：(a) 调试阶梯本体与 persona 生效边界在一步链接深——路由设计的既定代价（首屏只给指针，防复述漂移），保留；(b) 日志世代细节外指 [log-generation](./2026-10-05-steerability-log-generation.md)——既定分工；(c) README 首屏未直接点出「改动面 → 最窄检查」表 → **本 diff 已修**（首跑验收行补一句）。
- `pnpm verify` ALL PASS（AGENTS 94/105、预算全界内；md-links / bare-path 对新文件 runtime-map 硬档扫描）+ `pnpm test` 316/316。

## 输掉的方案（留尸）

- **巨型单一 README**：复制政策必漂（D26）。
- **runtime map 并入 project-map**：受众不同（空间导航 vs 时序状态轴），合写两长。
- **四轴表复制进 README / project-map**：唯一家 = runtime-map §二，其余只一句话版 / 指针——走查证实指针足以定位。
- **新造第二套入口文档树**：与 docs/ 分层（D10）冲突。

## 后果

- steerability 六条 RFC 全部实施完毕，原推敲卡六项拍板全部兑现；#7 物理拆分按拍板⑤延后（重启条件 = [pack-boundaries](./2026-10-05-steerability-pack-boundaries.md) 重启条件节）。
- 三首屏（README / project-map / runtime-map）成为新读者与新 Agent 的标准入口（根 AGENTS 第一行已路由）。
