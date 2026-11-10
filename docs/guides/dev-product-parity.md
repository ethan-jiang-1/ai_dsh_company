# dev 与用户侧路径 parity（同机制、有界差异）

> 什么时候读：改 `pnpm company` / dev home / 观察窗启动方式，或怀疑"dev 绿能不能推出用户绿"时。
> 合同：安装/发布形态 = [release.md](../contracts/release.md)；profile 与 workspace = [profile.md](../contracts/profile.md)。
> 本页只回答一件事：**哪条机制 dev 必须和用户走同一条，哪条允许不同、为什么。**

## 一句话

`pnpm company` 默认走用户侧同形安装：`tsc + tsdown → npm pack → dsh plugin --profile company add file:<tgz>
→ exec dsh --profile company`。`--link` 是显式的快速通道（改 `presets/**` 即刻生效），不是默认。
差异只允许落在调试必需项上，并且必须在下表里；**表外新差异 = 门禁红**（`dev-product-parity`）。

## 同形机制（不接受 dev 特例）

| 机制点 | dev（默认） | 用户侧 | 证据 |
|---|---|---|---|
| 安装源 | `npm pack` 的 tarball，`plugin add file:<tgz>` | tarball / registry `name@version` | `tools/company.mjs`、`tools/lib/dev-install.mjs` |
| 安装写入者 | `dsh plugin add` 写 profile 依赖与 `dsh.profile.bundles` | 同左（应用内 Plugins 页同款操作） | 不手写 roster；`docs/contracts/profile.md` |
| profile 名 | `company` | `company` | `docs/contracts/profile.md`、smokes |
| 版本门 | 包 `engines.dsh` 在安装/启动时校验 | 同左 | `release-smoke`、`pack-engines` |
| 打包面 | `files` 过滤后的 tarball（LICENSE/content/locale/icon 都在） | 同左 | `npm pack` + `export-dist` 清单 |
| profile 用户层 | 用户侧不写；dev 也不写 | 不写 | `dev-product-parity` 门禁 + `company-entry-smoke` |
| 首启零写 | 无 workspace 时不写公司状态 | 同左 | `isolation-matrix-smoke` |

## 允许差异（登记，不消除）

| 差异 | dev | 用户侧 | 为什么允许 |
|---|---|---|---|
| runtime | vendor 源码构建（`pnpm dsh` / vendor CLI） | npm 全局 `@deepseek-ai/dsh` | 开发要跑未发布代码；发行版由 npm 管 |
| workspace | `company-workspace/` | 用户自己的项目目录 | 演练盘与真盘分离（`runtime/README.md`） |
| 构建缓存 | 源/vendor pin/lockfile 未变时复用上次 tarball（跳过 tsc/tsdown/pack） | 用户装已发布 tarball，本来就不重建 | 同一 tarball 形状；`--rebuild` 强制重打；缓存只在安装前，DSH boot 次序不变（[runtime-map §一](../runtime-map.md#一完整-web-链时序)） |
| 凭据 | dev home 的 `.credentials.yaml` | 用户 home / 环境变量 | 按 home 隔离；不共享 |
| 浏览器两包 | dev 显式 `DSH_COMPANY_BROWSER=on` | 装了才开；`on/off` 强制 | 源码树可解析、npm 发行版不含两包 |
| probe / 日志 | 调试工具可自选 profile（多数 `probes/` 仍 boot `web`）；`preset-smoke` / `client-load-smoke` 固定 `company` | 用户无 | 调试必需，不承担用户侧验收；用户侧验收走 `company` 档 |
| 账户观察窗 | 3080 是日用 `~/.dsh` 的 `web` profile | 用户的 `company` profile | 日用 GUI 不承担验收；验收走 dev home 的 `company` |

## 怎么验

```sh
source run/env.sh
pnpm company --no-open            # 默认：pack + file: 安装 + 启动
pnpm company --link --no-open     # 快速通道（改 presets 即刻生效）
node checks/smoke/preset-smoke.mjs    # 真挂载（boot dev 默认 company profile）
node checks/smoke/release-smoke.mjs   # 用户侧认证档（tarball + 应用内安装）
pnpm verify                       # 含 dev-product-parity 门禁
```

## 回退与边界

- 回退到 link：`pnpm company --link`（显式）；不需要改任何 profile 文件。
- 不引入第二套 launcher：仍是 `exec dsh --profile company`；包装只多做 pack + add。
- 真实 npm publish 与市场托管不在本页：见 [publish-handoff](./publish-handoff.md)。
- 市场索引未发布前以 `market-index.staged.json` 标记；面向用户文档不引导加源，发布后删标记。
