# ai_dsh_company

虚拟公司多角色 DSH 插件项目：一个 pack（`packages/company-pack`）扮演一家公司——**wochen**，
CEO、VP-Eng、VP-Sales、COO、CFO 各自是独立 preset，事件从 CEO 进出，中间用 Agent Teams 协作。

- 入口：[AGENTS.md](./AGENTS.md)（coding agent）· [docs/index.md](./docs/index.md)（设计地图+决策台账）
- 安装：`pnpm dsh plugin --profile <名> add link:./packages/company-pack`（开发联调）；发布形状 =
  `npm pack` → 干净 profile `add file:<tarball>`（验收 = release-smoke，[docs/release.md](./docs/release.md)）——装后 profile 的 roster 可见五角色 preset
- 纪律：**默认严格照做钉住的 DSH 研发纪律，偏离必须登记**（权威对照表见 [AGENTS.md](./AGENTS.md) §纪律；操作手册 [guides/dev-loop](./docs/guides/dev-loop.md)）
- 队列：见 [ROADMAP.md](./ROADMAP.md) §队列（条目制 D23/D24，完成即离队——当前状态以队列为准，此处不镜像）
