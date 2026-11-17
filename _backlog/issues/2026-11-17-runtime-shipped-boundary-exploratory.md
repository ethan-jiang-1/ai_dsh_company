---
status: 待落地
opened: 2026-11-17
---

# 推敲：运行时 / 发布面与开发时刻的分离（C13）

> 立卡：2026-11-17 ｜ 状态：待落地 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：否
>
> **结论/去向**：implementation — 本卡执行 C13 的探索与证据（缺陷另开 `_backlog/bugs/` 卡；编号唯一源 = [bugs/README](../bugs/README.md) 的 Next；本组分配 BUG-213..222，Next = 223）；本卡不改产品代码。
>
> **授权边界**：静态 / tarball / 隔离安装 / 真入口可自主；不修产品代码；不改 vendor；发布字节只读（不重打 `_dist`）。
>
> **前序**：[C12 归属波次卡](2026-11-17-ownership-wave-exploratory.md) 已收 10 张 BUG-202..211（调查中）。本卡是用户新方向：「不少脚本/代码发布到运行时的不应该那么多；运行时的代码/脚本不应该依赖开发时刻的脚本，比如测试、设置环境、未来测试/验证什么的」。

## 问题与期望结果

`packages/company-pack` 是**随包发布的运行时插件**：安装后只有 tarball 里的字节 + DSH 宿主。仓库里的大量东西——`tests/`、`checks/`、`probes/`、`tools/`、`runtime/`、`_backlog/`、`notes/`、setup / release 脚本——是**开发时刻**的。边界一旦泄漏，就会以三种形态出现在发布面：

1. **多发了**：类型声明、源码注释、开发文档、dev metadata、source map 引用等只对开发/构建有用的字节进了 tarball；
2. **少发了**：运行时真正需要的包/模块/声明没进 `peerDependencies`/`client.inject`/`files`，靠宿主 hoisting 或仓库暖树才跑得起来；
3. **说错了**：shipped README / 组合注释 / 技能说明让安装后的读者去跑仓库 dev 命令或打开 dev 路径。

`pnpm test` / `pnpm verify` 都在**仓库树**里跑，证明不了这三种；只有拆开 tarball、按安装形状读、按声明的依赖表加载，才看得见。本卡用 **tarball × package.json × 安装形状 × shipped 文本** 四条线取证，每条结论都要有「盘面/字节 + 声明的面 + 负控」；不把「仓库里能跑」当「安装后能跑」。

**当前基线（2026-11-17 17:30 实测）：** `pnpm test` 261 files / 2203 tests；`pnpm verify` ALL PASS；`pnpm typecheck` exit 0；version 0.11.9；tarball = `_dist/dsh-company-pack-0.11.9.tgz`（506 KB，268 entries）。

**tarball 现状（实测）：**

| 面 | 数量 / 大小 | 备注 |
|---|---|---|
| `lib/` | 137 entries | 只有 `lib/index.js` / `lib/client.js` 两个运行时 JS；其余 135 个是 `.d.ts` |
| `lib/types/` | 660 KB / 135 `.d.ts` | `files` 显式收 `lib/types/**/*.d.ts` |
| `content/` | 85 entries / 368 KB | 运行时手册/模板/产品类型 |
| `presets/` | 39 entries / 300 KB | 运行时 preset + skills |
| `locale/` | 2 | 运行时文案 |
| 其余 | README / package.json / LICENSE / icon / cordis.patch.yml | README 是 dev 文档，随 npm 自动带上 |

## C13 的六条轴

| ID | 轴 | 问题 | oracle |
|---|---|---|---|
| A | **tarball 内容** | `files` 收进来的东西里，哪些是运行时必需、哪些是类型/构建/文档/测试面；有没有 test/fixture/**source map 引用**/dev 目录 | `tar -tzf` × `files` × 安装后实际被加载的入口（`main`/`exports`/`dsh.bundle.patch`/`dsh.client`） |
| B | **package metadata** | `scripts`/`files`/`dependencies`/`peerDependencies`/`devDependencies`/`exports` 里有没有 dev-only 条目、死引用、workspace 协议、缺失的运行时 peer | `package.json` × 实际 `require`/`import` × 干净安装/`npm pack` 实跑 |
| C | **运行时 import** | `packages/company-pack/src/**` 是否 import 了 `tools/`/`checks/`/`tests/`/`scripts/`/`vendor/`/dev 工具；构建产物是否 external 了未声明的包 | 静态 import 图 + 构建后 `lib/*.js` 的 `require` × peer/inject 声明；负控 = 假 module table 加载 |
| D | **shipped 文本** | README / `cordis.patch.yml` / `presets` YAML / 技能脚本 / 源码注释是否让安装后的读者去跑 dev 命令、打开 dev 路径；相对链接在包外是否断 | tarball 内链接存在性 + 路径存在性 + 「是否在包内」判定 |
| E | **安装形状** | 去掉仓库 `node_modules`/dev 脚本后，`lib/index.js`/`lib/client.js` 需要的模块是否齐全；source map 引用是否有对应文件；`npm pack`/`npm install` 是否还能完成 | 隔离目录 + 假 module table + `npm pack` 实跑；真入口（company-entry/client-load）只作补充 |
| F | **dev-only 内容** | `content`/`presets` 是否携带测试 fixture、demo、dev 命令、内部 backlog 引用 | 内容静态扫描 + 运行时会读取的文件清单 |

## 首轮假设（先写死，2026-11-17）

| ID | 假设 | oracle | 入口 |
|---|---|---|---|
| C13-1 | tarball 里类型声明/dev 文本/README 等非运行时字节占多数；`files` 可以收窄而不影响安装 | `tar -tzf` + `files` + `main`/`exports`/`dsh` 的加载面 | `_dist/dsh-company-pack-0.11.9.tgz`、`packages/company-pack/package.json` |
| C13-2 | shipped `package.json` 仍引用仓库 dev 脚本（`prepack`）或 `workspace:*` devDeps；安装后的包不能自己 `npm pack`/`npm install` | 解包后 `npm pack --dry-run`、`npm install --dry-run` | tarball 解包目录 |
| C13-3 | 运行时 `src` 或构建产物 import 了只声明在 `devDependencies`（而非 `peerDependencies`）的包，靠宿主 hoisting 才跑 | `src` import 集 × `lib/*.js` require 集 × `peerDependencies`/`dsh.client.inject` | `packages/company-pack/src`、`lib/*.js`、`package.json` |
| C13-4 | shipped README / `cordis.patch.yml` / preset YAML / 源码注释含 dev-only 路径；包外相对链接断 | tarball 内链接存在性 + 包外判定；路径存在性 | tarball 解包、`README.md`、`cordis.patch.yml`、`presets/**` |
| C13-5 | `lib/*.js` 有 `sourceMappingURL` 但 tarball 没有 `.map`；浏览器/调试器请求 404 | `grep sourceMappingURL` × `tar -tzf '*.map'` | tarball |
| C13-6 | `content`/`presets` 携带测试 fixture、demo、dev 命令或内部 backlog 引用 | 内容静态扫描 + 运行时读取面 | `content/**`、`presets/**` |
| C13-7 | `lib/types` 的 135 个 `.d.ts` 中，只有两个 `exports.types` 入口可达；其余是内部声明，运行时/安装均不需要 | `exports` × `.d.ts` 引用图 × 安装后是否被任何运行时入口读取 | tarball、`lib/types/**` |
| C13-8 | shipped README 要求 pnpm（dev/包管理器）才能安装；npm-only / Desktop-without-pnpm 路径没有 fallback | README 的前置节 × DSH 安装路径 × 实际命令 | `README.md`、安装手册、`company-entry` |
| C13-9 | `dsh.client.inject` 声明的依赖边与 `lib/client.js` factory 实际 `require` 不一致（缺 primitives/react， 多报 8 条） | 假 module table 加载 + `package.json` 声明 | `lib/client.js`、`package.json` |
| C13-10 | shipped 文本里的 dev 引用没有被任何门禁覆盖；`release --check` 只查源码指纹，不查 tarball 文本 | 负控 = 往 shipped 文本加一条 dev 路径，看门禁是否红 | `pnpm release --check`、`pnpm verify` |

## 预检坐标（只读，2026-11-17；是起点，不是本轮结论）

| # | 载体 | 预检看到什么 | 轴 | 首轮怎么证伪 |
|---|---|---|---|---|
| 1 | tarball `lib/` | 137 entries；运行时 JS 只有 2 个；135 个 `.d.ts`（660 KB） | A/E | `tar -tzf` × `exports` × `main`；[BUG-213](../_archive/fixed_bugs/BUG-213-tarball-ships-type-dts-majority.md) |
| 2 | tarball `package.json` | `scripts.prepack = node scripts/prepack-check.mjs`，但 `package/scripts/` 不存在；`npm pack --dry-run` exit 1 | B | 解包 `npm pack --dry-run`；[BUG-214](../_archive/fixed_bugs/BUG-214-shipped-prepack-missing-scripts.md) |
| 3 | tarball `README.md` | 5/5 相对链接指向包外（`docs/`/`probes/`/`_backlog/`）；另有 tests/repo/... 与 pnpm 前置 | D | 包内链接解析；[BUG-215](../_archive/fixed_bugs/BUG-215-shipped-readme-dev-links.md) |
| 4 | tarball `lib/*.js`、`lib/types`、`cordis.patch.yml`、preset YAML、技能脚本 | 共 76 处 dev 路径引用（lib/index 22、lib/client 16、types 27、README 7、cordis 4） | D | 逐文件 grep + 包内存在性；[BUG-216](../_archive/fixed_bugs/BUG-216-shipped-comments-dev-paths.md) |
| 5 | tarball `lib/client.js` + `package.json` | 只 require `@deepseek-ai/dsh-client-ui-primitives`（不在 peer/inject）+ react；`client.inject` 9 条里 8 条未被 factory require | C/E | 假 module table；[BUG-217](../_archive/fixed_bugs/BUG-217-client-inject-missing-primitives.md) |
| 6 | tarball `package.json` | `devDependencies` 24 条、其中 21 条 `workspace:*`；`dependencies` 缺失；全部运行时包走 peer | B | 解包 `npm install --dry-run`；[BUG-219](../_archive/fixed_bugs/BUG-219-shipped-devdeps-workspace-protocol.md) |
| 7 | tarball `lib/*.js` | 两个 bundle 各 1 条 `sourceMappingURL=*.js.map`；tarball `.map` 0 个 | A/E | grep + tar；[BUG-220](../_archive/fixed_bugs/BUG-220-sourcemap-url-missing-maps.md) |
| 8 | tarball `README.md` 前置 | Desktop 自带 pnpm；npm CLI / Plugins 页要求 pnpm 在 PATH；无 npm-only fallback | D/E | README 行 + 安装路径；[BUG-218](../_archive/fixed_bugs/BUG-218-readme-pnpm-runtime-prereq.md) |
| 9 | tarball `package.json` `dsh.client.inject` | 9 条声明 vs factory 实际 1 条 require；注入面大于/错于运行时面 | C | 假 module table；[BUG-221](../_archive/fixed_bugs/BUG-221-client-inject-over-declared.md) |
| 10 | tarball `lib/client.js` | external 了 `react`/`react/jsx-runtime`，但 peerDependencies / client.inject 都没有 react | C/E | 假 module table（提供 react 才能继续）；[BUG-222](../_archive/fixed_bugs/BUG-222-client-react-not-declared.md) |

## 方法（每轮固定）

0. **拆包**：`tar -tzf` + 解包到 `runtime/tmp/c13/`；先算「运行时入口加载面」= `main`/`exports`/`dsh.bundle.patch`/`dsh.client`，其余字节默认可疑。
1. **声明对账**：`files` × tarball、`peerDependencies`/`devDependencies` × `src` import / `lib` require、`client.inject` × factory require；一处事实一个表。
2. **安装形状**：解包目录 + 假 module table + `npm pack --dry-run`；不依赖仓库暖树与 `node_modules`。真入口 lane 只作补充，不替代包内检查。
3. **文本面**：tarball 内 README/`cordis.patch.yml`/presets/源码注释逐条判「安装后是否存在」；包外相对链接一律按断链算。
4. **负控**：往 shipped 文本加一条 dev 路径 / 删一个 peer / 去掉一个 map，看声明或门禁是否红；没有负控写 `unverified`。
5. **判决 + 证据**：每格 PASS/FAIL/未证；FAIL 开 `_backlog/bugs/` 卡（Next 212 起）；证据落 `runtime/tmp/c13/`（gitignored）。
6. **回填**：本卡 `## Round 97/98`；同步 [issues/README](README.md) 与 [bugs/README](../bugs/README.md)。

## 轮次与停止

| 轮 | 轴 | 内容 | 成本 |
|---|---|---|---|
| Round 97 | A/B/C | 拆包、`files` × tarball、`src`/`lib` 依赖 × peer/inject、`npm pack` 负控 | keyless 静态，90 分钟 |
| Round 98 | D/E | shipped 文本/链接、source map、假 module table、安装形状 | keyless，90 分钟 |
| Round 99 | F + 真入口 | `content`/`presets` 内容面；`company-entry`/`client-load` 补充（若需要） | 真入口，90 分钟；无 live 则写未跑 |

**停止规则：** 3 轮后无新材料 → 收口；至少 10 张；用户叫停优先。已有 C12 的 10 张不重开。

## 证据、判据与处置

- **oracle 阶梯**：tarball 字节 + `package.json` 声明 > 解包安装形状 > 假 module table > 真入口 lane > 仓库内 `pnpm test`（最后只是底线）。
- **载体分类**：runtime（安装后会被加载）/ type（只给 TS）/ dev（仓库/构建）/ shipped-text（README/注释/YAML 注释）/ generated（手册/索引）。只有 runtime/type/shipped-text 可判发布面缺陷；dev 不进包不算。
- **三种误判**：① 把「仓库里能跑」当「安装后能跑」；② 把「`files` 里写了」当「运行时需要」；③ 把「peer 声明」当「宿主一定提供」。
- **处置**：材料性 → BUG 卡（复现/根因/同类/已修判定）；非材料性 → 观察 + owner。不修产品代码。

## 验收标准

1. A–F 六轴各至少一轮，或逐项写未跑 + owner；每轮有期望 vs 实测与证据坐标。
2. 每个 tarball 结论有字节/entry 证据；每个依赖结论有 `src`/`lib` 的实际 require/import；每个文本结论有包内存在性。
3. 每个「shipped 面不依赖 dev」的结论有负控：删/加一条 dev 引用或一个 peer，看门禁/加载是否红；没有负控写 `unverified`。
4. 至少 10 张 BUG 卡（212 起），全部 `调查中`，不修产品代码。
5. 回填 `## Round 97/98`，更新两张索引；`pnpm verify` ALL PASS；`pnpm test` 绿。
6. 不把「仓库内全绿」写成「发布面干净」；不把「tarball 有该文件」写成「运行时需要」。

## 落地证据

- 本卡是 charter/证据卡，不改产品代码；系统面 = 本卡 + 10 张 BUG 卡 + 索引。
- 立卡基线（实跑）：`pnpm test` 261 files / 2203 tests；`pnpm verify` ALL PASS；`pnpm typecheck` exit 0。
- 拆包/静态证据（实跑）：`tar -tzf _dist/dsh-company-pack-0.11.9.tgz`；解包后 `npm pack --dry-run` exit 1；README 5/5 相对链接断；`lib/*.js` 2 处 sourceMappingURL、0 个 `.map`；假 module table 缺 primitives。

## 关闭条件

- A–F 每轴至少一轮，或逐项写未跑原因；C13-1..C13-10 全部判决。
- 3 轮内无新材料 → 收口；未跑面保留并标 owner。
- 所有 finding 已分诊（BUG 卡/观察/deliberate）；不写「没有 bug」。
- `pnpm verify` + `pnpm test` 绿；审查记录齐后归档。

## Round 97（2026-11-17 · A / B / C · tarball 与依赖声明）

**状态：** keyless 静态 + 解包实跑；不开 live。

| 假设 | 判决 | 证据 / BUG |
|---|---|---|
| C13-1 tarball 非运行时字节占多数 | **confirmed** | `lib/` 137 entries = 2 运行时 JS + 135 `.d.ts`（660 KB）；`files` 显式收 `lib/types/**/*.d.ts` → [BUG-213](../_archive/fixed_bugs/BUG-213-tarball-ships-type-dts-majority.md) |
| C13-2 shipped manifest 引用 dev 脚本/协议 | **confirmed** | `package/scripts/` 0 条但 `prepack` 指向 `scripts/prepack-check.mjs`；解包 `npm pack --dry-run` exit 1；`devDependencies` 24 条 / 21 条 `workspace:*`，`npm install --dry-run` EUNSUPPORTEDPROTOCOL → [BUG-214](../_archive/fixed_bugs/BUG-214-shipped-prepack-missing-scripts.md)、[BUG-219](../_archive/fixed_bugs/BUG-219-shipped-devdeps-workspace-protocol.md) |
| C13-3 运行时 require 与 peer/inject 不一致 | **confirmed** | `lib/client.js` 只 require primitives + react；primitives 不在 peer/inject，react 不在 peer/inject；inject 9 条里 8 条未被 factory require → [BUG-217](../_archive/fixed_bugs/BUG-217-client-inject-missing-primitives.md)、[BUG-221](../_archive/fixed_bugs/BUG-221-client-inject-over-declared.md)、[BUG-222](../_archive/fixed_bugs/BUG-222-client-react-not-declared.md) |
| C13-5 sourceMappingURL 无 map | **confirmed** | 两个 bundle 各 1 条 `sourceMappingURL`；tarball `.map` 0 → [BUG-220](../_archive/fixed_bugs/BUG-220-sourcemap-url-missing-maps.md) |

**负控（实跑）：**

| 负控 | 结果 |
|---|---|
| 解包 `npm pack --dry-run` | exit 1（`node scripts/prepack-check.mjs`） |
| 解包 `npm install --dry-run` | exit 1（`Unsupported URL Type "workspace:"`） |
| 假 module table（只给 `client.inject` + react）加载 `lib/client.js` | `factory_error=not declared: @deepseek-ai/dsh-client-ui-primitives`；required 三条 |
| tarball `.map` 计数 | 0；sourceMappingURL 2 |

**证据坐标：** `runtime/tmp/c13-dist/`、`runtime/tmp/c13-npm-pack.log`、`runtime/tmp/c13-npm-install.log`。

## Round 98（2026-11-17 · D / E · shipped 文本与安装形状）

**状态：** keyless 静态；无产品代码改动。

| 假设 | 判决 | 证据 / BUG |
|---|---|---|
| C13-4 shipped README/注释含 dev-only 路径、包外断链 | **confirmed** | README 5/5 相对链接断；README 7 处 dev 引用；`lib/index.js` 22 + `lib/client.js` 16 + `lib/types` 27 + `cordis.patch.yml` 4 = 76 处 dev 路径 → [BUG-215](../_archive/fixed_bugs/BUG-215-shipped-readme-dev-links.md)、[BUG-216](../_archive/fixed_bugs/BUG-216-shipped-comments-dev-paths.md) |
| C13-8 README 把 pnpm 写成运行时前置 | **confirmed** | README 行 9/10/62；`engines` 无包管理器；无 fallback/检查 → [BUG-218](../_archive/fixed_bugs/BUG-218-readme-pnpm-runtime-prereq.md) |
| C13-10 dev 引用无门禁 | **confirmed（构造性）** | `pnpm verify`/`md-links` 在仓库树绿（README 链接目标在仓库内存在）；`release --check` 只查源码指纹，不扫 tarball 文本；无 shipped-text 判据 |

**未跑：** 真 `company-entry` / `client-load` 本轮未重跑（无产品代码改动；tarball 是只读输入）；clean install 在无 pnpm 环境的实跑未做。

## Round 99（2026-11-17 · F · content/presets 内容面）

**状态：** 静态扫描；无 live。

| 假设 | 判决 | 证据 |
|---|---|---|
| C13-6 content/presets 携带测试 fixture/demo/dev 命令 | **refuted（本波）** | `content/**` 与 `presets/**` 的 `pnpm`/`node tools`/`tests/`/`checks/`/`probes/`/`_backlog` 扫描：0 处 dev 命令；`zz-`/`fixture`/`nonexistent` 0 处；唯一 tests/simulation/samples 是质量环方法里的通用证据类别，不是仓库路径 |
| 运行时技能脚本 | **pass（无 dev 依赖）** | `presets/_shared/skills/quality-loop/scripts/verdict-hash.mjs` 只用 `node:crypto/fs/path/url`；其注释里的 tools/tests 引用由 BUG-216 覆盖 |

**判决：** F 轴本波没有材料性新缺陷；`content`/`presets` 的运行时面干净。

## 判决汇总

| ID | 判决 | BUG |
|---|---|---|
| C13-1 | confirmed | 212 |
| C13-2 | confirmed | 213 / 218 |
| C13-3 | confirmed | 216 / 220 / 221 |
| C13-4 | confirmed | 214 / 215 |
| C13-5 | confirmed | 219 |
| C13-6 | refuted（本波） | — |
| C13-7 | partial（类型面） | 212 |
| C13-8 | confirmed | 217 |
| C13-9 | confirmed | 216 / 220 / 221 |
| C13-10 | confirmed（构造性） | 214 / 215 |

**本轮共开 10 张 P2 卡（BUG-213..222）**，全部 `调查中`，不修产品代码；未跑面 = 真
`company-entry`/`client-load` 重跑、无 pnpm 安装环境实跑、clean clone。没有「发布面干净」的结论。

## 执行记录

- 2026-11-17 ｜ 立卡（focus v8 / C13）｜ 本卡 + bugs/README + issues/README ｜ 拆包与静态预检 10 条 ｜ `pnpm verify` ALL PASS ｜ Round 97–99 待跑。
- 2026-11-17 ｜ Round 97–99 ｜ `runtime/tmp/c13-*` ｜ 拆包/解包 npm 两个负控/假 module table/README 链接/76 处 dev 引用/类型面 135 ｜ 10 张 BUG-213..222（调查中，不修） ｜ `pnpm verify` ALL PASS；`pnpm test` 261/2203 ｜ 真 lane 重跑与无 pnpm 安装未跑。
