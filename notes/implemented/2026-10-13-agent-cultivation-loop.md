# 2026-10-13 · 培养回路落地：公司页培养 + 部署本地角色方法层（C 路径首版）

状态：已交付（[_backlog/issues/2026-10-13-agent-cultivation.md](../../_backlog/_archive/settled_issues/2026-10-13-agent-cultivation.md)
拍板三项后同日实施并结卡。前决定 [twin-cultivation（2026-09-24，D25）](./2026-09-24-twin-cultivation.md)
**部分取代**：「培养动作 = 改 pack preset」扩为三面（通用方法/角色方法层/素材），其生效边界表与
自改否决维持有效——双方互链，D25 条目已指回本 Note。）

> **2026-10-28 M3 部分取代作用域**：方法层已从 `<profile>/company-cultivation/<role>/` 迁
> `<DSH_HOME>/company/methods/<role>/`（旧 profile 路径只读留一版，host 启动一次性迁移）；
> 提案/采纳/角色闸/沙箱边界等其余决定保留。见 [RFC](../proposed/2026-10-28-data-design-hardening.md)。

## ① Motivation（外部可观察行为）

用户在公司页看到「用量」子页后提出改为「培养」：每个人培养自己的角色分身，CEO 可给非 CEO
提意见。同日拍板（用户三项全选建议项）：① 对象粒度 = **公司盘×角色**（不先造个人实例）；
② 首版路径 = **C**（工作台 + 部署本地角色方法层，本人采纳后跨会话生效——B 的工作台是 C 的
UI 半边，不是独立过渡）；③ CEO 跨角色 = **仅建议权，目标角色本人采纳**。

## ② 决定（机制栈）

- **入口**：公司主面第四子页 用量→培养（`CompanyView` 的 `COMPANY_PANELS`）；培养面板**不依赖
  team 数据**（独立角色根会话可看）；用量保留平台页签 `company-budget`（换入口 ≠ 删统计）。
  同一领域视图（`CultivationBoard`）住公司页/侧栏/浮窗三个壳——一处事实。
- **数据**：培养记录 = 公司盘 `cultivation/records/*.md`（lib `cultivation.ts` 读模型
  `recordText`/`parseRecord`/`recordInbox`；**不可达 ≠ 0、未验证 ≠ 已掌握**的诚实呈现）。
- **权限分工**：分身提案 = `cultivation_propose` 工具（host 注册，署 preset/会话，只开提案）；
  人侧采纳/拒绝/撤回/验证 = `ctx.commands.register` 的 `/cultivation` 命令族（不经模型、run 进
  会话日志；**采纳角色闸** = 命令所在会话 preset === 记录目标角色——仅建议权拍板③的机制面）。
- **方法层**：每角色 preset 第二 `customSkillDirs` 锚 `baseUrl`（现 = `<DSH_HOME>/company/methods/<role>/`；
  M3 前 = `<DSH_HOME>/profiles/<name>/company-cultivation/<role>/`，旧路径只读留一版）；
  host `config.cultivationRoot` 同 `baseUrl` 同前缀（`cordis.patch.yml` `company-client` 行 `!!js`）——
  构造上对齐。pack 升级不擦；CEO 委派 child 继承 ceo 组合 ⇒ 不误挂职能角色方法（delegation-smoke 维持）。

## ③ 输掉的方案（真考虑过的）

- **B 单独成首版**（工作台 + 维护交接，无跨会话生效）：用户拍板弃——单独 B 不能宣称「教会分身」。
- **个人实例粒度**：弃——DSH 无身份/实例机制，需求明确前不建（研究稿 §4）。
- **CEO 可直接改他角**：弃——与归属/专业域 owner 合同冲突。
- **UI 按钮采纳**（浏览器→host 业务 Remote）：弃——钉版 DSH 无 pack 自有 UI→host 动作通道
  （remotes 选择面由 vendor 组装、dynamic cordis = session-scoped 且 trust 等同 bash）⇒ v1 用
  命令族 = 平台原生「人侧直控面」；按钮留待上游开放通道后另立卡引用本 Note。
  **2026-10-17 后续**：该前提经读码证伪——平台有通用人侧命令执行面（`remote.commands.execute`，vendor 的 `/permission` 即此路，
  host 一律记 `source: user`）⇒ 按钮/创作表单已落地 = [培养 GUI 行动面](./2026-10-17-cultivation-gui-actions.md)。
- **workspace 作方法层根**：弃——workspace 是分身可写区，违反 D25「可写共享根不进任何角色技能面」
  不变量；profile 根在会话 workspace 之外。

## ④ 后果与边界（如实口径）

- **写隔离口径修正**（本轮最硬的发现，探针先证伪再定案）：方法层在 **workspace-write 部署**下
  分身 fs 写被沙箱拒（`[sandbox: file access denied under workspace-write mode]`，活体留证）；
  本机 dev 因 Seatbelt 被禁跑 danger-full-access（`run/env.sh` 机器条件处方）⇒ 该模式无围栏。
  合同与卡片均写模式依赖口径，不宣称绝对隔离。
- 方法层按 **profile×角色** 隔离：同 profile 多公司盘共享角色方法层（v1 单公司现实，不宣称按公司隔离）。
- 单操作者可信协作口径：命令是人敲的、owners 是政策不是身份凭证——不宣称认证隔离。
- watcher 实测**强于合同**：运行中会话的 catalog 也会刷新（原合同只主张新会话）。

## ⑤ 实际跑过的验证

| 检查 | 结果 |
|---|---|
| 红（先立后实现） | 新 spec 三文件在实现前实跑红 **8 断言**（`CultivationBoard` 不存在 / 方法层根未声明 / 读模型缺 exports / inboxRows 无 reach）→ 实现后全绿（红绿皆在对话与卡上留证） |
| `npx vitest run tests/company/cultivation.spec.ts tests/client/cultivation-board.spec.ts tests/presets/presets.spec.ts` | 40/40 |
| `pnpm test` | **538/538**（54 spec 文件） |
| `pnpm verify` | ALL PASS |
| `node checks/smoke/preset-smoke.mjs` | 5/5 ALL PASS（方法层缺目录容忍 ⇒ 挂载不炸；「只看见自己的 skills」隔离断言维持） |
| `node checks/smoke/delegation-smoke.mjs` | ALL PASS（child 组合边界未变） |
| `node checks/smoke/client-load-smoke.mjs` | ALL PASS（真浏览器挂载零失败） |
| `node checks/smoke/probe-smoke.mjs`（快速档） | 5/5 |
| `node probes/session-context/cultivation-method-layer-probe.mjs` | **12 判据 ALL PASS**：目录冷启动发现 / 角色隔离 ×3 / 缺目录容忍 ×5 / 命令族 wiring / correct 落记录 / adopt 落方法层+记录翻转 / 新会话跨会话生效 / ceo 代采纳被拒（仅建议权反例） |
| 同上 `--full`（先 `DSH_PERMISSION_MODE=workspace-write`） | ⑦ 写隔离 PASS：分身 fs 写方法层 → 沙箱拒（会话日志 `tool/result` 层锚 `[sandbox: file access denied under workspace-write mode]`）。**首跑在本机默认（danger-full-access）下红**——「无条件沙箱拒」假设被证伪，根因 = 本机 Seatbelt 禁用的 env.sh 处方；钉模式重跑即绿（红绿双证，探针头注已写明复跑条件） |

**未验（显式）**：`probe-smoke --full` 内容档（本轮只改组合未改 persona 文案——四道门禁的内容档
义务按 D25 合同针对**内容**改动）；培养面板的浏览器视觉走查/视觉夹具（keyless 静态渲染 +
client-load-smoke 真挂载已过，视觉档留给下次观察窗走查）；多人真实使用回路（单操作者现实）；
按钮式采纳（上游无通道，见输掉的方案）。
