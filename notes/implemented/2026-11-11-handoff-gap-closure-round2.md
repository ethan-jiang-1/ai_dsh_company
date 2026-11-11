# 2026-11-11 · 接手 gap 第二轮：prepack、hook、卸载对账与 clean-clone setup

状态：implemented（用户 2026-11-11 直接授权：静默自主补齐审计 Y1–Y7）
上游 = [handoff-gap-closure](2026-11-11-handoff-gap-closure.md)（clean clone 首跑、手册指针、发布证据）；
本文补其「未验」中的 clean clone，并把 2026-11-11 只读审计新发现的 Y1–Y7 收口。

## 决定

1. **`npm pack` 缺 `lib/` 必须 fail-loud。** pack 新增 `scripts/prepack-check.mjs`（prepack），检查
   `lib/index.js`/`lib/client.js`；缺则退出 1 并提示 `pnpm setup`。发布路径（`tools/export-dist.mjs`）
   本来先 build，本守护只堵手工打包：`lib/` 是 gitignored，clean clone 直接 pack 会静默打出空壳。
2. **pre-push 接线前移到 `pnpm install` 的 prepare。** 唯一实现 = `tools/hooks-install.mjs`；
   根 `package.json` 的 `prepare` 与 `run/env.sh` 都调用它，不再各写一份 `git config core.hooksPath`。
   原因：core.hooksPath 不随 clone 走，只在 `source run/env.sh` 里接线会让忘 source 的 agent 静默跳过 verify/test。
3. **卸载残留清单两处对账，不删 README 的可执行清单。** pack README 补齐 lease/日志/检索索引 3 条，
   与《安装手册》§八 的 6 条 rm 路径一致；判据 = `tests/harness/repo/uninstall-parity.spec.ts`。
   手册仍是生成物（唯一模板 = `tools/lib/install-manual.mjs`），README 不指向不可离线取得的清单。
4. **随包 YAML 注释里的 docs 指针加存在性 spec。** `cordis.patch.yml` 的 docs/release.md 是死指针；
   `bare-path` 只扫 Markdown，注释面没有守卫。新 spec 只查 pack 内 `.yml` 注释的 `docs/` 路径，
   不扫 `vendor` 相对写法（如注释里的 `vendor packages/...`），避免把上游相对路径误判成仓库根路径。
5. **clean-clone 全量构建进 CI：`setup-macos` job。** 每周/手动在 macOS 上跑
   `pnpm install → pnpm setup → setup --check → verify → test`；不放进每次 push 的 `ci.yml`
   （构建成本与 Linux musl-gcc/双 lock 的已知缺口），也不改 `install-verify` 的双 OS 边界。
6. **`market-index.staged.json` 明确为未发布哨兵。** 在 [release 合同](../../docs/contracts/release.md)
   加一行：6 行哨兵不是待托管索引副本，不要编辑成 index。
7. **版本 0.11.4。** 改动含 pack 的 `package.json`/README/`cordis.patch.yml`，按发布纪律 bump 并重导
   `_dist`（tarball + 手册 + manifest）；市场索引与 staged 同步 0.11.4。
8. **clean clone 的 setup 补齐 Typert pass。** clean clone 实测 `pnpm run setup` 在
   `vendor client types` 失败：`/typert` 与 `/remote` 声明不是 tsc 产物，warm checkout 的 `lib/`
   掩盖了缺口。`tools/setup.mjs` 的 `types()` 在 host types 后加
   vendor `scripts/generate-typert.ts`（bundle-free，30 artifacts / 3.7s），再跑 client types；
   顺序对齐 vendor `scripts/build.ts` 的 `host-src → host-typert → client-src`。
9. **带参数的 setup 一律走 node 入口。** `pnpm setup` 是 pnpm 内置命令，`pnpm setup --check` 实测
   `[ERROR] Unknown option: 'check'`；CI/文档/帮助文本统一 `node tools/setup.mjs --check|--types`，
   并加 `tests/harness/repo/setup-invocation.spec.ts` 防回退。

## 输掉的方案

- **prepack 里直接 build**：把分钟级构建藏进打包，且 `release --prepare` 已 build，会双跑；只做 fail-loud。
- **把 hook 接线留在 `.githooks` 目录内**：目录随 clone 走，但 `core.hooksPath` 不随；仍会静默跳过。
- **pack README 只留一行“看手册 §八”**：npm 页面/离线收件人拿不到可执行命令；保留完整清单 + parity spec。
- **YAML 注释扫全部仓库路径**：会把 `vendor packages/...` 这类上游相对写法判红；只扫 `docs/`。
- **把 setup 全量构建塞进每次 push 的 CI**：与 2026-09-28 的 CI 定界冲突；用每周/手动的 macOS job 单独证明。
- **不 bump 版本、只在 0.11.3 上重打**：发布物已落盘且 manifest 指向 0.11.3；改内容不 bump 会制造 source/artifact 漂移。
- **clean clone 直接跑 vendor `pnpm run build:artifacts`**：全量构建在 7GB runner 有 OOM 前科；用 vendor 自带的
  bundle-free Typert pass，只补 client aggregate 需要的声明。
- **继续用 `pnpm setup --check`**：pnpm 内置 setup 会吞参数，clean clone 实测直接失败；带参统一 node 入口。

## 证据

- `node tools/release.mjs --prepare --allow-dirty` → `export-dist: ALL PASS`；tarball `0.11.4` 259 entries；
  sha `cd4beea4e440697cc7cc20de62870a89f1dd5d582fe74f33705f0aad52b43248`；手册 0.11.4。
- `pnpm verify` → `verify: ALL PASS；2 门无对象`（replay-fixture / replay-ui 显式 SKIP）。
- `pnpm test` → `Test Files 192 passed (192)` / `Tests 1552 passed (1552)`。
- `pnpm typecheck` → exit 0；`pnpm lint` → 0 warnings/0 errors；`pnpm dup` → 0 clones。
- prepack 红/绿（临时副本，不动仓库）：无 `lib/` 时 `npm pack --dry-run` exit 1，
  输出 `pack: 缺 lib/index.js / lib/client.js——先跑 pnpm setup…`；补两个 dummy 文件后 exit 0。
- 卸载 parity 红/绿：删掉 README 的 `company-pack.lock` 行 → `expected [ …(5) ] to deeply equal [ …(6) ]`；
  还原 → 同 spec 绿。
- YAML 指针红/绿：把 `docs/contracts/release.md` 临时改回 docs/release.md →
  `packages/company-pack/cordis.patch.yml:8 → docs/release.md`；还原 → 绿。
- hook 接线：`node tools/hooks-install.mjs` → `hooks: pre-push 已接线（.githooks）`；
  `git config --get core.hooksPath` → `<repo>/.githooks`（本机绝对值）。
- `node tools/release.mjs --verify --allow-dirty` → verify / test / release-smoke / company-entry-smoke /
  client-load-smoke / preset-smoke / present-catalog-smoke 全 pass；preset-smoke 11/11 可挂载。
- clean clone 首轮（`0ffe4547`）`pnpm run setup` 在 vendor client types 失败：
  `Cannot find module '@deepseek-ai/dsh-api-job-controller/remote'` / `ClientRemote` 缺属性；
  单独跑 vendor `tsx scripts/generate-typert.ts` → `wrote 30 Typert artifact(s) … in 3.7s`，
  再跑 setup → `SETUP_DONE=51s`；`pnpm setup --check` → `[ERROR] Unknown option: 'check'`（pnpm 内置命令）。
  修法 = setup 的 types() 加 typert pass + 带参统一 node 入口（本文决定 8/9）。
- setup-invocation spec 红/绿：修前 `tools/setup.mjs`/bootstrap/workflow 出现 `pnpm setup --...` →
  测试红（`tools/setup.mjs 不应出现 pnpm setup --...`）；修后同 spec 绿。
- `node tools/release.mjs --stamp` → `stamp 0.11.4 @ 0ffe4547`；`--check --allow-pre-publish-index` →
  `release: READY 0.11.4 @ 0ffe4547（tgz 259 条目；7 项检查 pass）`（代码提交点；Note 提交后 manifest 以最终 stamp 为准）。
- clean clone：见「未验」节（本轮稍后以独立 clone 跑）。

## 未验

- GitHub Actions 的 `setup-macos` job 未在 GitHub 上执行（本地 clean clone 用同一组命令证明，见下轮更新）。
- patched setup 的新 clean clone 端到端尚在本轮后续；首轮 clone 已暴露缺 Typert 的红，修法见决定 8。
- Desktop/Windows、真模型多轮行为仍按原合同未认证。

## 相关

- 只读审计：2026-11-11 接手成本评估（报告在当轮回复，未落盘）。
- 运行合同：[release](../../docs/contracts/release.md) · [bootstrap](../../docs/guides/bootstrap.md) · [tests/README](../../tests/README.md)。
