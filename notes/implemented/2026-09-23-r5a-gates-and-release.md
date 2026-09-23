# R5a 门禁与发布（P1.3 / P1.4 / P4 收尾）· 2026-09-23

> 轮次：[roadmap](../../docs/plans/roadmap.md) R5a（后半，接 P1.1/P1.2 —— commit `133b82d`/`bcda032`）。
> 意图登记：[intents.md](../intents.md) 2026-09-23「R5a 续作」行。
> 权威判据：r5-plus-readiness §9 P1.3 / P1.4 / P4（已逐条销账；该文件已于 R6 删除，git 留史）。

## 交付了什么（外部可观察）

| 件 | 形状 |
|---|---|
| **P1.3 委派卡端到端** | `scripts/replay-smoke.mjs --ui`：真浏览器加载真重放页面 → 连接临时工作区 → 搜索打开 lead 会话 → 展开轮次组 → centerCol `ariaSnapshot` 金样比对 + 委派卡**可访问名**断言（`button "委派 VP-Eng（研发） 已交稿 展开"`，金样 `snapshots/r3-delegation/replay/ui.expected.md:74`） |
| **sidecar ×4** | `system-prompt.expected.md` / `tool-schemas.expected.json`（+ `.1.` child 变体）：vendor `suite.ts` 格式的自算（其有 vitest 依赖不可 import），产在 `--prepare`/`--record`，比在默认重放档 |
| **P1.4 分层守卫** | `tests/layering.spec.ts` 新增第三档守卫：tests/ 不得 import scripts/ 驱动脚本（`scripts/lib/` 纯逻辑库除外）、任何 vitest 配置不得引用 scripts/、replay-smoke 头注必须声明"不进 pnpm test" |
| **P4 发布欠账闭账** | pack manifest：`dependencies` 精确钉 → **`peerDependencies`**（17 个：cordis `^4.0.2` + dsh-* `^0.1.5-rc.2`）+ `dsh.compatibility.dshReleases` 矩阵 + description 五角色 + 摘掉指向 tarball 外的 `./src/*` 出口 |
| **P4 新门禁** | `pnpm verify` 的 `pack-compat`（钉住 tag ∉ 矩阵即红）+ `preset-row-deps` 改读 deps ∪ peers（verify.mjs §7 与 tests/presets.spec.ts 两处同口径） |
| **P4 脚本** | `scripts/release-smoke.mjs`（构建 → npm pack → 干净 profile → plugin add → boot 冒烟）+ `scripts/sync-dsh.mjs`（检查模式 + `--pin` 升级环） |
| **合同** | [docs/release.md](../../docs/release.md) 出生（依赖姿态 / 矩阵语义 / 冒烟程序 / 升 pin 程序），00-index 出生地图已记 |

## 实际跑过的验证（判据全记录）

**迭代环**：`pnpm verify` ALL PASS（含新 `pack-compat`）；`pnpm test` **39/39**（新第三档守卫 +1）。

**认证档（全部 2026-09-23 实跑）**：

| 检查 | 结果 | 关键输出 |
|---|---|---|
| `node scripts/replay-smoke.mjs --ui`（终态复跑） | ✅ 11s 无 key | 会话零 diff + sidecar×4 零 diff + 委派卡 ×1（可访问名）+ ui 金样零 diff |
| 同上 · **红证** | ✅ 三连红→还原复绿 | 摘场景组合 `company-client` 行：卡基数 0 / aria 无节点 / 金样 diff 点名缺 `🗂 任务板` |
| `node scripts/release-smoke.mjs` | ✅ 全绿 | tarball 35KB；bundles reconcile；安装副本 peers×17/矩阵/presets/lib 全数断言；roster 五角色 + create ceo + 模块表含本包 client |
| `node scripts/preset-smoke.mjs` | ✅ | 5 preset 全挂载，模块闭包 lint 55 模块缺失 0 |
| `node scripts/client-load-smoke.mjs` | ✅ | 零挂载失败 + 品牌槽在场 |
| `node scripts/sync-dsh.mjs`（检查模式） | ✅ | 四处簿记一致（fb2c4b9e；矩阵 1 列） |

**红证存档**：P1.4 守卫双红证（违规 spec import replay-smoke → 红；`vitest.replay.config.ts` 编入 scripts/ → 红；移除后全量 39/39 绿）；`pack-compat` 红证（矩阵清空 → FAIL 点名 tag → 还原绿）；release-smoke 开发中三次真实红（tsdown `.bin` 是 shell shim / `--profile` 必须挂在 plugin 子命令 / web 是子命令别名，自定义 profile 走默认命令）= 该脚本敏感度的 de-facto 实证。

## 设计决定（别随手改）

1. **委派卡在场判据一律走可访问名**：红证暴露 `[data-tool="vp_eng"]` locator **通用工具行也渲染**（vendor present.e2e 的 `[data-tool="present"]` 即通用行）——摘 `company-client` 行后 locator 版误绿、可访问名版正确红。基数断言 = `getByRole('button', { name: /^委派 VP-Eng（研发）/ })`；data-tool 降级为诊断输出。这是 readiness P1.3"判据口径必须落在可访问名/文本"的实证注脚。
2. **红证摘的是 `company-client` 行而非 toolview 注册本体**：注册住在本包 client 入口（`src/client/index.ts` 的 `slots.inject('tool.call.toolview', …)`），场景组合行是它进浏览器的唯一通道——摘行 = 摘装载，可观察效果等价且不动产物文件。
3. **sidecar 归一化语境 = 全 run 的 session ids + cwd + webUrl 场景自有替换**（vendor `scaffold.ts:1069-1072` 对位）：lead 的 system prompt 嵌 `Team id is session-<自身id>`、child 嵌 lead 的 id（只带自己的 header id 会每次漂移）；web 起在随机端口，`{{webUrl}}` token 从录制文本**句子锚定**自提取（避免误伤手册里的正当端口引用）。
4. **场景组合补三组行（两侧同构）**：`ui-agent-team` + `company-client`（pack client 面进组合，卡/品牌/任务板才伺服）+ **browse 目录选择器对**（auto 行在 macOS 有显示环境时选 native，headless 浏览器打不开；bundle 注释明说 pin = 直接组对行）。三组行零会话事件——重放零 diff 不受影响（实证）。
5. **裸包名行要求根 node_modules 可解析**：`linkProfilePackage` 从 patch 位置解析、解析不到**静默跳过**——根 devDependencies 补 `dsh-company-pack: workspace:*`（P1.2 给 llm-replay/session-snapshot 补链接的同款坑）。
6. **peers 是声明语义不是安装要求**：profile 模板自带 `autoInstallPeers: false` + hoisted，行解析走安装锚兜底（vendor `PROFILE_PNPM_WORKSPACE` 注释原文）；tarball 里 peers 表达"验证过的宿主 API 面"，矩阵每列 = 真实验证过的 pin tag。
7. **干净 profile 预置而非依赖 initProfile**：自定义 profile 名走 `DEFAULT_PROFILE_BUNDLES`（只有 dsh-base，起不了 web）——release-smoke 预写 package.json（web 模板形状 bundles + `patchReload: startup`）+ pnpm-workspace.yaml（vendor 模板镜像）+ `.npmrc`（store 钉 repo 内，§11 先重定向后使用）；initProfile 对已存在文件零改动。
8. **fresh home 首访必弹 Internal Testing Notice 模态框**：守卫必须**等它出现**再关（goto 返回时它往往没挂载完，条件检查扑空——实证一次）；另设兜底：还剩可见模态框就点名失败。

## 环境状态（下轮会话判断"哪些已就绪"读这里）

- 两层门禁全绿（verify ALL PASS / test 39/39）；工作树 = 本 Note 所属提交，无未收改动。
- `snapshots/r3-delegation/replay/` 新增 5 个金样/sidecar 文件（ui.expected.md + sidecar×4）；
  录制（raw/ + fixtures）**没有重录**——扩展组合（三组新行）经重放零 diff 证明零会话事件，
  原 P1.2 录制仍是有效输入（决策见研究笔记 §8）。
- `dev/harness-home/tmp/` 新增 `release-pack/`（tarball 落点）与 `npm-cache/`（§11 重定向），
  gitignored，可删；干净 profile `release-check` 已被脚本回收（`--keep` 才保留）。
- `pnpm-lock.yaml`：根 devDeps 多 `dsh-company-pack: workspace:*`；pack importer 的 peers 由
  workspace 链接满足（auto-install-peers 记录在 dependencies 节，无 registry 拉取）。
- dev web profile 未动（link: 安装照旧）；其 pack manifest 读取是运行时 fresh 的，peers 化无需重装。

## 残留与去向

| 项 | 去向 |
|---|---|
| teammate 共享 CEO preset，其 `subagent` 行与 team shadow 相冲 | 与升 pin 一起处理（`sync-dsh --pin`；`docs/delegation.md` §4.4）——本轮无新 tag 可升，不占轮次 |
| `sync-dsh --pin` 全程序未真跑（无新 tag） | 首次真实升 pin 时执行；预检守卫（脏树拒绝）已实证 |
| R5b 的回放断言（r2-motion 录制喂在场板读模型） | R5b 轮内做，喂法 = `replay-smoke --scenario`（harness 已就绪） |
| research 笔记 §8 记录的 P1.3 六机制 | [research/2026-09-23-replay-harness-feasibility.md](../research/2026-09-23-replay-harness-feasibility.md) §8 |
