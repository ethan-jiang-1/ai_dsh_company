---
topic: 产品形态
intent: "补齐插件即产品的生命周期状态机、失败模式与验收面，给安装/首启/升级/回滚/迁移/卸载/修复的落地卡提供技术支撑。"
---

# 插件即产品的生命周期与失败模式

> 服务卡：[插件即产品（伞卡）](../../settled_issues/2026-11-01-plugin-as-product.md)、
> [产品生命周期落地卡](../../settled_issues/2026-11-01-product-lifecycle.md)。
> 性质：研究证据与失败模式清单，不是决定；拍板项住卡。基线 = `vendor/dsh` `dsh-v0.2.1-rc.2`；
> 证据标签 **T** 实跑、**C** 源码/合同读、**P** 设计、**U** 未验证。
> 与主研究稿的分工：主稿（`2026-11-01-plugin-as-product.md`）回答“形状与数据归属”；
> 本稿回答“产品从安装到卸载的每一步怎么进、怎么退、失败长什么样、拿什么证明”。

## 0. 结论（先看七条）

1. **产品化不是一条 happy path**：安装、首启、日常、升级、降级、移动、备份、恢复、卸载、修复
   是十个状态；每个状态都有入口、出口、持久副作用、失败模式与证据。当前仓只把
   “安装 + 首启 + 升级”做到了有脚本，其余多数是文档口径或未测（C）。
2. **升级不是“换 tarball + 重启”**：基部哈希、用户改过的文件、方法层/账本、`bundle.json` v2、
   运行中的实例、降级时的旧数据、profile 的 `link:`/`file:` 形状，各有一条失败路径；
   没有失败注入就只是演示（P）。
3. **首启的失败面比成功面大**：无 workspace、路径不存在/不是目录/不可写、已有项目的
   `AGENTS.md`、无 TTY、浏览器不自动选中、profile 已存在、seed 未确认——每一条都要有明确
   出口；不能靠“应该会”（C/U）。
4. **移动/改名是 DSH 的绝对路径问题，不是本包的 rebind 问题**：`storages/workspace.json` 与
   session `header.cwd` 存绝对路径；删掉 `DSH_COMPANY_REBIND` 不等于搬家自动成立，仍要
   重新登记/新建会话/提示旧会话不可续（C）。
5. **备份/恢复要分“业务可携带”与“整机迁移”**：workspace 是业务盘；home 是运行时 + host 治理
   （sessions/凭据/methods/ledger）。只打 workspace 会缺治理；只打 home 会缺业务盘。
   必须写清两份的关系与恢复顺序（P）。
6. **卸载不会自动删数据**：`plugin remove` 只摘 pack/profile layer；workspace、home、
   methods、ledger、sessions 都保留。产品要提供“保留什么、怎么彻底删”的明确路径（C + P）。
7. **修复是产品的一等公民**：损坏的 `bundle.json`、被删的 workspace、失效的 profile 依赖、
   stale lock、中断的安装/升级，都需要 `doctor`/`repair` 或可操作错误；只 fail loud 不够（P）。

## 1. 生命周期状态机（每步都要有出口）

| 状态 | 入口 | 出口 | 持久副作用 | 主要失败 | 证据 |
|---|---|---|---|---|---|
| 预检 | 用户运行启动器 | 可安装/拒绝 | 无（只读） | Node/pnpm/DSH/产物缺；版本不匹配 | doctor 输出 |
| 安装 | `dsh plugin add` + profile 建 | pack 进 profile、bin 链出 | home/profile/node_modules | pnpm 失败、profile 被替换、磁盘/权限、离线 | `company-entry-smoke`/`release-smoke` |
| 首启 | 启动器 + Web boot | workspace 登记/seed/身份 | workspace 文件、home 登记、bundle.json | 无 workspace、路径坏、无 consent、已有项目碰撞、浏览器不选中 | `release-smoke` + `client-load-smoke` |
| 日常 | 再启动 | 会话/产物 | sessions、workspace、日志 | 第二 writer、端口、旧会话 cwd、profile 失效 | 启动器/doctor/RPC |
| 升级 | 新 tarball + 重启 | 新 pack/基部 | pack、基部哈希、bundle.json、日志 | 半升级、用户改过的基部、方法/账本、运行中实例 | `lifecycle-smoke` |
| 降级 | 旧 tarball + 重启 | 旧 pack/旧基部 | 同上 | 数据 schema 更高、manifest 更高、旧文件被保留 | `lifecycle-smoke`（部分） |
| 移动 | 搬 home/workspace | 新路径可启动 | DSH 登记绝对路径、session cwd | 旧登记失效、旧会话不可续、符号链接 | `external-workspace-smoke` |
| 备份 | 用户/操作员 | 可恢复的包 | 无（只读复制） | 漏 methods/ledger/凭据、包内含 secrets | 文档 + 演练 |
| 恢复 | 解包 + 重装 + 启动 | 可运行 | 覆盖/新建 home/workspace | 版本不匹配、manifest/skeleton 不一致、绝对路径 | 演练 |
| 卸载 | `plugin remove` | pack 摘除 | profile 依赖、node_modules | 误删 workspace/home、残留 profile | `lifecycle-smoke` |
| 修复 | doctor/repair | 可运行或明确不可修 | 备份/迁移/重建 | 坏 manifest、stale lock、缺目录、半安装 | 新 `doctor`/`repair` 测试 |

## 2. 安装

### 2.1 前置（启动器/doctor 必须自己查）

- Node ≥ 22.19（`vendor` 基线）；pnpm 11/12（`dsh plugin` 在 profile 目录调 pnpm；空 profile 无
  `packageManager` 时 corepack 可能取 12.x）；DSH CLI 在 PATH 或显式 `DSH_BIN`；Web dist 在场
  （源码通道）；vendor 产物在场（源码通道）；目标 home 可写；目标 workspace 存在/可建。
- `engines.dsh` 是运行时硬门；README/手册写“可安装 ≠ 已认证”，兼容台账不住包里（C：
  `docs/contracts/release.md`）。

### 2.2 profile 建/装

- 空 home：`dsh --profile company --from-default-profile web --dump-default-config` 建
  `profiles/company`（T）。之后 `dsh plugin --profile company add <spec>` 把 pack 加入 bundles
  （T）。
- **已有 profile**：只验证，不 `--from-default-profile`（它会替换同名 profile 的依赖与用户
  patch）；缺 web-app 时拒绝并给“新 home/备份后重建”的指令；缺 pack 时只 `plugin add`。
- **安装形状**：repo `link:`（改 presets 即刻生效）；tarball `file:`（真拷贝；改内容要重装）；
  registry（未发布）。启动器要识别并打印“这是 link 还是 file”，避免“改了没生效”的误判。
- **幂等**：重复 `plugin add` 不应产生重复 bundle（`release-smoke` 已断言）；profile 的 user
  patch 不应被覆盖（`multi-install-smoke` 已覆盖）。
- **离线/权限**：pnpm 需要 store/registry（file/link 可离线）；home 无写权限、profile 目录
  immutable、磁盘满都要有明确错误；不要把半安装当成功。
- **bin**：包 `bin` 会被 pnpm 链到 `profiles/company/node_modules/.bin/`（T 小包实测）；
  启动器要给出稳定入口，不要让用户猜路径。

## 3. 首启

### 3.1 成功路径（目标）

启动器解析 workspace → 确认 seed → 设 `DSH_HOME`/`DSH_COMPANY_HOME` → spawn
`dsh --profile company` → host 登记 workspace（独立 row，早于 Web readiness；T 探针）→ Web
打开即目标 workspace（U：浏览器自动选中未实测）→ 默认 `ceo` 会话/至少 composer 可用。

### 3.2 失败面（必须逐条有出口）

| 失败 | 用户看到什么 | 产品动作 | 证据 |
|---|---|---|---|
| 无 `--workspace`/env/设置，且无 TTY | 两条可执行命令 + 退出码 | 不启动、不猜、不建 | 启动器测试 |
| 路径不存在 | 问“创建？”或拒绝 | 不静默建；`--yes` 才建 | 启动器测试 |
| 路径是文件/不可写/符号链接坏 | 明确原因 | 拒绝；不 seed | 路径校验 spec |
| 已有项目 `AGENTS.md` | “将用 `COMPANY.md` 作公司手册；`AGENTS.md` 保留” | 碰撞 seed；不覆盖 | handbook spec |
| seed 未确认 | “未写盘；用 --yes 或确认” | 零写；不写身份/不登记 | consent spec |
| profile 已存在但缺 web-app | “不要用 --from-default-profile 修；新建 home/备份” | 拒绝；不 reset | 启动器负例 |
| 浏览器不自动选中 | 侧栏有 workspace，手点一次 | 文档写清；后续 client 选择器 | client-load（U） |
| 端口冲突/无浏览器 | 启动横幅/诊断 | 继续服务/打印 URL | vendor 行为 |

## 4. 日常

- **启动/停止**：`dsh --profile company` 是前台进程；启动器不 daemon 化。第二实例同 home 会
  被 writer lease 拦公司数据写入（DSH 会话仍可用）；这是安全策略，不是 bug（C）。
- **工作区选择**：v1 一安装一 workspace；侧栏若出现其他 workspace（历史/手工），产品命令只认
  `DSH_COMPANY_HOME` 的盘；会话 cwd 不在盘根时拒绝公司数据写入（C）。
- **日志**：升级日志在 workspace `.dsh-company/logs/`；client 错误日志在 home；日志可能含 URL，
  不打包/不共享（P）。
- **doctor**：至少检查 Node/pnpm/DSH、profile bundles、pack 版本、workspace 存在/可写、manifest
  有效、lane、stale lock、seed consent、方法/账本可读；输出“可修/不可修/下一步命令”。

## 5. 升级

- 触发：用户 `plugin add` 新 tarball + 重启；不是自动更新（v1 不做 auto-update）。
- 步骤：装新 pack → 重启 → host 读 manifest → `planSkeletonUpgrade` → 未改基部替换、改过保留 →
  写升级日志 → manifest 版本前移；扩张面不动（C：现有逻辑）。
- 新增：`bundle.json` v2 路径/`handbookTarget`/身份备份；v1→v2 迁移；`COMPANY.md` 碰撞；
  方法层/账本不搬。
- 失败：
  - 半升级（pack 装了、boot 没跑）→ 下次 boot 继续升级；不能把旧 manifest 当新版本。
  - 用户改过的基部文件 → keep + 日志点名；不能静默覆盖。
  - 方法/账本 schema 更高 → fail loud/保留，不降级写。
  - 运行中的实例 → 先停/重启；正在写的数据不保证一致（文档写清）。
- 证据：`lifecycle-smoke`（v1→v2 tarball、改基部、扩数据、卸载、搬 home）；需新增
  `bundle.json` v2/`handbookTarget`/export 断言。

## 6. 降级/回滚

- 路径：备份 → 装回旧 tarball → 重启。基部：改过的保留，未改的回旧版；扩张面不动。
- 风险：新版本可能写了更高 schema（manifest v2、catalog、ledger、records）→ 旧版本不认；
  必须 fail loud + 保留原文件，不能静默降级写。
- 回滚失败：记录 `restore-failed`/`unknown` 类状态（参考外部 `dsh-suite` 的补偿流程，不照抄）；
  没有原子事务，只有补偿。
- 证据：`lifecycle-smoke` 的降级段要覆盖 manifest v2→旧版、ledger/records 更高 schema、
  旧 profile 依赖仍可解析。

## 7. 移动/改名

- **home 移动**：profile 依赖若是 `link:` 绝对路径会断；启动器要能 relink/重装；sessions 与
  `storages/workspace.json` 的绝对路径不自动迁移；旧会话不可续（C）。
- **workspace 移动/改名**：`bundle.json` 跟着走（v2 自定位）；DSH 登记仍是旧绝对路径 →
  启动时点名 stale，重新登记新路径；旧 session `header.cwd` 仍是旧路径；不自动改 vendor 存储。
- **rebind 退役**：`DSH_COMPANY_REBIND` 不再处理“home 指向哪个盘”；workspace 移动靠重新登记/
  新会话，不靠改 manifest。
- 证据：`external-workspace-smoke`（搬 home）、新 `workspace-move-smoke`（搬 workspace/改名）。

## 8. 备份/恢复

| 姿势 | 打包 | 不包含 | 用途 |
|---|---|---|---|
| business | workspace（公司盘 + `.dsh-company/` 导出/身份）+ home 的 methods/ledger（或导出） | sessions、凭据、缓存 | 交接/换机器/业务归档 |
| full | 整个 home + workspace | 无；含会话正文/密钥/绝对路径 | 整机迁移/灾难恢复；加密限权 |

- 恢复 business：新 home → 解 workspace → `plugin add` 同版本/新版本 → 启动；**没有 sessions，
  旧会话不回来**；methods/ledger 从 home 备份或导出恢复（v1 不做自动 import）。
- 恢复 full：整 home 搬移；profile 依赖失效要重装；workspace 登记/会话 cwd 绝对路径要重加/接受
  旧会话不可续。
- 证据：`lifecycle-smoke` 的 business 恢复段；新增 workspace 搬移/恢复演练。

## 9. 卸载

- `dsh plugin --profile company remove dsh-company-pack`：只摘 pack/profile layer；workspace、
  home、methods、ledger、sessions 保留（C）。
- 彻底删除：确认备份后删 home + workspace；启动器 `--reset` 只删带标记的 home，不删 workspace。
- 证据：`lifecycle-smoke` 卸载段；文档写清“删什么/留什么”。

## 10. 修复

- `doctor` 检查：profile 缺 web-app / pack 不在 bundles / pack 版本不匹配 / workspace 不存在 /
  manifest 坏/更高 / consent 缺失 / lock stale / 方法/账本不可读 / DSH 存储 stale 路径。
- `repair` 策略：能补的补（profile 缺 pack、consent 重写、lock stale 接管）；不能补的给人工步骤
  （profile 替换、manifest 损坏恢复备份、workspace 丢失）；绝不静默重置。
- 证据：新 `doctor.spec` + `doctor-smoke`（损坏/缺失/stale 各一例）。

## 11. 失败注入 / 测试矩阵（落地要做的）

| 注入 | 预期 | 证据 |
|---|---|---|
| 安装中断（pnpm 失败/半 pack） | profile 可诊断；重跑幂等；不把半安装当成功 | `interrupted-install-smoke` 扩展 |
| 重复 `plugin add` | 不重复 bundle；user patch 保留 | `release-smoke`/`multi-install` |
| profile 被 `--from-default-profile` 替换 | 启动器拒绝；文档警告 | 启动器负例 |
| seed 未 consent | 零写；无身份；可重试 | consent spec |
| 已有 `AGENTS.md` | 写 `COMPANY.md`；不覆盖 | handbook spec |
| 坏/更高 `bundle.json` | fail loud；保留原文件；恢复备份 | manifest v2 spec |
| 升级中杀进程 | 下次 boot 可继续/诊断；不重复写 | `upgrade-while-running`/kill 测试 |
| 搬 home/workspace | 启动点名 stale；新登记；旧会话不可续 | external/workspace-move smoke |
| 磁盘满/无权限 | 明确失败；不写半截 | 路径/权限测试 |
| 第二 writer | 公司数据停写；DSH 可用 | `concurrent-home-smoke` |
| 卸载后重装 | workspace 数据仍在；身份不丢 | `lifecycle-smoke` |

## 12. 未决 / 风险

- v1 是否做 `doctor`/`repair` 命令，还是只做启动器预检 + 文档？建议至少 `doctor --check`，
  修复留给人工步骤。
- 升级/降级是否做自动备份点？建议升级前提示/自动复制 manifest+profile 到 `.bak`，不做整 home
  快照（成本/隐私）。
- 运行中升级：v1 只支持“停 → 装 → 起”；不承诺热升级。
- Windows：继续 POSIX；不承诺。
- 失败注入的 CI 成本：至少 keyless 的坏 manifest/无 consent/搬盘；真 tarball 的升级/卸载在
  `lifecycle-smoke`。

## 13. 服务卡与下一步

- 伞卡：[插件即产品](../../settled_issues/2026-11-01-plugin-as-product.md) 的 S1/S2/S5。
- 落地卡：[产品生命周期](../../settled_issues/2026-11-01-product-lifecycle.md)。
- 需要用户拍板：doctor/repair 的 v1 范围；升级前自动备份点；运行中升级是否明确不支持。
