# 2026-10-06 · 驾驭者表面包：目录显性化 + 运行态观测 + 导航减密

状态：implemented（五条目全部毕业：A `5aeb2ab` / B `1119111` / C `15a3e12` / D `05aeff6` / E `8f35ab2`；授权链 = 用户 2026-10-06 驾驭轮七点诊断 → 三工作面合并立项 + AGENTS 减密、docs 可读性两追加 → 次序 A→B→C→D→E + ongoing goal 推进；归档卡 = [driver-surface-package](../../_backlog/_archive/settled_issues/2026-10-06-driver-surface-package.md)）

## 背景（驾驭轮诊断，为什么立这包）

用户（驾驭者）唯一验证手段是端到端——最贵的验收仪器被当成日常观测仪器。七点：dev/ 混四种性质（P1）、运行链跨五处无盘上锚点且纯文档修补已证伪一次（P2）、缺白话单页（P3）、测试资产一问四家（P4）、loop/skills/运行态/run bundle 不显性（P5）、AGENTS.md 太密（P6）、docs 合同体难读（P7）。

## 已交付（五条目）

- **A 拆 dev/**：dev/ 只留 tracked 启动配置（env.sh + 两 overlay + README）；harness-home、harness-home-b、pw-browsers、rehearsal-workspace 四树迁顶层 `runtime/`（分类 owner = runtime/README.md，非隐藏显性）。env.sh / .gitignore / run-gates（RUNTIME_PREFIXES、TOP_DIRS 加 runtime/、README 索引）/ rehearsal seam / 30 脚本 / 9 docs / AGENTS 布局段全路径同步；公司手册仅机械路径同步（一行，语义零变更）。新增 tests/harness/runtime-layout.spec.ts 布局守卫（dev/ 再长残留即红）。
- **B `pnpm orient`**：scripts/lib/orient.mjs 纯核心（keyless 图守卫面：home 判定 devHomeStatus 只警告不抛、requireDevHome 同款双向重叠判定 / profiles / 会话 slug 汇总 / 公司盘 deliverables 概览 / 便宜检查 / run bundle 视图——snapshot.yml 合同字段有界读取，引用不复制不落盘 manifest）+ scripts/tools/orient.mjs CLI（git 计数住真实进程侧）+ `scripts.orient` + 脚本索引行。
- **C 驾驭者单页 docs/orient.md**：白话五问各 ≤1 跳直达唯一家；第五问明说 loop 本体在 vendor（只读）、本仓只拥有输入与输出；正文无 D 号、只导航不复述事实。根 README 入口行、index 导航句（零行增长）、scripts/README 分区三标签行（验证/调试/工具）同步。
- **D AGENTS.md 纯路由化减密**：95→72 行，棘轮 105→84。删复述、括号链与 D 号叙述；纪律表落点列指针化；命令表补登 `pnpm orient`；pin-bookkeeping 逐字格式保持。悬空指针修复：journal-presence-mechanism 范式指针迁 notes/README §二（原行删除后唯一可达路径只剩脚本注释）。
- **E docs 可读层**：八份顶层合同首屏补「什么时候读 + 路线」（testing.md 顶预算原地改写零增行）；index 文档路由四行主题人话化。合同语义零变更、一处事实一个家不动。

## 输掉的方案（备选必载，留尸）

- 再写一份更全的运行链文档修 P2——runtime-map（10-05）已证伪；下一个杠杆必须是目录与命令。
- 改写根 README 当驾驭者单页——两受众一身互相挤；分家 docs/orient.md。
- run bundle 落盘成独立 manifest——违反「引用不复制」（10-05 runtime-runbundle 决定），制造第二权威；改由 orient 按需计算视图。
- AGENTS.md 砍成极简——纪律与 vendor 边界必须常驻注入面；减密是删复述不是删纪律。
- docs 全量白话重写——漂移面失控；只加首屏白话行 + index 人话化。
- dev/ 运行残留留原处只加 README——dev/README 已存在且用户仍看不清；分类写在文档里不等于目录自述。
- 运行残留用隐藏目录（`.state/`）——隐藏即不可见，违背显性化立项目的。
- YAML 解析进 lib（vendor createRequire/js-yaml）——keyless 图守卫的 unresolvedImports 白名单只给 markdown-links 开过；合同字段是有界平铺标量，字段读取器足够且不弱化守卫。

## 验证记录（红绿收据 + 走查）

- **A**：红 = verify md-links（runtime/README.md 缺失）+ runtime-layout.spec 4/4 红；绿 = verify ALL PASS + vitest 35 文件 328 项 + sessions 迁移前后 6/6 与 credentials 零丢失 + `source dev/env.sh` 后 headless 真模型整轮冒烟通过。
- **B**：红 = orient.spec 模块缺失 10 项红；绿 = spec 10/10 + verify ALL PASS + vitest 338 项；走查 = unset/日用重叠（本会话 DSH_HOME 实况）均警告不误报、source 后全景（6 slug/138 会话可见）、r2-motion run bundle 视图引用全解析（lead 在场 + 5 jsonl + workspace.expected 在场）、未知场景 fail-loud exit 1。
- **C**：红 = DOC_LINE_BUDGETS 新条目（cap 80）反证（临时 86 行 → verify 1 FAILURE → 还原 51 行 → ALL PASS）；绿 = md-links 11 链接全解析；走查 = 五问各 ≤1 跳（是什么→README/project-map；怎么跑→demo §前置；改哪→project-map 按任务表；测试→tests/README 最窄检查 + testing.md；loop/运行态→runtime-map + runtime/README + vendor/dsh）。
- **D**：红 = 棘轮 105→84 后 doc-budget 红（95 行超上限）；绿 = 72/84 + pin-bookkeeping 过 + vitest 338 项；走查 = 原全部入口 ≤2 跳可达（community-practice 经 index 台账 D15 行 2 跳；journal-presence-mechanism 范式经 notes/README §二 2 跳；首跑验收 / §11 / §12 / §13 均 1 跳）。
- **E**：走查 = 按 index 路由行到达正确 owner 且一句话可懂；md-links 绿；六个预算文件全部不升（AGENTS 72/84、index 148/148、orient 51/80、dev-loop 374/395、testing 75/75、手册 195/195）。

## 边界与未做（2026-10-06 收口轮 review 补登记）

- 真模型面：仅条目 A 的 headless 冒烟过真 API；B/C/D/E 按各自验收节全 keyless（无需真模型）。
- **orient 会话清单字段 = slug / 时间 / 会话数**——RFC 方案文本里的 preset 字段未实现：preset 藏在多帧 zstd 会话日志内，解码不属 keyless 秒级观测面（session-log lib 无解码器）。要用 preset 口径查会话 = session-log-export 导明文；字段升级待点名。
- **被改路径的 30 个脚本未逐一实跑**（实跑成本档按各自头注触发）；补偿 = `node --check` + 相对 import 目标存在性全过、rehearsal seam 实跑（rehearsal-init 幂等成型通过：runtime/rehearsal-workspace 参考镜像刷新、产物未动、真盘零写入）、workspace-oracle spec 实际创建 runtime/harness-home/oracle-tests（该路径已被 keyless spec 触达）。
- **探针脚本 20+ 处仍各自硬编码 runtime/rehearsal-workspace**（本轮仅机械替换）；「发现集中共享模块」的 10-05 教训在 scripts 侧只完成一半——rehearsal seam（lib/rehearsal.mjs REHEARSAL_REL）已存在但未被全部消费。集中化收口待点名另立。
- **E 范围口径**：白话首屏按「顶层合同」= 合同层八份兑现；design/guides 设计与指南层、project-map/index 导航层未加（project-map 开头已是白话导语）。要不要扩展到 design/guides 层待点名。
- run bundle 视图 = 有界字段读取（顶层标量 + session/workspace 一层嵌套），非完整 YAML 解析——lib 纯度约束下的取舍；元数据权威仍是 snapshots/README 合同与 snapshot.yml 自身。
- scripts/ 未再分桶（10-05 职责分区已完成；剩余标签问题由 C 的三标签行收口）。
- notes/_backlog 制度未动（用户未点名；点名另立 RFC）。
