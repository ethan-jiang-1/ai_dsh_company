# 2026-11-01 · 插件生命周期与发布：默认安装路径修复、npm 身份与市场 handoff

状态：已交付（2026-11-02；P0–P5 落地，0.7.0 发布字节与验收证据在下方）

> 上游：[插件生命周期与发布卡](../../_backlog/_archive/settled_issues/2026-11-01-plugin-lifecycle-publish.md)（已结，发布就绪 + handoff）、
> 研究题 [plugin-lifecycle-publish](../../_backlog/_archive/research/plugin-lifecycle-publish/README.md)
> （装/起/升/卸实验 + 发布面事实）。
> 用户授权（2026-11-01）：「静默自主执行，遇到障碍自行克服，直到所有issues 可以落地后验证，需要证据支持我们的落地」；
> 前一轮同类授权：「需要我review的, 授权给你 记得 做对最重要, 不需要兼容考虑, 安装需要尊重dsh」。
> 据此 D1–D6 由 agent 代行 review：D1=A（isolated 组）、D2=保留包名、D3=MIT、D4=npm+自托管 index、
> D5=0.7.0、D6=真实 npm publish 人工 handoff。
> 取代：无（v3 的入口/workspace/内容边界不变）。不改：vendor pin、五角色 persona 语义、方法层/账本归 home。

## 决定

1. **默认安装路径必须绿，CLI 绿不算。** 应用内安装（`pluginManager/installBundle`）会在运行中的组合上
   live 应用 patch；用 bundle patch **改值替换** `session-query-sqlite` 会重载被 `session-controller`
   依赖的服务行，rc.2/rc.5 实测都报 `file-upload: Agent resolver is already registered`，
   `application: failed`。改为官方 `session-search` 同款 **insert + isolate** 组：
   `company-session-search`（`isolate: { sessionQuery: true }`）内放 `company-session-query-sqlite`
   （durable path，`openAt: first-search`）与 `company-tool-session-query`；六个 preset 的
   `tool-session-query` 行全部收敛到组内。
2. **代价显式化。** 隔离组只服务组内消费者：DSH 侧栏 `session/search` 保持出厂 `openAt: never`
   （有会话时搜索报禁用），durable 索引只给角色 `session_search` 工具；不再声称侧栏搜索是本包能力。
3. **发布身份从“内部交付”切到“可 npm 发布”。** `license: MIT` + `LICENSE`、`author`/`homepage`/
   `bugs`/`keywords`/`publishConfig.access: public`；`private` 移除（真实 publish 不再被 `EPRIVATE` 拒）。
   `pack-engines` 门禁改为发布姿态（缺身份即红），`pack-files` 要求 `LICENSE` 进 tarball。
4. **包名保留 `dsh-company-pack`。** npm 上可用、市场 format 1 校验通过；改名会破坏行 name/用户配置，
   首次发布前不做无收益改名。
5. **默认路径看门狗进认证档。** `release-smoke` 增加 ④c：干净 web profile 上真调
   `pluginManager/inspect` + `installBundle`，断言 `application: applied` 并进 roster；
   `preset-smoke` 用 `pluginInventory/list` 断言组内 provider/tool `active` 且全组合只有一条 tool 行。

## 输掉的方案

- **继续替换 base 行 + 文档让人重启**：默认路径仍红；FAQ 37 的“装成功”不成立。
- **禁 base 行 + 插入 root realm 新 provider**：rc.2/rc.5 实测同样 live 失败（`file-upload` 重复 resolver）。
- **root realm 双 provider**：`service "sessionQuery" has been registered`，启动即报错。
- **首启写 profile patch 打开 durable 索引**：保住侧栏搜索，但产品重新成为 profile 写者（违背 v3 D4），
  且要重启；作为备选未采用。
- **rename scoped + 同步改行 id**：改动面大、首次发布前无收益；保留原名。

## 证据（实跑）

| 断言 | 命令/环境 | 结果 |
|---|---|---|
| 修复前 in-app 安装失败 | rc.2 + rc.5，`pluginManager/installBundle` | `application: failed`，`session-controller … file-upload: Agent resolver is already registered` |
| bisect 触发器 | 合成 bundle 逐行 | 只有 `session-query-sqlite` 改值替换失败；同值/其它 override/纯 insert 都 applied |
| 修复后 in-app 安装 | rc.2 + rc.5，干净 web profile | `application: applied`；六 preset 零 broken；`session/create` ceo；client 模块表在场 |
| 组内行挂载 | rc.2/rc.5 `pluginInventory/list` | `company-session-query-sqlite` / `company-tool-session-query` 均 `active`；tool 行唯一 |
| 认证档 | `node checks/smoke/release-smoke.mjs` | ALL PASS（含新增 ④c 应用内安装） |
| preset 冒烟 | `source run/env.sh && node checks/smoke/preset-smoke.mjs` | ALL PASS（六角色 + 组挂载） |
| keyless 回归 | `pnpm test` | 121 files / 1025 passed / 3 skipped |
| 结构门禁 | `pnpm verify` | ALL PASS |
| npm 身份 | `npm publish --dry-run` + `npm pack --json` | 127 files；LICENSE/README 在场；无 `bin/`；public access；无 EPRIVATE（dry-run） |

## 发布字节与验收（0.7.0）

| 项 | 值 |
|---|---|
| 版本 | `0.7.0`（tarball `_dist/dsh-company-pack-0.7.0.tgz`） |
| sha256 | `13d01509ff02e79286a85aa50e808285558290cf015488c1576bd4426fa679f6` |
| 手册 | `_dist/安装手册.md`（生成；MIT/精确卸载面/市场开关） |
| manifest | `_dist/release-manifest.json`（`pnpm release --verify` 全绿后写） |
| market index | `market-index.json`（仓库根，tracked；图标内联）；`node tools/market-index.mjs --check` → `dsh-company-pack@0.7.0`，DSH 校验器通过 |

认证档（实跑）：`pnpm release --verify` 全绿（verify / test 1027 passed / release-smoke /
client-load-smoke / preset-smoke / present-catalog-smoke）；`interrupted-install-smoke` ALL PASS
（remove 后 run bundle / home 身份 / presented ledger 残留）；`upgrade-while-running-smoke` ALL PASS
（运行中 remove+add 0.7.1；重启后身份保留创建版本 0.7.0、依赖到 0.7.1、旧 session 仍在）；
rc.5 干净 profile 应用内安装 `application: applied` + 六 preset + `session/create`。

## 真模型会话检索（2026-11-02，T）

隔离组不只「行 active」——真模型下也工作：

- 会话 A（`session-5e83a253-a099-4371-9191-ad76c034d9d6`）：让模型记住 `ZEBRA-987`；
- 会话 B（`session-be04d9b7-e0cb-4f4a-97df-b2d00781dcc7`）：让模型用 `session_search` 查该码；
- 结果：模型返回会话 A 的 id 与原文片段；会话日志有 5 次 `session_search` 工具调用；
  `<DSH_HOME>/cache/company/session-search-web.db` 首次搜索后落盘（约 220MB）。
- 说明：host 侧栏 `session/search` 仍保持出厂 `openAt: never`，不在此承诺内。

v3 卡 0.7.0 复核结论：两卡不冲突（D53 只换检索实现、D54 只换发布姿态；v3 边界未改）。

## 按包名安装的本地演练（2026-11-02，T）

本机没有 npm 凭据，公有 publish 不可代做；为了把「npm 身份 → 按名安装」链路也验掉，用 repo 内极简
只读 registry（`_dist` tarball + manifest）做了一次发布演练：

- `node runtime/lifecycle-lab/mini-registry.mjs` 服务 `dsh-company-pack@0.7.0`；
- 干净 web profile：`dsh plugin --profile local add dsh-company-pack --registry http://127.0.0.1:4874`
  → dependency `^0.7.0`、roster 含包；
- boot + RPC：六角色零 broken、`session/create` ceo、stderr 空。

证明：包名/版本/依赖解析/按名安装是通的；**不证明**公有 registry 的账号、命名占用与签名。
公有 publish + index https 托管仍按 handoff 由发布人执行。

## 未做

- 真实 `npm publish`（需 npm 凭据；D6 人工 handoff）与 market index 的 https 托管（步骤 = [publish-handoff](../../docs/guides/publish-handoff.md)）。
- 真模型会话里的 `session_search` 调用（keyless 冒烟只证 provider/tool active + 索引路径配置；
  首次 agent 搜索才懒开索引）。
- Windows/Linux、Desktop 真机、容器。
