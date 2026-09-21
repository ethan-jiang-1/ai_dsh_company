# 2026-09-21 · 开发环思想沉淀（guides/60 + 外部材料登记）

## 决定

1. **FAQ 13 操作面思想吸收为 `docs/guides/60-dev-loop.md`**（指南层"怎么操作"）：六步闭环
   展开、调试五层阶梯（dump-config → roster 原因 → 热重载 → JSONL → snapshot）、设计四问
   （本 repo 版）、插拔速查表（workspace 直跑 / `--patch` overlay / `plugin add` / `disabled: true`）、
   升级环与发布纪律时点（peers/compat 矩阵/OpenSpec 触发条件）、双 home 操作细节。
   机制引文全部在 vendor/dsh（钉住 tag）重新核对，不只转抄外部 FAQ。
2. **FAQ 原文不复制进本 repo**（输掉的方案：快照进 `docs/research/`——理由：`_faq_on_digested/`
   在其宿主 repo 已被 git 跟踪（117 文件、未 ignore，已核实），非裸文件；思想吸收进 docs 后
   日常不再依赖原文，复制徒增同步负担）。改为 `docs/00-index.md` 新增"外部研究材料登记"表：
   每份外部材料 → 吸收落点映射，AGENTS.md 的"repo 外只读参考"段指向它。
3. **AGENTS.md 四处小修**：布局块补 `snapshots/` 与 CLAUDE.md symlink（编辑真文件）；命令表
   verify 描述补"pack 形状"；repo 外参考段指向登记表；纪律段加一行指向 guides/60 与 50。
4. **agent 直达补强**（第二轮，按"对 coding agent 友好"审计）：00-index 术语映射表加
   "vendor/dsh 落点"列——概念 → DSH 载体 → 源码路径一张表直达，路径全部核实存在于钉住
   tag；AGENTS.md 探索路由补两行（术语表指针；DSH 全局不变量在 `vendor/dsh/AGENTS.md`
   Conventions 节）；AGENTS.md 新增"密钥"节（`pnpm dsh` 需 `DEEPSEEK_API_KEY`，按 home
   隔离，`dev/harness-home/.credentials.yaml` 配一次）。

## 输掉的方案

- 上述快照复制方案（决定 2）。
- 把调试阶梯并进 guides/50 runbook——50 号是 demo 现场运维（症状→动作），开发期排查是
  另一性质，混排会让两张表都不能独立查。

## 验证（实际跑过）

- `pnpm verify` → ALL PASS（md-utf8/newline ×31、md-links ×32、presets ×4、claude-symlink、
  vendor-pin、pack-bundle）
- 机制引文核对（vendor/dsh @ dsh-v0.1.5-rc.2）：`--dump-config`（apps/cli/src/dump-config.ts、
  args.ts "print the composed profile tree and exit"）、`--patch`（args.ts "extra patch-list
  overlay applied after the profile layer (repeatable)"）、`plugin` 子命令（args.ts "forwarding
  the remaining arguments to pnpm in the profile directory"，含 `file:` 形式）、user patch 层
  热重载（packages/boot/app-boot/src/profile.ts "custom profiles default to live reload"）

## 未验证 / 已知风险

- 指南中 `plugin add file:./packages/company-pack` 尚未实际执行（阶段 0 的 `pnpm install` /
  `pnpm dsh` 立环验收本来就没跑，见 roadmap 阶段 0 与 2026-09-21-repo-scaffolding note）——
  首次跑通后如有出入，回改指南对应行。
