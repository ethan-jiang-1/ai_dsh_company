# 侧栏角色标记收进 16px 座位（角色身份 UX · B 段返工）

状态：implemented（2026-10-13；起因 = 用户截图里会话行首的 `CEO` 药丸左端被切成半个字）

## 决定

侧栏会话行首的角色标记按**座位尺寸**设计，不再按文案长度设计：

- 座位 = vendor 的行首 ambient 格 `sidebar.session.row.leading`，合同写明 **16px**
  （"the 16px cell before the title that the row's own state dot otherwise occupies"，
  `vendor/dsh/packages/client/ui-workspace/src/client/contract/slots.ts`），且是 **list 座位**
  ——同格还住着计划任务时钟（`[data-session-schedule-mark]`，12px 图元 / 16px 跨度）。
- 标记 = **12px 方形**（= 同格既有 occupant 的尺寸）+ **单字母** `C/F/O/E/S`
  （`ROLE_MARK`，`packages/company-pack/src/client/RoleBadge.tsx`）；
  `ROLE_SHORT`（CEO/CFO/COO/VPE/VPS）保留给窗口标题前缀、会话头 preset 标签与标记自身的 `title`。
- CSS 在 `packages/company-pack/src/client/styles.ts` 的 `.wk-role-badge`：`box-sizing: border-box`
  + `width/height: 12px` + `padding: 0`（座位占用者的宽度自此是**声明**的事实，不再由字号/内边距悄悄决定）。

## 为什么（真 DOM 实测，不是推算）

修前（旧构建，真 web app 侧栏，本仓 dev home）：

| 量 | 值 |
|---|---|
| 标记渲染宽 | **32.45px**（= 座位的 2.03 倍；三字缩写 21.6px 文本 + 2×5.12px 内边距） |
| 与时钟同格时左溢 | **8.22px**（标记左缘落到行框外；无侧栏内边距的窄窗布局里 = 被容器边界切掉字母——用户截图现场） |
| 右溢 | **8.23px**（吃掉整条 4px 标题间隙，压进标题首字盒 4.23px） |

座位 `justify-content:center` 且不裁剪 ⇒ 超宽占用者必然两侧各溢出一半——这不是"某个主题下的观感问题"，
是尺寸合同违背；`CE`/`CF`/`CO` 这类两字方案同样超（16px 标记 + 16px 时钟 = 32px > 16px 座位，
无内边距布局里左缘仍为负、照样被切），所以取 12px。

## 输掉的方案

1. **把三字缩写缩小塞进 16px**：`CEO` 要在 16px 内放得下需 ≈7.4px 字号，低于平台最小文本尺寸（10px，vendor 全树无更小用例），不可读。
2. **保留药丸、改挂载点**（标题前缀 / 换槽）：行首座位没有"标题前缀"槽；`sidebar.session.row.hover` 只在悬停卡里出现，行首仍会空着；换挂载点 = 改 UX 语义，超出"修几何"的范围。
3. **16px 方形 + 两字**（`CE/CF/CO/VE/VS`）：单占用时完美，但与时钟同格时合计 32px，在无内边距布局里标记左缘 −6px 仍被容器切——同一症状换个尺寸复发。
4. **`slot:has([data-session-schedule-mark])` 自适应收窄**：耦合 vendor 私有 DOM（该属性不在座位合同里承诺），上游一改就静默失效；否决。
5. **不动**（"官方座位太窄"）：真 DOM 证明是我方占用者 2.03 倍宽，责任在我方。

## 后果与边界

- **信息量下降**：单字母不如三字缩写自明；补偿 = 标记 `title`（全称缩写）、窗口标题【角色】前缀（C 段）、会话头 preset 标签；docs 的开门 runbook 同步写了字母表。
- **同格共存仍是紧的**：标记 12px + 时钟 16px 跨度 = 28px > 16px 座位，靠"座位居中溢出 + 标题前 4px 间隙"恰好不撞标题盒（实测 `icon.right == title.left`）。**再加第三个同格占用者、或把标记改宽，这条就破**——已记 [company-pack README 已知限制](../../packages/company-pack/README.md)。
- **颜色纪律未动**：仍只用 `--dsw-*` 令牌（每角色不同色仍等上游分类色板，见[角色身份 UX 提案](../archived/2026-09-26-role-identity-ux.md)开放问题 2）。

## 验证（都真跑过）

- `pnpm test tests/client` —— **13 files / 79 tests 绿**（含新增守卫 `client-css.spec.ts`「行首座位的尺寸上限」与 `role-badge.spec.ts` 的 `ROLE_MARK` 两张表同键/单字母/互异断言）。
- 守卫反证（红→还原→绿）：把 `.wk-role-badge` 的 `width: 12px` 改成 `32px`
  ⇒ `pnpm test tests/client/client-css.spec.ts` 红（`AssertionError: expected 32 to be less than or equal to 16`）→ 还原 ⇒ 绿。
- `node probes/browser-visual/sidebar-role-mark-probe.mjs`（前置 `source run/env.sh`）——**三腿 ALL PASS / 64 PASS**
  （腿① desktop 1280、腿② narrow 356 点开侧栏、腿③ 注入 0 侧栏内边距复现用户截图的布局条件；腿③实测 `row.l=0`、
  `badge.l=2`、`clockIcon.r = title.l = 28`）。
- 探针反证（红→还原→绿）：同一次 `width: 32px` + 重建（`tsc -b packages/company-pack` + `tsdown`）
  ⇒ 探针 **12 条 FAIL（G1/G2/G4）、exit 1**（`badge.w=32 seat.w=16`、`badge.l=4 row.l=12`、`icon.r=50 title.l=40`）→ 还原重建 ⇒ ALL PASS。
- 修前基线取自旧构建的同口径真 DOM 实测（上表三行）；现场截图证据 = 用户 2026-10-13 那一张。
- `node checks/smoke/client-load-smoke.mjs` —— 真页面零挂载失败（client 面完成定义；本变更的"挂得上"链）。
- `pnpm verify` —— 结构门禁全绿。
- **未跑**（如实登记）：`preset-smoke`（未动 presets/ 与组合行）、`release-smoke`（未动导出/安装面）、真模型档（本变更零模型面）。

## 落点

- 实现：`packages/company-pack/src/client/RoleBadge.tsx`（`ROLE_MARK`）、`packages/company-pack/src/client/styles.ts`（`.wk-role-badge`）。
- keyless 守卫：`tests/client/client-css.spec.ts`、`tests/client/role-badge.spec.ts`。
- 真几何判据 + 图像判据：`probes/browser-visual/sidebar-role-mark-probe.mjs`、`snapshots/visual/sidebar-role-mark/`。
- 合同/runbook：`docs/multi-human.md` §2 第 4 条、`packages/company-pack/README.md` 已知限制。
- 前身：`notes/archived/2026-09-26-role-identity-ux.md` B 段（标记形态由本 Note 部分取代；A/C 段与其数据来源结论仍现行）。
