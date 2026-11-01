---
topic: 产品形态
intent: "把插件即产品的信任边界、模型可写面、方法/账本/身份保护、秘密与数据保留写透，给数据安全卡提供技术支撑。"
---

# 插件即产品的信任边界与数据安全

> 服务卡：[插件即产品（伞卡）](../../settled_issues/2026-11-01-plugin-as-product.md)、
> [workspace 与数据安全落地卡](../../settled_issues/2026-11-01-workspace-and-data-safety.md)。
> 性质：研究证据与威胁模型，不是决定；拍板项住卡。基线 = `vendor/dsh` `dsh-v0.2.1-rc.2`。
> 证据标签 **T** 实跑、**C** 源码/合同读、**P** 设计、**U** 未验证。
> 与主稿分工：主稿回答“数据放哪”；本稿回答“放进去之后谁还能改、坏了怎么办、哪些承诺不能做”。

## 0. 结论（先看八条）

1. **workspace 是模型可写区**：Session 的 `header.cwd` 是 sandbox 默认根；`workspace-write` 下
   模型的文件/ bash 工具可以写 workspace 内任何位置，包括 `.dsh-company/`。产品把
   `bundle.json`、导出、手册放进 workspace，就必须承认“模型能改”，不能声称防篡改（C）。
2. **home 是 host 保护区**（相对模型工具）：`workspace-write` 的写入围栏只覆盖 Session 根与
   平台临时目录；模型工具默认不能写 home。方法层（D25）与 presented 账本（M2）留在 home，
   才能保住“角色不能自改方法、模型不能改审计”的边界（C）。
3. **`danger-full-access` 会把上述边界降级为约定**：没有文件围栏，模型可写 home/workspace；
   数据卡与 README 必须写明“保护依赖权限模式”，不能把 `workspace-write` 的承诺宣传成永久
   安全属性（C）。
4. **Host 插件代码不受 Session sandbox 约束**：host 用 `node:fs` 写 workspace/home 是进程权限；
   产品自己的写入必须自己做路径校验、只补缺、原子写、备份；不能把“Session 沙箱”当 host 的
   安全边界（C：FAQ 26、vendor sandbox 文档）。
5. **workspace 里的一切都可能是不可信输入**：用户项目可能带 `AGENTS.md`/`CLAUDE.md`/skills/
   `.git` 钩子/符号链接；角色会话会把这些读进 prompt 或执行命令。公司手册注入与用户指令会
   同时进入模型上下文；prompt injection 无法靠“公司手册优先”消除（C/P）。
6. **秘密不能进 workspace/导出/日志**：`.credentials.yaml` 在 home、0600；`DEEPSEEK_API_KEY`
   走 env/凭据库；日志可能含 URL/token；`present`/export/备份不得打包凭据（C：现有合同）。
7. **数据删除没有统一 API**：Session 没有通用 delete；Workspace delete 只删登记；产品数据
   （workspace 文件、methods、ledger、exports）由产品负责清理/保留说明；不能承诺“卸载即删”（C）。
8. **单 writer 是产品级约束**：同 home 第二实例会停写公司数据（lease）；多进程/多机并发写入
   不在 v1 范围；workspace 在共享盘/NFS 上的锁语义未验证（C/U）。

## 1. 信任边界（谁可以写什么）

| 面 | 机制 | 模型工具（`workspace-write`） | Host 插件 | 用户 | 备注 |
|---|---|---|---|---|---|
| 插件包（`presets/**`、`lib/**`、`workspace/**`） | 安装副本只读 | 读 | 发布时写 | 不直接写 | 运行时不写包目录（T5） |
| workspace 公司盘（`kb/`、`deliverables/`、`cultivation/`、手册） | 文件 | **可写** | seed/升级/目录 | 可写 | 业务事实；用户备份 |
| workspace `.dsh-company/bundle.json` | 文件 | **可写** | 创建/升级/校验 | 可读 | host-owned 约定，不是防篡改 |
| workspace `.dsh-company/exports/**` | 文件 | **可写** | 生成 | 可读 | 派生导出；可重建 |
| home `sessions/` | DSH 持久化 | 读（模型可读，写不保证） | DSH | 不手改 | 无删除 API |
| home `.credentials.yaml` | 文件/凭据库 | 默认不可写 | DSH/provider | 用户 | 0600；不进包/导出 |
| home `company/methods/` | 文件 | 默认不可写 | `/cultivation adopt` | 人命令 | D25 自改否决 |
| home `storages/company_deliverables.json` | domain | 默认不可写 | host 事件/命令 | 人命令 | M2 防篡改 |
| home `company-pack.lock` | 文件 | 不可写 | host | 不手改 | writer lease |
| home `storages/workspace.json` | DSH domain | 默认不可写 | DSH | UI | 登记；删除只删登记 |
| 浏览器 localStorage | 浏览器 | 不可见 | client | 浏览器 | 按 origin/设备 |

**关键**：上表的“可写/不可写”是 `workspace-write` 下的默认；`danger-full-access` 下模型可写
home，产品只能 fail loud/备份，不能阻止。

## 2. 模型可写面的具体后果

- **`bundle.json` 被改/删**：host 下次 boot 读到 corrupt/更高版本 → `dataBlocked`，公司数据停写；
  产品要保留原文件、点名 `identity` 备份（home）、给恢复命令；不能静默重建（会丢 id/哈希）。
- **`exports/` 被改**：导出是派生，不是权威；下次导出覆盖；文档写“可删可重建”。
- **`COMPANY.md`/`AGENTS.md` 被改**：这是治理面（可写）；模型改它会影响后续会话的指令链；
  基部哈希会把它当“用户改过”保留；这是约定，不是 ACL（现有 data-model 已说明）。
- **`kb/`/`deliverables/` 被改**：业务事实；用户备份；产品没有自动版本控制；`present` 账本只记
  事件，不是内容备份。
- **`.dsh-company/.seed-consent` 被改**：模型可伪造 consent；host 只能校验形状/工作区/版本，
  不能证明是用户点的。这是“防误写”而不是“防恶意”；威胁模型要写明。

## 3. 方法层 / 账本：为什么留 home

- **方法层（D25）**：方法文件是角色“学到的做法”，如果模型能写自己的方法，就能自我改写行为/
  绕过治理；因此放在 workspace 沙箱外，只通过人命令 `/cultivation adopt` 写入。
  搬进 workspace 会反转这条已立决定（详见主稿 §6.6）。
- **presented 账本（M2）**：`true` 来自 present 事件，`false` 是操作员结论；domain 在 home，
  模型工具无写通道；搬进 workspace 会让 `false` 可被模型改，审计失去意义。
- **导出**：workspace `.dsh-company/exports/` 是只读快照（产品约定，不是 OS 只读）；用于备份/
  携带/人读，不是权威；恢复时先恢复 home 权威，再重新导出（v1 不做自动 import）。
- **若用户要求全搬**：需要另立安全设计（签名/HMAC、host-only 读写、审批、加密），不能只改路径。

## 4. 秘密、日志、隐私

- 凭据：`<home>/.credentials.yaml`（0600）或 env；不写 workspace、不进 tarball、不进导出/
  备份共享；`DSH_COMPANY_*` 环境变量不打印 secret。
- 日志：升级/客户端错误日志可能含 URL、路径、token（启动横幅 token 绝不入库）；手册要求
  打包/分享前脱敏；`runtime/web-logs` 已 gitignored（现有合同）。
- 会话：sessions 含用户正文/路径/工具输出；`full` 备份要加密限权；`business` 备份不含 sessions。
- 隐私：产品不向第三方上传；`web_search`/`web_fetch` 是用户显式工具；README 写清。

## 5. 不可信项目内容（prompt injection / 路径）

- 用户项目可能有 `AGENTS.md`/`CLAUDE.md`/skills/脚本；角色会话会把它们读进上下文或执行；
  公司手册与用户指令冲突时，产品不能保证“公司手册赢”。文档要提示“workspace 内容视为用户
  输入”，高信任场景用专用盘。
- 符号链接：`ctx.fs`/bash 可能跟随链接穿出 workspace；`workspace-write` 的围栏由 provider/
  后端决定；host 自己的写入要用 `realpath`/`contains` 校验（主稿 §3）。
- `.git` 钩子/`package.json` scripts：如果角色运行 `pnpm`/`git`，项目脚本会执行；产品不承诺
  在不可信项目里安全运行，文档写清信任前提。
- 路径：workspace 路径含空格/中文/`~`/相对路径要 canonical；`DSH_COMPANY_HOME` 相对路径按
  cwd 归一；host 写入前校验存在/目录/非 home/非 OS home（现有 `validateCompanyHome`）。

## 6. 数据生命周期与保留

| 数据 | 创建 | 更新 | 删除 | 备份 | 保留责任 |
|---|---|---|---|---|---|
| 公司盘（kb/deliverables/cultivation） | seed/角色 | 角色/用户 | 用户 | workspace | 用户 |
| `bundle.json` | 首启 | 升级 | 不自动删 | workspace + home identity 备份 | 插件/用户 |
| methods | `/cultivation adopt` | 人命令 | 人命令 | home（或导出） | 部署者 |
| presented 账本 | present/audit | host/人 | 人命令 | home（或导出） | 操作员 |
| sessions | 会话 | DSH | 无 API | full | DSH/用户 |
| 凭据 | 用户 | 用户 | 用户 | 不共享 | 用户 |
| exports | host | host | 可删可重建 | workspace | 插件（派生） |
| 日志 | host | host | 轮转/用户 | 可选 | 插件/用户 |

- 产品要给“彻底删除”的清单：workspace、home、profile、methods、ledger、exports、logs；
  不能只说“卸载”。
- 没有 Session delete API：不要物理删 session 目录；README 写清。

## 7. 多用户 / 并发 / lease

- 单 writer：`company-pack.lock` 在 home；第二实例停写公司数据（DSH 会话仍可用）；stale lock
  按 PID 接管（现有 lease）。
- 多 workspace：v1 不支持同 home 多公司盘；一 home 一 workspace（伞卡 Q2）。
- 多机/共享盘：workspace 在 NFS/SMB 上的锁、权限、符号链接语义未验证；不承诺。
- 角色 ACL：roles/owners/签字线是 prompt/approval 级，不是数据 ACL；不承诺 per-role 文件隔离。

## 8. 安全测试（落地要做的）

- **路径/符号链接**：workspace 内 symlink 指向 home/凭据/系统文件；host seed/upgrade 必须
  `keep`/拒绝；模型工具的行为按 provider 断言（C/P）。
- **manifest 篡改**：改坏/改高版本/删 `bundle.json` → fail loud、保留原文件、恢复备份；
  `bundle-manifest-v2.spec` + `release-smoke`。
- **consent 伪造**：模型写 `.seed-consent` → host 只能校验形状/工作区/版本；测试断言“不因
  伪造 consent 覆盖已有文件”（只补缺）。
- **秘密扫描**：tarball/导出/README 不含凭据；`tracked-secrets`/`security-scan` 已存在，
  新导出路径要纳入。
- **日志脱敏**：启动 token 不入库；`runtime/web-logs` ignored；新日志路径检查。
- **danger-full-access**：文档/数据卡明确降级；不把 workspace-write 的边界写成永久承诺。

## 9. 未决 / 风险

- `bundle.json` 在 workspace 可被模型写：接受“host 备份 + fail loud”还是另做 host-only 身份？
  后者与“run bundle 在 workspace”冲突，需要用户拍板。
- methods/ledger 是否永远留 home：若用户要求全搬，先立安全设计卡，不在本轮偷渡。
- 用户项目作为 workspace 的信任前提：是否在 README 明确“只建议可信项目/专用盘”？
- 多用户/共享盘：v1 明确不支持，还是做只读/单 writer 支持？
- 导出是否要带签名/哈希，以便恢复时校验？v1 建议先做派生导出 + 文档，签名后置。

## 10. 服务卡与下一步

- 伞卡：[插件即产品](../../settled_issues/2026-11-01-plugin-as-product.md) Q1/Q3。
- 落地卡：[workspace 与数据安全](../../settled_issues/2026-11-01-workspace-and-data-safety.md)。
- 需要用户拍板：`bundle.json` 可写边界；methods/ledger 是否全搬；不可信项目的支持声明。
