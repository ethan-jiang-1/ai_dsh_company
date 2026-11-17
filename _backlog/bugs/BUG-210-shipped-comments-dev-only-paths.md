---
status: 调查中
severity: P2
opened: 2026-11-17
---

# BUG-210：发布产物里的源码注释仍指向不随包分发的 tools/lib 路径

> 严重级别：P2（次要）｜发现：2026-11-17｜状态：调查中｜审查：—
>
> **关联**：[C12 归属波次探索卡](../issues/2026-11-17-ownership-wave-exploratory.md)（C12-8 / N5）。
> **留痕**：待修复者决定（本轮只开卡，不修）。

## 症状

`_dist/dsh-company-pack-0.11.9.tgz` 里的 `package/lib/index.js` 与 `package/lib/types/lib/delegation/*.d.ts`
仍带 3 处注释，指向 `tools/lib/company/delegation-model.mjs`：

```text
package/lib/index.js: 委派面的运行时边界表（pack 内；与 tools/lib/company/delegation-model.mjs 的期望同源）。
package/lib/index.js: 委派通道的运行时能力表（pack 内；与 tools/lib/company/delegation-model.mjs 的 COMPOSITIONS 同源）。
package/lib/index.js: subagent 重试的运行时策略（pack 内；与 tools/lib/company/delegation-model.mjs 的 RETRY 是同一套语义）。
```

tools/lib 下的路径 不在 tarball 里（`tar -tzf` 无 `tools/` 条目）；安装后的 `node_modules/dsh-company-pack`
读者按注释去找 `tools/lib` 只会扑空。`cordis.patch.yml` 对同类台账明确写了「不随包分发」，
这三处没有。

## 复现

```sh
rm -rf runtime/tmp/c12/dist && mkdir -p runtime/tmp/c12/dist
tar -xzf _dist/dsh-company-pack-0.11.9.tgz -C runtime/tmp/c12/dist
grep -rn 'tools/lib/company/delegation-model.mjs' runtime/tmp/c12/dist/package/lib | head
tar -tzf _dist/dsh-company-pack-0.11.9.tgz | grep -c '^package/tools/' || true
```

实测 grep 命中 `lib/index.js` 与 `lib/types/lib/delegation/*.d.ts`；`package/tools/` 为 0。

## 根因与证据

- 根因：`d7f0776c` 只清零了 **旧家**（checks/lib/delegation-model.mjs 等）；这些注释在改成**新家**
  后重新进入 shipped 字节。`docs/contracts/release.md` 的触发线要求「重建 `_dist` 时同批核对
  shipped 注释里的路径指针」，但没有判据区分「同源说明（dev-only）」与「安装面可用的路径」。
- 证据：上命令；[release.md](../../docs/contracts/release.md) 的 shipped 注释行；
  [ac147a0c 的边界记录](../../notes/implemented/2026-11-17-surface-ownership-cleanup.md)。
- 影响：安装形态的读者（人或 agent）拿到一个不存在的路径；不阻塞运行，但属于 shipped 面的
  「声明 > 可用面」。

## 失败类与同类排查

**失败类 = 发布形态 / shipped 注释指针**（与 BUG-187 同族，但目标是 tarball 不是 dev 树）。

同类：

- `cordis.patch.yml` 的兼容台账注释已写明「不随包分发」，是本卡的正确写法。
- `deliverables-index.ts` 等 pack src 注释也引用 tools/lib/company/ 下的路径（dev provenance）；
  它们进了 `lib/index.js` 吗？本卡只证 delegation 三处，修复时按同一形状扫全 tarball。
- `_dist/安装手册.md` 无旧家/新家 tools 路径（本次 grep 0），不在本卡范围。

## 已修判定

修成什么算修好（建议，供修复者采用）：

1. shipped 源码注释只留「仓库内」限定，或删除 dev 路径；tarball 里 `grep 'tools/lib/'` 为 0
   （或每一条都带「不随包分发」限定）。
2. 最小负例：在 shipped source 加一条未限定的 tools/lib 下的路径 注释并重打 → 发布形状检查红；
   当前没有这条检查。
3. 正例：`cordis.patch.yml` 的「不随包分发」注释保留，不误杀。

## 修复方向（不授权，仅记录）

- 在 `release --prepare` 的导出后检查里加一条 tarball 注释扫描（只对 `lib/**` 的 `tools/`/`checks/` 路径，
  允许带「不随包」/「仓库内」限定）；成本秒级，不影响源码面。
- 或把注释改成「与仓库生成器同源（不随包）」的统一措辞，同批重打 `_dist`。
