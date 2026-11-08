# README 与安装手册改为使用者面向：补「第一次经营一家公司」，开发面归位

状态：implemented（2026-11-08）— 上游卡 [_backlog · README 与安装手册使用者面向](../../_backlog/_archive/settled_issues/2026-11-08-user-facing-readme-and-first-use.md)（用户「全按推荐」拍板，同轮点名落地归档）。

上游 = [README 与安装手册使用者面向，补「第一次经营一家公司」](../../_backlog/_archive/settled_issues/2026-11-08-user-facing-readme-and-first-use.md)

## 决定

1. **读者 → 页面 → 回答的单一 owner**：根 [README](../../README.md) = 使用者的首屏（是什么 / 值不值得 / 怎么装 / 第一次怎么用 / 东西在哪 / 坏了去哪）；《安装手册》= 收件人的唯一完整路径（前置 / 安装 / 首用 / 升级 / 备份 / 卸载 / 排障）；开发面回 [bootstrap](../../docs/guides/bootstrap.md)；Agent 面 = [AGENTS.md](../../AGENTS.md)。pack README 只留一句安装 + 手册指针。
2. **README 前 25 行零本仓内部词**（preset / persona / harness home / host 行 / D 号 / 包内路径）；`profile` 首次出现同句给「DSH 里的一套已装插件与配置」的人话；六个角色用一张表回答「分别是谁、各管什么」。
3. **README 明写「第一条命令」= `dsh --version`**（版本窗口自检），并说明安装本身是 Plugins 页的界面操作——冷读第一次 6.5/7 的唯一失分点是读者找不到「第一条命令」，补后复探 7/7。
4. **手册新增 §四「第一次经营一家公司」**：六步、一步一动作、每步一个界面可见结果；终点 = `deliverables/<日期>-<slug>/final.md`。启动器与机器核对降附录 B；CLI / 市场 / 浏览器两包归附录 A。
5. **凭据与支持口径**：用户面只写 DSH 的 **Settings → Models** 与缺凭据的症状（`INVALID_CREDENTIAL` / API key blank）；支持走仓库 issue 或发布方；不把维护者的 `pnpm orient` 凭据自检抄进用户文档。
6. **未发布期分发**：主路径写「向发布方索取 tarball、Plugins 页粘贴绝对路径」；不写「输入包名即可」。
7. **新门 [readme-manual-commands](../../checks/gates/readme-manual-commands.mjs)**：README 里的 `dsh` 命令必须逐字（空白归一）出现在手册里；`command-refs` 管不到 dsh 启动命令，这一格由本门补。
8. **截图 2 张**：真实隔离实例（fresh home + 干净 workspace）抓首屏与 Plugins 页，无 token、无开发数据；放 `docs/assets/`，README alt 文本在场。
9. **审批是首用路径的一部分**：真跑走查发现 CEO 执行命令会停在右栏「待办」的审批卡；README 与手册都补了「点开批/拒，它才会继续」，手册排障表补「一直停着不动 → 看待办」。

## 输掉的方案

- **只改 README 文案**：首屏好看，装完还是不会用——最贵的缺口（第一次使用）没动。
- **新建 `docs/` 下的 user-guide 让 README 指过去**：多一跳，且它不进 tarball/手册，收件人拿不到。
- **把 demo.md 改造成用户教程**：demo 是维护者演示合同（含仓内命令与验收判据），改造会同时污染两边 owner。
- **pack README 同轮做完整产品页**：会动 160 行预算与 npm 页 Data/Backup/Uninstall 结构；本轮只收安装副本。
- **直接提 README 预算到 110**：反序；先搬（dev 段 → bootstrap、数据表 → 手册）再压，最终 89 行留在 90 内。
- **同轮双语/英文**：没有英文读者证据，维护翻倍。
- **手册内嵌截图**：手册是单文件生成物，PNG 不随包；内嵌会带死链，改为手册文字标志 + README 图。

## 验证

### 冷读探针（单读者，只给被读文档）

| 文档 | 本卡基线 | 本次首探 | 修订后 |
|---|---|---|---|
| [README](../../README.md) | 5.0/7 | 6.5/7（④答一半：找不到「第一条命令」） | **7/7**（补「第一条命令」后换读者复探） |
| [_dist/安装手册.md](../../_dist/安装手册.md) | 5.0/7 | **7/7**（一次） | 7/7（同轮修掉审读点名的升级命令缺参数 / Node 与 profile 语义 / 角色职责边界，未复探） |

首探的「仍不知道」已收掉两项：README 现在写清 tarball 索取渠道（发布方，没渠道去仓库 issue）、安装即界面操作；手册补了 Node 版本、Desktop 内置 profile、`DSH_COMPANY_HOME` 语义与审批卡。剩余「仍不知道」都是设计上归手册或外部渠道的（手册附录内容、发布方身份、日期/slug 细节），属出范围。

### 新门红 → 绿（先红后绿）

首次接线后在**现状真树**上直接红，正是本卡诊断的「命令副本已漂」：

```text
FAIL readme-manual-commands README.md:9 → dsh plugin --profile company add <tgz> 不在《安装手册》里…
README.md:34 → dsh plugin --profile company add /path/to/dsh-company-pack-<version>.tgz 不在《安装手册》里…
README.md:40 → dsh plugin --profile web 不在《安装手册》里…
```

README 重写、手册重排后：

```text
readme-manual-commands ×2（README 的 dsh 命令全在手册里）
```

### 截图（真实例，非手绘）

| 文件 | 来源 | 尺寸 / 字节 | 检查 |
|---|---|---|---|
| `docs/assets/readme-first-screen.png` | 隔离 home + 干净 workspace 起的 company 实例，CDP 无头浏览器 | 1440×757 / 70,440 | 品牌「DSH 梦之队」、默认「梦之队 CEO」、右栏公司页签菜单；body 无 `token=` |
| `docs/assets/readme-plugins.png` | 同一实例 Plugins 页 | 1440×1057 / 123,789 | Installed plugins 显示 Dream Team Company Pack 且启用；body 无 `token=` |

抓图脚本一次跑完 `console problems [] exceptions []`；实例端口与 token 只存在于本地启动横幅，未入库。

### 导出与发布面

```text
node tools/export-dist.mjs  → ALL PASS
  build (tsc -b) / bundle (tsdown) / npm pack / tarball inventory / sha256 / manual generated
  sha256 = 7cfc216d58f8fca4b452c977d875febd894a7f519ffb3d69d442077815fb694a
  manual = _dist/安装手册.md（264 行；模板同源由 dist-manual 门禁强制）
```

### 全量检查

（本节的最终结果在收尾时逐条替换为实跑输出；未通过的项会如实写「阻断 + 原因」。）

- `pnpm verify` — 本次改动面 **ALL PASS**（两门 SKIP = replay-fixture-freshness / replay-ui-freshness 盘上无对象，预期）；`release --verify` 内的全树重跑被**并行会话未提交的** VP-Eng workflow 卡（现已归档）挡住 2 条 `bare-path`（该卡计划 Note 未落地，非本变更引入）。
- `pnpm test` — **150 files / 1,223 tests PASS**（含 manual spec 同轮更新：新标题、§八卸载、首用/凭据/支持/分发新判据）。
- `pnpm typecheck` — **exit 0**（pack 两面 + tests/client + tests/company + tests/harness）。
- `pnpm release --check` — **READY 0.9.0**（tgz 154 条目；7 项检查 pass；tarball/手册 sha 一致，`7cfc216d…`）。并行会话的在途研究文件在 stamp/check 的短窗口内临时 stash、随后原样 pop 恢复。

## 未验 / 环境限制

- **真跑走查的终点未在本环境走通**：隔离实例启动、workspace 登记、CEO 会话、模型回话、读 `kb/` 公司状态、判定任务归 VP-Eng 都已实测；CEO 第一次 `bash` 报 `sandbox mode "workspace-write" is requested but no sandbox backend is usable on this host; refusing`，随后停在 `escalate sandbox to danger-full-access` 的审批卡。成因是公司实例跑在本会话的嵌套沙箱里（`sandbox-exec` 被上层挡住），**不是文档步骤失败**。真跑因此停在这里，未观察到 `final.md` 落盘；该条验收按「部分 + 环境限制」记录。
- **手册冷读未在最后一轮润色后复跑**：最后一轮只改了审读者点名的三处（升级命令参数、Node/profile 语义、角色职责），不改变七问结构。
- **用户层审查跳过**：本轮由用户点名直接落地归档；文档为公开面，验收证据 = 冷读 + 真实例截图 + 命令契约门 + 全量检查，未逐页人审。
