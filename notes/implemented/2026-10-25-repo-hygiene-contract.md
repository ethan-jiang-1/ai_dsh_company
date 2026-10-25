# repo hygiene 合同：默认拒绝 + 类级门禁 + 一次历史清理（2026-10-25）

状态：implemented（2026-10-25；用户令「不惜一切代价把它做对」；`pnpm verify` + `pnpm test` 全绿；两处 token 历史已 scrub）

> 上游 = [BUG-013（e2e driver token）](../../_backlog/_archive/fixed_bugs/BUG-013-e2e-driver-token-committed.md)、
> [BUG-029（web-logs token）](../../_backlog/_archive/fixed_bugs/BUG-029-committed-web-token-recurrence.md)。
> 上一轮窄扫决定 = [tracked-token 类级守卫](2026-10-20-tracked-token-guard.md)。本 Note **部分取代**它：
> URL 窄扫与 tracked-token 门禁保留；其中「不做历史重写」的裁定被本次用户令推翻，两处 token 历史一并清理。

## 决定

1. **`runtime/` 从逐条点名改为默认拒绝 + 显式白名单**。`.gitignore` 的 `runtime/*` 拒绝整树，
   只放行 5 件：`runtime/README.md`、`runtime/probe-*.mjs`（3 件）、`runtime/harness-home/README.md`
   （目录 negation 两行，见 `.gitignore` 注释）。新增残留目录（如 `runtime/ops/`）默认就忽略，
   不再靠每次记得补规则。
2. **四条类级防线进 `pnpm verify`**：
   - `no-tracked-ignored`：`git ls-files -ci --exclude-standard` 必须为空——`git add -f` 也绕不过。
   - `tracked-file-size`：tracked 文件 2MB 上限，点名超限文件（防截图/数据库/tgz 当资产提交）。
   - `gitignore-shape`：断言默认拒绝/白名单形状，并用 `git check-ignore --no-index` 真验
     `runtime/ops`、`runtime/e2e`、`runtime/web-logs`、`harness-home` 凭据面与 5 件白名单。
   - `tracked-secrets`：跨仓 tracked 文本的**带引号凭据赋值**扫描（`const TOKEN = '...'`），
     补 `tracked-token` 只认 URL 查询串的形状缺口；值不打印。
3. **secret 扫描的范围声明同步**：`security-scan` 仍只真扫 `packages/company-pack/workspace/`；
   跨仓 tracked 面 = `tracked-token`（URL）+ `tracked-secrets`（赋值）。合成夹具面
   （`checks/lib/ci-security-gates/` 下的 fixtures 与 evidence 子目录）由 a2 自测与 MANIFEST 指纹负责，
   不在新门禁重复扫。
4. **fresh-clone CI**：新增 `.github/workflows/fresh-clone.yml`，在干净 runner 上按
   [bootstrap 配方](../../docs/guides/bootstrap.md)跑 install → `bundle:init` → host/native/pack 构建 →
   `pnpm test` → `pnpm verify`；手动 + 每周一 03:00 UTC。它才是「tracked 内容支持开发」的可执行证明。
5. **一次性 history scrub**：删除 `runtime/e2e/` 与 `runtime/web-logs/` 的全部历史，force-push
   `master` 与 tag `0.0.1`，并删除旧的 `rewrite/master` 远端分支。执行前留全量 bundle 备份。
6. **文档单源**：`AGENTS.md` 不再枚举 runtime 白名单（白名单唯一家 = `runtime/README.md`）；
   `runtime/README.md` 改成精确的 5 件 + `ops/` owner；删除 `cold-storage` 的 tracked 陈旧说法
   （真实证据已移出产品仓）。`docs/project-map.md` 同步「默认整树忽略 + 显式白名单」。

## 输掉的方案

- **继续逐条点名 ignore**：`runtime/ops` 已经证明会漏；每来一个新目录就补一条，长期必漂。
- **`runtime/` 整树 ignore、不设白名单**：会把 5 件 tracked 文件（两份 README + 3 个 probe）
  一起藏掉；`git add -f` 仍可绕过，且没有 owner 登记。
- **直接复用 a2 全仓扫描 secret**：a2 以目录为 target 会走 `node_modules` / 大目录；且对
  `never-render-this-placeholder`、`0123456789abcdefghij` 等测试替身恒假红。故选「只认带引号赋值 +
  显式占位串 allowlist + 夹具面交给 a2/MANIFEST」。
- **引入 gitleaks 作为本地门禁**：第三方二进制/许可与 CI 成本；当前 quoted-assignment 扫描已覆盖
  BUG-013 的真实形状。若将来需要历史/熵的独立第二意见，再单独加 CI 层，不塞进 `pnpm verify`。
- **不重写历史**：旧 Note 的裁定是「token 是本地进程级、失效即可」。本次用户令把长期正确置于
  SHA 稳定之上；且历史里实际有**两处**（e2e driver + web-logs），不是一处。继续保留会让任何
  clone/fork 永久继承 token 形状。
- **把 `runtime/ops` 移进 `snapshots/`**：`snapshots/` 只收合成/脱敏 fixture；真实窗口截图属
  部署证据，按 [snapshots 政策](../../snapshots/README.md) 不进产品仓。留在本机 ignored 区、按 7 天清扫。
- **只 untrack 不清理历史**：已做过一次（BUG-013/029），历史仍在；与「永不提交密钥」不相容。

## 后果

- 新增残留目录不再需要改 `.gitignore`；要 tracked 一个 runtime 文件则必须同时改白名单、README、
  `gitignore-shape` 的期望表——摩擦是故意的。
- tracked 文件超过 2MB 会红；确需大件时先论证它该不该在产品仓（多数应去私有归档/生成物）。
- `tracked-secrets` 的占位串 allowlist 是显式的；新增测试占位串要同步加值并说明，不能整目录豁免。
- 历史 SHA 已变化：`master` 已重写（本次提交），tag `0.0.1` = `5be568a`；旧 SHA 引用（如 `bfa893e`）
  继续悬空。**今后文档用日期 + 标题 + Note 链接作证据锚点，不再引用 commit SHA。**
- 旧 clone 必须重新 clone（不能 pull）；远端 `rewrite/master` 删除后，旧历史不再可达。
- `runtime/ops/shots/window-boot.png` 仍在本机（ignored）；`prune-runtime` 会因 tracked markdown 引用保留它，
  fresh clone 不会带它——这符合「真实部署证据不进产品仓」。

## 验证（实跑，2026-10-25）

命令链一律 `set -o pipefail`；临时红件创建后已删除，`git status` 干净。

```text
# 门禁红/绿（每条都先破坏真东西，再还原）
FAIL no-tracked-ignored: index 里有 1 件命中 ignore 规则（git add -f 绕过）：runtime/ops/shots/window-boot.png
（git rm --cached 后）PASS no-tracked-ignored（索引零命中…）

FAIL tracked-file-size: 1 件超过 2MB：notes/zz-size-test.bin (3.0MB)
（删除后）PASS tracked-file-size ×719（最大 pnpm-lock.yaml 0.90MB / 上限 2.00MB）

FAIL gitignore-shape: 缺规则 /^runtime\/\*$/m；runtime/ops/shots/window-boot.png 应 ignored 实为 not-ignored；
  runtime/e2e/assembly-e2e-driver.mjs 应 ignored 实为 not-ignored；runtime/web-logs/web-20261019-105001.log 应 ignored 实为 not-ignored
FAIL gitignore-shape: 缺规则 /^!runtime\/probe-\*\.mjs$/m；runtime/probe-drill.mjs 应 not-ignored 实为 ignored
（两次还原后）PASS gitignore-shape（runtime 默认拒绝 + 5 件白名单；check-ignore ×10）

FAIL tracked-secrets: 1 件 tracked 文本含硬编码凭据赋值（值不打印）：notes/zz-secret-test.md:1 key=TOKEN len=32
（删除后）PASS tracked-secrets ×696（tracked 面零硬编码凭据赋值…）

pnpm verify  → verify: ALL PASS
pnpm test    → 86 files / 834 tests passed
```

```text
# history scrub（先备份，后重写）
git bundle create runtime/backups/git-pre-scrub-2026-10-25.bundle --all   # verify: okay
FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch --index-filter \
  'git rm -r --cached --ignore-unmatch runtime/e2e runtime/web-logs' \
  --prune-empty --tag-name-filter cat -- --all
# 删除 refs/original + reflog expire + gc 后：
git log --all --oneline -- runtime/e2e runtime/web-logs      # 0
git rev-list --objects --all | grep -cE 'runtime/(e2e|web-logs)'  # 0
# master 已重写；tag 0.0.1 = 5be568a；729 commits
```

远端清理（2026-10-25）：`git ls-remote origin` 只剩 `refs/heads/master` + `refs/tags/0.0.1`，
无 `rewrite/master`；本地旧的 remote-tracking ref 也已删除。

## fresh-clone 首跑与已知缺口（2026-10-25）

CI 先按「全配方」跑，连续红，逐条暴露（都不是本仓 tracked 内容缺失）：

- **红 1**：`Cannot find package 'vite'`——vendor 根的依赖没有装（根 lock 不提供 vendor 根
  devDependencies；本地能跑是因为旧 vendor `node_modules` 还在）。
- **红 2**：根 lock 把 `@earendil-works/pi-ai` 解析到 `1.3.0`，全 host 类型检查在
  `packages/llm/llm-pi-ai/src/catalog.ts` 报 TS1360；vendor lock 钉的是 `1.1.0`。
- **红 3**：全 host 项目图 + `tsdown host` 在 7GB runner 上 `Ineffective mark-compacts near heap
  limit`（OOM）。
- **红 4**：native build 在 Linux 报 `spawnSync musl-gcc ENOENT`（landlock-run 静态编译）。
- **红 5**：pack build 报 `Cannot find module '@deepseek-ai/dsh-client-*/client'`——pack 的 client 面
  依赖 vendor client 类型；client aggregate 又带 vendor 测试面的既有类型错误。
- **红 6（已修）**：干净 verify 在 `bare-path` 报
  `docs/design/roles-isolation.md` → packages/subagent/subagent-in-process-driver（旧名）不存在。该包是
  本机 vendor 残留（无 package.json/src），不在 submodule 里；本地残留目录把它掩盖了。
  已把设计文档改到现行的 `packages/subagent/subagent`（`applyChildComposition` 的现行家）。

**处置（诚实范围）**：

- `fresh-clone` CI 收敛为 **install → `bundle:init` → `pnpm verify`**：干净、可绿，证明 tracked
  内容能装、能建 dev workspace、能过全部门禁。它**不**跑 vendor 全量/native/`pnpm test`。
- dev 机按 [bootstrap 配方](../../docs/guides/bootstrap.md)：两套 lock（根 + vendor）+
  最小 host type graph（六包）+ native（Linux 需 musl-tools）+ pack；全量 host 打包走发布/本机并
  注意内存。
- **未修 / 已知缺口**（后续 pin 升级或构建分片任务处理，不在本任务硬改 vendor）：
  vendor 双 lock 版本漂移、全 host 构建 OOM、client aggregate 测试类型、Linux musl-gcc 前置。
  CI 不用 `continue-on-error` 或降级断言来假绿。
- 重跑记录：run 40159113068 **绿**（2026-10-25，install → `bundle:init` → `pnpm verify`；干净 Ubuntu runner）。

## 跨环境合同（2026-10-25）

- **新增合同** = [docs/repo-hygiene.md](../../docs/repo-hygiene.md)：两棵树、什么进 git、跨环境规则、例外、执行面。
- **新增基线** = `.gitattributes`：`* text=auto eol=lf` + 二进制后缀；CI 双跑 Ubuntu/macOS。
- **新增门禁** = `tracked-portability`：活动面绝对 home 路径、CRLF、大小写冲突、macOS 专属命令。
  例外 = `notes/archived/`、`_backlog/_archive/`、`snapshots/`、合成 fixture；活动面已去本机化
  （AGENTS、external-research、notes/README、probes/open-in-app、security-gates README 等）。
- **红/绿**：staged `docs/zz-portability.md` 写一个本机绝对 home 路径 → `FAIL tracked-portability:
  docs/zz-portability.md:1 绝对 home 路径…`；删除 → 绿。删 `.gitattributes` →
  `FAIL tracked-portability: .gitattributes 缺失…`；还原 → 绿。
- **影响**：新活动文档/脚本若带本机绝对路径或 macOS 专属命令，`pnpm verify` 直接红；历史归档保留原样。

## 指针

- 边界 = [.gitignore](../../.gitignore)；逐件 owner / 白名单 = [runtime/README.md](../../runtime/README.md)；
  空间导航 = [docs/project-map.md](../../docs/project-map.md)。
- 门禁 = [checks/gates/no-tracked-ignored.mjs](../../checks/gates/no-tracked-ignored.mjs)、
  [tracked-file-size.mjs](../../checks/gates/tracked-file-size.mjs)、
  [gitignore-shape.mjs](../../checks/gates/gitignore-shape.mjs)、
  [tracked-secrets.mjs](../../checks/gates/tracked-secrets.mjs)；
  纯逻辑 = [tools/lib/tracked-secrets.mjs](../../tools/lib/tracked-secrets.mjs)。
- fresh-clone CI = [.github/workflows/fresh-clone.yml](../../.github/workflows/fresh-clone.yml)；
  配方 = [bootstrap.md](../../docs/guides/bootstrap.md)。
