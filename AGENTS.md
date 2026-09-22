# AGENTS.md — 本仓库的入口链

虚拟公司（**wochen**）多角色 DSH 插件：一个包（`packages/company-pack`）提供四个角色 preset
（显示名 `wochen CEO` / `wochen VP-Eng` / `wochen VP-Sales` / `wochen COO`）+ host profile 源；
协作用 DSH 现成通道（Agent Teams 主通道）。

## 布局

```
CLAUDE.md -> AGENTS.md    symlink（编辑真文件 AGENTS.md，verify 门禁校验）
packages/company-pack/   唯一自写包：presets/<role>/（persona+skills）、cordis.patch.yml（bundle 行）、src/client/（client 面：品牌皮肤）、src/（host 代码 R3+）
company-workspace/      运行时"公司共享盘"（会话 cwd）：kb/<role>/（CHARTER+journal）、templates/、deliverables/
vendor/dsh/             DSH 源码 submodule（钉 SHA，**只读铁律**：见 §vendor 铁律，`pnpm verify` 强制）
docs/                   文档层：00-index（地图+决策台账+外部材料登记）→ design/ plans/ guides/ + 顶层合同
notes/                  决策记录：intents.md → proposed/ → implemented/；事故复盘 postmortem/；外部研究 research/
scripts/                verify.mjs（结构门禁）、preset-smoke.mjs（真入口冒烟）……
dev/                    env.sh（双 home+裸 dsh 拦截）、company.overlay.yml（headless 实验 overlay）、harness-home/（开发 DSH_HOME，gitignore 运行残留）
snapshots/              回归资产：r1-motion（录制会话 + workspace.expected 独立 oracle）；replay harness R5
```

设计全貌与决策台账：`docs/00-index.md`（先读它，再按需进 design/10-40）。

## 命令表

```sh
git submodule update --init            # 拉下 vendor/dsh（已钉 tag）
corepack enable pnpm                   # 一次性：pnpm 走 Node 自带 corepack（读 packageManager 钉 11.7.0）
pnpm install                           # workspace 解析（vendor/dsh 全树）；引导全配方见 guides/60 §7
source dev/env.sh                      # 双 home 兜底：DSH_HOME=<repo>/dev/harness-home，别碰日用 ~/.dsh；并把裸 dsh（日用全局安装）拦截
                                       # ⚠ 每个新 shell/后台 job 必须先 source 本文件——DSH_HOME 不继承，漏了会静默写日用 home（guides/60 §6.5）
pnpm dsh --profile headless "hi"       # 从 DSH 源码起会话（R0 已验收）
pnpm dsh web -- --port 3081 --no-open  # web 观察窗（需 client 面+前端构建，guides/60 §7）；3080 是本 GUI 占用
pnpm verify                            # 结构门禁（UTF-8/链接/preset 结构/symlink/**vendor 铁律：SHA+零改动**/pack 形状/行依赖/client 两半）
pnpm test                              # keyless 回归（vitest：roster 零 broken、行依赖、内容定稿、命名系列、bundle 语法、roots 语义、必填 config）
node scripts/preset-smoke.mjs          # 上线前门禁：boot 真 web，逐个 preset 建会话（唯一能抓"preset 挂载失败"的检查；需 DSH_HOME + 已装 pack）
node scripts/client-load-smoke.mjs     # client 面完成定义：headless 浏览器加载真页面，断言零插件挂载失败 + 品牌槽在场（需 DSH_HOME；postmortem 0003）
node scripts/release-smoke.mjs         # （R5 建）npm pack → 干净 profile → dsh plugin add → 冒烟
```

## 密钥

`pnpm dsh` 是真实 API 会话，需要 `DEEPSEEK_API_KEY`。凭据按 home 隔离：在开发 home
（`dev/harness-home/.credentials.yaml`）配一次即可（见 guides/60 §6）；永不提交密钥。

## DSH 源码在哪、怎么读

三个 DSH 实体，角色不同，**别混**：

| 实体 | 位置 | 角色 |
|---|---|---|
| ① 开发基线（唯一权威） | `vendor/dsh/`（钉 SHA，**只读铁律**见 §vendor 铁律） | 机制核对与验证会话都用它：一律 `pnpm dsh` |
| ② 日用全局安装 | npm 全局（`which dsh`；跑日常会话与改本 repo 的 coding 会话的就是它） | 与本 repo 开发无关；版本随全局升级漂移（当前恰同为 0.1.5-rc.2，**巧合不是保证**），其行为不作机制依据 |
| ③ 外部研究树 | `/Users/bowhead/deepseek-harness/`（`_digested`/FAQ 宿主） | 只读参考，登记见 `docs/00-index.md` §外部研究材料登记 |

裸 `dsh` 已被 `dev/env.sh` 拦截提醒（`DSH_HOME` 只护数据层，护不住代码版本层；确要日用：
`command dsh` 或另开终端）。

- 探索路由（对 ①）：`vendor/dsh/docs/architecture.md` → `docs/capability-seams.md` →
  具体 package README。机制结论的权威在 ① 这棵树。
- 本项目概念 → DSH 载体 → vendor 源码路径的直达表：`docs/00-index.md` §术语映射。
- DSH 全局不变量（fail-loud、model-visible ⟺ logged、registrations are effects、
  plugins not loop changes）：`vendor/dsh/AGENTS.md` 的 Conventions 节。
- repo 外只读参考：`/Users/bowhead/deepseek-harness/_digested/`（源码消化笔记）与
  `_faq_on_digested/13_expert-plugin-repo-organization/`（本 repo 形态的依据 FAQ）。
  引用时注明是外部研究材料；逐份落点登记见 `docs/00-index.md` §外部研究材料登记。

## 纪律（**全程沿用 DSH 的研发纪律**，不发明本地流程）

本 repo 的开发过程不是"借鉴"DSH，而是**整套继承**：凡 DSH 有明文纪律的，一律照做，只按本
repo 规模裁剪（例如 CI 穷举暂由本地门禁代行）。**纪律的权威在 vendor 树，不在本 repo 的转述**：

| DSH 纪律 | 权威（vendor 树） | 本 repo 落点 |
|---|---|---|
| docs = 当前合同（一处事实一个家，只写 now） | `docs/AGENTS.md` | `docs/` 按性质分层（D10）+ `pnpm verify` 链接门禁 |
| 非平凡变更同 diff 带 Agent Note（决定/输掉的方案/需验证什么） | `.agents/notes/README.md` | `notes/intents.md → implemented/` |
| 窄证据切片；本地窄、CI 穷举；只报告实际跑过的检查 | `AGENTS.md` Run relevant checks | guides/60 §1 六步闭环 + `pnpm verify` |
| **完成定义 = 该面最小"真检查"通过；发现权在代理一侧，不在人**（迭代是常态，但必须由代理能自己跑的检查闭合） | `docs/testing.md` Test the real entry path / Verify the world, not the self-report；`docs/postmortem/0003`（"delegated acceptance to the user"） | guides/60 §1 第⑥步 + §7 两道防线；`preset-smoke.mjs` 是 preset/config 类改动的完成定义 |
| 测试分层（unit/coverage/e2e/expected/**snapshot 无 key 重放**）；测试描述行为 | `docs/testing.md` | `snapshots/`（R5 正式化；R1 会话日志即首份资产） |
| 真实入口路径（发布产物 `lib/` 跑）+ 真实安装形状 | `docs/testing.md` Test the real entry path | R5 `release-smoke`（`npm pack`→干净 profile→`plugin add`） |
| 源码面/产物面不混（paths 指 src） | `AGENTS.md` Conventions | 根 `tsconfig.json` extends vendor base |
| vendor 钉版本 + manifest/SHA + 同步程序 | `vendor/README.md` | AGENTS.md vendor 簿记 + `scripts/sync-dsh.mjs`（R5） |
| 日志税：model-visible ⟺ logged | `AGENTS.md` Conventions | guides/60 §3 设计四问② |
| 机械门禁（结尾换行、链接、结构） | `AGENTS.md` Conventions + `scripts/run-gates.ts` | `scripts/verify.mjs` |

### vendor 铁律（本仓最高优先级，机械门禁在 `pnpm verify`）

**`vendor/` 下受版本控制的内容（当前只有 `vendor/dsh/`），一个字节都不许改。** 这不是建议，是门禁：`pnpm verify` 检查
submodule HEAD == 簿记 SHA（`vendor-pin`）且工作树零改动（`vendor-clean`，`git status --porcelain`
必须为空）。两条都做过反证（改一个 tracked 文件即 FAIL，报 `M README.md`）。

**允许面**（只有这两类，别的都算违反）：

1. **只读**：探索源码、`extends` 它的 tsconfig、import 它的包、跑它的构建脚本。
2. **在 vendor 内产生被它自己 `.gitignore` 覆盖的构建产物**（`lib/`、`apps/web/dist/`、
   `node_modules/`）——"从源码跑"要求构建，构建必须在树内；这些产物不出现在 `git status` 里，
   所以不违反 `vendor-clean`。⚠ **禁止 `git clean -x`**（会删掉运行所需的产物）。

**需要改 vendor 的行为时，三条正路（都不碰 vendor）**：

| 想要 | 正路 |
|---|---|
| 组合/配置层面的差异 | 本 pack 的 bundle `cordis.patch.yml`（`- id:` 替换 / `- insert:` 新增）或 profile patch |
| 需要上游修的行为 | 改 **DSH upstream** → 升 pin（`scripts/sync-dsh.mjs`，R5）；期间在本仓记入 `notes/` |
| 上游功能在本形态下不可用 | **先证伪"不可用"再自建**：R1 曾误诊"官方团队 UI 挂不上"→ 自建任务板 + 重复挂 remote → 全 UI 砖（postmortem 0003；实为可用，`dsh.client.inject` 是 informational only）。确属不可用才在本 pack 自己实现等价面 |

**为什么用 SHA 而不是 tag**：tag 可被移动/别名，SHA 才是钉住的合同（`vendor/README.md` 的
pin + manifest/SHA 纪律）。

- 具体操作手册：`docs/guides/60-dev-loop.md`（六步闭环 / 调试阶梯 / 插拔速查 / 设计四问 /
  发布纪律时点 / 双 home）。demo 现场运维 runbook：`docs/guides/50-budget-and-ops.md`。
- **不发明**：不新增 spec 流程（OpenSpec 留触发条件，guides/60 §5）、不自造调度器/记忆/门禁——
  优先用 DSH 现成载体（D13）。**否决理由（有证据）**：规格驱动工具（Spec Kit / Kiro / OpenSpec）
  优化的是"别做错东西"，而本仓两次事故是"东西做对了但装不上"（schema 校验、模块解析）——
  规格不校验 config schema、也不进浏览器模块表，且无第一方返工量化证据；把指令文件写更长同样是
  最弱杠杆（Anthropic 明说这类指令是 advisory，hooks 才是确定性的；GitHub 2500 仓分析结论是
  好文件靠迭代长出来）。见 notes/research/2026-09-22-agent-workflow-community-practice.md。

## vendor 簿记

- upstream：`https://github.com/deepseek-ai/deepseek-harness.git`
- 当前钉住：tag `dsh-v0.1.5-rc.2` = `fb2c4b9e698e30edb738bca4cf0618587db7d203`
  （= `_digested` 审计基线；机制文档的核对基线与其一致）
- 本地初始化技巧：submodule 首次克隆走了本地路径 + `-c protocol.file.allow=always`（单命令
  放行，未改全局配置）；`.gitmodules` 的 URL 已指上游，别改回去。

## 当前状态

**R0（立环）✅ / R1 两人公司 ✅ 完成（2026-09-22）**：CEO + VP-Eng 正式内容就位，pack 装进
web profile；**首条动议跑通**（CEO 澄清 → 任务板 → `spawn_teammate(vp-eng)` → VP 出稿 →
CEO 合稿 `present`），`company-workspace/deliverables/` 两份交付物 + 两个 journal；
首份回归资产 `snapshots/r1-motion/`。当前轮 **R2 四人全员——▶ 开工中（2026-09-22）**（补 VP-Sales/COO 内容、
分镜 v0 两空间镜头 + 任务板活面板；UI 薄片重排见 `notes/implemented/2026-09-22-r2-ui-slice-replan.md`）。迭代按垂直轮（D11）见 `docs/plans/roadmap.md`。
**R2 切片顺序（步步为营，UI 反馈优先）**：① 任务板活面板 ✅（打开期间每 5s 自动刷新；client-load-smoke 全绿）→
② 两空间分镜彩排（现两角色即可走，收 UI 反馈后把分镜 v0 烤进 `demo.md`）→
③ +VP-Sales/COO 正式文案与 skills（含独立会话探针，顺手定 Q2/Q3）→
④ 四人动议全流程（DAG 分派、VP 互审、fork 会议上下文）+ `snapshots/r2-motion/` →
⑤ 轮次收尾清单（roadmap 六条）。
**皮肤第一笔已落**：pack 长出 client 面（`src/client/`：侧栏品牌槽 + **会话头部任务板**）+ `DSH_CLIENT_TITLE`
构建期品牌——见 `notes/implemented/2026-09-22-client-face-brand.md`。
观察窗：`pnpm dsh web -- --port 3086 --no-open`（3080 是本 GUI 占用）。
