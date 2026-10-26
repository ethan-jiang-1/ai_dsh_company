# 安装/升级风险登记（2026-10-26）

状态：已交付（2026-10-26）。这不是功能合同；是“哪些已证、哪些没数、下一步测什么”的账。

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
| 自定义 profile 缺 web-app → presets pending；补 web-app 后可启动 | `multi-install-smoke`、合同 Note |
| 空 bundle 与公司包共存/卸载 | `multi-install-smoke` |

## 没数 / 未执行

| 面 | 为什么没数 | 下一步 |
|---|---|---|
| 真实全局 DSH 安装（registry 的 base/web-app/peer） | 全程用 repo vendor built CLI | 只能在真实第二机/发布环境验；本机标未执行 |
| 运行中 install/remove/upgrade | 没有测试；profile 与运行实例的边界未知 | 最小并发安装边界；不安全就文档化 |
| 只读 home/workspace、缺骨架目录 | 只有 corrupt bundle 单测/告警 | permissions-recovery smoke |
| 用户 `cordis.patch.yml` 行真实生效（不只文件保留） | 当前 smoke 只断言文件不变 | profile-row-coexist smoke |
| 第二 bundle 带真实 row，抢/不抢 id | 只测空 bundle | profile-row-coexist smoke |
| session 跨升级 resume、catalog presented 跨升级 | 只有文件/哨兵保留 | 补 resume/presented 断言或写原因 |
| Windows/容器/预构建 | 本机 Darwin；Docker daemon 不可用 | 静态审计；标未执行 |
| 多 DSH 版本矩阵 | 只有当前 pin | 无现成构建，标未验证 |

## 推荐

- 最高优先：并发 boot（已做）、中断安装（已做）、外部 workspace（已做）、权限（未做）、profile row（未做）。
- 只修有证据的 BUG；没证据不改行为。
- 未执行项不写成“支持”。
