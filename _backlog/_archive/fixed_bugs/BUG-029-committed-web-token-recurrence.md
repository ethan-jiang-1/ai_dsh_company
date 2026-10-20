---
status: 已修
severity: P1
opened: 2026-10-20
---

# BUG-029：观察窗 token 再次随 runtime 日志入库——BUG-013 的路径级修复没有升成类级

> 严重级别：P1（重要）｜发现：2026-10-20｜状态：已修（2026-10-20，用户授权全部修复）

## 症状

runtime/web-logs/web-20261019-105001.log 被 git 跟踪，首行为一条带
`?token=<redacted>` 的启动 URL（token 值**不转录进卡**，防二次扩散）。同目录另一件
`web-20261019-104945.log` 只有一行 `nohup: setsid: No such file or directory`。

事实：

- `git ls-files runtime/web-logs` 返回两件——它们不是运行时忽略物，而是 tracked。
- 两件由 `0dce0db`（2026-10-19）随一次 motion6 测试提交入库；提交说明与 web 日志无关，
  属于「临时工具态随正式改动一起 add」。
- runtime/web-logs/ 不在 `.gitignore`；根 `AGENTS.md:25` 与 `runtime/README.md` 的 tracked
  白名单也都没列它（白名单只列两份 README、cold-storage r6 基线、`probe-*.mjs`）。
- `checks/gates/security-scan.mjs` 的 `SCAN_REL = 'company-workspace'`，只真扫公司盘；
  同一套 a2 闸对 runtime/web-logs 单独跑会报
  `HIGH-ENTROPY-ASSIGNMENT ... key=token len=43 entropy=4.90`，退出码 2。
  ⇒ **工具能咬，通道没接**。
- 这是 [BUG-013](BUG-013-e2e-driver-token-committed.md) 的同类复发：
  上次修的是 `runtime/e2e/` 路径 + `.gitignore` 规则，`tests/harness/gitignore-guards.spec.ts`
  也只钉这一条路径；没有类级「任何 tracked 文件不得含 token URL」守卫。

缓解事实：该 token 是本地观察窗**按进程生成**的会话 token，重启即轮换，不是 API key；
当前进程早已结束，不构成跨机长期凭据。但「永不提交密钥」是绝对规则，且同类复发本身
就是缺陷。

## 根因（假设）

1. **路径级修复，不是类级修复**：BUG-013 修了 `runtime/e2e/`，没有把「tracked 文件里的
   token URL / 高熵凭据」做成通用检查；当时卡里提过「`git ls-files` × tracked 白名单机械
   对照（候选门禁，不强制）」，没有落地。
2. **扫描范围与失败面不一致**：安全闸只扫 `company-workspace`，而运行日志、探针输出、
   `runtime/` 都在扫描面之外；失败恰好在未扫区。
3. **日志落点没有 owner 纪律**：`nohup ... > runtime/web-logs/...` 这类临时启动日志没有
   gitignore 规则，也没有「测试结束即清理」的动作；之后一次 `git add` 就把它们带进来。

## 暴露的失败类

- **类**：任何 tracked 文本文件（日志、探针输出、文档、Note、快照说明）里出现
  `?token=...`、`const TOKEN = ...`、高熵密钥赋值。不是某个目录的问题。
- **横切排查**：`git grep -nE 'token=[A-Za-z0-9_-]{20,}'` 全 tracked 面；本次只命中
  runtime/web-logs 这一件。用 a2 全 tracked 扫描会命中三件，其中两件是**测试替身**：
  `probes/session-context/human-exits-nonblocking-probe.mjs` 的
  `token: url.searchParams.get('token')`（动态值）与 `tests/harness/orient.spec.ts`
  的 `secret = 'never-render-this-placeholder'`（占位串）。类级守卫若直接复用 a2，
  需要把 `tests/**` / 探针源码标成 fixture 面，或用窄的 token-URL 正则，避免假红。
- **为什么值得横切**：这是同一失败类 7 天内第二次；不升类级就会第三次。

## 复现

```sh
git ls-files runtime/web-logs
node checks/lib/ci-security-gates/g-a2-secret-scan.mjs --target=runtime/web-logs
```

第一条非空；第二条输出 `GATE a2 verdict=VIOLATION`（退出 2），命中行号 1。
token 值不复制到卡、报告或测试输出里。

## 修复关联

已执行（2026-10-20，用户授权全部修复；决定与证据的持久记录 = [tracked-token guard Note](../../../notes/implemented/2026-10-20-tracked-token-guard.md)）：

1. `git rm --cached` 两件日志并删除本地文件；`.gitignore` 增加 `runtime/web-logs/`；
   `AGENTS.md:25` 与 `runtime/README.md` 的 tracked/ignored 说明同步。
2. 类级守卫落在两处：
   - 纯逻辑 = `tools/lib/tracked-token.mjs`（只认 URL 查询串里的 token，值不回传）；
   - 门禁 = `checks/gates/tracked-token.mjs`（扫 `git ls-files`，跳过只读 `vendor/`），
     已装配进 `checks/run-gates.mjs`；keyless 判据 = `tests/harness/tracked-token.spec.ts`，
     `.gitignore` 红绿守卫 = `tests/harness/gitignore-guards.spec.ts`。
3. 安全闸的**范围声明**同步：`checks/README.md` 与 `security-scan.mjs` 头注写清
   「company-workspace 真扫 + tracked token-URL 窄扫」；不再说无边界的「真扫」。
4. 不做历史重写：token 已随进程失效，和 BUG-013 同一裁定；重启观察窗即轮换。

红/绿实跑（2026-10-20）：

- 红：临时 tracked 文件写合成 token URL →
  `FAIL tracked-token tracked 文件含 token URL（值不打印）：runtime/audit-token-red.log（line 1 tokenLen=30）`；
- 绿：移除后 → `PASS tracked-token ×1740（tracked 面零 token URL；跳过 5 个 >2MB 或非普通文件）`；
- `.gitignore` 红：临时删 `runtime/web-logs/` 规则 → 对应 spec 1 failed；还原 → 3 passed；
- `git ls-files runtime/web-logs` 为空；`pnpm verify` ALL PASS；`pnpm test` 71 文件 / 699 用例全绿。

## 已修判定

- [x] `git ls-files runtime/web-logs` 为空；
- [x] `.gitignore` 含 `runtime/web-logs/`，`git check-ignore -v` 命中；
- [x] 新守卫在「临时 tracked 文件写合成 token URL」时红，移除后绿，红/绿输出留证；
- [x] `pnpm verify` + `pnpm test` 全绿；
- [x] 卡、报告、测试输出里不出现真实 token 值。
