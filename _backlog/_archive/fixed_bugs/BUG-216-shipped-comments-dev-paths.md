---
status: 已修
severity: P2
opened: 2026-11-17
---

# BUG-216：shipped 代码/组合/技能注释里有 76 处 dev-only 路径，安装包内不可解析

> 严重级别：P2（次要）｜发现：2026-11-17｜状态：已修｜修复：2026-11-17｜审查：agent（独立盲审）— B1 类型闭包 + S1–S4 已处置；证据见本卡 `## 修复证据`
>
> **关联**：[C13 运行时/发布面分离卡](../../issues/2026-11-17-runtime-shipped-boundary-exploratory.md)（C13-4 / C13-10 / D）。
> **留痕**：批次 Note [2026-11-17-shipped-package-boundary](../../../notes/implemented/2026-11-17-shipped-package-boundary.md)（本批共用）。

## 症状

解包 tarball 后按 `tests/`/`probes/`/`tools/`/`_backlog/` 计数：

| 文件 | dev 路径引用 |
|---|---|
| `package/lib/index.js` | 22 |
| `package/lib/client.js` | 16 |
| `package/lib/types/**/*.d.ts` | 27 |
| `package/README.md` | 7（另见 BUG-215） |
| `package/cordis.patch.yml` | 4 |
| `package/presets/**` 注释 | 若干 |

合计 **76** 处（不含 README 的 7 已单列）。安装包内没有 `tests/`、`probes/`、`tools/`、`_backlog/`，这些路径全部不可解析。典型：

```text
package/cordis.patch.yml:8   # 已认证 tag 台账在 tools/lib/core/compat-tags.json（不随包分发）
package/cordis.patch.yml:17  # 用户决定与验收 = _backlog/_archive/settled_issues/...
package/cordis.patch.yml:113 # 端到端实证 = probes/session-context/cultivation-method-layer-probe.mjs
package/lib/client.js        # keyless 判据 = tests/client/cultivation/...
package/lib/types/lib/...d.ts # 与 tools/lib/company/delegation-model.mjs 同源
```

## 复现

```sh
rm -rf runtime/tmp/c13-dist && mkdir -p runtime/tmp/c13-dist
tar -xzf _dist/dsh-company-pack-0.11.9.tgz -C runtime/tmp/c13-dist
for f in lib/index.js lib/client.js README.md cordis.patch.yml; do
  printf '%s: ' "$f"
  grep -oE 'tests/[A-Za-z0-9_./-]+|probes/[A-Za-z0-9_./-]+|tools/[A-Za-z0-9_./-]+|_backlog/[A-Za-z0-9_./-]+|docs/[A-Za-z0-9_./-]+' "runtime/tmp/c13-dist/package/$f" | wc -l
done
grep -rhoE 'tests/[A-Za-z0-9_./-]+|probes/[A-Za-z0-9_./-]+|tools/[A-Za-z0-9_./-]+|_backlog/[A-Za-z0-9_./-]+' runtime/tmp/c13-dist/package/lib/types | wc -l
pnpm release:shape
```

实测 `lib/index.js 22`、`lib/client.js 16`、`lib/types 27`、`README 7`、`cordis 4`。

## 根因与证据

- 根因：这些注释是**仓库内维护者指针**（方便 agent 找判据/证据），随源码注释/组合注释/技能脚本原样进入 tarball。`d7f0776c` 只清了「旧家」，没清「dev-only 路径」；[release.md](../../../docs/contracts/release.md) 的触发线要求重建时核对 shipped 注释，但没有机械判据。
- 证据：上命令；`cordis.patch.yml` 行 8/17/113；`lib/client.js` 的 tests/probes 注释；`lib/types` 的 tools/tests 注释；`presets/**/quality-loop/.../verdict-hash.mjs` 的 tools/tests 注释。
- 影响：安装形态的读者（人或 agent）拿到一个不存在的路径；与 BUG-210 同族，但本波实测面更大（76 处，不只是 3 处 delegation）。

## 失败类与同类排查

**失败类 = 文档指针 / shipped 注释面**（与 BUG-187..190、BUG-210 同族）。

同类：README 断链（[BUG-215](BUG-215-shipped-readme-dev-links.md)）；`lib/*.js` 的 source map 引用（[BUG-220](BUG-220-sourcemap-url-missing-maps.md)）。

## 已修判定

修成什么算修好：

1. tarball 的 `lib/*.js`、`lib/types/**/*.d.ts`、`README.md`、`cordis.patch.yml`、`presets/**` 里不再有**未限定**的 `tests|probes|tools|checks|_backlog|docs` 路径；带「不随包」限定或已剥离。
2. `pnpm release:shape` 扫 shipped 文本，旧 tarball 76 处红；新 tarball 0 处未限定。
3. 正例：`cordis.patch.yml` 的「不随包分发」措辞保留；content 运行时说明书不误杀。

## 修复证据

- 改动面：`tools/lib/release/shipped-shape.mjs`、`packages/company-pack/cordis.patch.yml`、`packages/company-pack/presets`
- 红：`pnpm release:shape`（旧 tarball：shipped 文本 76 处未限定 dev 路径（lib/index.js 22 / client 16 / types 27 / README 7 / cordis 4））
- 绿：`pnpm release:shape`（新 tarball：lib 注释/字符串剥离；cordis 3 处 + presets 16 处带「不随包」；未限定 = 0）
- 提交：commit f1629047
