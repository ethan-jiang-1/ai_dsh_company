# 2026-11-02 · 去掉 Trajectory 页签与右侧栏 New terminal：pack 层禁两行

状态：已交付（2026-11-02；2026-11-03 用户真页面走查通过、卡已归档到 settled_issues）

> 上游 = [去掉 Trajectory 页签与 New Terminal 入口卡](../../_backlog/_archive/settled_issues/2026-11-02-remove-trajectory-terminal-ui.md)。
> 部分取代 = [培养主视图 Note](./2026-10-28-cultivation-main-view.md) 的「主区三 tab」；该 Note 已加回链。
> 不改 = vendor `dsh`、pin、五角色 persona、公司九页签、`terminal-controller` 宿主服务、3080 日用 home。

## 决定

1. **两处 UI 都从 pack 的 bundle patch 关**：`packages/company-pack/cordis.patch.yml` 加两条顶层替换行
   `ui-trajectory` / `ui-sidebar-terminal`（`name` + `disabled: true`）。两行都是 web-app 出厂行，
   pack 在其后叠加；不新增行、不做 vendor patch、不升 pin。
2. **Trajectory 只去 view 注册**：轨迹数据、会话日志、`ui-attachment` 的图片槽都保留；保存的 view 偏好
   指向 trajectory 时 `resolveActiveView` 兜底到 Chat。主区剩 Chat + 培养（两个 View 时标签栏仍在）。
3. **New terminal 整行禁用**：入口、右栏 tab 类型、`terminal.new` 快捷键一起去掉；`terminal-controller`
   宿主服务保持 active（无 UI 入口时不分配进程，回滚面最小）。上游没有「只去 guide」的窄开关，
   CSS/slot 覆盖是脆弱的第二套，不用。
4. **dev 与产品同形**：改的是包内 patch，dev home 的 tarball 安装与产品用户装同一 tarball 得到同样结果；
   不改 dev 专用 profile patch。
5. **附带修复启动器清理顺序**：[`tools/company.mjs`](../../tools/company.mjs) 原来在 `plugin add` 之前
   删旧 tarball；换内容时 profile 的旧 spec 还要读旧文件，pnpm 报 ENOENT（实测 `abef80f4` → `5fe5f189`
   时 `plugin add` exit 254）。清理移到 add 成功之后；安装失败时旧 tarball 保留，便于重试。

## 输掉的方案

- **关 `developerTools` 开关**：能隐藏 Trajectory，但连带代码差异/交互预览与 built-in `ptc`/`minimal`，
  且是每用户设置而非产品默认——为去一个 tab 关掉一片面，不做。
- **只隐藏 New terminal 的 guide 入口**：上游没有该粒度配置；改 vendor client 或 CSS 覆盖违背
  vendor 铁律/易碎，不做。
- **vendor patch / 升 pin**：两行都在 web-app bundle，pack 替换足够；改 vendor 还要随升 pin 重做。
- **只改 dev profile**：产品用户得不到同形结果，且 dev 绿推不出用户绿（parity 卡的反面），不做。
- **一并禁用 `terminal-controller`**：更彻底但多动一条宿主服务、可能影响隐藏消费者；无 UI 入口时
  不分配进程，收益不足。

## 证据（实跑）

| 断言 | 命令/环境 | 结果 |
|---|---|---|
| patch 形状 | `pnpm test tests/company/ui-surface.spec.ts` | 5 passed：两条行 `disabled: true`、web-app 真行存在、controller 未禁用 |
| 干净 home 产品形安装 | `tools/company.mjs --home <tmp> --workspace company-workspace --port 0 --no-open` | `dep=file:…dsh-company-pack-0.7.0-5fe5f189.tgz`；banner 出 |
| 真挂载 | 同上 home + `preset-smoke` | ALL PASS（5 角色 + researcher；client 闭包 lint 69 模块） |
| 运行态行状态 | 运行实例 `pluginInventory/list` | `ui-trajectory` / `ui-sidebar-terminal` `enabled:false`；`terminal-controller`/`ui-attachment`/`ui-chat`/`ui-conversation` `active` |
| 真页面 | Playwright 打开 company profile 会话 | 主区 tab = `Chat` + `培养`（无 Trajectory）；右栏 guide = 9 个公司页签（待办/看板/依赖图/在场/用量/任务板/培养/台账/成品），无 New terminal；品牌在场、loader 错误 0 |
| 启动日志 | `pnpm company` 实跑 | 无 `did not activate` / `failed to apply loader entry` |
| 启动器 bug 红→绿 | 旧 `abef80f4` → 新 `5fe5f189` 内容变化 | 修前 `dsh plugin add` ENOENT exit 254；修后安装成功、旧 tarball 清掉、新 tarball 保留 |
| 全量 | `pnpm verify` / `pnpm test` / `pnpm typecheck` | ALL PASS；124 files / 1042 passed / 3 skipped；typecheck exit 0 |
| 验收 · 主区 tab（真页面 DOM） | 端口 57999 实例开会话读 `[data-conversation-tabs] [role=tab]` | `Chat` + `培养`；点「培养」渲染主体、点回 `Chat` 正常 |
| 验收 · 右栏 guide（真页面 DOM） | 开右栏清点 registry 胶囊 + 全页文本 | 胶囊仅 `files`；公司 9 页签全在；页面无 `terminal`/`终端` |
| 验收 · 组合面（比文本硬） | `window.__DSH_BOOT__.entries`（69 条） | `ui-trajectory` / `ui-sidebar-terminal` 两条 client 行 **ABSENT**；`api-terminal-controller`/`ui-chat`/`ui-attachment` PRESENT |
| 验收 · 快捷键 | 会话页派发 `Ctrl+`` keydown | 无新 tab/面板、无 console 报错（合成按键，补充证据） |

## 边界与未做

- 轨迹数据/会话日志不删；只是 UI 入口消失。保存的 trajectory view 偏好回落 Chat。
- 已保存的右栏 terminal tab 不再渲染（终端是临时进程，无持久数据损失）；`terminal-controller` 仍 active。
- `ui-attachment` 的 client `inject` 仍列 `ui-trajectory`（type-only 依赖）；`preset-smoke` 的闭包 lint 报
  非致命 WARN，app 与 attachment 均 active。上游 tidy-up 不在本卡范围。
- 真页面断言是**一次性探针**（读数见上表），没进 `ui-scene-smoke` 金样：金样只盖公司九页签 catalog，
  不含主区 view tab 与 guide 胶囊清单。要变常驻，得给 `ui-scene-smoke` 加断言面——后续票，不在本卡。
- 3080 日用 `~/.dsh` home 未动；若那里装过本包，升级/reinstall 后自然同形。
- 真实 npm publish 仍按 [publish-handoff](../../docs/guides/publish-handoff.md)，不在本卡。
