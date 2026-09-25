# dsh-company-pack

唯一自写包（决策 D1：一个包；行多包少）。三个面按垂直轮长出：

| 面 | 内容 | 轮次 |
|---|---|---|
| 配置面（现在） | `presets/<role>/`（persona + skills，硬隔离）+ bundle 行（`cordis.patch.yml`：`agent-preset-registry` 替换出厂行；`dsh.bundle.patch` 为**数组** = registry 1 + 五角色预设行）+ `package.json` 的 peerDependencies（21 个，钉 `^0.1.7-rc.2`；cordis `^4.0.2`） | R0–R2 |
| host 代码面 | `src/`（M2 委托 provider、org 工具——有了再建，见 docs/design/roles-isolation §3 / architecture §2.1） | R3+ |
| client 面 | `src/client/` + `dsh.client` 字段 + tsdown 构建（公司驾驶舱，docs/design/ui-demo §2） | R5 |

发布前清单已全部落地（2026-09-25 随升 pin ①）：cordis 在 peerDependencies、`dsh.compatibility`
版本矩阵（0.1.5-rc.2 / 0.1.7-rc.2）、`npm pack` → 干净 profile → `dsh plugin add` 真实安装冒烟 =
release-smoke ALL PASS（[docs/release.md](../../docs/release.md)）。pack 保持 `private: true`——
真实 npm 发布等第二个消费者出现再定（registry 三态等前瞻 =
[harness-alignment 台账](../../notes/research/2026-09-25-harness-alignment-ledger.md) §五）。
