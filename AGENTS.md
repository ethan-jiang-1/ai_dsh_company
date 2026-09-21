# AGENTS.md — 本仓库的入口链

虚拟公司多角色 DSH 插件：一个包（`packages/company-pack`）提供四个角色 preset
（CEO / VP-Eng / VP-Sales / COO）+ host profile 源；协作用 DSH 现成通道（Agent Teams 主通道）。

## 布局

```
CLAUDE.md -> AGENTS.md    symlink（编辑真文件 AGENTS.md，verify 门禁校验）
packages/company-pack/   唯一自写包：presets/<role>/（persona+skills）、profiles/、cordis.patch.yml、src/（R3+ 才有代码）
company-workspace/      运行时"公司共享盘"（会话 cwd）：kb/<role>/（CHARTER+journal）、templates/、deliverables/
vendor/dsh/             DSH 源码 submodule（钉 tag，见下）
docs/                   文档层：00-index（地图+决策台账+外部材料登记）→ design/ plans/ guides/ + 顶层合同
notes/                  决策记录：intents.md → proposed/ → implemented/
scripts/                verify.mjs（结构门禁）……
dev/harness-home/       开发 DSH_HOME（gitignore 运行残留）
snapshots/              最小 replay 证据（R5 起，JSONL diff 起步）
```

设计全貌与决策台账：`docs/00-index.md`（先读它，再按需进 design/10-40）。

## 命令表

```sh
git submodule update --init            # 拉下 vendor/dsh（已钉 tag）
corepack enable pnpm                   # 一次性：pnpm 走 Node 自带 corepack（读 packageManager 钉 11.7.0）
pnpm install                           # workspace 解析（vendor/dsh 全树）；引导全配方见 guides/60 §7
source dev/env.sh                      # 双 home 兜底：DSH_HOME=<repo>/dev/harness-home，别碰日用 ~/.dsh；并把裸 dsh（日用全局安装）拦截
pnpm dsh --profile headless "hi"       # 从 DSH 源码起会话（R0 已验收）
pnpm verify                            # 结构门禁（UTF-8/链接/preset 结构/symlink/vendor pin/pack 形状）
node scripts/release-smoke.mjs         # （R5 建）npm pack → 干净 profile → dsh plugin add → 冒烟
```

## 密钥

`pnpm dsh` 是真实 API 会话，需要 `DEEPSEEK_API_KEY`。凭据按 home 隔离：在开发 home
（`dev/harness-home/.credentials.yaml`）配一次即可（见 guides/60 §6）；永不提交密钥。

## DSH 源码在哪、怎么读

三个 DSH 实体，角色不同，**别混**：

| 实体 | 位置 | 角色 |
|---|---|---|
| ① 开发基线（唯一权威） | `vendor/dsh/`（钉 tag，见下簿记） | 机制核对与验证会话都用它：一律 `pnpm dsh` |
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

## 纪律（沿用 DSH 开发习惯）

- **docs/ = 当前合同**（只写 now，按性质分层不按时间）；**notes/ = 决策**（非平凡变更必须带
  Note：决定 / 输掉的方案 / 需要验证什么；proposed 与实现在同一 diff 改写为 implemented）。
- **窄证据切片**：核对现场 → 窄 diff → 原子修改 → 跑最小证据（`pnpm verify` 起步）→ 沉淀 →
  只报告实际跑过的检查。
- **真实安装形状**：源码直跑之外，交付前 `npm pack` → 干净 profile → `dsh plugin add` 冒烟
  （源码测试会掩盖依赖声明错误）。
- **升级环**：`vendor/dsh` 换 tag → 记 SHA 簿记 → typecheck → compatibility 矩阵加列 → 重装冒烟。
- 开发环的完整操作手册（调试阶梯 / 插拔速查 / 设计四问 / 发布纪律时点 / 双 home）：
  `docs/guides/60-dev-loop.md`；demo 现场运维 runbook：`docs/guides/50-budget-and-ops.md`。

## vendor 簿记

- upstream：`https://github.com/deepseek-ai/deepseek-harness.git`
- 当前钉住：tag `dsh-v0.1.5-rc.2` = `fb2c4b9e698e30edb738bca4cf0618587db7d203`
  （= `_digested` 审计基线；机制文档的核对基线与其一致）
- 本地初始化技巧：submodule 首次克隆走了本地路径 + `-c protocol.file.allow=always`（单命令
  放行，未改全局配置）；`.gitmodules` 的 URL 已指上游，别改回去。

## 当前状态

**R0（立环）✅ 完成（2026-09-22）**：`pnpm dsh --profile headless` 从 vendor 源码跑通真实 API
会话；环境引导配方沉淀于 guides/60 §7。当前轮 **R1 两人公司——⛔ Q4**（最小动议主题，一句话
任务即可），见 `docs/00-index.md` 台账；迭代按垂直轮（D11）见 `docs/plans/roadmap.md`。
