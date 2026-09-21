# dsh-company-pack

唯一自写包（决策 D1：一个包；行多包少）。三个面按阶段长出：

| 面 | 内容 | 阶段 |
|---|---|---|
| 配置面（现在） | `presets/<role>/`（persona + skills，硬隔离）+ `profiles/company.cordis.yml`（host 共享行源）+ `cordis.patch.yml`（空 bundle） | 0-1 |
| host 代码面 | `src/`（M2 委托 provider、org 工具——有了再建，见 docs/design/20 §3 / 10 §2.1） | 3+ |
| client 面 | `src/client/` + `dsh.client` 字段 + tsdown 构建（Company 驾驶舱，docs/30 §2） | 5 |

阶段 5 待办（发布前）：`@deepseek-ai/cordis` 转 peerDependencies、`dsh.compatibility` 版本矩阵、
`npm pack` → 干净 profile → `dsh plugin add` 真实安装形状冒烟（docs/10 §7）。
