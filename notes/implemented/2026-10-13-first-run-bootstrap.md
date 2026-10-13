# 首启自举：装完第一次跑起来就把公司盘落到位

状态：implemented（2026-10-13；起因 = 用户令「如果 company-workspace 不在，你需要建立一下；当然建立好了就不用再建立了」）

## 决定

host 半（`packages/company-pack/src/index.ts` 的 `apply`）在每次装载时跑一次**幂等自举**：
把包内 `workspace/` 骨架落到 `companyHome`（默认 `<DSH_HOME>/company-workspace`）。

三条纪律（住 `src/host/bootstrap.ts` 头注，机器判据 = `tests/company/bootstrap.spec.ts`）：

1. **只补缺**：目标已存在的一律 skip——已有公司盘（尤其本仓 `company-workspace/`，制度件还是符号链接）
   一个字节都不动；缺件补齐（additive migration 语义）。
2. **不抛**：骨架不可用/无权限 ⇒ 返回带 `error` 的空计划 + 一行 warn——插件在 apply 期抛错会砖整个应用
   （postmortem 0003），首启自举不该有这种破坏面。
3. **可重入**：重复调用第二次全 skip（"建立好了就不用再建立了"）。

旋钮（两个，都住 env）：`DSH_COMPANY_HOME` 换落点、`DSH_COMPANY_BOOTSTRAP=off` 关闭。
本仓 `run/env.sh` 显式 `off`——**我们的盘在仓库里**（制度件符号链接 + 业务数据），不需要插件在 DSH_HOME 下
再建一份；模拟安装（release-smoke）自己 `if-missing` 翻回来。

**为什么落点是"默认目录"而不是"会话 cwd"**：公司盘是**人连进 GUI 的工作区**，插件不知道下一个会话的 cwd；
往任意 cwd 写骨架 = 可能把公司盘倒进别人的代码仓。默认目录 + 一条"把它连成工作区"的说明，既不误伤又零配置。

## 输掉的方案

1. **只在文档里写"装完手动 `cp -R workspace/.`"**：装完不能用（多一步人肉步骤，且没人读手册就不会做）。
2. **落在会话 cwd**（"哪个会话跑起来就在哪建"）：会往任意工作区写盘（第三方拿本站当工作区跑 CEO = 公司盘倒进他的代码仓）；且 `git status` 突然多文件——误伤面太大。
3. **plugin Config/schemastery 暴露旋钮**：本仓 dev home 的 profile patch 是 **gitignored**（改不进 git，"我们自管盘"这条声明无处安放），而 env 在 tracked 的 `run/env.sh` 里就能表达；旋钮只有两个 ⇒ 先用 env，涨到三个以上再升级成 Config。
4. **版本标记文件 + 迁移器**（`kb/.skeleton-version` 记录已落版本、按版本做增量迁移）：当前"只补缺"已覆盖同类需求（新增文件会被补上；**已存在文件永不改写** ⇒ 也永不"升级"制度件）——真需要"制度件升级"时再引入（届时要有覆盖策略与冲突提示）。
5. **只在 release-smoke 里验、不进产品**：那等于"文档说会自动建、实际不会"——本仓最忌的空转形状。

## 后果与边界

- **已有盘的制度件不会升级**：`只补缺` 意味着插件版本带来的手册/章程更新**不会**写进已存在的盘（安全 > 新鲜）。
  这是明确取舍；要升级 = 手工比对（或将来做版本标记 + 冲突提示）。**本仓自己的盘不受影响**（制度件是符号链接 ⇒ 永远跟 pack）。
- **落点在 DSH_HOME 下**：第三方装完即有盘可连；但"连成工作区"仍需人在 GUI 里点一次（未自动化——见下"仍未做"）。
- **日志面**：落盘成功/跳过各一行（`ctx.logger.info/warn`）。**首次实测教训**：路径算错时它只留一行 warn，
  在真实例里没人看见——是模拟安装（release-smoke ⑥）把它抓出来的；故那条断言不是装饰。

## 验证（都真跑过）

- `pnpm test` —— **53 files / 522 tests 绿**，含 `tests/company/bootstrap.spec.ts`（8 条：全 create / 骨架缺失带 error 不抛 /
  第一次落盘 + 第二次全 skip + 已有文件内容不改 / 部分缺件只补缺 / error 计划是纯 no-op / 落点优先级 / 开关 /
  **路径算术防"多套一层 workspace"**）。
- **模拟安装**：`source run/env.sh && node checks/smoke/release-smoke.mjs` —— **ALL PASS**，新增：
  `PASS 安装副本带出厂骨架 workspace/（手册 + 章程 + 模板 + 起动件）`、
  `PASS 首启把出厂公司盘落到 DSH_COMPANY_HOME（含手册/章程/起动件）（共 30 件）`、
  `PASS 第二次启动零变更（建立好了就不用再建立了）（before=30 after=30）`。
- **真 bug 由此抓出并修**（本轮最有价值的一条）：首版接线把已解出的 `<pack>/workspace` 又喂给会再拼
  `workspace` 的助手 ⇒ 指向 `<pack>/workspace/workspace`，真实例里**静默**只留一行 warn；
  release-smoke ⑥ 报 `落点不存在` ⇒ 定位（直接以 stub ctx 调 `apply` 看到 warn 原文）⇒ 收敛成
  `resolveSkeletonDir(moduleUrl)` 一条路 + keyless 防复发断言。
- `pnpm verify` ALL PASS；`preset-smoke`、`client-load-smoke` ALL PASS。
- **未跑**（如实登记）：`handbook-smoke`（真模型注入验收；**无 `DEEPSEEK_API_KEY`，阻断**——第三方盘里
  "角色会话读到的确实是这份手册"仍只有机制证据（同一文件、同一注入路径），没有模型档证据）。

## 仍未做（本 goal 的后续切片）

- **把落点登记成工作区**（GUI 里自动出现"梦之队公司盘"）：未做——现在要人手点一次"添加工作区"。
- ~~仓库瘦身~~ → 已做完：[公司盘瘦身](2026-10-13-workspace-slimming.md)。
- 制度件升级策略（见"后果与边界"第 1 条）。

## 落点

- 纯逻辑：`packages/company-pack/src/host/bootstrap.ts`（`planBootstrap` / `applyBootstrap` / `bootstrapCompanyWorkspace` /
  `resolveSkeletonDir` / `resolveCompanyHome` / `bootstrapEnabled`）；host 接线：`packages/company-pack/src/index.ts`（apply 末尾）。
- 编译面：`tsconfig.host.json`（`include` 加 `src/host` + `types: ["node"]`）；client 叶注释点明 `src/host/**` 不进它。
- 判据：`tests/company/bootstrap.spec.ts`；模拟安装：`checks/smoke/release-smoke.mjs` ④⑥；
  文档：`docs/release.md` §真实安装冒烟程序 6、`packages/company-pack/README.md`、`packages/company-pack/src/README.md`、`run/env.sh`。
- 同伴决定：[出厂公司盘骨架随包分发](2026-10-13-company-workspace-skeleton-shipped.md)。
