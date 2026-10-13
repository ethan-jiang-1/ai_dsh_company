# 出厂公司盘骨架随包分发（插件给不同人安装的第一块）

状态：implemented（2026-10-13；起因 = 用户「company-workspace 里只有部分内容值得进 git」+「这插件要给不同人安装」）

## 决定

把公司盘的内容分三层，各归其家（**家**决定进不进 git、随不随包分发）：

| 层 | 内容 | 家 | 进 git | 随包分发 |
|---|---|---|---|---|
| ① 出厂骨架 | 手册 `AGENTS.md`、`templates/`、`kb/org.md`、`kb/<角色>/CHARTER.md`×5 | **`packages/company-pack/workspace/`**（唯一真源） | ✅（就是 pack 源码） | ✅（`files` 带 `workspace/**`） |
| ① 起动件 | `kb/owners.md`、`kb/motion-ledger.md`（待填/待写）、空目录 `.gitkeep` | 同上 | ✅ | ✅ |
| ② 本部署数据 | 填写后的 owners、台账行、`kb/<角色>/journal/`、`deliverables/` | `company-workspace/`（运行盘） | 现状不变（本轮只动 ①） | ❌ |
| ③ 过程物料 | `deliverables*/**/drafts/**`（含 `sources/` 原始取证） | 运行盘 | 待切片 2（≈70MB / 694 件） | ❌ |

运行盘对 ① 用**符号链接**指回 pack（`company-workspace/AGENTS.md` → `../packages/company-pack/workspace/AGENTS.md` 等 8 处），
不复制：一处事实一个家（先例 = 根 `CLAUDE.md`、排练场手册）。角色会话读 `company-workspace/AGENTS.md` 照读（链接透明），
而第三方装到的与我们在改的**是同一份**。

**为什么这是"给不同人安装"的硬缺口**：手册是 vendor `agent-instructions` 从**会话 cwd 往上找 `AGENTS.md`**
注入的（`DEFAULT_INSTRUCTION_FILE_CANDIDATES`），我方 host 零注入，而 pack 的 `files` 此前只有
`lib/** presets/** cordis.patch.yml` ⇒ **第三方装完插件，五个角色裸跑**：没手册、没 CHARTER、没模板。

## 输掉的方案

1. **全 ignore（连手册都不进 git）**：骨架失去唯一真源，第三方与我们都拿不到——方向反了。
2. **维持现状（全 tracked）**：仓库随每场动议涨 10–40MB，且第三方会装到"我们这家公司的数据"。
3. **只 ignore drafts、不迁骨架**：仓库瘦了，但"给别人装"仍缺手册——半个答案。
4. **业务数据拆独立仓/submodule**：converge、deliverables-check、orient 全要跨仓跳，收益不抵复杂度（数据再涨 10× 再回看）。
5. **骨架复制进运行盘 + 漂移门禁**（不做符号链接）：两本账要靠门禁天天对表，不如链接本身单源。

## 后果与边界（本轮真撞到的两处）

1. **md-links 的（路径）排除**：骨架是要**发布到任意磁盘**的运行语料，手册里的相对指针（`../docs/*`）
   是**部署相对**的——在运行盘读到才成立，在 pack 家读到深度没有意义。所以 `tools/lib/markdown-links.mjs`
   按**路径**排除 `packages/company-pack/workspace`（不按目录名，避免误伤任何叫 workspace 的目录），
   校验落在运行盘那份（显式加入 `company-workspace/AGENTS.md`，符号链接读到同一内容）。
   模板与 CHARTER 实测 **0 条 markdown 链接** ⇒ 无覆盖损失。
2. **排练场镜像要解引用**：`tools/lib/rehearsal.mjs` 此前 `cpSync` 直接拷制度件；源变成符号链接后
   二次刷新 EEXIST 崩（preset-smoke 首跑现场）。修法 = `copyRef` 先 `realpathSync` 再拷
   （⚠ Node 的 `cpSync` 对「符号链接源 + 已存在目标」会抛误导错 `Cannot overwrite non-directory … with
   directory …`，`dereference: true` 与否都实测复现——所以不能靠 `dereference` 旗子）。
   排练场拿到的是**实文件**（每次刷新），不跟着仓库走。

**同轮已接着做完**：②首启自举 = [首启自举](2026-10-13-first-run-bootstrap.md)；③模拟安装 =
release-smoke ④⑥（骨架随包 + 首启落盘 + 二次启动零变更，ALL PASS）。
**同轮再接着做完**：④仓库瘦身 = [公司盘瘦身](2026-10-13-workspace-slimming.md)（drafts/sources 出 git +
converge/orient/排练判据适配 + `drafts-untracked` 门禁）。
**仍未做**：⑤落点自动登记成工作区、⑥制度件升级策略。

## 验证（都真跑过）

- `node checks/run-gates.mjs`（`pnpm verify`）——**ALL PASS**，含新门禁 `company-skeleton`
  （`PASS company-skeleton 单源 ×8 + 起动件 ×9`、`PASS company-skeleton 随包分发（files 含 workspace/**）`）。
- 门禁反证三处（红→还原→绿，原话）：
  ① 运行盘手册换成真副本 ⇒ `FAIL company-skeleton: company-workspace/AGENTS.md 不是符号链接（副本 = 第二本账；运行盘该指回 packages/company-pack/workspace/AGENTS.md）`；
  ② `files` 删掉 `workspace/**` ⇒ `FAIL … 的 files 缺 workspace/**——第三方装了插件却没有公司盘骨架`；
  ③ 删起动件 `owners.md` ⇒ `FAIL … packages/company-pack/workspace/kb/owners.md 缺失（出厂起动件/空目录骨架）`。
- 镜像守反证：把 `copyRef` 退回 `cpSync(…, {dereference:true})` ⇒ 新测
  「真盘制度件是符号链接时，镜像落的是实文件」红（`Error: Recursive option not enabled, cannot copy a directory: …/kb/org.md/`）→ 还原绿。
- `pnpm test` —— **52 files / 514 tests 绿**（含新镜像守）；`preset-smoke`、`client-load-smoke` —— **ALL PASS**。
- **未跑**（如实登记）：`handbook-smoke`（真模型注入验收；**无 `DEEPSEEK_API_KEY`，阻断**——它才是"注入的确实是手册"那一道，
  本轮的注入面证据 = 角色会话能读 `company-workspace/AGENTS.md`（链接透明）+ preset-smoke 挂载）；`release-smoke`（切片 3 跑）。
- 顺带核过（不是本轮引入的）：`deliverables/**/fixtures/**/.ssh/id_ed25519` 是**合成夹具**
  （内容 = `SYNTHETIC-ED25519-FIXTURE-DO-NOT-USE`），是凭据可达性门禁的必需诱饵——"永不提交密钥"要留这条写明条件的例外。

## 落点

- 骨架：`packages/company-pack/workspace/`（含 `README.md` 说明"是什么 / 装完怎么落盘"）；pack `files` 加 `workspace/**`。
- 运行盘链接：`company-workspace/AGENTS.md`、`templates`、`kb/org.md`、`kb/<角色>/CHARTER.md`×5。
- 门禁：`checks/run-gates.mjs` 的 `company-skeleton`；走查修复：`tools/lib/markdown-links.mjs`（路径排除）、
  `tools/lib/rehearsal.mjs`（`copyRef` 解引用）+ `tests/harness/foundation-safety.spec.ts`（新守）。
- 文档：`packages/company-pack/README.md`（owner 表 + 装完第一步）、`docs/project-map.md` 公司盘行。
