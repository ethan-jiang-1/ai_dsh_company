// 状态：常驻（被 checks/smoke/* 负例夹具 import；不单独跑）
// 何时跑：作为负例 smoke 的一部分（two-axis-gates / gates-negative 等）；秒级。
//
// 为什么：负例夹具靠「把输入改坏」来证明 gate 会红。输入语言/字段一改名，replace 就成了
// no-op：gate 看到的是没改坏的副本，当然不红——smoke 红，但报的是「gate 没红」，根因是
// 夹具过期。本助手把「mutation 必须真的改到字节」变成断言，让失败指向夹具而不是 gate。
import { readFileSync, writeFileSync } from 'node:fs'

/**
 * 对文件做一次文本替换；只有字节真的变了才写回。
 * @returns true = 已改写；false = 替换没命中（夹具过期）。
 */
export function mutateFile(path, transform) {
  const before = readFileSync(path, 'utf8')
  const after = transform(before)
  if (after === before) return false
  writeFileSync(path, after)
  return true
}
