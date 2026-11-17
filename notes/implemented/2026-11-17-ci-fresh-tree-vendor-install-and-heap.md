状态：implemented

# CI 新鲜树两处隐性前提收口（vendor install + setup heap）+ attachment WARN 登记

> 2026-11-17 只读 L1 评估后的修理轮。红态全部来自 GitHub Actions 真实 run 的 log（本机暖树不可复现）；
> 搜过 notes/：archived [2026-09-27-enforcement-channel-and-boundaries](../../notes/archived/2026-09-27-enforcement-channel-and-boundaries.md)
> 已登记「mdast 三件套经 `vendor/dsh/package.json` 解析，裸 checkout 无 store 即 MODULE_NOT_FOUND」的解析锚决定——
> 本 Note 不取代它，只把它的 CI 前提装上；无既有 owner 拥有「CI 里的 vendor install 步」。

## 决定

1. **ci.yml `verify` job 与 fresh-clone.yml `install-verify`（双 OS）在根 install 后补一步
   `pnpm -C vendor/dsh install --frozen-lockfile --ignore-scripts`。**
   依据链：verify 的 YAML/MD 解析原语（[tools/lib/core/repo-markdown.mjs](../../tools/lib/core/repo-markdown.mjs)）经
   `vendor/dsh/package.json` 锚解析 `js-yaml`/`mdast`；vendor 根不是 workspace 项目
   （[pnpm-workspace.yaml](../../pnpm-workspace.yaml) 只收 `vendor/dsh` 的子树 glob），根 install 不装它的依赖；
   本地不红只因暖树里 [vendor/dsh/node_modules](../../vendor/dsh) 在场（bootstrap 的 vendor install 步跑过）。
   该步与 [tools/dev/setup.mjs](../../tools/dev/setup.mjs) `install()` 同款命令 = bootstrap「标准引导」的一步，非新依赖面。
2. **fresh-clone.yml `setup-macos` 的 `pnpm run setup` 显式 `NODE_OPTIONS: --max-old-space-size=6144`。**
   OOM 点名：`setup: vendor host types`（vendor `tsc -b tsconfig.host.json`）在 arm64 runner 2GB 默认
   old-space 下 120s 打满（run 43852645841 / job 133248855109）。
3. **[cordis.patch.yml](../../packages/company-pack/cordis.patch.yml) 登记 attachment→trajectory WARN 为预期。**
   本包整行 disabled `ui-trajectory` 后，上游 attachment 行的 inject 指针悬空，preset-smoke 每跑必报一条
   「非本包模块 inject 引用未知包名」；ui-scene 真页面错误环零命中 + 10 页签金样一致 ⇒ 无用户可见残缺，
   处置 = 知悉（登记在惊吓点就地），上游修复后该 WARN 自行消失。
4. **[tools/lib/core/asset-lanes.mjs](../../tools/lib/core/asset-lanes.mjs) 11 条 weekly lane 标 `ciSafe:false` + 实测理由。**
   首次 dispatch 的 fresh-clone（2026-11-16 schedule + 2026-11-17 手动）实证 `keyless-lane --ci` 11 红
   （preset/company-entry/concurrent-home/external-workspace/interrupted-install/isolation-matrix/multi-install/
   permissions-recovery/profile-row/revoke-recovery/upgrade-while-running）——它们需要 dev home、已装 pack、
   `_dist` tarball 等安装态前置，干净 CI 从未具备；此前 `ciSafe` 默认 true 从未在真 CI 里被检验过。
   按 fresh-clone.yml 头注预设的处置（「按实际结果标 ciSafe:false + 理由，不删资产」）收敛：weekly CI
   只声明它真能跑的（6 PASS），这 11 条在本地 pre-push/smoke:all 的证据面不变。

## 输掉的方案

- **根 devDependencies 补 `js-yaml`/`mdast-*`**：制造第二本版本账，与上述 archived Note「复用 vendor 已声明
  解析器、零外部新依赖」冲突；vendor lock 与根 lock 解析到不同版本正是 vendor install 存在的理由
  （setup.mjs 头注：playwright-core 1.61/1.63 冲突实测）。
- **verify job 改跑 `pnpm setup`**：把 ~1 分钟穷举门禁变成全量构建；且 Linux 全量构建有已登记缺口
  （fresh-clone.yml 头注「不在这里假绿」）——范围错配。
- **repo-markdown 造解析失败 fallback**：该文件头注明令不造「永不可达的友好错误分支」；
  解析不到就该炸且点名，缺的是把前提装上，不是把炸藏起来。
- **为 attachment WARN 建门禁或改 lane 静默它**：低频低爆不配门禁；静默会吞掉上游真改动
  （上游若新增悬空 inject，这条通道是唯一会响的哨）。

## 状态事实与载体

- **现状事实**：verify 在新鲜 checkout 上的依赖面 = 「根 install + vendor install」两步（CI 三个 job 已装上）；
  `setup` 全量构建在 2GB 默认 heap 下会 OOM，runner 上需显式放宽；attachment→trajectory WARN 是**预期信号**
  （它的家 = [cordis.patch.yml](../../packages/company-pack/cordis.patch.yml) 注释，不在本 Note 复述第二份）。
- **载体（谁读）**：下次改 CI/workflow 或升 pnpm 的人（本 Note）；看到 preset-smoke 这条 WARN 的新 agent
  （patch 注释就地解答）；CI 排障者（红态 run id + 本 Note 验证表）。
- **形状一致性**：本 Note 与 [.github/workflows/ci.yml](../../.github/workflows/ci.yml)、
  [.github/workflows/fresh-clone.yml](../../.github/workflows/fresh-clone.yml) 同 diff；路径/命令以 workflow 文件为现行家，本 Note 不逐字复述。

## 后果

- CI verify 档每次多 ~30-60s vendor install；换来「新鲜 checkout 上 verify 自足」——本地绿与 CI 绿重新同因。
- `setup-macos` 的 6GB 是 runner 形状假设（macos-latest ≈7GB）；runner 缩水需重估此值。
- 本地暖树行为零变化（vendor/node_modules 本就在场）。

## 验证

| 层 | 失败类 | 负控（见过红） |
|---|---|---|
| CI 新鲜树 · 依赖解析 | install/CI | run 43998433633（ci verify）与 run 43852645841（fresh-clone install-verify 双 OS）：`Cannot find module 'js-yaml'`，requireStack 点名 vendor/dsh/package.json |
| CI 新鲜树 · 全量构建 | 资源上限（OOM） | run 43852645841 `setup-macos`：`FATAL ERROR: Ineffective mark-compacts … heap out of memory`，发生在 `setup: vendor host types`；修复后 run 44004467565 `setup-macos` 走到 `pnpm test` 全绿（OOM 步通过） |
| weekly CI · lane 前提 | 安装态缺失（11 红） | run 44004467565 `keyless-lane --ci`：6 PASS / 11 FAIL / 13 SKIP，FAIL 全是 dev 态前置缺失；标 ciSafe:false 后 weekly CI 只跑真 ci-safe 资产（绿收据 → receipts） |
| 本地门禁（改动后） | — | `pnpm verify` ALL PASS；`pnpm test tests/presets` 138 passed；`node checks/lanes/preset.entry.mjs` 11/11 真挂载 ALL PASS（WARN 按决定③属预期） |
| 真页面（WARN 无残缺） | — | `node checks/lanes/ui-scene.entry.mjs --isolated --expected`：ALL PASS，金样 10 页签一致、错误环零命中 |
| CI 绿收据 | — | push 后 ci run 与手动 dispatch 的 fresh-clone run 绿态收据 → `notes/archived/receipts/`（未绿前本表不写绿） |

## 未覆盖轴

- [environment-gap] GitHub runner 的内存/队列形状本机无法复现（含 ubuntu-latest→26 迁移通告）→ 证据通道 = [.github/workflows/fresh-clone.yml](../../.github/workflows/fresh-clone.yml) 的每周 schedule + 手动 dispatch
- [covered] `pnpm -C` 与 setup.mjs 的 `cwd:` 形式等价性 → 已由同款 vendor install 在本地树的既有在场产物背书 → 锚 = [tools/dev/setup.mjs](../../tools/dev/setup.mjs)
- [policy] push 的 enforcement 通道（pre-push 全量 verify）在本次提交上实际执行 → 锚 = [.githooks/pre-push](../../.githooks/pre-push)
