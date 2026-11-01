---
topic: plugin-lifecycle-publish
intent: "真运行时上复现安装、in-app 安装、升级、卸载、版本门与首启，找出默认安装路径上的真实缺陷与数据残留面。"
---

# 装、起、升、卸的真运行时证据（rc.2 与 rc.5）

> 服务卡：[生命周期与发布卡](../../issues/2026-11-01-plugin-lifecycle-publish.md)。
> 性质：实验记录 + 事实归纳，不是方案。方案与取舍在卡里。
> 证据：T = 本轮真跑；C = vendor 源码/README、FAQ 文本、本仓脚本。

## 0. 环境与边界

| 项 | 值 |
|---|---|
| 机器 | macOS（本机） |
| Node / pnpm | `v22.23.1` / `11.7.0` |
| 运行时 A | vendor built CLI，`0.2.1-rc.2`（钉住的 tag） |
| 运行时 B | 日用全局 `dsh`，`0.2.1-rc.5`（本机 PATH 上的真实安装） |
| 实验 home | repo 内 `runtime/lifecycle-lab/`（gitignored），每个实验独立 `DSH_HOME` |
| 安装物 | `_dist` 里已导出的 0.6.0 tarball；以及只为实验构造的合成 tarball（不改产品源码） |
| 未覆盖 | Windows/Linux、Desktop 真机、npm 真发布、市场真托管、真模型会话 |

命令统一用 `$LAB` 指代实验根、`$H` 指代该实验的 `DSH_HOME`。所有写入都在 repo 内。

## 1. CLI 安装路径：干净 profile 真装（T）

步骤（运行时 B，rc.5）：

```sh
DSH_HOME=$H dsh --profile company --from-default-profile web --dump-default-config
DSH_HOME=$H dsh plugin --profile company add <tarball>
DSH_HOME=$H dsh --profile company --dump-config
DSH_HOME=$H DSH_COMPANY_HOME=$W dsh --profile company --port 0 --no-open
```

观察：

| 检查 | 结果 |
|---|---|
| profile 首建 | `profiles/company/{package.json,cordis.yml,cordis.patch.yml,pnpm-workspace.yaml}`；bundles = base + web-app |
| 安装 exit code | `0`；pnpm `+ dsh-company-pack`；**带一条 peer 警告**（`Issues with peer dependencies found`） |
| dependency 写入 | `"dsh-company-pack": "file:<abs>/dsh-company-pack-0.6.0.tgz"` |
| 进 roster | `dsh.profile.bundles` = `[dsh-base, dsh-web-app, dsh-company-pack]` |
| 安装副本 | `profiles/company/node_modules/dsh-company-pack` 含 `content/`、`presets/`、`lib/client.js`、`locale/`、`icon.svg` |
| dump | `company-client`、`preset-ceo`…`preset-researcher`、`agent-team`、`session-query-sqlite` 替换行都在；stderr 无 patch 报错 |
| 真启动（rc.5） | 打印 token URL；stderr 空；无 `did not activate` / `skipping profile bundle` |
| RPC（rc.5） | `agentPresets/list` 六个角色（ceo/vp-eng/vp-sales/coo/cfo/researcher）全部在场且 `broken` 为空；`session/create` 以 `ceo` 成功；HTML 模块表含 `dsh-company-pack/client.js` |

结论：**CLI + 重启这条路径在 rc.2（`release-smoke`）与 rc.5（本实验）都成立**；0.6.0 的
`engines.dsh: ">=0.2.1-rc.2 <0.3.0"` 至少在 rc.5 上不是空头承诺（host 面）。

## 2. in-app 安装路径：Plugins 页同款调用失败（T，P1 缺陷）

`pluginManager/installBundle` 是 Web Plugins 页与 `plugin_manager` 工具共用的入口；CLI 的
`dsh plugin` 走的是另一条路径。用 RPC 复现 in-app 安装（运行时 B，rc.5；干净 web profile）：

```json
{
  "inspect": { "status": "accepted", "kind": "tarball", "bundle": null },
  "install": {
    "stage": "enable",
    "target": "dsh-company-pack",
    "enabled": true,
    "changed": true,
    "application": "failed",
    "bundle": "dsh-company-pack",
    "version": "0.6.0",
    "error": {
      "code": "operation-error",
      "diagnostic": "dsh: warning: 1 entry did not activate\nsession-controller (@deepseek-ai/dsh-api-session-controller): Error: file-upload: Agent resolver is already registered"
    }
  }
}
```

要点：

- 包确实装上了（dependency 写入、roster 追加、`listBundles` 可见），但**应用阶段失败**；
  Plugin Manager 的语义是「安装成功、激活失败」——依赖与选择保留，插件不可用。
- **重启后恢复正常**：同一 profile 再 boot，stderr 空、token URL 正常，说明失败只发生在
  live recomposition，不是包本身坏。
- **rc.2 同样失败**：把同一 tarball 用 vendor built CLI 走 `installBundle`，错误相同
  （`application: failed`，同一条 `session-controller` 诊断）。所以这不是 rc.5 回归。

这正是 FAQ 37 说的「应用能开、我的功能没有」加「默认安装路径红」。CLI 安装 + 重启是绿的，
但它不是 FAQ 50/24 认定的默认路径（默认是应用内 Plugins 页）。

### 2.1 分层 bisect：触发器是 `session-query-sqlite` 的**改值**替换（T）

用同一份安装副本构造合成 bundle（只改 `dsh.bundle.patch` 与 patch 内容），逐个走 in-app 安装：

| 变体 | patch 内容 | `application` |
|---|---|---|
| 全量 bundle | 原 `cordis.patch.yml` | **failed**（同一条 session-controller 诊断） |
| 只带 preset 行 | `presets/*/agent.cordis.yml` 五份 | applied |
| 只替换 `agent-preset-registry` | `default: ceo` | applied |
| 只 insert 团队/company-client 行 | `tool-present`/`agent-team`/`tool-agent-team`/`ui-agent-team`/`company-client` | applied |
| 只替换 `session-query-sqlite`（原 `!!js` path + `openAt: first-search`） | 原样 | **failed** |
| 只替换 `session-query-sqlite`（静态 path + `openAt: first-search`） | 去掉 `!!js` | **failed** |
| 只替换 `session-query-sqlite`（config 与 base 相同：`openAt: never`） | 不改值 | applied |

三个对照说明：

1. 不是 `!!js` 表达式的问题——静态 path 同样失败。
2. 不是「任何 override 都失败」——`agent-preset-registry` 改 `default` 可以 live 应用。
3. 是「改一个被 `session-controller` 依赖的服务行的配置」触发的：live recomposition 重载该行，
   旧的 `file-upload` agent resolver 没有先注销，于是新实例注册时报
   `Agent resolver is already registered`。

vendor 自己在 base bundle 里对这条行的注释是（C）：

> deployments enabling content search override `openAt` to `first-search` or `startup` in a later
> patch layer (profile `cordis.patch.yml` or a `--patch` overlay), typically with a durable `path`.

即上游推荐的落点是 **profile patch / 启动 overlay**（启动时一次性生效），而不是「装包时 live
重载」。我们把这条 override 放进了 bundle patch，CLI + 重启没问题，但默认的 in-app 安装会红。

### 2.2 两个对照：最小 bundle 与官方隔离组（T）

| 对照 | 内容 | `application` |
|---|---|---|
| 最小 bundle | 只 insert 一个空 `apply` 的行 | applied |
| 官方 `session-search` 同款模式 | `insert` 一个 `cordis:group`，`isolate: { sessionQuery: true }`，组内挂 `@deepseek-ai/dsh-session-query-sqlite`（`openAt: first-search`） | applied |

第二行是本轮最重要的**修法证据**：不改 base 的 `session-query-sqlite`，而是 insert 一个
isolated provider 组（官方实验 bundle `@deepseek-ai/dsh-experimental-session-search` 就是这个形状，
C）。它只新增行、不触碰被依赖的既有行，所以 live 安装是绿的。

推论（不是结论，方案在卡里）：把「会话全文检索」从「替换 base 行」改成「insert 独立 provider 组」，
同时把五个 preset 里的 `tool-session-query` 行收敛到组内（否则工具仍指向未打开的 host provider）。
这会改变工具面（全局 vs per-preset），需要人拍板。

## 3. 版本门：不兼容包会被拒绝并回滚（T）

用同一份安装副本把 `engines.dsh` 改成 `>=9.0.0`、版本改成 9.9.9，走 CLI：

```text
dsh: installation rejected: Plugin dsh-company-pack@9.9.9 is incompatible with dsh 0.2.1-rc.5:
requirements {"engines.dsh":">=9.0.0"}.
dsh: restored package.json, pnpm-lock.yaml, and node_modules.
```

观察：

- rc.5 的 CLI 路径**会回滚**（package.json / lockfile / node_modules 都恢复），退出码非 0。
  这与 FAQ 24 早期写的「CLI 的 pnpm/patch 失败不保证回滚」不一致——以当前 rc.5 实测为准。
- 拒绝发生在 pnpm 跑完之后（本地 tarball 要 fetch 后才能读 manifest），不是安装前预检。
- 给出的逃生门是 exact-version exemption；我们的文档明确不推荐用它绕过，这是对的。

对我们的含义：`engines.dsh` 是唯一硬门；范围写得宽（`<0.3.0`）会把所有 0.2.x 都放进来。
目前真实验证面是 rc.2（`release-smoke`）+ rc.5（本实验 host 面），文档必须把「已验证」与
「窗口内可安装」分开写，不能把窗口当认证。

## 4. 升级：依赖会换，身份不换（T）

先装 0.6.0，再构造一个只改版本号的 0.7.0 tarball，走 CLI `add`：

| 检查 | 结果 |
|---|---|
| profile dependency | 从 0.6.0 的 `file:` 换成 0.7.0 的 `file:` |
| roster | 不变（同名的 bundle 不重复追加） |
| 安装副本版本 | 0.7.0 |
| 重启 | 正常（带 workspace 时 stderr 空） |
| `<workspace>/.dsh-company/bundle.json` | `pack.version` 仍是 **0.6.0**（创建时的身份） |
| `logs/company-pack-upgrade.log` | 只有创建那一条（`previous missing`），升级没有追加 |

推论：

- 升级在 DSH 语义里就是「换依赖 + 重启」；外部插件在 Plugins 页**没有 Update 按钮**
  （见发布面材料 §4），只能卸载再装。手册写「在 Plugins 页更新/重装新版本」是不准确的。
- `bundle.json.pack.version` 是「创建这个 run bundle 的包版本」，不是「当前包版本」。这可以是一个
  合法语义，但文档必须说清；否则用户会把它当当前版本排障。
- 升级没有迁移钩子（FAQ 50：本来就没有），v3 的「只补缺、不覆盖」策略继续适用。

## 5. 卸载：摘插件不等于删公司（T）

`dsh plugin --profile company remove dsh-company-pack` 后：

| 平面 | 结果 |
|---|---|
| profile dependency | 删除 |
| `dsh.profile.bundles` | 退回 `[dsh-base, dsh-web-app]` |
| preset 行 | 从 dump 消失（4 个 shipped preset 仍在） |
| `<workspace>/.dsh-company/` | **原样保留**（bundle.json、kb、deliverables、cultivation、logs、exports、overrides） |
| `<DSH_HOME>/company/identity/<id>.json` | 保留 |
| `<DSH_HOME>/company/methods/`（含 `.migrated`） | 保留 |
| `<DSH_HOME>/storages/company_run_bundle_ledger.json` | 保留 |
| `<DSH_HOME>/storages/workspace.json` | 保留（DSH 的 workspace 登记，不是本包专有） |

所以「彻底删除一个公司」的正确操作是：

```sh
# 插件层
dsh plugin --profile company remove dsh-company-pack
# 公司数据（确认已备份）
rm -rf <workspace>/.dsh-company
rm -rf <DSH_HOME>/company
rm -f  <DSH_HOME>/storages/company_run_bundle_ledger.json
```

而不是当前手册写的「删除整个 `DSH_HOME` + workspace」——`DSH_HOME` 里还有别的东西（会话、凭据、
workspace 登记、storages），整删会把用户的 DSH 一起删掉。这是**文档会误导用户造成数据损失**的
一类，必须在发布前改。

## 6. 首启：干净落点只补状态（T）

干净 home + 空 workspace 第一次 boot（带 `DSH_COMPANY_HOME`）：

- workspace 只出现 `.dsh-company/`（`kb/` 含 company/org/owners/motion-ledger/角色目录与 CHARTER、
  `deliverables/`、`cultivation/`、`logs/`、`exports/`、`overrides/`、`bundle.json` v3、`README.md`）；
- workspace 根没有 `AGENTS.md` / `COMPANY.md` / `templates/`（v3 内容边界成立）；
- home 出现 `company/identity/<id>.json`、`company/methods/.migrated`；
- 无 workspace 时 boot 零写，stderr 有一句「未指定 workspace」，宿主仍起（符合 v3 设计）。

与 `release-smoke` 的「二次 boot 零变更、安装副本零写入」是同一族证据；本轮只补看了 home 残留面。

## 7. 事实清单（给卡的输入）

| # | 事实 | 等级 |
|---|---|---|
| F1 | CLI 安装 + 重启：rc.2 / rc.5 都绿；六 preset、session/create、client 模块表正常 | T |
| F2 | in-app 安装：rc.2 / rc.5 都 `application: failed`（session-controller / file-upload 重复 resolver） | T |
| F3 | 触发器 = 替换 `session-query-sqlite` 且改值；同值 override、其它 override、纯 insert 都不触发 | T |
| F4 | 最小 bundle 可 live 应用；isolated `sessionQuery` 组可 live 应用 | T |
| F5 | 不兼容 `engines.dsh` 在 rc.5 CLI 上被拒绝并回滚 | T |
| F6 | 升级只换依赖与包副本；`bundle.json.pack.version` 不跟随 | T |
| F7 | 卸载保留 workspace `.dsh-company/` 与 home `company/`、`storages/company_run_bundle_ledger.json` | T |
| F8 | 首启只补状态、不在 workspace 根 seed 手册/模板 | T（本实验）+ C（v3 Note） |
| F9 | 上游把 `session-query-sqlite` 的 durable 打开方式写在「profile patch / `--patch` overlay」 | C |
| F10 | 官方 `session-search` 用 insert + isolate 的独立 provider，不改 host 行 | C |
