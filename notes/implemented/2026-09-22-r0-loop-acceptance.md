# 2026-09-22 · R0 立环验收（环境从零到真会话跑通）

## 决定

1. **workspace 形状**（pnpm-workspace.yaml 重写）：glob `vendor/dsh/packages/*/*` 两层深
   （DSH 包在 `<group>/<pkg>`）+ `vendor/dsh/vendor/*`（vendored cordis 全家为 workspace 包）
   + `vendor/dsh/native/system{,/packages/*}`（node-addon-system 源树）；镜像 vendor 的
   linkWorkspacePackages/overrides（路径改指 vendor 内）/peerDependencyRules/allowBuilds；
   patchedDependencies 只留闭包内命中的 node-pty（@yao-pkg/pkg 不在闭包，声明即
   ERR_PNPM_UNUSED_PATCH 硬拒）。
2. **版本逐字对齐 vendor**（用户指令"跟他一样，不要变化"）：根 `packageManager:
   pnpm@11.7.0`、`engines.node ^22.19.0 || >=24.0.0`、devDeps tsx ^4.22.4 /
   typescript ^6.0.3 / @types/node ^22.20.0 / @types/js-yaml ^4.0.9 /
   lightningcss ^1.32.0 / vitest ^4.1.8（后四项是 vendor 根声明的构建工具链，
   tsdown 配置图与 tsc 构建实际需要）。
3. **pnpm 入口修复**：`/usr/local` 老 corepack shim 执行新 pnpm 触发 Node VM 崩溃
   （ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING）→ `corepack enable pnpm`（nvm 自带
   corepack 的 shim 遮住老 shim；经批准的越权写入 nvm bin 目录，一次性机器动作）。
4. **源码面解析门面**：根新增 `tsconfig.json` extends vendor 的 `tsconfig.base.json`
   ——paths 相对声明文件解析，把 @deepseek-ai/* 的 workspace 导入改解析到 vendor `src/`
   （没有它 tsx 落到 `lib/` 构建产物扑空）。
5. **host 面构建（局部路线）**：typert 类型图产物（`lib/typert.host.js` ×5 包）由 tsdown
   的 typertPlugin 生成，前置 tsc -b 六个项目（generator + 五个导出 typert 的包）。
   否决 vendor 全量 `tsc -b tsconfig.host.json`：其根级程序拖 website/benchmarks/tests
   面（2566 错，依赖 vendor 根 devDeps 与 vitepress 等），属 DSH 仓库自身职责面，
   非本 repo 消费者义务。
6. **原生插件零特权编译**：flock（文件锁，JSONL 持久化启动刚需）用 CommandLineTools
   编译：PATH 前置 CLT + `SDKROOT` 指定其 SDK（绕开 Xcode 许可墙，零 sudo 零系统改动）；
   随后用户已把机器 `xcode-select` 切到 CLT，此后裸 cc 直接可用（实测 errno.h 解析 OK）。
7. **presets roots 实测回填**：`plugin add file:` 探针（profile=probe）实测 pack 落
   `<DSH_HOME>/profiles/<p>/node_modules/dsh-company-pack/`，四角色 presets 齐全；
   `company.cordis.yml` 的 CHANGE-ME 占位换为实测路径，合同 `docs/profile.md` 诞生。
8. **.gitignore 补门**：`.pnpm-store/`（沙箱拒默认位置后的仓库内存储，node_modules
   依赖它，只忽略不删）、`.pnpm-debug.log`；`pnpm-lock.yaml` 进版本控制（可复现，
   vendor 同样提交 lockfile）。

## 输掉的方案

- vendor 根纳为 workspace 项目（结束根 devDeps 缺失的一整类问题）——其 postinstall
  （lefthook 安装器）会改写 submodule 的 git 内部状态（worktree 配置/hooks 路径），
  代价高于镜像 devDeps 的窄方案。
- 接受 Xcode 许可——输给 CLT 零特权路线（后用户干脆 xcode-select 切 CLT）。
- 用 npm 预编译的 node-addon-system 平台包替代源码编译——违反钉源码基线（版本混线）。

## 验证（实际跑过）

- `pnpm install` exit=0（282 workspace projects；node-pty/esbuild/koffi/subprocess-local
  的构建脚本经 allowBuilds 正常执行；`lib/bin.js` bin 警告为未构建产物路径引用，源码
  直跑下无害）。
- 局部 `tsc -b`（六项目）exit=0；`tsdown --env.DSH_BUILD_FACE host` exit=0
  （typert.host.js ×5 生成）。
- flock 原生构建 exit=0：`darwin-arm64/bin/system.node`（52232 字节）。
- **立环验收：`source dev/env.sh && pnpm dsh --profile headless "hi, 回一个词就行"`
  exit=0，模型回复"你好"**（真实 API 会话，凭据 = dev home 的 .credentials.yaml，
  由日用 home 复制，chmod 600，gitignore 验证 IGNORED）。
- `plugin --profile probe add file:./packages/company-pack` exit=0；find 实测四角色
  preset.yml 落点。
- `pnpm verify` → ALL PASS（本轮文档改动后）。

## 环境状态（留给 R1 会话）

- 机器级一次性动作已做：corepack pnpm shim 启用；xcode-select 已切 CommandLineTools。
- 仓库级：pnpm-lock.yaml 已提交；vendor 内部构建产物（lib/、system.node）存在且被
  submodule 自身 gitignore 覆盖；引导全配方在 guides/dev-loop §7。
- 未验证：空列表 `cordis.patch.yml` 的 Loader 接受性（probe 已装未起会话，R1 首次
  company profile 会话时验证）；`tsc -b` 全量 host 面（有意不做，见决定 5）。
