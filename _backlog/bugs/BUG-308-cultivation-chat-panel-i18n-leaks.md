---
status: 调查中
severity: P2
opened: 2026-11-22
---

# BUG-308：培养主视图的对话面板双向漏语言——英文页显示整段中文提示，中文页显示 `session:` 英文

> 严重级别：P2（次要偏重：语言开关是产品合同；这是主视图右侧常驻面板，不是边缘提示）｜发现：2026-11-22（E2E 第四轮）｜状态：调查中
>
> **留痕**：待定（本轮只立卡，不修——用户 2026-11-22 指令「继续找 8–10 个，别管那边怎么修」）。

## 症状

打开「培养」主视图（Chat 旁的 培养 tab），右侧独立培养对话面板：

- **en**：面板顶部提示仍是
  `只谈培养：纠正、方法、journal、赞踩；回复不会混进主 Chat。工具审批走平台审批面。`
  （同页其它文案是英文，`CULTIVATION_COPY.chatBadge`/`chatEmpty*` 等已本地化。）
- **zh**：面板底部状态固定写
  `session: <8位id>`
  （中文界面混入英文 `session:`）。

本轮 en 实测（`fullview2`）：body 含 `只谈培养`；同页 `Cultivation`、`Start recording` 等均为英文。

## 运行面

- **面 = client**：`packages/company-pack/src/client/cultivation/CultivationChatPanel.tsx`。
- 数据面 = `CULTIVATION_COPY`（已有 zh/en），这两个串没有走字典。

## 复现

1. 隔离 home 写 `cordis.patch.yml`：`- id: locale\n  config:\n    preference: en`。
2. 起实例，打开一个有会话的页面 → 主 tab「Cultivation」。
3. 看右侧对话面板顶部提示：中文 `只谈培养…`。
4. 切回 zh，打开同一面板 → 底部 `session: …` 英文。

## 根因与证据

- 硬编码中文提示：`CultivationChatPanel.tsx:179-181`
  ```tsx
  <div className="wk-cult-chat-hint">
    只谈培养：纠正、方法、journal、赞踩；回复不会混进主 Chat。工具审批走平台审批面。
  </div>
  ```
  没有 `CULTIVATION_COPY` key，也没有 `t()`。
- 硬编码英文 `session:`：`CultivationChatPanel.tsx:319`
  ```tsx
  <span className="wk-cult-chat-session">session: {String(binding.sessionId).slice(0, 8)}</span>
  ```
  中文界面同样显示 `session:`。
- 同文件其它 UI 已走 `CULTIVATION_COPY`（`chatBadge` / `chatWaiting` / `chatCreating` / `chatEmpty*` / `chatWho*` / `chatPlaceholder` / `chatSend`），只有这两处漏。

## 失败类与同类排查

**失败类 = 表达层迁移漏字符串（双向）**。同类：

- 英文漏中文：本卡的顶部提示；BUG-302 的 helper 是另一类（动态片段），已修。
- 中文漏英文：本卡的 `session:`；`TeamToolCard` 的 fallback 英文标题有 token 兜底；`CultivationChatPanel` 的 `session:` 没有。
- 不是 host 文案；是 client 组件字面量。

## 修复方案与范围

- 把两条文案加进 `CULTIVATION_COPY`（zh/en）：`chatScopeHint` 与 `chatSessionLabel`（或 `chatSession(id)`）。
- 判据：en 面板 body 不含 CJK（提示区）；zh 面板 `session` 行的标签为中文；`company-copy`/locale 门禁覆盖新 key。
- **不改**：`CULTIVATION_SCOPE`（发给模型的范围前缀，不是 UI）；`USER_MARKER` 协议。
- **材料性**：client 公开文案；修复需授权/留痕裁决，本轮不修。

## 已修判定

- en 主视图对话面板的提示区无中文；
- zh 主视图对话面板的会话状态行无裸 `session:`；
- 新 key 在 zh/en 字典各一条，组件无字面量；两条真页面/静态渲染断言。
