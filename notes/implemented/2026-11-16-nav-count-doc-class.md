状态：implemented（2026-11-16；触发 = 用户点名「接手成本评估」remediation，目标全绿；非 _backlog 卡毕业）

# 导航面计数门扩「文档篇数」类 + clean-clone 首跑序列单家锚点

> 教义上游 = [增长型清单退出导航文档（D28）](../archived/2026-10-12-navigation-enumeration-retirement.md)（归档冻结，不回写；本 Note 单侧承载指针）。
> 该归档 Note 的「输掉的方案」早已否决「把数字更新到现状」，并预判「第三次复发时的窄门候选」——本轮是同教义窄门的再落地（篇数类；D28 预判的 tests/README 四区表窄门已于 2026-10-12 落为 nav-enumeration）：
> 页签计数门 [nav-count-claims](../../checks/gates/nav-count-claims.mjs) 原只查「N 个页签」，漏了同教义的**文档篇数库存计数**，
> 于是 [repo-handoff §4](../../docs/guides/repo-handoff.md) 写死的 `notes/（332 篇）_backlog/（597 篇）` 活过了评估（实测 335/506，当天即过期）。

## 决定

1. **扩既有门，不新建门**：在 [nav-count-claims](../../checks/gates/nav-count-claims.mjs) 内增 `DOC_COUNT_PHRASE` 一类，与页签计数同门同扫描面（docs/** + content/** + AGENTS/README/包 README）。守住 gates/ 总量只降不升棘轮（先并后加）。
2. **detector 锚在结构签名，不是弱计数**：命中 ① 括号裸篇数注解「（N 篇）」（篇紧邻闭括号）② 库存目录 `notes/`/`_backlog/` 相邻的阿拉伯篇数。豁免汉字数词（四篇/八篇/两篇）、操作叙述（本篇/长篇/一篇）、历史叙事（「（46 篇 journal 已于…）」篇后有散文）——勘界实测导航面 13 处合法「篇」用法零误伤。
3. **事实家改现算公式**：[repo-handoff §4](../../docs/guides/repo-handoff.md) 删两个死数，改「清单=目录本身（体量现算 `find notes -name '*.md' | wc -l` / `find _backlog -name '*.md' | wc -l`）」。家 = 命令，不是数字。
4. **clean-clone 首跑序列单家锚点并入既有 owner**：[navigation-assets.spec](../../tests/repo/docs/navigation-assets.spec.ts) 增「首跑序列单家锚点」describe——`INIT`/`ACCEPTANCE` 常量做漂移守卫锚点（散文家 = bootstrap，行为家 = [setup.mjs](../../tools/dev/setup.mjs)），断言 handoff §1 与 bootstrap 共享 init 前缀同序、handoff 含完整验收尾。不新建 spec 文件（免 surface-coverage/naming 新件摩擦）。
5. **运行面全绿重钉**：`pnpm setup` 重建 lib 随 HEAD src → `release --prepare --force` 同版重生 _dist（新 sha）→ company profile 从 0.11.6 升装当前 0.11.8 → `release --verify` 七项真冒烟全 pass。**staged 预发布，不 npm publish**（publish/版本 bump 是用户决定）。

## 输掉的方案

- **把 332/597 更新到 335/506**：归档教义 Note 已否决「把数字更新到现状」——一轮内正确、下一轮必再漂（本仓 BUG-192..201 收口当天篇数又变）。否。
- **blanket `/[0-9一二三四五六七八九十]+篇/` 正则**：勘界实测会误伤 navigation 面 13 处合法用法（architecture 四篇 Note / budget-and-ops 本篇·长篇 / demo-scenes 一篇·历史 46 篇 / external-research 八篇·两篇）。弱计数条件违反 gate-change-definition「锚结构不锚弱计数」。否。
- **新建独立 gate 文件**：gates/ 总量棘轮 + 先并后加；nav-count-claims 已是「导航面计数声明」唯一 owner，扩它而非造第二门。否。
- **Top3 新建 first-run-sequence.spec.ts**：新 tracked 文件触 surface-coverage/naming 申报摩擦；navigation-assets.spec 已是导航骨架守卫 owner，并入即可。否。
- **release --bump 0.11.9**：本轮授权 = 「全绿 at HEAD」非「发新版」；同版 `--prepare --force` 重生 + staged 预发布即满足，bump/publish 留给用户裁决。否（范围外）。

## 状态事实与载体

- **事实**：导航面不得写增长型库存的篇数计数（D28 投影）；clean-clone 首跑序列两家（handoff/bootstrap）不得分叉。
- **唯一入口**：计数声明门 = [nav-count-claims.mjs](../../checks/gates/nav-count-claims.mjs)；序列锚点 = [navigation-assets.spec.ts](../../tests/repo/docs/navigation-assets.spec.ts)。
- **读载体**：`pnpm verify`（nav-count-claims）；`pnpm test`（navigation-assets）；`pnpm test:checks`（[gates-negative](../../tests/checks/gates-negative.test.mjs) conformance）。
- **写载体**：门内 `DOC_COUNT_PHRASE` 正则；spec 内 `INIT`/`ACCEPTANCE` 常量。

## 未覆盖轴

- [covered] 篇数门红→绿两方向（病灶红 + 豁免绿）→ `tests/checks/gates-negative.test.mjs`
- [covered] 序列锚点漂移（改坏真实命令即红）→ `tests/repo/docs/navigation-assets.spec.ts`
- [policy] 历史叙事/有界引用/汉字数词豁免边界 → `checks/gates/nav-count-claims.mjs`
- [environment-gap] Linux 全量构建缺口（CI 全量仅 macOS runner）→ `.github/workflows/fresh-clone.yml`
- [unprovable] 真模型行为质量（keyless 真挂载/真页面不证模型配合）→ `docs/testing.md`
- [policy] publish / 版本 bump 属用户裁决（本轮 staged 预发布）→ `market-index.staged.json`

## 验证

| 层 | 失败类（[词表](../../tests/failure-classes.md)） | 负控（见过红） |
|---|---|---|
| 静态门 nav-count-claims | #12 文档/生成物/指针 | 真实病灶 handoff:66 → `FAIL nav-count-claims: docs/guides/repo-handoff.md:66 → 文档篇数计数声明「notes/`（332 篇」…`；删死数改公式 → `OK nav-count-claims ×119` |
| gates-negative conformance | #12 | 临时夹具「（332 篇）（597 篇）」→ `FAIL … 文档篇数计数声明`；豁免形（本篇/一篇/四篇/历史 46 篇）→ `OK ×80`；`gates-negative-smoke: ALL PASS`；`pnpm test:checks` 10 PASS / 0 FAIL |
| navigation-assets 序列锚点 | #12 | 改坏 handoff `pnpm bundle:init`→`pnpm bundle-init` → `AssertionError: 缺命令或乱序：pnpm bundle:init: expected -1 to be greater than 600`（1 failed）；还原 → 10 passed |
| 真挂载 preset-smoke | #10 配置/profile/组合 | `release --verify` 内：11/11 roster + 11/11 session/create 真挂 + 并发不串 + session-search 隔离 + skills 隔离 + client 闭包 70 模块 0 缺 → ALL PASS（修前评估 U2：stamp 5c2c0796 后 5 src 文件未重验） |
| 真页面 client-load-smoke | #9 client UI/浏览器 | 真浏览器零挂载失败 + 零 loader 错 + 品牌槽在场 → ALL PASS |
| 真装 release-smoke / company-entry | #10 / #8 子进程/独立 home | 干净 profile 真 tarball 装 + boot；干净 home 双 workspace bundle.json v3 → ALL PASS |
| 结构/回归全量 | #12 / #1 | `pnpm verify` ALL PASS（2 门无对象 SKIP）；`pnpm test` pass；`release --verify` 七项 checks 全 pass |

运行态观察（非材料，不立卡）：preset-smoke 一条 WARN「非本包模块 inject 引用未知包名：`@deepseek-ai/dsh-client-ui-attachment` → `@deepseek-ai/dsh-client-ui-trajectory`」——上游 ui-attachment 的 inject 指向本包按产品决定 disabled 的 ui-trajectory 行；非本包配置、非失败，preset-smoke 仍 ALL PASS。留作上游升 pin 时核对。

## 审查（P5 盲审）

门禁增改 → 无历史上下文只读独立子代理盲审（2026-11-16；输入 = 当前 git diff + P5 四判据）。结论 **blocker=0，可归档**。独立复核：正则电池 8/8 病灶命中 + 8/8 豁免不命中、ordered() 5 组 mutation 模拟全抓红、tarball sha256 三方一致（独立计算 = manifest = 手册 `3b5b6d2b`）、sourceFingerprint 独立重算 MATCH、未覆盖轴锚点 test -e 全 EXISTS、终态 verify ALL PASS 独立复跑。

7 条建议处置：**S1**（分支②独立红夹具）/ **S2**（豁免夹具补长篇·八篇·两篇）/ **S3**（词界防 `keynotes/3 篇` 误命中 + 容篇后空格 + 登记边界）/ **S6**（措辞改「同教义窄门再落地」）本笔采纳；**S4**（ordered 全文首现序边界）登记注释代替块提取（现行为有效且保守，免重驱红）；**S5**（AGENTS 迷你摘要无守卫）按唯一家教义可接受跳过；**S7**（证据时序微差，pack 指纹同一故有效）提交后复跑 verify 收尾。
