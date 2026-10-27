# cdp-probe — 观察窗的「呈现即验证」机器腿

> 什么时候读：client 面改动后的呈现前走查、或页面挂了/面板异常要定位时。路线 = §架构（两层）→ 场景清单。

**为什么存在**：插件 client 半（侧栏面板、卡片、对话区）在 stub/静态冒烟里是绿的，在真实渲染器里仍可能崩——钩子绑定、会话作用域、主题、布局都是真实环境才有的变量。这个工具起一个**一次性无头 Chrome**，把 booted 的观察窗当真实用户一样驱动，然后报告**实际渲染出了什么**。它是「执行冒烟」和「owner 亲眼看」之间的那一环——呈现即验证（dev-loop §1）的机器实现。

**出处**：2026-10-01 从 `ai_dsh_loop_advisor` 项目借鉴（owner 指令「想办法借鉴过来」）。驱动层按其文档契约**逐字拷贝零修改**；场景层换成本仓观察窗的面（五角色驾驶舱）。借鉴当夜即抓到驱动层两个新坑并回灌本文（见下）。

## 架构（两层，借用只拷第一层）

| 文件 | 职责 | 可移植性 |
|---|---|---|
| `tools/drivers/cdp-driver.mjs` | **通用驱动**：起无头 Chrome（port 0 + DevToolsActivePort）、CDP 连接、evaluate/click（20s 超时竞速）、console 错误与未捕获异常捕获、清理。Node 22 内建（原生 WebSocket/fetch），零 npm 依赖 | 任何有 web UI 的项目直接拷走（本项目已验证逐字可用） |
| `probes/browser-visual/cdp-probe.mjs` | **本仓场景**：composer + 品牌 + 右栏全部公司页签逐个开（Start-chip 回切；页签清单从 `packages/company-pack/src/client/company-tab-registration.ts` 解析，面板体 `data-company-tab-title` 可见且非空）+ `--ask` 全环（真建会话输入发送等收口） | 换成你自己页面的选择器和断言 |

## 本仓用法

```sh
source run/env.sh   # 提供 DSH_PROBE_CHROME 备选；二进制默认复用 loadChromium 解析（ms-playwright 缓存）
pnpm dsh web -- --port 0 --no-open        # 起观察窗，横幅拿 URL（demo.md §前置）
node probes/browser-visual/cdp-probe.mjs 'http://127.0.0.1:<port>/?token=<t>'          # 默认断言面（零模型）
node probes/browser-visual/cdp-probe.mjs '<url>' --ask '用一句话自报角色与职责。'      # + 完整产品环（真模型一次调用）
node probes/browser-visual/cdp-probe.mjs '<url>' --evidence                # 成功也落证据目录（截图 + verdict）
```

stdout 打一个 JSON verdict；exit 0 = 全部断言成立，**exit 2 = 环境未就绪**（home 停在登录/凭据引导——
不是渲染失败；先配凭据或换已 onboarding 的 home）。失败时另写
runtime/harness-home/diagnosis 下的 cdp-probe-<timestamp>/（page.png / body.txt / verdict.json /
console.log），JSON verdict 的 `evidenceDir` 指向它；`--evidence` 让成功也写同一形状。
`--ask` 会在 GUI 里真建会话（registry default = ceo）留下测试会话，需要时在 GUI 里归档清理。

## 已踩平的环境坑（驱动 + 场景里已编码成规则）

驱动层（源自 loop-advisor，逐字保留）：
- **`--remote-debugging-port=0`** + 从 profile 目录 `DevToolsActivePort` 读真实端口——固定端口会静默连上孤儿 Chrome 的旧页面，判决全错。
- **`--no-sandbox` + GPU/crashpad 禁用**：受限环境起不来 Chrome 内部沙箱，GPU 进程直接 FATAL。
- **桌面 `--window-size`**：无头默认 800×600，响应式 UI 在窄视口是另一套产品形态。
- **别用 `--virtual-time-budget`**：页面有活 WebSocket 时虚拟时间永不推进。用真实时间预算 + 轮询。
- **每个 evaluate 带超时竞速**：socket 断了要 fail，不能挂死探针。
- **dock 前后台子树并存**：同名节点 DOM 里多份，断言用 `.some()`/全文 `includes` 扫，不取第一个。

本仓借鉴当夜新踩平的（场景层已编码）：
- **两段式导航**：冷 profile 直接带 token URL，303 换 cookie 链会丢状态、页面停在
  "authentication required"（CPD 实测，body 只有 68 字节提示行）。先 `location.href = origin`
  建立上下文，再带 token 进——完整挂载。
- **驱动的 evaluate 不 await Promise**：`(async () => { … })()` 返回序列化 Promise 恒真值不可用
  ——时序由场景侧 sleep 控制，页面动作用**同步 IIFE**。
- **首启双模态**（Internal Testing Notice + Preview Notice，0.2.0 起两个）：每个新浏览器上下文
  都会弹，Continue 同名按钮逐个关。
- **Start-chip 回切**：右栏开一个页签后 guide 列表被页签条替换——开下一个页签前先回 Start。
- **Chrome 二进制**：默认复用 `tools/drivers/playwright.mjs` 的 `loadChromium().executablePath()`
  （ms-playwright 缓存的 Chrome for Testing），`DSH_PROBE_CHROME` 可覆盖；驱动自带系统
  Chrome/Edge 候选兜底。

## 与其它检查的分工

| 面 | 检查 | 层 |
|---|---|---|
| 结构/契约 | `pnpm verify` / `pnpm test` | 静态 |
| client 面健康（零挂载失败 + 品牌） | `client-load-smoke` | 真浏览器（自起实例） |
| 回放 UI 金样 | 暂无可用场景（`replay-smoke --ui` 仅对声明 uiEvidence 的场景开放） | — |
| **运行中实例的真实渲染 + 全环** | **本探针** | 真浏览器（附着运行实例） |
| owner 亲眼看 | demo.md §前置 | 人 |
