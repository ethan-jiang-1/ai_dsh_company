# 2026-09-30 · 0.2.0 插件收割轮：五批落地 + 判收台账

状态：已交付（判收清单经用户裁定：按序四批 + 评估档纳入 plan-mode/browser-use/office-to-pdf；mcp-client/auto-review/tool-ralph/外部代理后端登记不动）。commit 链：`9e65e7e`（批1）→ `582b5fe`（批2）→ `5b657b7`（批3）→ `dc17b12`（批4）→ `12a0952`（呈现即验证纪律）→ `0e86b97`（批5a/5b）。待续两项见 §风险。

## 问题

用户点名「充分利用 DSH 0.2.0 新内置插件，我们的插件依赖可能是老的」——升 pin（同日 [0.2.0-rc.2 换基座](./2026-09-30-pin-upgrade-0.2.0-rc.2.md)）后外部研究树的插件清单已刷新（`_digested/plugin-inventory`，316 包/55 组/92 服务，基线同 tag）。本仓五角色 preset 是 **0.1.7 形状的自包含声明**，standard 工具面在 0.1.7→0.2.0 间长出一批未被继承。

判收依据：`_digested/plugin-inventory` 01（八类能力）/02（图鉴，可见性档位）/04（四条出路 + 缺口清单）+ vendor 树实测行形状（`standard.patch.yml` / `schedule-bundle` patch / 各 README）。

## 方案（四档判收 + 五批落地）

| 档 | 内容 | 处置 |
|---|---|---|
| 追平 standard | tool-jobs / command-goal+tool-goal / compaction 组×4 / tool-subagent-fork | 批1 采纳（五角色，行形状逐字照抄 standard） |
| 未挂载现货 | session-query-sqlite + tool-session-query；schedule + ui-schedule | 批2 / 批3 采纳 |
| CEO 编排位 | tool-workflow + workflow-ptc | 批4 采纳（仅 CEO——编排位归 CEO 的组织语义） |
| 评估档 | plan-mode / browser-use / office-to-pdf | 批5：前两项落地，第三项**已评估·上游 seam 缺口**（见台账） |
| 刻意排除 | tool-bash/pwsh（角色无 shell 是设计前提——日期口径等规矩的基础）；tool-plugin-manager（角色不管装机）；tmux/语音/computer-use/ssh（场景不符） | 登记，不加行 |
| 登记不动 | mcp-client（无当前需求，未来扩展面）；auto-review（与团队互审通道重叠）；tool-ralph（出厂关，激进循环）；subagent-codex/claude-code（外部代理后端，实验重） | 用户裁定本轮不动 |

## 收割台账（逐项）

**已收（机制落地 + 验证）**：
1. **compaction 家族**（批1）：角色长会话动辄读大 KB，无压缩迟早爆上下文；compaction-basic 阈值压 + `/compact` 人命令 + tool-result-pruner（8192/4096/1024）。
2. **tool-goal + /goal**（批1）：动议跨轮推进（create/get/update）。
3. **tool-jobs**（批1）：后台任务（list/output/kill）。
4. **subagent_fork**（批1）：可续跑自身分叉——搁置池「并行快捷派活」等的 seam 到位；delegation.md §4.4 改判（~~等上游 seam~~）。
5. **会话全文检索**（批2）：tool-session-query ×5 工具 + bundle 替换行翻开 session-query-sqlite（`openAt: first-search` 懒开，索引库锚 profile 目录）；授权域 = 调用者工作区（五角色共用共享盘 ⇒ 跨角色可查，CEO 合稿校对受益）；persona 开工动作句同步（journal 是摘要、会话库是全文）。
6. **自主节律**（批3）：schedule-bundle（cron/定频 + 到点投递回原会话 + **宿主恢复冷会话**——搁置池复活条件实证闭合）；行归 bundle 所有，pack 只留替换行钉 `timeZone: Asia/Shanghai`；工具按 agent 作用域落位（角色根会话有、瞬态委派 child 无——r3 夹具实证，正合「立节奏的是角色本体」）。
7. **CEO workflow 编排**（批4）：tool-workflow + workflow-ptc（JS 脚本 fan-out）；persona 派活两条路→三条路（**编排面不是分工面**）。
8. **plan-mode 推敲位**（批5a，五角色）：section 公司化改写（先探索后落笔/计划决策完整/exit_plan_mode 唯一收尾）。
9. **browser-use**（批5b，仅 VP-Sales）：playwright-mcp 实现（选型见输掉的方案）；真入口行为验证 = vp-sales 会话真调 `mcp__playwright-mcp__browser_navigate`（工具调用落日志）。

**已评估·阻塞（有证据，不硬做）**：
- **office-to-pdf 交付物成品化**：office→PDF **预览**出厂已有（侧栏 documentpreview，无需本仓动作）；缺的是**持久化 .pdf 成品**，而 host 侧无合规二进制落盘通道（fs seam 仅 `writeText`、WorkspaceFiles 只读、attachments 是会话工件非交付物）——绕过 fs seam 直写 node:fs 违反沙箱纪律（D13）。正路 = **提上游 seam**（fs 二进制写 or render 落盘选项）。md 交付物不经它（render 只收 doc/docx/xls/xlsx/ppt/pptx；md 已有侧栏预览）。

## 输掉的方案

- **pack `dependencies` 声明 schedule-bundle ⇒ reconcile 自动启用**：release-smoke 实测证伪——reconcile 的自动启用只对「直接作为插件安装的 bundle 包」生效，pack 传递依赖不落 profile manifest 的 dependencies。撤销后 R5a「dependencies 面清空」教义维持。真实部署形状 = 手册第二行 `plugin add` bundle 包 / 插件页开关；release-smoke 预置 bundles 列表；dev web profile 手动加行（bootstrap 已记）。
- **自己 insert schedule 三行**（不依赖 bundle）：与 OPTIONAL_BUNDLE 手动开关撞重复行 id 硬拒 + 三行两份事实——输给「行归 bundle」。
- **stagehand-native 浏览器后端**：强制 OpenAI/Anthropic 系模型 key 且不支持 DeepSeek 端点（README 明文），本部署只有 DEEPSEEK_API_KEY。
- **executablePath 硬编码机器缓存路径**（解 chromium revision 缺口）：机器特定路径进 shipped preset = 脆弱；输给「上游默认发现 + 环境前置安装」（进行中，见 §风险）。

## 验证矩阵（各批完成定义，均为实跑）

批1/批2/批4/批5：preset-smoke 五角色真挂载 + verify ALL PASS + test 251 + r3 重录（真模型，工具表变化实证：schedule_create/list、exit_plan_mode、workflow 相继进夹具）+ 无 key 重放 + r2-motion + `--ui` + probe ping 5/5；批2 另跑 release-smoke（真安装）；批3 另跑 release-smoke（bundle 进预置 bundles 列表被断言输出证实，ALL PASS——二连红均非功能：EPERM 清理抖动遗留锁 + 锁拒绝并发，按合同 pgrep 确认无进程后人工清锁复跑即绿）。

## 测试基建沉淀（同 diff）

- replay 临时 profile 镜像真 profile 形状（schedule-bundle 进 node_modules+bundles，批3）。
- ui 金样两处掩码：`Usage {{tokens}} tok`（工具面大小漂）+ `Think {{reasoning}}`（reasoning 摘要每次重录必然变——批4→批5 两连红实证）；按钮在场性仍被金样断言。
- 教训：改脚本必 `node --check`（本轮正则多一括号令 replay 全线语法红）。
- export-dist 手册模板：验证基线改注入 expectedTag（原硬编码停在 0.1.7-rc.2——pin-currency 类漂移）；bundle 安装步骤。
- **呈现即验证**纪律（用户裁定）：凡「启动给我看/呈现给我」先自跑全绿再交付；家 = dev-loop §1，demo.md 前置指针（`12a0952`）。

## 风险 / 待续

- **browser-use 行为验证收口（机制链通、沙箱写是上游 seam 缺口）**：chromium-1243 已装（`@playwright/mcp` 0.0.80 → playwright-core 1.63.0-alpha 要 1243，缓存原只有 1228；装机走沙箱升级审批）。真入口两轮实证：工具链全通（seam + provider + `mcp__playwright-mcp__browser_navigate` 调用落日志、模型行为诚实——导航失败时拒绝用 web_fetch 冒充、按规程用 ask_user_question 问人）。**阻塞点 = 角色会话产品沙箱拒写 playwright 缓存目录**（`EPERM mkdir ~/Library/Caches/ms-playwright/...` ×2：预建子目录后 mkdir 过了、缓存内写仍拒 ⇒ 是整树拒绝不是缺目录；sandbox-local 无路径白名单 Config 面）。正路 = **提上游 seam**（三选一：provider 给 workspace 内缓存目录的 Config 面 / sandbox × browser-use 联动白名单 / 验证 attach 模式——用户自带登录态浏览器本就是更对的产品形状）。**部署现状**：chromium 已装，但沙箱解锁前 browser 工具在角色会话内会挂载、调用会失败、模型会诚实回退（web_fetch 不受影响）。
- **probe --full**：升 pin 轮的未收口项（提供方 TRANSPORT 悬挂，判据在[升 pin Note](./2026-09-30-pin-upgrade-0.2.0-rc.2.md) §风险）叠加本轮五批工具面变化——低峰一次全绿即双收口。
- 搁置池登记：**自主节律已复活**（批3 机制 + 用户总指令为任务源）；「并行快捷派活」 seam 已到位（批1 fork + 批4 workflow），内容层用法（persona 深调）留后续轮。
- 上游 seam 提案候选 ×2：office-to-pdf 二进制落盘通道；browser-use × sandbox 可写目录面（本条证据最全：两轮 EPERM 实测 + 沙箱 Config 面核查）。
