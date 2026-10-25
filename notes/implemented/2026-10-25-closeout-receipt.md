# 收尾回执：company-pack 0.3.2（分发 / 分离 / 独立启动）

状态：implemented（2026-10-25）

## 结论

六张收尾卡全部结清并归档；三份 RFC 全部毕业为 implemented Note；产物版本 `0.3.2`。
对外形状 = **真插件安装**（tarball + profile）与 **目录独立启动**（`pnpm standalone`）两条；
共同判据 = 不依赖维护者机器/仓库/数据也能装、跑、升级、删。

## 卡与去向

| 卡 | 去向 |
|---|---|
| [分发契约与产物身份](../../_backlog/_archive/settled_issues/2026-10-25-distribution-contract.md) | [distribution-lifecycle](./2026-10-25-distribution-lifecycle.md) |
| [安装生命周期证据](../../_backlog/_archive/settled_issues/2026-10-25-install-lifecycle-evidence.md) | 同上 |
| [出厂内容自足](../../_backlog/_archive/settled_issues/2026-10-25-shipped-content-self-contained.md) | [installed-shape-self-sufficient](./2026-10-25-installed-shape-self-sufficient.md) |
| [成品目录与审计产品化](../../_backlog/_archive/settled_issues/2026-10-25-deliverables-catalog-and-audit.md) | 同上 |
| [独立启动形状](../../_backlog/_archive/settled_issues/2026-10-25-standalone-deployment-shape.md) | [standalone-deployment](./2026-10-25-standalone-deployment.md) |
| [部署身份与盘守卫](../../_backlog/_archive/settled_issues/2026-10-25-deployment-identity-and-workspace-guard.md) | 同上 |

## 证据（本轮实跑）

- `pnpm verify` → `ALL PASS`（含 `pack-engines`、`dist-manual`、`shipped-links`、`backlog-liveness`、`gate-wiring ×46`）。
- `pnpm test` → 87 files / 839 tests passed。
- `node checks/smoke/release-smoke.mjs` → `ALL PASS`（0.3.2 真 tarball 安装；32 件骨架；空 catalog；二启零变更）。
- `node checks/smoke/lifecycle-smoke.mjs` → `ALL PASS`（0.3.2 → 0.3.3；改基部保留/未改替换/扩张不动；卸载；搬 home）。
- `node checks/smoke/standalone-smoke.mjs` → `ALL PASS`（隔离 home；自建 profile；copy 骨架/身份；relink；boot/RPC；reset）。
- `node checks/smoke/client-load-smoke.mjs` → `ALL PASS`（真浏览器零挂载失败；品牌槽）。
- `node tools/export-dist.mjs` → `ALL PASS`；tgz 269 条目；sha256 `3c33dcdff0b130ca7f5b3e026cfc69fe4a70e11cb4ef91b45b4140dfe1680ac8`；手册 [_dist/安装手册.md](../../_dist/安装手册.md) 版本 0.3.2。
- 现有 GUI（本会话观察窗）未被替换；所有临时实例用随机端口并在结束时回收。

## 合同与文档

- [docs/release.md](../../docs/release.md)：`engines.dsh` 是运行时窗口、矩阵是认证台账；sha256 产物身份；生命周期冒烟；版本 0.3.2。
- [docs/profile.md](../../docs/profile.md) 与 [guides/bootstrap.md](../../docs/guides/bootstrap.md)：两条部署形状矩阵。
- [packages/company-pack/README.md](../../packages/company-pack/README.md)：收件人入口（版本不在此复述）。
- [runtime/README.md](../../runtime/README.md)：`standalone/` 运行残留 owner。
- [checks/README.md](../../checks/README.md)：`standalone`、`lifecycle-smoke`、`standalone-smoke` 入口。
- [docs/decisions.md](../../docs/decisions.md)：D44（host catalog）与 D48（目录独立启动）路由。

## 资产增量

- 新门禁：`pack-engines`（并入 `pack-shape`）、`shipped-links`。
- 新冒烟：`lifecycle-smoke`、`standalone-smoke`；`release-smoke` 增加空 catalog 断言。
- 新测试：`tests/company/catalog.spec.ts`（5 条）。
- 新入口：`pnpm standalone`（`tools/standalone.mjs`）。
- 新身份件：`workspace/kb/company.md`。

## 未验证面 / 边界

- **真实 live 会话的 present→catalog 端到端**：当前有单测投影 + release-smoke 空目录；需要一次真模型/工具调用会话才能补。
- **完整 `deliverables-check` 三态审计**仍在产品外（第二阶段）；host 只记 present/未核。
- 浏览器里公司名的视觉断言未单独做（`client-load-smoke` 只证零挂载失败与品牌）。
- 未承诺/未验证：npm registry 发布、market 索引、预构建离线包、Windows、真容器/第二台机器。
- vendor 产物是环境前置；本机补建过 host/client bundle（ignored 面，不是产品 diff）。

## 下一脚（触发式）

1. 出现第二个真实消费者或自助需求 → 开 npm 发布 RFC（license/名字/自动化/支持窗口）。
2. 下一次真模型动议 → 补一次 present→catalog 的 live 验收，记入本 Note 后续或新卡。
3. 需要完整三态审计/归档收敛 → 第二阶段卡（`deliverables-check` 语义最小集）。
