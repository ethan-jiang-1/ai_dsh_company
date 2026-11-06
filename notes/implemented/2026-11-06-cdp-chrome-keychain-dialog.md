# 2026-11-06 · 真浏览器探针别再弹 macOS 钥匙串框（"A keychain cannot be found to store Chrome"）

状态：implemented（2026-11-06；用户实证：每次跑真浏览器检查后 macOS 弹「A keychain cannot be found to
store "Chrome"」+ Reset To Defaults，要密码；点过很多次都复发）

## 根因

`tools/drivers/cdp-driver.mjs` 的 `launchCdpBrowser` 是手搓 `spawn`，参数表里**没有** Playwright
launcher 默认的那两枚钥匙串开关。而这个驱动是从 **DSH 沙箱化的 bash** 里起 Chrome 的（同 shell 的旁证：
`log show` 直接报 `Cannot run while sandboxed`，`ps` 被拒），Chrome 拿不到系统钥匙串，于是每起一个一次性
`--user-data-dir` profile 就弹一次系统框索要密码。`Reset To Defaults` 只把登录钥匙串改名
（`~/Library/Keychains/login_renamed_1.keychain-db` 即产物），触发源还在，所以点多少次都没用。

路径分叉也是证据：`client-load-smoke` 走 `launchChromium`（Playwright 自带
`--password-store=basic` + `--use-mock-keychain`）⇒ 从不弹；`cdp-probe` / `ui-scene-smoke` 走手搓 launch
⇒ 每跑必弹。

## 决定

- `launchCdpBrowser` 参数表补 `--password-store=basic` 与 `--use-mock-keychain`（逐字对齐 Playwright
  launcher）：一次性 profile 改用内置 basic store + mock keychain，Chrome 完全不碰 OS 钥匙串。
- [cdp-probe 指南](../../docs/guides/cdp-probe.md) 的「已踩平的环境坑」加一条，写明症状与两枚开关。

## 输掉的方案

- **让用户点 Reset To Defaults / 重建登录钥匙串**：治不了触发源（沙箱里的 Chrome 每次起都要一遍），
  且已把登录钥匙串改名过一次；再点是拿用户的钥匙串数据换一次假修复。
- **探针统一改走 Playwright launch**：驱动是通用 CDP 驱动（launch + attach 两条路），`attach` 根本不
  spawn 浏览器；为一个开关重构驱动层，风险大于收益。
- **要求「跑探针前把 shell 升到 danger-full-access」**：把「能不能跑」绑到权限档，且不保证 seatbelt
  对 securityd 的 mach 限制真的解除；开关是确定性的。
- **只写文档不动代码**：下次跑探针照弹，等于没修。

## 验证（实跑）

- `node probes/browser-visual/cdp-probe.mjs '<gui-url>'`（真 Chrome，走 `launchCdpBrowser`）⇒
  **exit 0**：九个公司页签全在、`tabFailures=[]`、`consoleProblems=[]`、`exceptions=[]` ⇒ 两枚开关被
  Chrome 正常接受，CDP 链路不受影响。
- 同一轮前后 `stat ~/Library/Keychains/login.keychain-db`：`mtime=2026-11-06 12:09:36 / size=118492`
  **前后一致** ⇒ 这轮 Chrome 没往钥匙串写东西。
- **未做红证**：旧参数下会让用户再看到一个系统弹窗，代价大于证据价值；可比基线改用 Playwright launcher
  的参数表（它带这两枚开关，且其路径从不弹）。

## 后果

- 真浏览器检查（`cdp-probe` / `ui-scene-smoke` / 任何用 `launchCdpBrowser` 的探针）不再弹钥匙串框。
- Playwright 路径不变（本来就有这两枚开关）。
- **已知边界**：若日用 Chrome 自己也弹这个框，那是另一条（不是本仓触发）；处置是先确认弹窗归属的进程，
  别再用 `Reset To Defaults` 换钥匙串改名。
