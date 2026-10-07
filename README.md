# ai_dsh_company

[![ci](https://github.com/ethan-jiang-1/ai_dsh_company/actions/workflows/ci.yml/badge.svg)](https://github.com/ethan-jiang-1/ai_dsh_company/actions/workflows/ci.yml)

虚拟公司多角色 DSH 插件项目：一个 pack（`packages/company-pack`）扮演一家公司——**wochen**，
CEO、VP-Eng、VP-Sales、COO、CFO 各自是独立 preset，事件从 CEO 进出，中间用 Agent Teams 协作。

**首屏快读**（展开 = [运行态地图](./docs/runtime-map.md)）：

- **四条状态轴**：代码与构建（vendor 只读、src → lib generated）｜DSH 运行态（runtime/，gitignored）｜
  会话事实（company-workspace/，随会话演进）｜验证证据（snapshots/，冻结）——一轴不推断另一轴。
- **最小启动**：完整公司面 = Web 观察窗（`source run/env.sh` → `pnpm dsh web` → token URL 开门，步骤 =
  [demo.md](./docs/demo.md)）；`pnpm dsh --profile headless` 只证明通用 CLI，**不是**公司运行。
- **新 Agent 首跑验收**（推荐、非强制）= [tests/README](./tests/README.md) 首跑节（有 key / 无 key 两条路径）；改东西选检查 = 同文件「改动面 → 最窄检查」表。

- 入口：[驾驭者五问](./docs/orient.md)（白话速读）· [项目地图](./docs/project-map.md)（空间导航）· [运行态地图](./docs/runtime-map.md)（时序与状态轴）·
  [脚本索引](./checks/README.md)（按用途选入口）· [AGENTS.md](./AGENTS.md)（coding agent）· [设计与决策](./docs/index.md)
- 安装：`pnpm dsh plugin --profile <名> add link:./packages/company-pack`（开发联调）；发布形状 =
  `npm pack` → 干净 profile `add file:<tarball>`（验收 = release-smoke，[docs/release.md](./docs/release.md)）——装后 profile 的 roster 可见五角色 preset
- 纪律：**默认严格照做钉住的 DSH 研发纪律，偏离必须登记**（权威对照表见 [AGENTS.md](./AGENTS.md) §纪律；操作手册 [guides/dev-loop](./docs/guides/dev-loop.md)）
- 任务与推敲：任务源 = 已批 RFC（`notes/proposed/`）与用户点名；裁决前的思考住 [_backlog/](./_backlog/README.md)（推敲卡 D31 / 队列层退役 D32 / 搁置池·磨清单退役 2026-09-28，归档 [_backlog/_done/_misc/](./_backlog/_done/_misc/)）
