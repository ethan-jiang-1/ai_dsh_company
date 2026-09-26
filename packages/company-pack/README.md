# dsh-company-pack

唯一自写包（决策 D1：一个包；行多包少）。三个面按垂直轮长出：

| 面 | 内容 | 出生 |
|---|---|---|
| 配置面（现在） | `presets/<role>/`（persona + skills，硬隔离）+ bundle 行（`cordis.patch.yml`：`agent-preset-registry` 替换出厂行；`dsh.bundle.patch` 为**数组** = registry 1 + 五角色预设行）+ `package.json` 的 peerDependencies（**版本以 `package.json` 为准，此处不复述**——复述必漂） | 轮次 R0–R2（轮次制已退役，见 D23） |
| host 代码面 | `src/` + `src/lib/`（看板/在场/DAG/台账的读模型与 host 代码） | R3+ |
| client 面 | `src/client/` + `dsh.client` 字段 + tsdown 构建（公司面板：在场 / 依赖图 / 用量 / 任务板 / 台账） | R5 |

发布前清单已全部落地（2026-09-25 随升 pin ①）：cordis 在 peerDependencies、`dsh.compatibility`
版本矩阵（历史版本 + 当前钉住，见 `package.json`；`pack-compat` 门禁强制含当前 tag）、
`npm pack` → 干净 profile → `dsh plugin add` 真实安装冒烟 =
release-smoke ALL PASS（[docs/release.md](../../docs/release.md)）。pack 保持 `private: true`——
真实 npm 发布等第二个消费者出现再定（registry 三态等前瞻 =
[harness-alignment 台账](../../notes/research/2026-09-25-harness-alignment-ledger.md) §五）。
