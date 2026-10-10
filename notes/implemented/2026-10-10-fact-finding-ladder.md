# 2026-10-10 · 取证阶梯改判：全员全装备 + HITL 降为最后手段（fact-finding-ladder）

状态：implemented

## 决定

1. **全员全装备**（五张 preset 同款挂载）：`tool-bash` + `browser-use` 组（`dsh-browser-use` +
   playwright-mcp，isolate realm）加入 ceo / vp-eng / coo / cfo（vp-sales 首挂）。
   实证前提：preset 自包含原则下 **bundle 的工具到不了会话**（R1 教训的运行时确认）——base bundle
   挂着 `tool-bash` + `bash-sandbox` executor，但公司会话确实没有 bash（CEO"无 shell"诊断属实，
   误的只是归因：不是沙箱墙，是 preset 没声明）。
2. **取证阶梯改判**（取代 [hitl-fact-gate](./2026-10-10-hitl-fact-gate.md) 的"唯一获取通道 = HITL"）：
   **HITL = 最后手段**。开工先打能力探针 → **换通道穷举**（八条打法 = CEO skill
   `fact-finding-playbook`：bash 直取 / 镜像转载 / 第三方拆解 / 播客 / 索引挖矿 / 浏览器兜底 /
   DoH+IP 直连 → 补料卡）——"找不到"多数是"没换姿势"（同场实证：同一篇新闻，裸 curl 501、
   换 sohu 镜像 + 浏览器 UA 200，45KB 正文到手）。
3. **外部正文已实际取回**并落 `deliverables/2026-10-10-ai-transformation-2026/drafts/sources/`
   （文章全文 + 双语 README + 4 个 SKILL.md，通道实录 = 同目录 FETCH-LOG.md）——A 级事实可回填，
   VP-Sales 出 v2 事实包后 T3/T4/T5 重算。
4. **CEO 技能**：`presets/ceo/skills/fact-finding-playbook/`（八条通道 + A/B/C 分级 + FETCH-LOG
   落盘形状）；`assembling-the-team` 能力盘点步指向它。

## 输掉的方案

- **preset 挂 `bash-local` executor + `shell-env` + `tool-bash` 三件套**：挂载直接红
  （3 FAILURE：`service "shell" has been registered at <SandboxBashExecutor>`——base 已注册 shell
  服务，双注册非法）。正确形状 = **只声明 `tool-bash` 工具行**，服务面用 base 现成的。
- **bash 只挂 CEO / 不挂 CEO** 两个方向都否：只挂职能 preset → 单操作者模式分身继承 CEO 组合，
  分身照样没手；不挂 CEO → 继承链断。**Lead 有手 = 分身有手**（用户定盘：全员全面能力）。
- **只改 skill 不给工具**：skill 是打法，手是工具——没有 tool-bash，八条通道里 1/2/4/7 全不可执行。
- **接代理（`*_PROXY`）**：唯一能让 `web_fetch` 工具本身复活的杠杆，用户暂缓——bash 通道打通后
  优先级下降，留独立轮。
- **占 postmortem 编号**：并入本 Note（同 hitl-fact-gate 先例）。

## 后果

- 浏览器 ×5 = 每个会话可起 Chromium（成本面）；`tool-workflow` 保持 CEO-only——团队模式分身
  继承 CEO 组合已有，独立会话的职能无 workflow（已登记，需求出现再议）。
- `bash` 的进程权限 = 本 DSH 进程（可写范围超出共享盘）——手册「工作纪律」约束使用面，
  取证用途外跑命令 = 违纪（yml 注释同款登记）。
- pack peerDependencies 补 `@deepseek-ai/dsh-tool-bash`（deps ∪ peers 同构门红证）。
- 手册 189/195；[hitl-fact-gate](./2026-10-10-hitl-fact-gate.md) 顶部互链改判指针。

## 验证（实际跑过）

- **挂载红证**：三件套方案 → `preset-smoke` **3 FAILURE**（双注册报错原文见输掉的方案）；
  改单行 `tool-bash` → **ALL PASS**；全员全装备（browser ×5）→ **ALL PASS**。
- **bash 运行时探针**：`pnpm dsh --profile headless` 真会话跑 `echo probe-bash-ok` →
  输出 `probe-bash-ok / exit=0`——base bash 栈（bash-sandbox executor）调用层在本环境正常。
- **通道实录**：`drafts/sources/FETCH-LOG.md`（7 条命令：501 / 200×6 / 403——正文 15.9KB 提取成功）。
- `pnpm test`：**43 文件 / 445 测试全绿**（1 红后修复：pack peers 补 tool-bash）。
- `pnpm verify`：**ALL PASS**（doc-budget 手册 189/195；notes-liveness；ledger 全套）。
