---
status: 推敲中
opened: 2026-10-25
---

# 推敲：独立启动形状（目录即部署）

> 立卡：2026-10-25 ｜ 状态：推敲中 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：否

**问题与期望结果：** 现在只有维护者的 dev 形状：`source run/env.sh` 强制仓库内 home/workspace、link profile；换目录、换机器、换 home 都要手工修。期望：从干净目录 + 干净 home 一条受支持的入口起 web，五角色出现、可建会话；可迁移、可清理、前置可检，不依赖 `~/.dsh` 和维护者状态。

**当前情况：**
- [run/env.sh](../../run/env.sh) 无条件导出 `DSH_HOME` 到 `runtime/harness-home`、`DSH_COMPANY_HOME` 到仓库 `company-workspace`，并 `DSH_COMPANY_BOOTSTRAP=off`。
- dev profile 的 pack 依赖是绝对 `link:`（runtime 状态，gitignored）；仓库搬家后没有 relink/repair。
- [bundle-init.mjs](../../tools/bundle-init.mjs) 把制度件做成指回 pack 的符号链接；这是维护者 single-source，不是可移植部署。
- [bootstrap.md](../../docs/guides/bootstrap.md) 是长配方；fresh-clone CI 只跑 install + bundle:init + verify，不构建 host/native/pack、不起 web（[fresh-clone.yml](../../.github/workflows/fresh-clone.yml)）。
- DSH 官方源码直跑 = 先 `pnpm run build`，再 `pnpm dsh`；launcher 不检查产物新鲜度。
- 没有 doctor/preflight、`--home`/`--reset`、迁移检测。

**未决问题：**
- Q1：A 源码直跑 / B 可迁移目录 / C 任意隔离 home / D 预构建离线，选哪几个？推荐 A+C，B 作验收，D 不做（除非离线是硬需求）。
- home 放哪：`runtime/standalone/<name>` 还是用户传入；workspace 放 home 内还是旁边？
- 构建策略：总是 build、按 mtime 判 stale、还是只检查产物在场？
- 隔离边界：`~/.dsh` 零写入如何断言；复制目录时如何避免带上 `runtime/harness-home` 的凭据/会话？

**下一步：** 等 Q1/Q4；写 RFC；先写 clean-room smoke 的失败检查（无入口/绝对 link/写日用 home），再实现入口。

## 范围与排除项
- 范围：一个入口（暂名 `pnpm standalone`）+ doctor + 隔离 home + copy workspace + relink/repair + `--reset` + 形状矩阵文档 + clean-room smoke。
- 排除：预构建离线包、Windows 支持（除非目标环境明确）、容器镜像；这些另立卡。

## 已知与未决
- 已知：DSH bundle 不能自己启动，必须有 profile + runtime；所以“目录即部署”= 仓库 + pinned vendor + 自建 profile/home。
- 未决：迁移时 `bundle.json.workspace` 的相对/绝对记录策略；与卡 6 的 guard 如何配合。

## 方案与取舍
- A 源码直跑 + 隔离 home（推荐）：符合 DSH 的 source run，能复现、能清理。
- B 复制构建产物：跨平台/体积/新鲜度都不可控；不承诺。
- C 只做文档说明：不满足“一条入口”的目标；不采用。

## 验收标准

（初稿；RFC 时定稿。）

- clean-room：临时目录副本 + 全新 home；`pnpm standalone` 起 web；roster 五角色 + researcher；`session/create` 成功；`~/.dsh` 零写入；不依赖 `runtime/harness-home`。
- 移动仓库目录后重跑：检测/修复绝对 link；boot 成功。
- doctor：缺 Node/pnpm/vendor 产物/凭据时，给出可执行诊断并非零退出。
- `--reset` 只清 standalone home/workspace，不碰用户数据；文档写清。
- 形状矩阵（真插件安装 vs 目录独立启动）进 docs，含前置/数据落点/验收/升级/删除。

## 关闭条件
- Q1/Q4 已决；RFC 已批；clean-room 实跑；卡顶写结论与去向。

## 裁决（2026-10-25）

- Q1 = A+C（源码直跑 + 隔离 home）；B 作可迁移性验收；D 不做。
- Q4 = 本机 clean-room 必做；CI 至少一个 OS（预算允许）；容器级只对具体目标环境做一次。
- 去向：`notes/proposed/2026-10-25-standalone-deployment.md`（与卡 6 合并）。
