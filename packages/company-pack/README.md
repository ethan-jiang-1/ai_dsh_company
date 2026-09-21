# dsh-company-pack

唯一自写包（决策 D1：一个包；行多包少）。三个面按垂直轮长出：

| 面 | 内容 | 轮次 |
|---|---|---|
| 配置面（现在） | `presets/<role>/`（persona + skills，硬隔离）+ `cordis.patch.yml`（bundle 行：`agent-presets` 替换 web-app 出厂行、`tool-present`/团队两行 insert）+ `package.json` 的 runtime deps（8 个，精确钉 `0.1.5-rc.2`） | R0–R2 |
| host 代码面 | `src/`（M2 委托 provider、org 工具——有了再建，见 docs/design/20 §3 / 10 §2.1） | R3+ |
| client 面 | `src/client/` + `dsh.client` 字段 + tsdown 构建（Company 驾驶舱，docs/30 §2） | R5 |

R5 待办（发布前）：`@deepseek-ai/cordis` 转 peerDependencies、`dsh.compatibility` 版本矩阵、
`npm pack` → 干净 profile → `dsh plugin add` 真实安装形状冒烟（docs/10 §7）。
