# ai_dsh_company

[![ci](https://github.com/ethan-jiang-1/ai_dsh_company/actions/workflows/ci.yml/badge.svg)](https://github.com/ethan-jiang-1/ai_dsh_company/actions/workflows/ci.yml)

虚拟公司多角色 DSH 插件项目：一个 pack（`packages/company-pack`）扮演一家公司——**wochen**，
CEO、VP-Eng、VP-Sales、COO、CFO 各自是独立 preset，事件从 CEO 进出，中间用 Agent Teams 协作。

- 入口：[项目地图](./docs/project-map.md)（运行、交互、调试与测试）· [脚本索引](./scripts/README.md)（按用途选入口）· [AGENTS.md](./AGENTS.md)（coding agent）· [设计与决策](./docs/index.md)
- 安装：`pnpm dsh plugin --profile <名> add link:./packages/company-pack`（开发联调）；发布形状 =
  `npm pack` → 干净 profile `add file:<tarball>`（验收 = release-smoke，[docs/release.md](./docs/release.md)）——装后 profile 的 roster 可见五角色 preset
- 纪律：**默认严格照做钉住的 DSH 研发纪律，偏离必须登记**（权威对照表见 [AGENTS.md](./AGENTS.md) §纪律；操作手册 [guides/dev-loop](./docs/guides/dev-loop.md)）
- 任务与推敲：任务源 = 已批 RFC（`notes/proposed/`）与用户点名；裁决前的思考住 [_backlog/](./_backlog/README.md)（推敲卡 D31 / 队列层退役 D32 / 搁置池·磨清单退役 2026-09-28，归档 [_backlog/_done/_misc/](./_backlog/_done/_misc/)）
