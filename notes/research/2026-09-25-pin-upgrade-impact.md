# 2026-09-25 · 升 pin 候选窗口实测：影响面清单 + 一处硬阻塞

状态：进行中（①a 候选测量窗口已跑完静态与轻量面；`vendor/dsh` 工作树 HEAD 暂在 `477b4f42`，tracked 零改动）

## 怎么测的

`https` 抓 rc.2 的 tag 对象（不动 origin、不动 HEAD）→ `git -C vendor/dsh checkout dsh-v0.1.7-rc.2`
→ 在候选上跑 `pnpm install` / `pnpm verify` / `pnpm test` / `pnpm --dir vendor/dsh run build`。

## 已经在候选上通过的

- **`pnpm install` ✓**（5m03s，+169 包：`dsh-agent-presets` → `dsh-agent-preset` + `dsh-agent-preset-registry`，
  `dsh-tool-present` 换址到 `packages/deliverables/tool-present`）。
- **`pnpm verify` ✓** 除 `vendor-pin`（簿记仍指旧 SHA，窗口内预期）。
- **`pnpm test` 178/178 ✓**（前提是做完下面 A/B 两组的改造）。

## A. 声明面（本地已改，未提交）

1. **install 级阻塞**：根 `package.json` 的 `"@deepseek-ai/dsh-agent-presets": "workspace:*"` —— 该包在 rc.2
   **不存在**（拆为 `dsh-agent-preset` + `dsh-agent-preset-registry`），pnpm 直接 `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND`。
   已改为两个新包。
2. pack manifest：peer 名替换 + 全部 `dsh-*` range → `^0.1.7-rc.2`（`@deepseek-ai/cordis` `^4.0.2` 仍满足
   rc.2 的 4.0.4，不动）；`dsh.bundle.patch` 由**单文件字符串改为数组**（registry 1 + 角色预设 5）。
3. `cordis.patch.yml`：旧的 `agent-presets` 行（roots 目录扫描）→ `agent-preset-registry` 行
   （`default: ceo`；按 id 替换 web-app 在 rc.2 的 insert 行）。
4. 五份 `presets/<role>/agent.cordis.yml`：包进 `- insert:` + 一行 `@deepseek-ai/dsh-agent-preset`
   （`config.id` = 角色、`config.plugins` = 原行内联）；原 `preset.yml` 的 name/description/order 内联后删除。
5. `dev/company.overlay.yml`：同上改 registry 行。

## B. 测试与门禁（本地已改，未提交）

6. `tests/presets.spec.ts` 引入的 `vendor/dsh/packages/preset/agent-presets/src/discovery.ts` 在 rc.2
   **已不存在** ⇒ 扫描型断言改为声明形状断言（真挂载的完成定义归 `preset-smoke`）；缩进敏感的正则
   `^- id:` → `^\s+- id:`；`preset.yml` 读取改行内 `config.name/description`。
7. `tests/presence-board.spec.ts` 的显示名同源断言改读行内 `config.name`。
8. `scripts/verify.mjs`：`pack-bundle` 接受字符串**或数组**；preset 结构门禁不再要求 `preset.yml`。

## C. 环境/工具面（未解，但都有绕过）

9. vendor postinstall `install-lefthook.mjs` 在本仓 submodule 布局下失败
   （`cannot enable extensions.worktreeConfig while core.worktree is in the common config`）。
   上游自带逃逸口：`CI=true` 时该脚本直接 return（**两个 pin 都有此脚本，非新回归**——root install 不触发它，
   `pnpm --dir vendor/dsh` 才触发）。⇒ 构建与官方同步须带 `CI=true`。
10. vendor 自带 `clean` 在 rc.2 自身报错：`clean: expected TypeScript outDir to end in /types:
    lib/desktop-keyboard-test-types` ⇒ 不能依赖它清生成物（本轮改为按 `.gitignore` 覆盖的 `lib/`、`.typecheck`、
    `*.tsbuildinfo` 定向清，清后 `git -C vendor/dsh status --porcelain` 仍为空）。

## D. 硬阻塞（未解；需裁决）

11. **`pnpm --dir vendor/dsh run build`（= `build:lib:host`，也是官方 `sync-dsh` 第③步）在干净生成物状态下必失败**：

```
ERROR  Error: [@deepseek-ai/dsh-root] Cannot find entry: ["lib/types/{index,invariant,startup}.js"]
```

- 该 entry 由根 `tsdown.config.ts` 对**每个 workspace 成员**统一声明；根包 `@deepseek-ai/dsh-root` 无 `src/`、
  无 `exports`，而 typert 生成器明确跳过"无 `./typert` export"的包 ⇒ **没有任何流水线步骤产出这三份文件**。
- 旧 pin 时代它们以旧产物形式躺在树里（本机是 Sep 22 生成），所以一直没暴露；一旦为防旧产物污染而清理
  （升 pin 必须清），就再也生成不出来。
- 排除手段均失败：`tsdown -F` 按 name / cwd / 正则四种写法都得 `No valid configuration found`；vendor `clean`
  自身报错（见 10）。已查过 vendor 的 `scripts/`、两个 pin 的 `tsconfig.host.json`/`tsdown.config.ts` 差异、
  `Makefile`、CI workflow 与 `scripts/run-gates.ts`（CI 也是同一条 `pnpm run build`）——**没找到那个前置步骤**。
- 影响面：本仓 dev-loop §7 的 `tsdown --env.DSH_BUILD_FACE host` 与官方同步的 vendor 自建**都走这条命令**。

## 等裁决的两条路

1. **带登记的本地前置**：以官方发布产物补齐根包缺的三份 `lib/types/*.js`（来源需选定并留证），或临时以
   自定义 config 排除根成员——两者都是偏离官方构建程序，须写 D 号并把证据留在本条。
2. **交上游**：把 11 作为 rc.2 的构建前置问题提给上游（或先核对上游 CI 是否靠暖产物通过），期间本仓
   停在"候选已测量、声明面已改"的状态。
