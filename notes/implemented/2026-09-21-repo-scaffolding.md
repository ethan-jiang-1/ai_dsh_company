# 2026-09-21 · repo 骨架（阶段 0）

## 决定

1. **company-workspace 放 repo 内**（输掉的方案：repo 外 sibling 目录——理由：demo 单仓
   自包含，产出可 diff/可回溯；运行残留按目录精细 gitignore）。
2. **deliverables/ 与 kb/*/journal/ 纳入版本控制**（输掉的方案：整体 gitignore——复盘需要
   diff 场次产出与角色记忆演化）。
3. **vendor/dsh submodule 钉 `dsh-v0.1.5-rc.2`（fb2c4b9e）**，= `_digested` 审计基线；
   克隆自本地 checkout（`-c protocol.file.allow=always` 单命令放行），`.gitmodules` URL
   指上游 https，本地 file transport 不留全局配置。
4. **cordis.patch.yml 阶段 0 为空列表**——pack 价值先在 presets/profiles，host 共享行走
   profile 部署（决策 D2）。已知风险：空列表若被 Loader 拒绝，阶段 5 release-smoke 时
   把共享行折叠进 bundle（届时记新 Note）。
5. **preset roots 留 TODO 占位**（`~/CHANGE-ME-pack-presets-path`）——不猜 file: 安装后的
   真实路径，装一次确认后回填（合同 docs/profile.md 诞生时消除）。

## 验证（实际跑过）

- `node scripts/verify.mjs` → ALL PASS（UTF-8/链接/preset×4/symlink/vendor pin/pack 形状）
- `git -C vendor/dsh describe --tags` → dsh-v0.1.5-rc.2

## 未验证 / 已知风险

- `pnpm install` 未跑（含 vendor/dsh 子 workspace，按 docs/design/10 §6 风险清单自查后再定）
- 空列表 patch 的 Loader 接受性；presets roots 真实安装路径
