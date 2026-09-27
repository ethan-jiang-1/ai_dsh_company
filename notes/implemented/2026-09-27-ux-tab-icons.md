# 公司页签 icon × 语义色向（8 页签，页签条 + 浮窗头）

状态：implemented（2026-09-27 毕业：用户点名（client 红线就此项解除）→ RFC 同日实施 →
验收四条全绿（§验收实况）。原 RFC 稿 = 本文件 proposed 形态，毕业时方案节保留原样、
追加交付实况；实施细节以本稿为唯一事实家。）

## 背景

用户 2026-09-27 观察窗走查时点名：8 个公司页签（需要你 / 看板 / 依赖图 / 在场 / 用量 / 任务板 / 培养 /
台账）每一个要有独特 icon，icon 带颜色且**颜色有语义方向**；页签**浮出成浮窗后**标题处也要有同一 icon。

## 机制依据（已在钉住 vendor 基线核实）

1. **接缝**：`ui-sidebar-right/src/client/contract/slots.ts:73` 声明 keyed 会话级槽
   `sidebar.right.pane.tab.title`（注册可选，fallback = 注册时捕获的标题文本）；页签条 chip 经
   `titlesFor → TabSlot` 分发（`SidebarRight.tsx:246`），**浮窗头同一 renderer**
   （`FloatLayer.tsx FloatHeader`：`renderTabTitle?.(tab) ?? tab.title`）——一处注册两处生效，零 vendor 改动。
2. **色令牌**：平台色相族 = amber / blue / deepseek（紫）/ green / neutral / red（`ui-theme design-platform.css`
   静态层，跨主题同值）。alias 墨色层（brand/bluish 系）在暗色主题退化为墨/白（非彩色），不能当识别色；
   故 icon 用 `--dsw-static-*` 色相族——平台令牌，满足「颜色一律 --dsw-*、禁写字面色」红线。

## 方案（按此实施）

**色 = 方向（四个方向），icon = 面板身份（八个独特 glyph）；族内主/次两档色深区分同方向的两个页签。**
口诀：**琥珀喊你（要人/烧量），蓝在干活（总览/工作台），紫管机制（结构/账），绿是人心（在场/成长）。**

| 页签 | 方向（色族） | 色令牌 | icon |
|---|---|---|---|
| 需要你 | 🟠 注意·要人 | `--dsw-static-amber-500` | 铃铛 |
| 用量 | 🟠 注意·消耗 | `--dsw-static-amber-400` | 半圆仪表 + 指针 |
| 看板 | 🔵 执行·总览 | `--dsw-static-blue-600` | 2×2 圆角四格 |
| 任务板 | 🔵 执行·工作台 | `--dsw-static-blue-500` | 三列看板条（不等高） |
| 依赖图 | 🟣 机制·结构 | `--dsw-static-deepseek-500` | 一源两汇节点连线 |
| 台账 | 🟣 机制·账 | `--dsw-static-deepseek-400` | 开页账本（中缝 + 行线） |
| 在场 | 🟢 人·在线 | `--dsw-static-green-500` | 双人（前全后半） |
| 培养 | 🟢 人·成长 | `--dsw-static-green-400` | 幼苗（茎 + 两叶） |

只给 icon 上色（tone 类挂 span、glyph 吃 currentColor），标题文字保持平台默认前景。

## 交付实况

- **文件**：`packages/company-pack/src/client/tab-icons.tsx`（8 glyph + 8 标题组件 + 8 guide icon + **8 guide 条目胶囊**，新增）；
  `index.ts`（+8 条 `sidebar.right.pane.tab.title` keyed 槽登记；+8 条 `sidebar.right.tab.guide.entry` keyed 槽登记
  （接管 Start 页胶囊）；`registerType` 扩 icon 参 → guide 条目同一 glyph 同一 tone——**guide 页是独立渲染路径**
  （`SidebarRightGuideEntry.icon`，不填画出厂立方体占位），用户走查抓到这一缺口后补）；
  `styles.ts`（+`wk-tab-title` 布局 + 8 个 tone 类 + `wk-guide-entry` 胶囊样式，全部 `var(--dsw-*)`，零字面色）。
- **更名记录（2026-09-27，用户语感裁定）**：「需要你」→ **「待办」**（原名是 *Needs You* 直译腔；「待办」与
  「任务板」天然成对——待办=人的事、任务板=分身的事）。全链路改名：client 5 文件 + 公司手册宪章节 +
  dev-loop 引用 + 测试注释；历史 Note / intents 行保原名为当时事实，出处注记保留在 tab-icons 注释与手册标题。
- **tooltip 交付（2026-09-27，用户令）**：① Start（guide）页 8 条目走 keyed 槽
  `sidebar.right.tab.guide.entry` **接管胶囊**——根因：vendor guide 只在条目 ≤4 时显示描述
  （`MAX_DESCRIBED_ENTRIES=4`），我们 8 条全被折叠成纯标题；接管后每颗胶囊挂 vendor `Tooltip`（ui-primitives），
  一行讲清这个页签是什么 + 关键操作；**有意偏离**：点击开页签**不用** vendor 的 `replaceTab: true`——guide 保留，
  可从 Start 连续开多个页签（vendor 原版点一下顶掉 guide，连续开要反复加回）。② 页签 chip 与浮窗头补**原生
  `title` 属性**悬浮提示（title 槽组件自有面，零 vendor 依赖）。
- **验收（2026-09-27 实跑）**：① `tsc -b packages/company-pack` 零错 + tsdown client 面构建；
  ② `client-load-smoke` ALL PASS（真浏览器零挂载失败）；③ playwright 实证：8 页签 chip 全开
  （DOM 断言 icon ×8 在场）、**计算样式断言色值逐对等于令牌解析值**（#f59e0b≡rgb(245,158,11) 等
  8 对 + 浮窗头 1 对，hex↔rgb 离线精确比对全等），浮窗头（`data-dockkit-float-title`）icon 在场
  且色值正确；**guide 页 8 条目同批断言 8/8 OK**；**tooltip 实证**：hover「待办」胶囊 → 提示文本可见、
  点击「在场」→ 页签开（guide 保留）、chip 原生 title 属性在场；截图 = /tmp/wk-strip.png、/tmp/wk-float-title.png、
  /tmp/wk-float-window.png、/tmp/wk-full.png、/tmp/wk-guide.png、/tmp/wk-tooltip.png
  （一次性运行态证据，不进版本库）；④ verify ALL PASS + test 全绿。
- **踩坑记录**（未来复用）：① guide（Start）页签是右栏空态——开第一个真页签即被替换，
  多开用页签条的 `[data-dockkit-add-tab]`（+按钮）逐个唤出 guide 再点条目；② playwright 断言令牌值
  要从**元素自身**查（custom property 继承；`documentElement` 上查为空）；③ exactOptionalPropertyTypes
  下可选 prop 类型要显式 `| undefined`。
- **生效路径**：client 面三跳 = 构建 → 模块表 rev 变 → **用户浏览器刷新**（无 HMR）。

## 非目标（维持）

每角色一色分类色板（搁置池既有项——上游 seam 线）；guide 页/平台出厂页签改动；页签内容语义。
