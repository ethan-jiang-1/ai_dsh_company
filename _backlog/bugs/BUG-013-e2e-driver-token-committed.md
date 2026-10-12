---
status: 修复就绪
severity: P1
opened: 2026-10-12
---

# BUG-013：观察窗 token 随无关 e2e driver 入库——「永不提交密钥」被误 add 击穿

> 严重级别：P1（重要）｜发现：2026-10-12（f8bc123...HEAD 双轴代码评审 Spec 轴）｜状态：修复就绪
> **翻转记录（2026-10-12）**：复现实跑见红（收据在复现节）+ 修法选定 + 已修判定在场——缺陷轨翻转表「调查中 → 修复就绪」（P1 修复型自授权通道）。

## 症状

- `runtime/e2e/assembly-e2e-driver.mjs`（+87 行）被 git 跟踪，随收敛提交 51340b4 入库；该文件与
  收敛执行器工作**无关**（scope creep）。
- 文件第 11 行硬编码观察窗 TOKEN（值不转录进卡——防二次扩散）；第 25/54 行引用同值。
- 违反根 AGENTS.md「永不提交密钥」；文件自注「§11 工具态落 gitignored 区」却进了 git；
  AGENTS.md 的 runtime/ tracked 白名单（两份 README + cold-storage r6 基线 + probe-*.mjs）无此类。

## 根因（假设→已证）

收尾 `git add` 无白名单对照：维护会话的临时工具态与正式改动同批 add。证据：
`git log --oneline f8bc123..HEAD -- runtime/e2e/` 唯一命中 51340b4（收敛提交）；
`git ls-files runtime/e2e/` 非空。

**缓解（降低严重级的实证）**：该 TOKEN 是本地观察窗会话 token，每次 `pnpm dsh web` 启动重新生成
（token URL 从启动横幅读）——重启即失效，非 API key，无跨机泄露面。

## 暴露的失败类

工具态/临时文件随正式改动随车入库类。横切排查：本 diff 面内已扫（runtime/ 仅此一件）；
可选升级 = `git ls-files` × AGENTS.md tracked 白名单机械对照（候选门禁，修复时评估是否值得立，
不强制——白名单目前只有四个成员，肉眼可查）。

## 复现

```sh
git ls-files runtime/e2e/        # → runtime/e2e/assembly-e2e-driver.mjs（应空）
grep -n "TOKEN" runtime/e2e/assembly-e2e-driver.mjs   # → :11 命中
```

**实跑收据（2026-10-12）**：两条均命中——`git ls-files runtime/e2e/` 输出该文件；`grep -n` 定位
`:11`（token 值不转录进卡，防二次扩散）。

## 修复关联

用户已拍板（2026-10-12）：**untrack 留本地**——`git rm --cached runtime/e2e/assembly-e2e-driver.mjs`
+ `.gitignore` 补 `runtime/e2e/` 规则；token 重启轮换，**无历史重写**。
备选（已否决）：挪 `tools/drivers/` 去密钥化 + 白名单登记——用户裁定不值得为一次性 driver 走全套。

## 已修判定

- `git ls-files runtime/e2e/` 为空；`.gitignore` 含 `runtime/e2e/` 规则；
- 全仓 tracked 文件 `git grep -l "const TOKEN =" -- runtime tools probes checks` 无命中；
- `pnpm verify` ALL PASS（白名单/结构门禁不红）。
