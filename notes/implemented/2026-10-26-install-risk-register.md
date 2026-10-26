# 安装/升级风险登记（2026-10-26）

状态：已交付（2026-10-26；0.3.10 补真实通道/指针轮，决定与输掉的方案见 [real-channel Note](./2026-10-26-real-channel-browser-home.md)）。这不是功能合同；是“哪些已证、哪些没数、下一步测什么”的账。

## 已证

| 面 | 证据 |
|---|---|
| 干净 home 真装、冷 store、空格/中文路径 | 第二机模拟、multi-install、interrupted-install |
| 双 home 隔离（id/company.md/catalog/journal/session） | `multi-install-smoke`、`two-homes.spec` |
| 非空 home 后装 pack（旧 session 保留） | `multi-install-smoke` |
| 中断安装：remove 后坏 add / 缺文件 add / re-add | [interrupted-install-smoke](../../checks/smoke/interrupted-install-smoke.mjs) |
| profile package.json 损坏 → boot 失败；修复后恢复 | 同上 |
| 重复 add 幂等、用户 profile patch 文件保留 | 同上、`multi-install-smoke` |
| 升级基部保留/替换/扩张面/home 哨兵 | lifecycle / bundle-manifest / release smoke |
| 单字节篡改 tarball 拒绝 | lifecycle、第二机 |
| 同 home 两个 web 进程并发 | `concurrent-home-smoke`（bundle/catalog/数据可解析，单实例恢复） |
| 外部 DSH_COMPANY_HOME + 只搬 home | `external-workspace-smoke`（绝对路径、boot、数据） |
| 只读 workspace、缺骨架、坏 catalog | `permissions-recovery-smoke`、catalog 单测 |
| 用户 profile patch 真实改 default；第二 bundle disabled row 共存/卸载 | `profile-row-smoke`；`multi-install-smoke` 双 home 亦验证 default=vp-eng |
| 运行中 remove/add 新版本；旧实例仍响应，重启后升级 | `upgrade-while-running-smoke`（0.3.9→0.3.10，旧 session/list 仍在） |
| 自定义 profile 缺 web-app → presets pending；补 web-app 后可启动 | `multi-install-smoke`、合同 Note |
| 空 bundle 与公司包共存/卸载 | `multi-install-smoke` |
| **真实 npm 发布版 DSH**（global rc.3）五角色 | `channel-matrix-smoke --channel all`；browser 缺包时条件禁用，装 rc.3 两包后自动启用（`--with-browser`） |
| pnpm 真实版本（profile 目录 corepack 解析 12.x） | `channel-matrix-smoke` 的 install 实跑；手册已写 11/12 |
| `DSH_COMPANY_HOME` 相对/`~` 归一；改盘告警且不建第二份盘 | `isolation-matrix-smoke` |
| 导出产物来自当前源码（build 在 pack 前）；tarball 106 条目 | `release --prepare`、`export-dist` 实跑 |

## 没数 / 未执行（本轮后）

| 面 | 为什么没数 | 下一步 |
|---|---|---|
| 其他 0.2.x / Node 20 / Windows / 容器 | 只实测 vendor rc.2 + npm rc.3、Node 22 | 需要构建/环境；未执行不写成支持 |
| session 跨升级 **内容 resume**、catalog presented 跨升级 | 已证 session 文件/list 保留；未做内容重开与 presented 独立断言 | 补 resume/presented 或写原因 |
| 多 DSH 版本矩阵 | 只有 vendor rc.2 + npm rc.3 | 无现成构建，标未验证 |
| 搬家后 DSH 自己的 workspace 登记 / session cwd 绝对路径 | 上游存储不迁移；手册已写，pack 不自动改 | 需要上游 seam 或 bundle export/import |

## 推荐

- 最高优先：真实 npm 通道（本轮已修）、并发/中断/外部 workspace/权限/profile row（已做）；下一步 = resume/presented、Node 20、Windows/容器、多 pack 冲突。
- 只修有证据的 BUG；没证据不改行为。
- 未执行项不写成“支持”。

## P3 静态/未执行（2026-10-26）

- **Windows**：未执行。静态事实 = `tools/standalone.mjs` 显式拒绝 `win32`；`tools/drivers/release-process.mjs`
  依赖 POSIX 进程组；smoke 还用了 `chmod`/symlink/`tar`。不能把 Darwin 结果外推成 Windows 支持。
- **容器**：Docker CLI 在，但 daemon 不可用（`docker info` 连接 `~/.docker/run/docker.sock` 失败）；未跑 Linux 容器。
- **预构建离线**：边界 = `_dist` tarball + 已安装 DSH/base；不把 DSH 本体打进公司包。第二机冷 store 证的是
  “pack 安装不联网”，不是“零 DSH 离线自举”。
- 运行中 remove/add 升级已由 `upgrade-while-running-smoke` 覆盖；并发 install/upgrade 的完整事务边界仍**未测**。
  session resume/catalog presented 跨升级也**未单独断言**，只有哨兵/文件保留。这些不冒充已证。
