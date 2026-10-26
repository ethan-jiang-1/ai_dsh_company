# 多 home / 多 profile / 非空 home 的安装合同（0.3.9）

状态：已交付（2026-10-26）。范围 = 分发/安装/升级的 profile 形状，不是新功能。

## 发现

1. **自定义 profile 不是一个可用的公司 profile**。`dsh plugin --profile web-a add <tgz>` 在空 home 自动建出的
   `web-a/package.json` 只有：
   `["@deepseek-ai/dsh-base", "dsh-company-pack"]`，**没有 `@deepseek-ai/dsh-web-app`**。
   启动输出 6 条 preset 行 `pending (waiting for service: agentPresets)`——本包的 roster 行是替换
   web-app 的 insert 行，base-only profile 没有它。
   → 合同：公司包要求含 `@deepseek-ai/dsh-web-app` 的 web profile；自定义 profile 名可以，但必须把
   web-app 加进 `dsh.profile.bundles`。**不承诺兼容 base-only profile。**
2. **一个 `DSH_HOME` = 一个 run bundle**。同一 home 下的多个 profile 共用 `bundle.json`、sessions、
   默认 workspace；`--profile web-a/web-b` 不是隔离单位。第二家公司/第二个 CEO 用第二个 home。
3. **非空 home 后装 pack 是安全的**：先有 stock workspace+session，再 `plugin add`；旧 session 文件仍在，
   roster 增加 company preset；用户 `cordis.patch.yml` 在重复 add 后原字节保留。
4. **空 bundle 可与公司包共存**：一个无 row 的 bundle 层装入/卸载不抢行；这是“多 pack 只保证不抢行”的最小证据。
5. **两个 home 的真装隔离**：bundle id、company.md、journal、sessions 目录都不串。

## 测试资产

- 新增 [multi-install-smoke.mjs](../../checks/smoke/multi-install-smoke.mjs)：两 home 真装、非空 home 后装、
  同 home 两 profile 反例、自定义 profile 补 web-app、空 bundle 共存/卸载、重复安装幂等、用户 profile patch 保留。
  已进 [checks/README](../../checks/README.md)；成本 ~3-4 分钟，**未进 release --verify**，发布前手动跑。
- [two-homes.spec.ts](../../tests/company/two-homes.spec.ts)：keyless 双 home identity/company/catalog 隔离。
- `bundle-manifest.spec.ts`：用户删基部补建、v2 移除基部不删用户盘。
- `lifecycle-smoke`：home `sessions`/`storages` sentinel 跨升级逐字节不变。
- `release-smoke`：同版本重复 add 不产生重复 bundle。

## 红/绿

- 红：base-only `web-a` 启动 → `did not activate` / `agentPresets pending`；补 web-app → roster 含 ceo。
- 绿：`multi-install-smoke` ALL PASS（0.3.9 tarball）。
- 绿：`pnpm verify` 47 gates；`pnpm test` 92 files / 860 tests；`release --verify --with-key` 9 项全绿。

## 未执行 / 边界

- **Windows**：未执行；本机 Darwin。静态事实：`tools/standalone.mjs` 显式拒绝 win32；release/standalone smoke
  依赖 POSIX 进程组。不能声称 Windows 可用。
- **容器**：Docker CLI 在，但 daemon 不可用（`docker info` 连接失败）；未跑 Linux 容器。
- **预构建离线**：边界 = `_dist` tarball + 已安装 DSH/base；不把 DSH 本体打进公司包。空 store/无网的安装
  已在第二机模拟覆盖，不等于“零 DSH 的离线自举”。
- 同一 home 多 profile 的**隔离**不承诺，也不做兼容；这是 run bundle 概念上的共享 home。
