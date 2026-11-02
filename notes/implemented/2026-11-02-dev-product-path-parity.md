# 2026-11-02 · dev 启动器与产品安装路径对齐：默认 tarball、`--link` 快速通道、parity 门禁

状态：已交付（2026-11-02；用户点名「严格遵循流程推进落地」）

> 上游 = [dev/产品路径 parity 卡](../../_backlog/_archive/settled_issues/2026-11-02-dev-product-path-parity.md)（已结归档）。
> 借鉴 = deep-research 仓 2026-11-02 的 dev/product parity 卡（外部、只读；同形问题：dev 绿推不出用户绿）。
> 不改 = 产品入口（`dsh --profile company`）、v3 的 workspace/内容边界、五角色 persona、vendor pin。

## 决定

1. **日常 dev 通道默认产品同形安装**：`pnpm company` = `tsc -b` + `tsdown` → `npm pack` →
   `dsh plugin --profile company add file:<tgz>` → exec。`link:` 从默认降为显式 `--link`。
   理由：link 绕过 `npm pack`/`files` 过滤与安装副本 peer 解析，"dev 里看着对"推不出"用户装上对"。
2. **tarball 内容寻址**：`<name>-<version>-<sha8>.tgz`（住 `<DSH_HOME>/tmp/dev-pack/`）。内容一变 spec 就变，
   pnpm 才会真的换安装副本；同 spec 跳过 add，二启保持快。
3. **迁移显式**：已有 `link:` 依赖的 dev home 首次跑默认模式时打印一句话并切到 tarball；
   要保留快速通道就加 `--link`。不静默改、不写 profile patch。
4. **parity 有家**：新 [dev-product-parity 指南](../../docs/guides/dev-product-parity.md) 列同形机制与允许差异；
   表外差异由 `dev-product-parity` 门禁兜底（启动器默认、指南机制点、bootstrap 三处漂移、市场 staged 规则）。
5. **市场索引 staged**：`market-index.staged.json` 声明"索引版本尚未发布"；未发布期面向用户文档不出现
   `market-index.json`。发布后删标记，索引即可对外托管（仍走 publish-handoff）。
6. **dev 冒烟的完成定义跟随 dev 默认**：`preset-smoke` / `client-load-smoke` boot `company`
   （`startWeb` 新增可选 `profile`；默认仍 `web`，其它探针/冒烟行为不变）。干净 home 上旧 web 档
   会因装不到 pack 而红——那不是产品缺陷，是冒烟找错了 profile。

## 输掉的方案

- **保持 link 默认 + 只靠 release-smoke**：日常回路仍不验打包面；smoke 是发布时动作，不是每天的回路。
- **默认同时装两份（link + tarball 两个 profile）**：两套状态、两倍排障面，且"看哪个"又成口头约定。
- **dev 专用 profile `company-dev`**：与产品名不同形，需要同步所有 smoke/文档，收益只是隔离。
- **把 staged 语义塞进 index 字段**：format 1 会丢弃未定义字段；且校验器不认，等于假装。
  改用旁路 `market-index.staged.json`，门禁可机械读。

## 证据（实跑）

| 断言 | 命令/环境 | 结果 |
|---|---|---|
| 默认 tarball | 干净 dev home：`tools/company.mjs --home … --workspace company-workspace --port 0 --no-open` | `dep=file:…dsh-company-pack-0.7.0-abef80f4.tgz`；banner；六角色零 broken；`session/create` ceo；无 `did not activate` |
| `--link` 快速通道 | 干净 dev home `--link` | `dep=link:/…/packages/company-pack`；banner |
| link→tarball 迁移 | 已 link 的 home 再跑默认 | 打印迁移提示后切到 `file:` |
| 二启幂等 | 同内容再跑 | `安装副本已是最新（file:…abef80f4.tgz）`，不重复 add |
| 门禁红绿 | 六组真树植入：默认改回 link / bootstrap 三处（装进 web profile、`dev = link:`、重指 link）/ parity 指南删「允许差异」/ 包 README 写 market-index.json | 各自点名红（原话见门禁头注）；逐条还原后 `PASS dev-product-parity` |
| 全量 | `pnpm verify` / `pnpm test` / `pnpm typecheck` | ALL PASS；123 files / 1037 passed / 3 skipped；typecheck 绿 |
| 活文档指针 | `grep -rn "只 exec\|不装包\|dev = link:\|重指 link" --include=*.md .`（live docs，排除 `_archive`/CHANGELOG） | 零命中；bootstrap / README / checks 索引 / run / ui-demo 与 v3 Note 均改到现行家 |
| preset 真挂载 | 干净 home 装 company 后 `node checks/smoke/preset-smoke.mjs` | 改前 boot web：19 FAIL（roster 0 公司角色）；改 company 后 ALL PASS（6 角色 + researcher 真挂载） |
| client 真页面 | 干净 home `node checks/smoke/client-load-smoke.mjs` | 改前 boot web：品牌槽 FAIL；改 company 后 ALL PASS（零挂载失败 / 零 loader 错误） |

## 未做

- 真实 npm publish 与 index https 托管（仍按 [publish-handoff](../../docs/guides/publish-handoff.md) 由发布人执行；
  `market-index.staged.json` 保持在场）。
- Desktop 真机、Windows/Linux、并发多 workspace（原边界）。
- 其余 dev 冒烟/探针（delegation / presence / human-loop / attention / ui-scene / `probes/`）仍按
  `startWeb` 默认 boot `web`；干净 home 上要跑它们，需先让 `web` profile 有 pack 或显式
  `--profile company`。已在 parity 指南登记为调试面差异（产品形验收 = `preset-smoke`(company) +
  `company-entry-smoke` + `release-smoke`）。
- link 通道的自动重建（`--link` 下改 `presets/**` 即刻生效，改 `src/**` 仍需 tsc+tsdown——按既有纪律）。
