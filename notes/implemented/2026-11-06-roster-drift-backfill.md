# 2026-11-06 · 非默认 workspace 的编制漂移：会话一开就按 pack 补种

状态：implemented（2026-11-06；CEO 把 MRD 派给 VP-Sales「代行」的机制侧根因：旧 workspace 的
`.dsh-company` 停在 CMO 出现之前，`org.md`/`owners.md` 无 CMO 席位、也没有 `kb/cmo/CHARTER.md`，
而 bootstrap 只在**默认公司盘**补缺、且永不改既有 `org.md`/`owners.md`）

## 决定

- `bootstrap.ts` 新增 `planRoleBackfill` / `applyRoleBackfill` / `backfillWorkspaceRoles`：
  对**已经存在 `.dsh-company/kb` 的任何 workspace**，按 pack 的六角色补三类缺件——
  ① `kb/<role>/CHARTER.md`（缺则从 `content/charters/` 建）；
  ② `org.md` 缺该角色的部门节（`### …（ROLE，N）`）→ 按 canonical 顺序插在下一个角色节之前，
  并把 `## N 条线` 的计数 +1；
  ③ `owners.md` 缺该角色的归属行 → 插在最后一个角色行之后。
  **只补缺、不覆盖**：其余内容原样保留；既有部门节/行绝不再插第二次（幂等）。
- 接线两处：`ensureRunBundle`（默认盘 boot，补后日志一行）与 `api-session/added`（**任何** cwd 带
  `.dsh-company/kb` 且不是默认盘时，在会话创建时就地补种，并落一行 `编制已按 pack 补齐`）。
- `tests/host/run-bundle/roster-backfill.spec.ts` 四条：缺 CMO 的旧盘 / 幂等 / 不覆盖用户内容 / 非公司盘不动手。

## 输掉的方案

- **只修那几块盘的数据**：下一块旧盘（排练盘、历史 lab 盘、别人的 workspace）再来一遍；机制才是根因。
- **覆盖写 org.md/owners.md**：那是用户可编辑的编制事实，覆盖 = 丢用户改过的部门与人数；只补缺才安全。
- **只在默认公司盘补**：本次事故的盘恰恰是「侧栏另外打开的 workspace」，主盘补不到它。
- **boot 时扫全机 workspace**：要枚举用户登记的所有盘并写入，代价与授权面都过大；会话创建点更准。

## 验证（实跑）

- `pnpm test tests/host/run-bundle/roster-backfill.spec.ts tests/host/run-bundle/bootstrap.spec.ts tests/presets`
  ⇒ **3 files / 45 tests passed**。
- **红证**：把 `planRoleBackfill` 里两处 `merge…` 调用短路成 `undefined` ⇒
  `1 failed | 3 passed`（「缺 CMO 的旧盘」红）；还原 ⇒ `4 passed`。
- **真实例**（重建 pack 后起 `57093`，`session/create` 指定 `cwd=/tmp/company-foreign-ws`）：
  造一块无 CMO 的旧盘 → 建 CEO 会话 3 秒后 `org CMO=true / 六条线=true / owners CMO 行=true /
  cmo charter=true`，web 日志落
  `company-pack：workspace /private/tmp/company-foreign-ws 编制已按 pack 补齐（…cmo/CHARTER.md、org.md、owners.md）`。
- `pnpm typecheck` 通过；`pnpm verify` ALL PASS；重建后 `client-load-smoke` ALL PASS。

## 后果

- 任何带 `.dsh-company` 的盘，在被公司会话使用前自动补齐缺的角色（章程/编制/归属），CEO 读到的是
  与 pack 一致的编制，不会再出现「本部署无 CMO」被当事实。
- 边界：只补**缺件**，不改用户自定的部门内容与人数；新角色首次进入时 `## N 条线` 计数会 +1，
  若用户把该行改成别的写法（非「N 条线」），计数保持原样（不猜）。
- 与 ② 的关系：即使补种失败，persona 的「缺角=补编制/报缺，禁止代行」仍是兜底。
