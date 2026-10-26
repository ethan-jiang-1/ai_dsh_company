# 第二机模拟：冷 store 离线安装 + 浏览器走查 + 0.3.7 → 0.3.8 迁移

状态：已交付（2026-10-26）；性质 = 一次真环境模拟，不是产品合同。

## 形状

在 `runtime/second-machine/`（gitignored）搭了一个“第二机”：

- 独立 `HOME` / `DSH_HOME` / `DSH_COMPANY_HOME`；日用 `~/.dsh` 不存在；
- 只放 `_dist` 的 0.3.7 tarball、sha256 旁文件与安装手册，不放仓库工作区数据；
- 空 `pnpm-store` / `pnpm-cache`；`PATH` 用真 pnpm（corepack 不下载）；
- 手写 `dsh` shim 指向 built CLI，按手册命令走。

## 结果

| 场景 | 结果 |
|---|---|
| 冷 store 安装 0.3.7 | PASS（空 store/cache；未联网下载 pnpm） |
| 首启 + roster + ceo 会话 | PASS；五角色 + researcher |
| 侧栏工作区登记 | 用 `workspace/create` RPC 模拟“人手点一次”；之后 cdp-probe 才看得到 composer |
| 浏览器走查 | cdp-probe PASS：9 个公司页签逐个开、面板体非空、console/异常零问题 |
| 真实数据 | 改 AGENTS/CHARTER、写 journal/final/meta |
| 0.3.7 → 0.3.8 | 本地 build 0.3.8（改一个未改过的基部模板）；清空 store + `COREPACK_ENABLE_NETWORK=0` 后 remove/add PASS |
| 迁移断言 | 改过的 AGENTS/CHARTER 保留、未改模板被替换、journal/final/meta sha256 不变、bundle.json 0.3.8、roster 完整 |

0.3.7 tarball = `b808012b99ece8f59a1024767b765d5232bd48730938bc2ec4a18df573b398a3`。

## 发现（值得进下一版手册）

1. **pnpm 是未写明的安装前置**。只给 Node + DSH、PATH 无 pnpm 时，`dsh plugin add` 在写 profile 后直接失败：
   `dsh: pnpm was not found; install pnpm and make it available on PATH.`
   模拟里我们把真 pnpm 放进 PATH 才冷装成功；手册目前只写 Node/DSH。建议下一版手册加：
   **pnpm 11（或 `corepack enable pnpm`）**，并说明无 pnpm 时安装会失败。
2. **“侧栏加工作区”是必要的人手步骤**。不登记工作区时 cdp-probe 的 `composerReady=false`、9 个页签 0/9；
   `workspace/create` 登记后全绿。手册第二节已写“人手点一次”，但自动化验收必须显式做这一步。
3. **浏览器走查需要 Chrome/Playwright**；第二机 HOME 不是开发 HOME，`PLAYWRIGHT_BROWSERS_PATH`
   要指向有 Chrome 的缓存。这是 operator 环境前置，不是包缺陷。
4. 冷 store 的“离线”在 **pnpm 已安装**前提下成立；若连 pnpm 都没有，Corepack 会尝试联网下载 pnpm——
   这属于前置缺失，不是包在联网。

## 证据（本机，gitignored）

- `runtime/second-machine/simulate.log`
- `runtime/second-machine/install-0.3.7.log`、`install-0.3.8-offline.log`
- `runtime/second-machine/cdp-probe.log`
- `runtime/second-machine/boot-0.3.7.log`、`boot-0.3.8.log`
- 脚本：`runtime/second-machine/simulate.mjs`（一次性，未进 repo 检查面）

## 边界

- 不是第二台物理机；CLI 仍来自本机 checkout，vendor/base bundle 由本机提供。
- cdp-probe 是机器腿；**真人视觉/手感判断仍需你本人看一遍**（尤其首屏、侧栏工作区、九页签文案）。
- 冷 store 没做真实断网（未拔网线/未 firewall）；用空 store + `COREPACK_ENABLE_NETWORK=0` + 无 registry 访问观测。
- 下一版 0.3.8 是本地临时 build，不是已发布版本；迁移结论对 0.3.7→0.3.8 形状成立。
