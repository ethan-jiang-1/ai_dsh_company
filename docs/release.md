# release · 发布形状的现在时（company-pack）

> 顶层合同：pack 的依赖姿态、兼容矩阵、真实安装冒烟程序、升 pin 程序。
> 依据：guides/60 §5（发布纪律时点表）+ FAQ 13（外部研究：dsh-market / dsh-im 生态姿态）。
> 执行器：`scripts/release-smoke.mjs`（发布冒烟）与 `scripts/sync-dsh.mjs`（升 pin）。

## 依赖姿态（R5a 起的现在时）

- **runtime 依赖 = `peerDependencies`，拒绝精确钉死**（`dependencies` 面已清空）：
  `@deepseek-ai/cordis ^4.x` + 组合行用到的全部 `@deepseek-ai/dsh-* ^0.1.5-rc.2`。
  理由：DSH API 仍 pre-stable，精确钉 = 每次上游同步逼发版（FAQ 13 生态失败样本）；
  dsh-market 姿态。
- **为什么 peers 装不进 profile 也无碍**：profile 模板自带 `autoInstallPeers: false` +
  `nodeLinker: hoisted`（vendor `app-boot/src/profile.ts` 的 `PROFILE_PNPM_WORKSPACE`）——
  out-of-tree 插件的 peers 由**安装锚兜底解析**（行解析顺序：installation anchor 先于
  profile 目录），所有插件共享 dsh 安装侧的同一份 cordis/工具包，不出现第二份单例。
  peers 是**声明语义**（"验证过的宿主 API 面"），不是安装要求。
- **client 面自打包**：`lib/client.js` 由 tsdown 产出，react 与 `dsh-client-*`/`dsh-api-*`
  留作浏览器模块表 require（见 `packages/company-pack/tsdown.config.ts` 外置规则），
  其余内联——所以 tarball 的浏览器半零 runtime 依赖。
- **exports 不说谎**：`./src/*` 出口已摘（tests 一律相对路径导入源码面；tarball 的 `files`
  不含 src，留着一个指向不存在文件的出口就是发布形状的谎言）。

## 兼容矩阵（`dsh.compatibility.dshReleases`）

```json
"dsh": { "compatibility": { "dshReleases": ["dsh-v0.1.5-rc.2"] } }
```

- 语义：**每个列名都是真实验证过的 vendor pin tag**（升 pin 走 sync-dsh，冒烟过了才加列）。
- 机械门禁：`pnpm verify` 的 `pack-compat`——当前钉住 tag 不在矩阵里就红
  （升 pin 忘加列 = 没验证过就装作验证过）。`sync-dsh` 检查模式同时核对四处簿记一致
  （submodule HEAD / verify.mjs 常量 / AGENTS.md 簿记行 / 矩阵）。

## 发布冒烟（`node scripts/release-smoke.mjs`，认证档）

程序（脚本按序执行，任一步失败即红）：

1. **构建发布面**：`tsc -p packages/company-pack` + tsdown（从当前源码长出，不拿陈旧 lib/ 凑数）。
2. **`npm pack`**：tarball 落 `dev/harness-home/tmp/release-pack/`（npm cache 重定向进
   repo gitignored 区——纪律 §11）。
3. **干净 profile**：dev harness home 下 `release-check`，**先删后建**；预置
   `package.json`（bundles = web 模板形状 `[dsh-base, dsh-web-app]` + `patchReload: startup`——
   自定义 profile 名走 DEFAULT 只有 dsh-base，起不了 web）+ `pnpm-workspace.yaml`
   （hoisted + autoInstallPeers: false，vendor 模板镜像）+ `.npmrc`（store/cache 钉 repo 内，§11）。
4. **`dsh plugin --profile release-check add file:<tarball>`**（⚠ `--profile` 挂在 plugin
   子命令上，给父级会被拒）→ 断言：bundles reconcile 进 `dsh-company-pack`、安装副本带
   `presets/` + `lib/client.js`、peers 在 manifest 里、矩阵在场。
5. **boot + RPC 冒烟**（preset-smoke 断言形状，跑在发布组合上）：`dsh --profile release-check --
   --port 0 --no-open`（⚠ web 是子命令别名，自定义 profile 走默认命令）→ roster 五角色零
   broken + `session/create` 挂上 ceo + 浏览器模块表含本包 client 行。

判据：全绿 = 真实安装形状可用（dev profile 的 `link:` 安装**不算数**——符号链接直指源码，
永不走 files/exports/peers 的发布面）。开发中三次真实红（tsdown shim 路径 / plugin 的
`--profile` 位置 / web boot 的 profile 语法）即本脚本的敏感度实证。

## 升 pin 程序（`node scripts/sync-dsh.mjs [--pin <tag>]`，认证档）

- **默认（检查模式）**：四处簿记一致性核对，只读。
- **`--pin <tag>`**：预检两边工作树干净 → fetch tags + checkout → 簿记两处
  （AGENTS.md + verify.mjs）→ 矩阵加列 → `pnpm install` → `verify + test` → `release-smoke`。
  ⚠ vendor 构建产物（lib/、web dist、client bundles）不在此脚本职责——那是 guides/60 §7
  的配方（一处事实一个家）；dist 陈旧会让 release-smoke 的 boot 红，按 §7 重建后重跑。
- vendor 铁律不受影响：checkout 已发布 tag 不是"改 vendor"。

## 版本纪律

- pack 版本 `0.2.0`（`private: true`——**尚未发布到任何 registry**；真实发布动作
  （npm publish）等出现第二个消费者/部署需求时再定，当前 release-smoke 验证的是
  `file:` tarball 安装形状）。
- 发布前必跑：`pnpm verify` + `pnpm test`（迭代环）+ `release-smoke`（认证档）；
  preset/内容改动另跑 `preset-smoke`（guides/60 §9.1 分层）。
