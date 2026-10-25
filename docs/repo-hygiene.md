# repo hygiene：什么进 git，什么不进，以及跨环境规则

> 性质：合同（当前边界）。**可执行边界 = [.gitignore](../.gitignore) + [.gitattributes](../.gitattributes)**；
> 本文件解释规则与例外，不替代实现。变更记录归 `notes/`，这里只写 now。
> 一句话：**tracked = 可复现的配方；ignored = 机器本地的状态**。

## 一、两棵树

| 树 | 住哪 | 进 git？ |
|---|---|---|
| 产品树 | `packages/`、`docs/`、`notes/`、`_backlog/`、`checks/`、`tests/`、`probes/`、`tools/`、`run/`、`snapshots/`、根 manifest/lock、`vendor/dsh` submodule pin | **是**（仅该进的子集） |
| 运行树 | `runtime/*`、`company-workspace/`、`.pi/`、`node_modules/`、`.pnpm-store/`、构建产物、导出 tgz | **否**（默认拒绝） |

## 二、必须进 git（fresh clone 的配方）

- 源码、presets、workspace 出厂骨架、配置、schema、迁移/回滚脚本。
- `package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`、`tsconfig*`、`vitest.config.ts`、`.gitmodules`、submodule pin。
- tests、gates、probes、tools、可复跑的 smoke/探针入口，以及它们的小型合成 fixture。
- 当前合同文档、决策 Note、归档卡（它们是项目记忆，不是运行残留）。
- 启动配置（`run/env.sh`、overlay）与安装/发布合同。
- **判定**：换一台同支持矩阵的机器 clone 后，缺了它就无法安装、构建、验证或继续开发 ⇒ 必须 tracked。

## 三、不进 git（机器状态）

- 会话、凭据、storage、profiles、浏览器二进制/profile、日志、截图、审计落盘。
- 构建产物（`lib/`、`dist/`、`*.tsbuildinfo`）、依赖树、pnpm store、缓存。
- 导出 tarball、备份、排练盘、外部工具任务态。
- OS/编辑器残渣（`.DS_Store`、`Thumbs.db`、`._*`、`*.swp`、`*.bak`、`*.orig`、`*.rej`、`.claude/settings.local.json`）。
- **判定**：可由命令重建、只对这台机器有意义、或可能含真实数据/凭据 ⇒ 不 tracked。
- 例外只有一种：**fresh clone 也需要有的 owner 说明**（如两份 runtime README），以 `.gitignore` 的 `!` 白名单逐件放行。

## 四、跨环境规则（不假定大家环境一致）

**支持矩阵 = macOS + Linux（CI 双跑）；Windows 原生不支持（POSIX 符号链接/权限/原生插件假设），用 WSL2。**
CI 证明 install + `bundle:init` + `verify`；vendor 全量构建/测试的干净复现是已知缺口，见
[repo-hygiene Note](../notes/implemented/2026-10-25-repo-hygiene-contract.md)。

1. **行尾**：文本一律 LF（`.gitattributes` 的 `* text=auto eol=lf`）；禁止提交 CRLF；二进制按后缀标记。
2. **路径**：活动 tracked 文件不写绝对 home 路径（macOS 的 Users 段、Linux 的 home 段、Windows 盘符）；
   用仓库相对路径、`repositoryRoot`、`$HOME`、`$DSH_HOME` 或显式环境变量。历史归档与合成 fixture 例外（见 §五）。
3. **大小写**：tracked 路径不得出现仅大小写不同的兄弟；macOS 默认大小写不敏感，这类冲突在 Linux 才炸。
4. **Shell**：tracked 脚本用 POSIX sh 或 Node API；禁止 macOS 专属旗标（`sed -i ''`、`stat -f`、`date -j`、
   `xargs -r`、`grep -P`、`realpath`、`open -a`、`pbcopy`/`pbpaste`、钥匙串命令）。跨平台逻辑优先 `node:fs`/`node:path`。
5. **机器身份**：活动文档不写用户名、主机名、内网 IP、端口作为事实；写成占位符或环境变量。
   命令示例用 `$PWD`、`<repo>`、`$HOME`，不写维护者本机路径。
6. **凭据**：只从 `$HOME/.credentials.yaml` 读；环境变量缺失不等于没配（`pnpm orient` 自检）；永不提交。
7. **换行/Unicode**：不假设文件名 NFC/NFD 一致；路径比较用 Node 的规范化/`fs` API，不靠 shell glob 猜。
8. **CI**：`fresh-clone` 在 Ubuntu + macOS 跑 install → `bundle:init` → `verify`；红了先查“是不是只在我机器上成立”。

## 五、例外（允许，但需要 owner）

- **历史归档**：`notes/archived/`、`_backlog/_archive/` 里可以出现当时的机器路径/会话 id——它们是时间点记录，
  不是当前环境要求；**新写活动文档不得照抄**。
- **合成 fixture**：`snapshots/` 与 `tests/` 的合成会话可以含 authoring-time 占位路径，
  它们只用于回放/断言，不参与构建；真实部署证据仍不得进产品仓。
- 例外不是“默认放行”：新例外必须在 `.gitignore` 有明确 `!` 规则、在 `runtime/README.md`（若属 runtime）登记 owner，
  并在 `tracked-portability` 门禁的 allowlist 里写理由。

## 六、新增文件/目录 checklist

1. 问：fresh clone 缺它还能开发吗？能 ⇒ ignored；不能 ⇒ 进产品树。
2. 进产品树 ⇒ 检查 LF、相对路径、无用户名/主机名、无凭据、大小写唯一。
3. 运行残留 ⇒ 默认 ignore（`runtime/*`）即可；要 tracked ⇒ 改 `.gitignore` 白名单 + `runtime/README.md` + 门禁期望。
4. 大件（>2MB）⇒ 先问该不该在产品仓；多数应去私有归档/生成物。
5. 跑 `pnpm verify`；涉及行为再跑 `pnpm test`；跨环境改动加跑 `fresh-clone`（Ubuntu/macOS）。

## 七、执行面

- 边界：`.gitignore`（默认拒绝 + 白名单）、`.gitattributes`（LF/二进制）。
- 门禁：`no-tracked-ignored`、`tracked-file-size`、`gitignore-shape`、`tracked-secrets`、`tracked-portability`。
- CI：[fresh-clone](../.github/workflows/fresh-clone.yml)（Ubuntu + macOS，install/bundle:init/verify）；
  全量 vendor 构建/测试的缺口登记在 repo-hygiene Note，不用假绿掩盖。
