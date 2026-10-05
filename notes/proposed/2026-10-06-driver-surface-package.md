# 2026-10-06 · 驾驭者表面包：目录显性化 + 运行态观测 + 导航减密

状态：proposed（批准：2026-10-06 用户驾驭轮「三个工作面一起立项」，同轮追加两条痛点——AGENTS.md 太密、docs 体系难读；条目实施次序待用户逐条给，D32）

## 问题（驾驭轮诊断）

用户是本项目的驾驭者，当前唯一验证手段是端到端（拉起整个公司 Web 会话）——最贵的验收仪器被当成日常观测仪器。七条痛点（2026-10-06 对话对齐）：

| # | 痛点 | 现状核查 |
|---|---|---|
| P1 | 运行态/测试/调试/交互分目录，别有超大混合子目录 | `dev/` 盘面 9000+ 文件混四种性质：3 个 tracked 启动配置 + `harness-home/`（1926 文件会话态）、`pw-browsers/`（6911）、`rehearsal-workspace/`（214）三种 gitignored 运行残留。分类只活在 dev/README 里，`ls` 一眼不自述 |
| P2 | 运行态入口与逻辑链看不见 | 链跨五处（根 package.json `dsh` → vendor CLI → `$DSH_HOME` profiles → company-pack bundle → session cwd），盘上无锚点。[runtime-map](../../docs/runtime-map.md)（10-05）已是第二次文档修补，仍不解决——纯文档修补已证伪一次 |
| P3 | 缺驾驭者可读的辅助说明 | 无白话单页；AGENTS.md 94 行但每行密度极高（表格 + 括号链 + D 号） |
| P4 | 测试资产组织怎么看 | 组织本身强（tests 四域 + scripts 分区 + snapshots 规则 + testing.md 宪法），但**一问四家**——单一入口缺 |
| P5 | agent loop / skills / 运行态 / run bundle 要显性化 | skills 已显性（`presets/<role>/skills/`）；运行态位置不可见（同 P1）；run bundle 只是逻辑合同无视图；**loop 本体属 vendor（只读）**这一边界未向驾驭者说清 |
| P6 | AGENTS.md 太密 | 94 行 ≈ 11.5KB；coding agent 读完入口链仍需再读三四份才能干活 |
| P7 | docs 体系难读 | 合同体写作：密集交叉引用、D 号、防漂措辞；读一份跳四五份 |

连续性：[职责分区轮](../implemented/2026-10-05-repository-responsibility-layout.md)已收 scripts/tests/snapshots；本包是同一长期整理令的下一轮，收剩余的 dev/ 树、观测面与导航面。

## 方案（五条目）

### 条目 A：拆 dev/——启动配置与运行残留分离（目录面）

- `dev/` 只留 tracked 启动配置：`env.sh`、`company.overlay.yml`、`entry-probe.patch.yml`、README（回答「怎么启动」）。
- 新顶层 `runtime/`（非隐藏，显性）收运行残留 + README（回答「跑过留下了什么、各自生命周期」）：
  `runtime/harness-home/`、`runtime/harness-home-b/`、`runtime/pw-browsers/`、`runtime/rehearsal-workspace/`。
- 改动面盘点（实施第一步，参照 10-05 迁移轮做法）：`dev/env.sh` 的 DSH_HOME 与 PLAYWRIGHT_BROWSERS_PATH、`.gitignore` 前缀、`scripts/run-gates.mjs` 的 RUNTIME_PREFIXES 与 README 索引行（dev 树 → runtime 树）、根 AGENTS.md 布局段、project-map / runtime-map / dev-loop 等全部路径引用。
- 数据迁移：tracked README 用 `git mv`；gitignored 运行数据用 `mv`（无历史包袱），sessions 与 credentials 零丢失。四条状态轴的家仍是 runtime-map.md，只改指针。

### 条目 B：`pnpm orient`——keyless 运行态观测命令（观测面）

- `scripts/tools` 下新增 orient 脚本（keyless、只读、无副作用）+ 根 package.json `scripts.orient`。打印：
  ①生效 DSH_HOME（含「未 source env.sh = 日用 home」警告——`requireDevHome` 同款判定）；
  ②在场 profiles；③最近 N 个会话（slug / 时间 / preset）；④company-workspace 概览（git 改动数 + 最近交付物）；⑤当前可跑的便宜检查清单。
- `--scenario <名>`：按 [snapshots/README「Run bundle 引用合同」](../../snapshots/README.md)**计算**该场景 run bundle 视图——引用不复制、不新增 tracked manifest（10-05 runtime-runbundle 的防第二权威决定不破，以视图方式显性化）。
- 运行态路径一律经共享 seam 解析（不散落硬编码），随条目 A 后的新路径走。

### 条目 C：驾驭者单页（导航面，docs/ 下新增 orient.md）

- 白话五问，每问 ≤1 跳到唯一家：这仓库是什么 / 怎么跑起来 / 改东西从哪进 / 测试资产在哪 / 运行态·loop·skills·run bundle 在哪（第五问须明说 loop 本体在 vendor、本仓只拥有输入与输出）。正文无 D 号、无合同措辞；只导航与白话定义，**不新增事实**（防漂硬规矩）。
- scripts/README 首屏补「验证 / 调试 / 工具」三标签行（P1 的 scripts 残余问题在此收口，不再动目录）。
- 根 README 首屏加一行指针；新单页入 DOC_LINE_BUDGETS（≤80 行）。

### 条目 D：AGENTS.md 减密

- 结构改纯路由：你是谁 → 布局一览（压缩）→ 命令表 → 纪律指针表（只留指针，说明性括号链删——事实已在链接目标家）→ vendor 铁律 → 簿记。密钥 / 三实体等已有家的细节段压成一行指针。
- 行数棘轮 105 → 84（目标），`scripts/run-gates.mjs` 同 diff 改并反证；CLAUDE.md symlink 与 verify 门禁不破。

### 条目 E：docs 可读层

- 原则：合同语义不动、一处事实一个家不动。给顶层合同统一「首屏白话段」（≤4 行：这份管什么 / 什么时候读 / 一句话路线）；docs/index.md 主题行改「主题 → 一句话人话 → 入口」。
- 可读层只做导航与白话定义，不新增事实；与 D26 一致——删重复优先于加转写层。

## 非目标

- 不动 vendor/dsh；不改证据政策；run bundle 不落盘 tracked manifest。
- 不动 notes/_backlog 制度（用户本轮未点名；点名另立 RFC）。
- 不做 scripts/ 再分桶（10-05 已按职责完成；剩余是标签问题，并入条目 C）。
- 不改 company-workspace/AGENTS.md（那是角色运行时输入，不是本仓导航面）。

## 输掉的方案（留尸）

- **再写一份更全的运行链文档修 P2**：runtime-map（10-05）已证伪——文档越全越密，驾驭者越读不进；下一个杠杆必须是目录与命令。
- **改写根 README 当驾驭者单页**：README 同时服务 GitHub 首访者与驾驭者，两受众一身互相挤；分家 docs/orient.md。
- **run bundle 落盘成独立 manifest**：违反「引用不复制」，制造第二权威；改由 orient 按需计算视图。
- **AGENTS.md 砍成极简**：coding agent 的纪律与 vendor 边界必须常驻注入面；减密是删复述与括号链，不是删纪律。
- **docs 全量白话重写**：漂移面失控；只加首屏白话段 + index 白话化。
- **dev/ 运行残留留原处、只加 README**：dev/README 已存在且已分类，用户仍看不清——分类写在文档里不等于目录自述。
- **运行残留用隐藏目录（`.state/`）**：隐藏即不可见，违背「显性化」的立项目的。

## 验收（先行点名怎么测；每条目独立红绿）

- **A**：①门禁先红——run-gates/repository-layout 期望新布局（RUNTIME_PREFIXES、README 索引位置）改后实跑见红；②迁移后 `pnpm verify` + `pnpm test` 全绿；③数据零丢失走查——迁移前后 sessions 目录计数一致、credentials 文件仍在；④`source dev/env.sh` 后 `pnpm dsh --profile headless "hi"` 冒烟（需 DEEPSEEK_API_KEY，标注条件）。
- **B**：①先写 orient 的 keyless spec（tests/harness 下，断言输出含 DSH_HOME 行 / 日用 home 警告 / profiles / 会话清单 / workspace 概览；`--scenario` 输出合同字段）实跑见红；②实现后同 spec 绿；③脚本头注自述 + scripts/README 索引行（script-triggers 门禁）；④人工走查：未 source env.sh 时 orient 明确警告且不误报。
- **C**：①走查判据——五问从新单页出发各 ≤1 跳到达唯一家（走查记录进毕业 Note）；②DOC_LINE_BUDGETS 加条目（cap 80）+ 初稿超限实跑见红、收敛后绿；③md-links 门禁绿。
- **D**：①棘轮 105→84 先改实跑见红（现 94 行 > 84）、减密后绿；②verify/test 绿；③走查——coding agent 从减密后 AGENTS.md ≤2 跳找到原全部入口（对照现布局表逐项走查）。
- **E**：①走查——按 docs/index.md 主题行到达正确 owner 且一句话可懂；②md-links 绿；③各文件行预算不升。

每条目同 diff 更新对应合同与毕业 Note（收尾动作 = dev-loop §12）。建议默认序 A → B → C → D → E（先定形目录，观测引用新形，导航收口三线）；实际次序由用户逐条给。
