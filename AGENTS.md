# AGENTS.md — 本仓库的入口链

虚拟公司多角色 DSH 插件：一个包（`packages/company-pack`）提供四个角色 preset
（CEO / VP-Eng / VP-Sales / COO）+ host profile 源；协作用 DSH 现成通道（Agent Teams 主通道）。

## 布局

```
packages/company-pack/   唯一自写包：presets/<role>/（persona+skills）、profiles/、cordis.patch.yml、src/（阶段3+才有代码）
company-workspace/      运行时"公司共享盘"（会话 cwd）：kb/<role>/（CHARTER+journal）、templates/、deliverables/
vendor/dsh/             DSH 源码 submodule（钉 tag，见下）
docs/                   文档层：00-index（地图+决策台账）→ design/ plans/ guides/ + 顶层合同
notes/                  决策记录：intents.md → proposed/ → implemented/
scripts/                verify.mjs（结构门禁）……
dev/harness-home/       开发 DSH_HOME（gitignore 运行残留）
```

设计全貌与决策台账：`docs/00-index.md`（先读它，再按需进 design/10-40）。

## 命令表

```sh
git submodule update --init            # 拉下 vendor/dsh（已钉 tag）
pnpm install                           # workspace 解析（含 vendor/dsh；装完按 10 §6 自查子 workspace 风险）
source dev/env.sh                      # 双 home 兜底：DSH_HOME=<repo>/dev/harness-home，别碰日用 ~/.dsh
pnpm dsh --profile headless "hi"       # 从 DSH 源码起会话（验证立环）
pnpm verify                            # 结构门禁（UTF-8/链接/preset 结构/symlink/vendor pin）
node scripts/release-smoke.mjs         # （阶段 5 建）npm pack → 干净 profile → dsh plugin add → 冒烟
```

## DSH 源码在哪、怎么读

- 本仓库内：`vendor/dsh/`。探索路由：`vendor/dsh/docs/architecture.md` →
  `docs/capability-seams.md` → 具体 package README。机制结论的权威在这棵树。
- repo 外只读参考：`/Users/bowhead/deepseek-harness/_digested/`（源码消化笔记）与
  `_faq_on_digested/13_expert-plugin-repo-organization/`（本 repo 形态的依据 FAQ）。
  引用时注明是外部研究材料。

## 纪律（沿用 DSH 开发习惯）

- **docs/ = 当前合同**（只写 now，按性质分层不按时间）；**notes/ = 决策**（非平凡变更必须带
  Note：决定 / 输掉的方案 / 需要验证什么；proposed 与实现在同一 diff 改写为 implemented）。
- **窄证据切片**：核对现场 → 窄 diff → 原子修改 → 跑最小证据（`pnpm verify` 起步）→ 沉淀 →
  只报告实际跑过的检查。
- **真实安装形状**：源码直跑之外，交付前 `npm pack` → 干净 profile → `dsh plugin add` 冒烟
  （源码测试会掩盖依赖声明错误）。
- **升级环**：`vendor/dsh` 换 tag → 记 SHA 簿记 → typecheck → compatibility 矩阵加列 → 重装冒烟。

## vendor 簿记

- upstream：`https://github.com/deepseek-ai/deepseek-harness.git`
- 当前钉住：tag `dsh-v0.1.5-rc.2` = `fb2c4b9e698e30edb738bca4cf0618587db7d203`
  （= `_digested` 审计基线；机制文档的核对基线与其一致）
- 本地初始化技巧：submodule 首次克隆走了本地路径 + `-c protocol.file.allow=always`（单命令
  放行，未改全局配置）；`.gitmodules` 的 URL 已指上游，别改回去。

## 当前状态

阶段 0（立环）进行中，阶段表见 `docs/plans/roadmap.md`；开工阻塞项：Q4（第一场 demo 动议主题），
见 `docs/00-index.md` 台账。
