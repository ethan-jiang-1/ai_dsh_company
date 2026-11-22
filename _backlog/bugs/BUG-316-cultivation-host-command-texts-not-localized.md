---
status: 调查中
severity: P2
opened: 2026-11-22
---

# BUG-316：培养命令的 host 回执/错误全是中文——en 面板里提交成功仍弹「已提交培养记录…」

> 严重级别：P2（表达层合同：主面板、命令回执、错误行应随 locale；当前 en 下所有 `/cultivation` 动作结果仍是中文）｜发现：2026-11-22（E2E 第五轮）｜状态：调查中
>
> **留痕**：待定（本轮只立卡，不修——用户 2026-11-22 指令「继续争取搞个 8–10 个，setup goal」）。

## 症状

en 实例打开「Cultivation」，主视图/侧栏都是英文；点「Start recording a piece of work」→ 填写 →「Record it」提交成功后：

```
已提交培养记录 20261122-221841-1y6l（纠正，待你采纳；背景「任务板 E2E 39593」，
以提交时服务端读到的版本为准）。培养页可查收件箱。
```

同一面板下方记录卡是英文（`Needs me` / `My correction` / `Waiting for me`），中间夹一段中文命令回执。同类：

- `/cultivation adopt` → 「已采纳 …」「部署到 … 方法层…」；
- `/cultivation reject` → 「已拒绝 …（理由已留档…）」；
- `/cultivation verify` → 「已记录后续工作依据并回填验证…」；
- `/cultivation revoke` → 「已撤回方法 …」；
- 参数错误 → 「用法：…」「记录 … 形状坏」；
- 命令面板里的 `description` / 参数 hint 也是中文。

## 运行面

- **面 = host 命令面 + client 培养面板**：`packages/company-pack/src/host/cultivation/cultivation.ts`；client 把命令 `result.text` 原样渲染（`Cultivation` 的 `outcome`）。
- 数据面 = 命令结果文本，不是记录 frontmatter。

## 复现

1. 隔离 home 写 `cordis.patch.yml`：`- id: locale\n  config:\n    preference: en`。
2. 起实例，打开一个 CEO 会话 → 主 tab「Cultivation」。
3. 打开右侧栏「Cultivation」→「Start recording a piece of work」→ 填期望/正文 →「Record it」。
4. 实测成功回执为 `已提交培养记录 …`（本轮证据：`runtime/tmp/e2e-evidence/en-compose-outcome.png`，gitignored）。

## 根因与证据

host 命令面写死了中文，没有随 `command` 的 locale/语言分支：

- `cultivation.ts:335`：`text: \`已提交培养记录 ${id}（${action}${contextNote}）…\``
- `:361/:378`：撤回失败；`:440`：撤回成功；`:453/:454/:456/:470/:482`：采纳错误；`:490`：采纳成功；`:508/:510`：拒绝；`:523/:526/:532/:534/:546/:550`：验证；`:641`：一致性检查。
- 命令 `description`/`input.hint`（`:783`/`:784`）也是中文。
- client 不翻译 `result.text`；它把 host 文本当作最终用户文案（与 zh 字典的 client 文案并列）。

## 失败类与同类排查

**失败类 = 用户可见文案只在 host 写死中文，client 语言层无法覆盖**。同类：

- 302 修的是 client 动态片段（时间/读失败原因）；308 修的是 client 对话面板字面量；本卡是 host 命令面。
- `startup` 的设置诊断有 zh/en（313/314）；培养命令没有。
- 不是「记录正文是中文」：本卡是 host 生成的回执/错误，不是用户内容。

## 修复方案与范围

- **根因修法**：命令面按 locale 产出结构化 `message`（key + params），client 用 `CULTIVATION_COPY` 渲染；或 host 通过 locale 分支返回对应语言。覆盖 success/error/help/description/hint。
- 至少先把 `result.text` 的成功/错误/帮助三族本地化；保留记录 id、slug、角色名作为参数。
- **判据**：en 下提交/采纳/拒绝/验证/撤回成功、参数错误、命令 help 均无中文（除用户内容/方法名）；zh 不回归。
- **不改**：命令协议/参数；记录格式；client 记录内容。
- **材料性**：host + client 公开文案；修复需授权/留痕裁决，本轮不修。

## 已修判定

- en 实例的 `/cultivation` 成功/错误/help/description 全部英文（用户内容/方法 slug 除外）；
- zh 实例保持中文；
- 提交成功回执不再出现「已提交培养记录」；
- host 命令 spec + en 真页面各一条。
