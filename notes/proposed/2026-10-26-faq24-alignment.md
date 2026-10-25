# RFC：faq24-alignment（发布形态、数据平面与发布内化）

状态：已批准（批准：用户 2026-10-26；goal 授权按 2026-10-26 对齐计划自主推进）

## 问题

对照外部研究 `_faq_on_digested/24_plugin-publish-and-agent-data-planes`（DSH rc.3 基线），我们的发布形态与数据平面总体对齐，但有四处要修正：
① preset 定义层携带公司数据（梦之队/高科技/三类业务/50 人），不同公司必须改包源码；
② 包 README 缺 Data / Compatibility / Uninstall，locale/icon 缺失；
③ `dsh.compatibility` 是 DSH 不读的旧字段，却仍被本地门禁当契约；
④ 发布仍依赖口耳相传的步骤，没有一条可执行 runbook / manifest。

## 决定

1. **`dsh.compatibility` 退役**：从 package manifest 移除；已验证 tag 迁到仓库内 `checks/gates/lib/compat-tags.json`，`pack-compat` / `sync-dsh` / release-smoke 改为读这份本地台账。运行时硬门只保留 `engines.dsh`（FAQ 06 §9.2）。
2. **公司盘根保持 bundle workspace**：`<DSH_HOME>/company-workspace`（或 `DSH_COMPANY_HOME`）是产品定义的部署根；catalog 以它为准，session cwd 不同则显示“非公司盘/未配置”，不静默读错盘。此项写进 README Data。
3. **catalog 的 node:fs 是显式例外**：bootstrap/catalog 是部署 provisioning 与 UI 派生索引，不是模型文件访问；模型文件访问仍走 `ctx.fs`。README Data 写明；若未来要进 model 可见面，另立 RFC 迁 `ctx.fs`。
4. **preset 文件名保留 `agent.cordis.yml`**：它由 `dsh.bundle.patch` 显式引用，不是旧 `.agent-presets/` 目录扫描；改名到 `preset.patch.yml` 只影响可读性、会牵动大量历史指针，本轮不做，README 说明。
5. **locale/icon 补上**：`locale/en.json`、`zh.json` 与原创 `icon.svg`，`exports`/`files` 同步；Config 本轮不引入（只有一个可选 `cultivationRoot`，引入 schemastery peer 会扩大依赖面，记录为显式例外）。
6. **发布知识内化**：`docs/release.md` 收敛为合同；新增发布 runbook、`CHANGELOG.md`、release 入口脚本、`_dist/release-manifest.json`、`release-ready` 门禁与 `pnpm release` 脚本（文件在后续阶段落树时再写具体路径）。
7. **FAQ 24 登记**：`docs/external-research.md` 增加一行，指向该目录与吸收落点。

## 验收

- 6 个 preset 的 persona 不再出现 `梦之队`（作为公司事实时）/`高科技`/`三类业务`/`50 人`；改为引用 `kb/company.md`/`kb/org.md`。keyless 断言在 `tests/presets`。
- README 有 Install / What it contributes / Configuration / Data / Compatibility / Uninstall 六节；Data 节写明 D/C/W/U/S/H/X 边界。
- `locale/en.json`、`locale/zh.json`、`icon.svg` 进 `files` 与 tarball；`export-dist` 清单断言在场。
- package manifest 无 `dsh.compatibility`；`pack-compat` 读 `checks/gates/lib/compat-tags.json`；`sync-dsh` 检查模式通过。
- `pnpm release --check` 只读通过；`--prepare` 产出 tgz/manual/sha/manifest；`--verify` 跑完全套 keyless smoke。发布 runbook 能按步复现。
- 0.3.4 产物重导，`pnpm verify` / `pnpm test` / release/lifecycle/standalone/client-load 全绿；Note 与 commit/push 完成。

## 输掉的方案

- 把公司事实留 preset、让用户改包源码：违反 D 平面，且每次部署都要发版。
- 把 `dsh.compatibility` 当运行时门：DSH 不读，第三方会误判。
- 为 catalog 引入 `ctx.fs` 异步重构：本轮风险大于收益；先记录例外，model 面另立。
- 把 `agent.cordis.yml` 全仓改名：机制已对，历史指针成本高。

## 范围 / 排除

- 范围：preset 内容、README、locale/icon、compat 台账迁移、release runbook/脚本/manifest、测试补强。
- 排除：npm publish、market、预构建离线、Windows、真容器、完整 `deliverables-check` 平移；不改 `vendor/dsh`。

## 实施顺序

1. P0：本 RFC + FAQ 登记 + 决定落卡。
2. P1：preset 去公司数据 + keyless 断言 + README 六节 + locale/icon。
3. P2：compat 迁移、数据/发布门禁、测试补强。
4. P3：release runbook / changelog / release.mjs / manifest / gate。
5. P4：0.3.4 发布验收。
