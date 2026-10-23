# 页签身份收成一行：`FACES` 派生三种渲染

状态：implemented（2026-10-23；架构评审候选 3；用户令「P1→P9 全做」）

## 决定

1. **身份表住 [tab-icons.tsx](../../packages/company-pack/src/client/tab-icons.tsx) 的 `FACES`**：
   一行 = `{ tone, glyph, label, tooltip }`。此前同样的四个值在三种渲染（标题 / guide icon / guide 胶囊）
   里各写一遍，改一个字的提示要动三处。
2. **三种渲染从这一行派生一次**（`titleOf` / `entryOf` / `iconOf`），导出 `TAB_IDENTITY`；
   原有的 27 个具名导出保留为派生常量（注册面与测试继续按名字引用，对象恒等不变）。
3. **注册行只留身份键**：`{ id, kind, face, description, order, registerBody }`；标题、guide icon、
   guide 胶囊全部由循环按 `face` 现取——注册行不再各存一份 title/icon/registerTitle/registerGuide。
4. **源解析器改成两输入**：[company-tab-catalog.mjs](../../tools/lib/company-tab-catalog.mjs) 同时读注册源与
   身份源，按 face 键解出标题；任一 face 找不到 label 一律返回空（cdp-probe 据此 fail-loud）。

## 输掉的方案

- **把身份表拆成独立 `tab-identity.ts`**：glyph 组件住在 tab-icons，拆出去要么再加一个 glyph 模块，
  要么让身份模块反向依赖 tab-icons——为“少一个文件间的 import”多造两个文件，不值。
- **让注册行继续带 `title`/`icon`**：那就是把刚合掉的副本又写回去；测试的平行数组已经覆盖“注册面与身份面一致”。
- **解析器只读注册源、从 face 猜标题**：face 键与可见标题是两套词，猜不出；两输入 + fail-loud 才是真单一来源。

## 后果

- 新增页签 = `FACES` 加一行 + `TAB_REGISTRATIONS` 加一条 body，不再改三个渲染文件。
- `parseCompanyTabCatalog(source)` 的旧签名失效：cdp-probe 与 spec 同 diff 改成两参；缺身份源 = 空目录。
- `company-tab-registration.ts` 少了 27 个 import、9 个 `registerTitle`/`registerGuide` 闭包。

## 验证（真跑）

```text
npx vitest run tests/client/company-tab-registration.spec.ts tests/harness/company-tab-catalog.spec.ts
#   3 passed（注册面恒等 + 源解析 9 条 + 面部缺失 fail-loud）
pnpm test     # 750 passed
pnpm verify   # ALL PASS
```

## 未验

- `cdp-probe` 未跑（真浏览器档）：它读同一份解析器，触发条件 = 页签清单/渲染改动，下次开观察窗时复跑。
- `pnpm build` / typecheck 未跑（不在 keyless 层）；已确认 `TAB_IDENTITY` 类型与既有具名导出的引用面一致。
