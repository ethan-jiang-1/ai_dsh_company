# 2026-10-05 · browser-use 行为链系统性测试：browser-behavior-probe 首跑 5/5 + 沙箱两层墙定位

状态：已交付（2026-10-05 用户令「你已经有自己测试浏览器的能力，先测试一遍，系统性的测试一遍，替我
测试一遍」；**判据先行**——probe 头注 B0–B5 写死后真跑；deferred-verifications 卡两笔全判收毕业 =
[卡](../../_backlog/_done/_closed_plans/2026-10-02-deferred-verifications.md)）

## 交付

- **`scripts/browser-behavior-probe.mjs`（常驻，零模型调用=零 API 成本）**：维护者侧镜像 provider
  拉起链（`@playwright/mcp` cli.js `--browser chromium --isolated --headless`，与
  experimental/browser-use-playwright-mcp/src/index.ts 逐参一致；pack Config = launch+headless），
  MCP stdio JSON-RPC 真调用打穿行为链：导航→读内容→点击→输入（自含交互 fixture，本地 http
  static server 提供——机制事实②见下）。
- **判收回填**：deferred-verifications 第 1 笔判收（第 2 笔 2026-10-03 已判收）→ 卡毕业迁档。

## 验证（实际跑过的）

- **首跑 5/5 ALL PASS**（栅栏外 + 双 env 重定向；排练场 cwd）：
  - B0 缓存重定向进栅栏（HOME + PLAYWRIGHT_BROWSERS_PATH 双旋钮，标记 `b/browser@<guid>` 落
    workspace，全程无沙箱升级）；
  - B1 栈自检（24 工具挂载）；B2 navigate 真成功（Page URL/Title 真回读）；B3 内容保真
    （snapshot 含标记）；B4 click/type 真调用并生效（`getByRole('button').click()` →
    CLICKED-OK；`getByRole('textbox').fill('probe-typed')` → ECHO:probe-typed，均落快照）。
- **红→绿全程留痕**（TDD 四轮迭代：EPERM 红 → file: 协议红 → Target crashed 红 → probe 自身
  断言 bug 红 → 5/5 绿；每次红都带错误原文定位）。
- 资产 = [snapshots/browser-behavior-probe/2026-10-04/](../../snapshots/browser-behavior-probe/2026-10-04/probe-stdout.md)
  （probe-stdout.md + probe-run.log 绿跑全文 + in-fence-crash.log 栅栏内第二层墙证据）。
- `pnpm verify` 绿。

## 沙箱两层墙（系统性测试的核心发现——seam 选型证据链补全）

| 层 | 症状 | 根因（源码定位） | 状态 |
|---|---|---|---|
| ① 缓存标记 EPERM | `open ~/Library/Caches/ms-playwright/b/browser@<guid>` 三度被拒（角色会话 ×2 + 维护者层 ×1） | @playwright/mcp 0.0.80 serverRegistry 的 `registryDirectory2()` = `join(defaultCacheDirectory2(), "ms-playwright", "b")`——**直连默认缓存、env 免疫**（macOS 分支连 XDG_CACHE_HOME 都不认；coreBundle serverRegistry.ts 段）；每次 launch 写 liveness 标记、退出删 | **已击穿（机制验证）**：`PLAYWRIGHT_BROWSERS_PATH`（env 感知的 registry 层用）+ `HOME`（os.homedir() 认 $HOME，拽住 env 免疫的 serverRegistry）双旋钮重定向进排练场，B0 栅栏内 PASS |
| ② chromium 子进程崩溃 | 栅栏内 `browserBackend.callTool: Target crashed`（EPERM 解掉后暴露） | chromium 子进程在 DSH sandbox-exec 沙箱内不稳定（嵌套沙箱摩擦） | **未解 = seam ②（sandbox × browser-use 白名单联动）的精确证据**；栅栏外行为链 5/5 证明工具链本体健康 |

**seam 选型影响**：用户直觉「把文件放到栅栏里头」**机制上成立**（B0 实证）——落地形状 = provider
`BrowserMcpConfig` 补 env 透传面（runtime `mountSessionMcp` 本就支持 `env?:`，mcp.ts:82-83）+
上游 serverRegistry 一行正解（`registryDirectory2` 尊重 `PLAYWRIGHT_BROWSERS_PATH`）；②仍需
sandbox 联动。**选型维持用户 2026-10-03 拍板的「暂缓登记」，本 Note 只是把三案的证据补到齐。**

## 输掉的方案

- **CDP/浏览器自动化断言渲染面**：本 probe 目标 = 行为链与原料层，渲染半边已有 keyless 钉
  （presence-board.spec 等）——不重复建面。
- **executablePath 硬编码**（harvest 轮已否）：本次再证其不足——EPERM 写的是 serverRegistry 标记，
  换 executablePath 绕不开。
- **沿用批5b 口径在角色会话内复跑**：第二层墙（沙箱内 chromium 崩溃）使该路径今天不可判收；
  用户明示改由维护者侧测试 = 正确的分层（工具链行为层与沙箱部署层分开验证）。

## 复跑登记（2026-10-05，用户令「值得再跑一遍」——多次采样才叫证明）

- **栅栏内 ×2：Target crashed 再现 → 4/4 确定性**（第二层墙非偶发——seam ② 证据升格）；
- 栅栏外 ×2：5/5 稳定（累计 3/3）；B0 重定向 4/4 稳定（修复非侥幸）；
- 孤儿 chromium/headless_shell 进程 **0/2**（probe 杀 server 后 ps 复查；ps 在栅栏内被拒、栅栏外查得）——收割干净，本轮新问首次回答；
- **复跑新抓一题**：probe 资产路径无 run 区分，复跑覆盖首跑 probe-stdout.md → 两 probe
  （taskboard/browser）改「稳定指针 + 时间戳历史」双写；首跑证据自留痕转录恢复。
- 矩阵全文 = [rerun-matrix.md](../../snapshots/browser-behavior-probe/2026-10-04/rerun-matrix.md)。
- **附加试探（试探轮，栅栏内零升级零模型成本）**：真实网站导航 ✅——`browser_navigate
  https://example.com` 真回读 `Page Title: Example Domain`（真网络/TLS/渲染；RAW dump 在会话留痕）。
  教训一笔：快检一次性脚本把本 probe 刚修的 resultText 读法 bug 又复制了一遍——**快检要抄修好的模板**。

## 第二层墙击穿（2026-10-05 复跑轮同日，用户令「修好这里」）

- **根因修正**：栅栏内 Target crashed ≠「chromium 子进程沙箱内不稳定」——A/B 实证裸 playwright-core
  在栅栏内**默认内沙箱也导航成功**；不对称点 = **MCP 默认启用 chromium 全进程内沙箱**（`--no-sandbox`
  旗子语义："disable the sandbox for all process types that are normally sandboxed"）在 DSH seatbelt
  内嵌套崩溃。修法 = 拉起加 `--no-sandbox` ⇒ **栅栏内 5/5 ALL PASS（零升级）**。
- seam 影响更新：②「sandbox × browser-use 联动白名单」降级为**不必须**——provider 落地形状收敛为
  `BrowserMcpConfig` 补两字段：env 透传（HOME / PLAYWRIGHT_BROWSERS_PATH）+ no-sandbox（或 chromium
  args 面）＝上游小改；安全权衡如实记录：chromium 内沙箱关闭后，浏览器级隔离由外层产品沙箱独任
  （页内恶意脚本的浏览器级逃逸面变宽——选型时权衡；本地 probe 场景外层栅栏已足）。
- 资产更新：栅栏内绿跑进 probe-stdout 时间戳历史；in-fence-crash.log 保留为第二层墙的历史证据
  （附根因修正批注）。

## 依据

- deferred-verifications 卡（两笔债的出处与判收口径）：[卡](../../_backlog/_done/_closed_plans/2026-10-02-deferred-verifications.md)
- 批5b 首验与 EPERM 首证：[plugin-harvest-round §风险](./2026-09-30-plugin-harvest-round.md)
- 机制语义（写判据前源码定位）：playwright-core coreBundle（serverRegistry / registryDirectory
  env 感知 / defaultCacheDirectory2 直连）；experimental/browser-use-playwright-mcp/src/index.ts
