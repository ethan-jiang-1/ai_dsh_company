# 2026-11-12 · 启动策略 + wiki 缺陷横扫：workspace 权威、盘上事实、表达层单源、验证面

状态：implemented（2026-11-12 落地；验证见下）

上游 = 用户 2026-11-12：「_backlog/bugs 都有不少bug，你好好看一看，我们怎么系统性地把这些bug给解决了，它终点是所有bug都得解决，想清楚了之后就set up一个goal」；
修复交接与分组 = [_backlog/bugs/README.md](../../_backlog/bugs/README.md) 的 2026-11-12 节。
十张卡 = BUG-080..089；前序机制 = [启动策略 Note](./2026-11-12-startup-settings.md)、[wiki 落地 Note](./2026-11-12-wiki-knowledge-map-landing.md)。

## 问题

十张卡同出一次探索（启动策略 + wiki 回归），但按根因是四类「同一事实多个载体」：

- **W workspace 权威/新鲜度**（081/089/082）：同一份 `.dsh-company/startup.json` 被面板（Lead 会话盘）、
  命令/注入（boot workspace）、注册时机（boot 常量）和派生 `wikiCheck`（无时间戳快照）四处解释；
- **F 盘上事实**（084/085/087）：权限用词法路径判、`index.md` 只看存在、读上限写死 64、模板给仓库相对路径；
- **L 表达层单源**（080/083）：探针手维护 en 页签映射、host 命令文案绕开 typed 字典；
- **V 验证面**（088/086）：门禁为消假红整目录排除、测试只证「按钮在场」不证 tooltip 值。

## 决定

1. **W：一个 workspace 解析 + 一条新鲜度契约**
   - `startupWorkspace(boot, agent)`：**会话 cwd 优先**，boot workspace 只在会话无 cwd 时回退；`/company-settings`
     与 `company:startup-settings` 都消费它，面板本来按 Lead 会话读，三处指向同一份。
   - `registerStartupSettings` 不再依赖 boot 的 `hasWorkspace`：`agent/created` 时按该 agent 的会话 cwd 注册 section；
     回执的「下一轮生效」因此成立（089）。
   - `wikiCheck` 带 `checkedAt`；`StartupOptionsWatch` 在 wiki 指针的最近存在祖先 + 目标目录布非递归 watcher，
     盘上变化（删除/改名/index 增删）去抖后重算派生文件；语义没变不重写（避免盯到自己的写盘）。
     面板只在「检查值 == 当前 settings.wiki」且 `checkedAt` 非空时显示可写/只读/失效，并标「上次检查」；
     否则显示「还没检查」——不拿快照冒充当前值。
2. **F：把字符串/常量换成盘上事实**
   - `wikiLocation` 对 workspace 与目标都取真实路径（不存在时最近存在祖先 + 后缀）；`checkWikiPointer`
     要求 `index.md` 是**文件**；`resolveWikiDir` 展开 `~`；`set wiki` 取原始剩余串，连续空格不折叠。
   - 选项预算 `STARTUP_OPTIONS_MAX_ENTRIES = 256`，读上限从它派生（`32 + 256`）；`parseStartupOptionsState`
     把截断/坏 JSON 变成 `unreadable`，面板显式报错而不是静默空下拉；`tests/content/startup-options-budget.spec.ts`
     对真实 `content/` 每次算条数与行数。
   - 模板 README 的拷贝命令改成安装视图（`node_modules/dsh-company-pack/content/wiki-template`）；
     `startup-options.json` 增 `wikiTemplate` 绝对路径，面板「缺 index.md」提示给当前部署路径。
3. **L：表达层只留一份**
   - `parseCompanyTabCatalog` 同时从 `locales.ts` 的 zh/en 块派生 `title` / `enTitle`；缺任一语言 label
     整体返回空（探针 exit 2），手维护的 `EN_TAB_TITLES` 删除。
   - 新增 `src/lib/startup-command-copy.ts`（zh/en typed copy）；`/company-settings` 的 description / hint /
     usage / 未知字段错误都从它取当前语言；语言切换时 dispose 旧注册并重注册 description（vendor 注册面
     没有 per-locale provider）。解析器只返回结构化错误码，文案在 handler 里取。
4. **V：换基准，不关扫描；测承诺，不测在场**
   - `shipped-links` 不再排除 `content/wiki-template/`：模板内部链接按**模板根**判存在，指向模板外的链接
     不判存在但禁指仓库；行内代码里的示例链接不计。
   - 策略按钮 tooltip 有覆盖时逐字段列「字段名: 值」，全自动仍是固定句。

## 输掉的方案

- **面板改读 host workspace**（BUG-081 的另一半）：面板现在经 `workspaceFiles` 按 Lead 会话读；改 host 需要新的
  host→client 读面，且会话在别的项目时会显示另一个项目的策略。选会话 cwd，boot 只作回退。
- **只给 `wikiCheck` 加 `checkedAt`、不做 watcher**：删目录后重开面板只能说「未刷新」，说不出「目录不存在」；
  卡片的验收要「明确说失效 + 原因」。watcher 是必要的一半，时间戳是降级面。
- **把 `/company-settings` 的描述留中文、只修回执**：en 命令中心仍显示中文，A8 的「en 无残留」不成立。
- **模板继续整目录排除、只靠 spec 守**：`pnpm verify` 仍抓不到模板内坏链接（088 的原症状）。
- **把 `STARTUP_OPTIONS_READ_LIMIT` 直接提到 5000**：掩盖内容增长，面板仍会在真超限时静默空下拉；改预算 + fail-loud。
- **把 `/req` `/prd` 的 `commandWorkspace` 一起翻成会话优先**：公司数据根（deliverables/kb）与项目策略根是
  两个事实；本轮只让策略跟随会话，数据命令保持原语义（未扩大授权）。

## 后果

- 新增 `src/host/startup/startup-watch.ts`、`src/lib/startup-command-copy.ts`、
  `tests/host/startup/startup-watch.spec.ts`、`tests/client/startup/strategy-panel.spec.ts`、
  `tests/content/startup-options-budget.spec.ts`。
- `StartupOptions` 增 `wikiTemplate`；`WikiCheck` 增 `checkedAt`；`STARTUP_OPTIONS_READ_LIMIT` 64 → 288。
- 角色 agent 创建时会为该会话 workspace 补一次选项派生（boot 无 workspace 的路径也能工作）。
- `shipped-links` 的扫描面 +6 份模板 markdown；行内代码示例不再被当链接。
- `docs/contracts/profile.md` 的 startup 段与 `content/README.md`、模板 `README.md` 同步安装路径/新鲜度语义；
  旧 Note [启动策略](./2026-11-12-startup-settings.md) 与 [wiki 落地](./2026-11-12-wiki-knowledge-map-landing.md)
  加「被…取代」指针。

## 验证

真跑（2026-11-12，本机）：

| 面 | 命令 | 结果 |
|---|---|---|
| W 081 | 把 `startupWorkspace` 改回 boot 优先 → `pnpm vitest run tests/lib/startup-settings.spec.ts tests/host/startup/startup-prompt.spec.ts tests/host/commands/settings-command.spec.ts` | 红 **3 failed**；复原 **42 passed** |
| W 089 | 恢复 `if (hasWorkspace) register...` → `pnpm vitest run tests/host/index/apply-lifecycle.spec.ts` | 红 **1 failed**（0 section）；复原 **4 passed** |
| W 082 | 去掉 watcher 重算 / 面板 `checkCurrent` 恒真 → startup-watch + strategy-panel specs | 各红 **2 failed**；复原 **12 passed** |
| F 084 | 词法 `wikiLocation` + `existsSync(index)` → startup-store + settings-command specs | 红 **4 failed**；复原 **25 passed** |
| F 085 | 读上限改回 64 / 解析折空 → lib + content 预算 + panel specs | 各红 **1 failed**；复原 **24 passed** |
| F 087 | 模板 README 改回仓库路径 → `tests/content/wiki-template.spec.ts` | 红 **1 failed**；复原 **7 passed** |
| L 080 | `enTitle` 落回 zh → `tests/ui/company-tab-catalog.spec.ts` | 红 **2 failed**；复原 **4 passed** |
| L 083 | description 硬编码中文 → settings-command spec | 红 **2 failed**；复原 **12 passed** |
| V 086 | tooltip 还原固定句 → strategy-button spec | 红 **1 failed**；复原 **6 passed** |
| V 088 | 往模板 `AGENTS.md` 塞坏链接 → `pnpm verify` | `FAIL shipped-links ... 模板内部链接目标不在盘上`；还原 **ALL PASS** |

全量：

- `pnpm typecheck` 绿；`pnpm test` **236 files / 1761 tests passed**；`pnpm lint` 0 warning；
  `pnpm dup` 0 clones；`pnpm verify` ALL PASS。
- `node checks/lanes/ui-scene.entry.mjs --isolated --lang en`：**ALL PASS**，10/10 页签（含 Strategy），
  `en 页面无中文残留（10 个页签）`；证据 `runtime/harness-home/diagnosis/ui-scene-smoke-2026-11-12T14-40-39-593Z`。
- `node checks/lanes/release.entry.mjs`：**ALL PASS**（干净 profile 真安装 + content 随包 + 首启自举/幂等）。

未跑（如实记）：**会话 cwd ≠ host workspace 的真实例 RPC 探针**（keyless 已覆盖读/写/注入同一文件）、
**BUG-089 的真模型 `system/message` 轮**（apply-lifecycle 真装配 + section text 已覆盖注册与读取）、
**082 的真页面「删目录 → 重开面板」**（keyless watcher + 面板行渲染已覆盖；en smoke 只开了自动态面板）。

## 剩余风险 / 未做

- `fs.watch` 在个别平台/权限下布不上：降级为 `checkedAt` + 「还没检查」，不冒充当前值，但不会自动变失效。
- 换内容包新增产品类型/交付模式仍需重启 host 才进下拉（watcher 只盯 wiki 指针）。
- 其它 host 命令（`/req`、`/prd`、`/delivery`、`/deliverables`）的 description/回执仍是中文；本轮只收
  `/company-settings`（卡片范围），未扩大成全局命令面双语工程。
- `/req` `/prd` 的 `commandWorkspace` 仍是 boot 优先（公司数据根语义未改）。
