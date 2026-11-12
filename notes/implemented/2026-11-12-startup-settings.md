# 2026-11-12 · 项目启动策略：composer 入口 + 右栏「策略」栏

状态：implemented（2026-11-12 落地；验证见下）

上游 = 用户 2026-11-12 三轮定形（「每个项目都可以改、公司有基线」「要 sidebar 不是弹卡」「选项不能写死，第一项自动」）；
研究 = [startup-settings 研究题](../../_backlog/_archive/research/startup-settings/README.md)（机制 / 58 项候选盘点 / DSH 原生落地）；
卡 = [2026-11-12 启动设置落地](../../_backlog/_archive/settled_issues/2026-11-12-startup-settings-landing.md)。

## 问题

每个新项目，模型都要问「是什么产品类型 / 怎么交付」，或者按 SOW/SLA 特征猜；同一项目里不同角色还可能各按各的
口径跑。用户要的是一个**随时能改**的项目级设置：选依赖哪个 wiki、这次按哪类产品、怎么交付——不准模型随意发挥。

## 决定

1. **入口 = composer 工具栏按钮，显示当前状态**（`conversation.input.left`，order 10，排在 auto-continue 之后）。
   文案是「策略：自动」/「策略：业务软件 · 按项目做」；有覆盖时按钮描边用品牌色。不点也看得见当前套路。
2. **面板 = 右栏页签**（`company-strategy`，order 20），不是 modal。理由是用户原话「弹出 sidebar 里面有 setting」——
   不挡对话、随时回来改；关掉面板设置继续生效。
3. **三行、首项「自动」**：做什么 / 怎么交付 / 参考资料（wiki）。`null`（不写字段）= 自动 = 不约束。
4. **选项不写死**：host 启动时按 `content/product-types/`、`content/delivery-modes/` 枚举，写派生文件
   `.dsh-company/startup-options.json`；交付模式把隐式 `productized` 排在最前。换公司 / 加类型不改界面。
5. **存储 = workspace 级** `.dsh-company/startup.json`（三字段 + `updatedAt`），原子写（同目录 tmp + rename）。
   ⚠ 刻意与 home 级 `<DSH_HOME>/company/settings.json`（workspace 最近选择登记）**不同文件、不同作用域**。
6. **读走文件、写走命令**：浏览器面用 `workspaceFiles` 读两份文件（无日志噪声）；写入走
   `/company-settings set|reset|show`（`remote.commands.execute`）。**不用命令读**：每次读都会往会话里写
   `command/run`，面板一打开就多一个命令条。
7. **注入 = `company:startup-settings`**（order 501，紧跟手册 500；`interpolate: false`）。`text` 是每次 assembly
   求值的 provider，**改完下一轮生效**、不重启。全自动时返回空串（不占上下文、不暗示约束）；只对已设字段
   显式压住手册的「问一句 / 按特征猜」。跳过集合与手册一致（`NON_ROLE_PRESETS`）。
8. **公司默认 v1 只读**：面板只显示本项目覆盖；公司基线仍来自 `kb/company.md` 与内容包。

## 输掉的方案

- **打开 DSH 自己的 settings modal**：vendor 无公共 opener——壳 store 建在 `sidebar.settings` 注册闭包内、
  `settings.open` shortcut 无 execute-by-id、`openSettings/openSection` 只是 owner props。做不到。
- **`pluginNavigation.openBundle('dsh-company-pack')` 当作面板落点**：这是公共可注入服务（voice-input 同款），
  但它跳到 **Plugins 管理页**，语义是「管插件」不是「改这个项目的套路」；且配置卡是 profile 级、不是 workspace 级。
- **命令读设置**：回执是 `CommandExecution`，可读；但每次读写一条 `command/run`，面板每开一次多一个命令条。
- **一拍板就弹的居中 modal**：用户明确否掉——项目跑起来后想改就没入口了。
- **profile 级存储（DSH volatile 字段）**：一个 home 顺序服务多 workspace，会让第二个项目继承第一个的选择；
  且要为本包引入 schemastery Config schema（`config.ts` 当初刻意避免）。
- **auto-continue 的 `sessionModes` 手法（profile 里放 map）**：路径作键、无生命周期清理、写一处重写整份配置。
- **所有候选字段一次做全**：研究盘出 58 项，v1 只取三样；`method` / `collaborationMode` / `timeZone` 等
  默认生效、不露面（研究材料 §8 列为可选/缓做）。

## 后果

- 新增 `src/lib/startup-settings.ts`（纯模型）、`src/host/startup/{startup-store,startup-prompt}.ts`、
  `src/host/commands/settings-command.ts`、`src/client/startup/{startup-store,StrategyButton,StrategyPanel}.tsx|ts`；
  右栏页签目录 +1（`dsh-company-pack/strategy`）、composer 槽 +1、命令族 +1（`/company-settings`）。
- `RUN_BUNDLE_PATHS` 增 `startup` / `startup-options`；`docs/contracts/profile.md` 增「项目启动策略」一节。
- 金样 `snapshots/visual/company-shell/ui.golden.json` 从 9 页签刷到 10（`ui-scene-smoke --isolated --refresh-golden`）。
- 真页面探针（cdp-probe）从注册源自动解析到 10 个页签，本次即用它验证「策略」面板在场。

## 归位

- **选择住 workspace、规则正文住内容层**：`startup.json` 只存「选哪个」；产品类型包/交付模式包/手册规则一字不动
  （宪章铁律 3）。
- **选项来源单一**：枚举只读 `content/` 目录，界面不认公司、不写死类型名——换公司只换内容。
- **注入面选 section 而非 skill**：策略必须每轮可见，不能等按需加载；section 的 thunk 是本仓已验证的活读管道
  （`company:language` 同款）。
- 没有把「默认值」写成第二份事实：公司基线仍住 `kb/company.md` 与内容包，面板只读。

## 验证

实测 2026-11-12（全部本轮跑过）：

- `pnpm typecheck`：绿（pack 两面 + tests/client/host/lib/content/harness）。
- `pnpm test`：**231 files / 1704 tests passed**（新增 5 个 spec：`tests/lib/startup-settings.spec.ts` 13 项、
  `tests/host/startup/startup-store.spec.ts` 8 项、`tests/host/startup/startup-prompt.spec.ts` 4 项、
  `tests/host/commands/settings-command.spec.ts` 8 项、`tests/client/startup/strategy-button.spec.ts` 4 项）。
- `pnpm verify`：ALL PASS（含 `ui-golden-freshness` 刷新后复跑）。
- `node checks/smoke/ui-scene-smoke.mjs --isolated --refresh-golden` → 金样更新为 10 页签；
  随后 `--golden` 复核 `金样一致（10 个页签）`、`ALL PASS（自起实例 + 全部公司页签 + 浏览器错误环零命中）`；
  证据 = `runtime/harness-home/diagnosis/ui-scene-smoke-*`（含 composer「策略：自动」按钮与右栏面板截图）。
- `source run/env.sh && node checks/smoke/client-load-smoke.mjs`：`ALL PASS（真浏览器加载，client 面健康）`——
  新增槽注册零挂载失败。
- `pnpm lint`：0 warnings / 0 errors。
- 红→绿实录：① 探针首跑 `策略(body)`——面板标题写成「项目策略」而探针按页签名「策略」找锚点；
  改成页签名 + body 内保留大标题后绿。② 首轮 `client-css` 红：用了未定义的 `--dsw-alias-bg-l1/l2`
  （实际定义是 `-bg-layer-1/2`），改名后绿。

## 剩余风险 / 未做

- **只做软强制**：`/req check`、`/delivery check` 的解析链**不**读 `startup.json`；模型理论上仍可忽略注入段。
  硬强制要另开卡（改两处解析函数 + fan-out 测试）。
- **公司默认不可在面板改**：要接 DSH 设置表单需引入 schemastery volatile 字段，未做。
- **`wiki` 只存指针**：内容形状（index 先行 / 维护协议）归 [wiki 研究题](../../_backlog/research/wiki-knowledge-map/README.md)；
  指针的**存在性校验与注入三档**（内可写 / 外只读 / 失效警示）由后继 [wiki 落地 Note](2026-11-12-wiki-knowledge-map-landing.md) 扩展；
  v1 按用户 2026-11-12 拍板 = 本地目录路径（可绝对、可在 workspace 外），注入段已写明「外部目录只读、不要尝试写入」。
- **无会话冷启动**：按钮住 composer 槽，无 session 不渲染；公司空壳页只能从右侧栏「策略」页签进。
- **选项刷新时机**：boot 时派生一次 + 每次写设置后刷新；换内容包后需重启 host 才进下拉。
