/**
 * Markdown 文档形状的唯一实现（2026-11-14，P0 收口）。
 *
 * 为什么是 .js：同一份判据要被 **pack（TS）** 与 **门禁（.mjs）** 同时消费；TS 侧只做类型包装，
 * 门禁直接 import 本文件。此前 TS 一份 + fix-evidence 一份简化版，围栏/注释/跨行 code span/BOM
 * 各自解释，BUG-176/178/181 都是这条分叉的症状。规则说明见下方各函数注释。
 */
/**
 * 按 CommonMark 反斜杠转义切表格行（BUG-165/172）。
 *
 * 两条规则按顺序吃：`\\` 是字面反斜杠（吃掉两个字符），`\|` 是字面竖线（吃掉两个字符）；
 * 未转义的 `|` 才是列分隔。先判 `\|` 会把 `\\|` 吞进单元格，少切一列。
 * @param line - 一行表格文本（可带首尾竖线）。
 * @returns 单元格文本（已 trim，转义已还原）。
 */
export function splitTableRow(line) {
    let body = line.trim();
    if (body.startsWith('|'))
        body = body.slice(1);
    if (body.endsWith('|')) {
        let backslashes = 0;
        let cursor = body.length - 2;
        while (cursor >= 0 && body[cursor] === '\\') {
            backslashes += 1;
            cursor -= 1;
        }
        if (backslashes % 2 === 0)
            body = body.slice(0, -1);
    }
    const cells = [];
    let cell = '';
    for (let index = 0; index < body.length; index += 1) {
        const char = body[index] ?? '';
        if (char === '\\' && body[index + 1] === '\\') {
            cell += '\\';
            index += 1;
            continue;
        }
        if (char === '\\' && body[index + 1] === '|') {
            cell += '|';
            index += 1;
            continue;
        }
        if (char === '|') {
            cells.push(cell.trim());
            cell = '';
            continue;
        }
        cell += char;
    }
    cells.push(cell.trim());
    return cells;
}
/**
 * 平台差异归一：去 UTF-8 BOM、CRLF 与孤立 CR → LF。
 * @param text - 原始文档文本。
 * @returns 归一化后的文本（行号不变）。
 */
export function normalizeDocument(text) {
    const withoutBom = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
    return withoutBom.replace(/\r\n?/g, '\n');
}
/** 围栏开合行：最多 3 个前导空格 + 三连以上反引号/波浪号，后跟信息串。 */
function fenceAt(line) {
    const match = /^\s{0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (match === null)
        return undefined;
    const marker = match[1] ?? '';
    return { char: marker[0] ?? '`', length: marker.length, rest: match[2] ?? '' };
}
/** 从 index 起连续反引号的个数（不是反引号 → 0）。 */
function backtickRun(line, index) {
    let run = 0;
    while (line[index + run] === '`')
        run += 1;
    return run;
}
/** 在后续行里找第一个包含 marker 的行号（1-based）；没有 → undefined。 */
function markerLine(source, offset, marker) {
    for (let cursor = offset + 1; cursor < source.length; cursor += 1) {
        if ((source[cursor] ?? '').includes(marker))
            return cursor + 1;
    }
    return undefined;
}
/**
 * 逐行产出结构视图（行数/行号与归一化后的文档一致）。
 * @param text - 文档全文（内部先归一化）。
 * @returns 每行的可见文本、结构标记、未闭合注释行号与顶层围栏块。
 */
export function scanDocumentDetailed(text) {
    const source = normalizeDocument(text).split('\n');
    const lines = [];
    const fences = [];
    let fence;
    let inComment = false;
    let commentStart;
    let spanUntil;
    for (const [offset, raw] of source.entries()) {
        const lineNumber = offset + 1;
        if (fence !== undefined) {
            lines.push({ text: raw, structural: false });
            const close = fenceAt(raw);
            if (close !== undefined && close.char === fence.char && close.length >= fence.length && close.rest.trim() === '') {
                fences.push({ info: fence.info, content: fence.content.join('\n'), startLine: fence.startLine });
                fence = undefined;
            }
            else {
                fence.content.push(raw);
            }
            continue;
        }
        if (spanUntil !== undefined) {
            lines.push({ text: raw, structural: false });
            if (lineNumber >= spanUntil)
                spanUntil = undefined;
            continue;
        }
        if (!inComment) {
            const open = fenceAt(raw);
            if (open !== undefined) {
                fence = { char: open.char, length: open.length, info: open.rest.trim(), content: [], startLine: lineNumber };
                lines.push({ text: raw, structural: false });
                continue;
            }
        }
        let visible = '';
        let index = 0;
        while (index < raw.length) {
            if (inComment) {
                const end = raw.indexOf('-->', index);
                if (end === -1) {
                    index = raw.length;
                    break;
                }
                inComment = false;
                commentStart = undefined;
                index = end + 3;
                continue;
            }
            const run = backtickRun(raw, index);
            if (run > 0) {
                const marker = '`'.repeat(run);
                const close = raw.indexOf(marker, index + run);
                if (close !== -1) {
                    visible += raw.slice(index, close + run);
                    index = close + run;
                    continue;
                }
                const later = markerLine(source, offset, marker);
                if (later !== undefined)
                    spanUntil = later;
                visible += raw.slice(index);
                index = raw.length;
                continue;
            }
            if (raw.startsWith('<!--', index)) {
                inComment = true;
                commentStart = lineNumber;
                index += 4;
                continue;
            }
            visible += raw[index] ?? '';
            index += 1;
        }
        lines.push({ text: visible, structural: true });
    }
    return { lines, fences, ...(inComment && commentStart !== undefined ? { unclosedCommentLine: commentStart } : {}) };
}
/**
 * 结构扫描的短视图：只要行。
 * @param text - 文档全文。
 * @returns 每行的可见文本与结构标记。
 */
export function scanDocument(text) {
    return scanDocumentDetailed(text).lines;
}

/**
 * 定位 `## <heading>` 节的起止行（行级视图，供门禁读卡）。
 *
 * 与 `scanDocumentDetailed` 的区别：这里只回答「哪一行是节标题」，不解析行内代码/跨行 span。
 * 卡片正文常把 `<!--` 当字面示例写（BUG-181 卡就有），若按完整注释状态扫描，一个未闭合的
 * 字面示例会把后面所有标题吞掉。节标题是行级事实，所以：围栏块内的标题不算；行首 HTML 注释
 * （`^\s*<!--`）内的标题不算；行内出现的 `<!--` 不改变节定位。
 * @param {string} text 文档全文。
 * @param {string} heading 节标题（不含 `## `）。
 * @returns {{ start: number, end: number } | undefined} 归一化行下标；缺节返回 undefined。
 */
export function sectionRange(text, heading) {
    const source = normalizeDocument(text).split('\n');
    const pattern = new RegExp(`^##\\s+${heading}\\s*$`);
    let fence;
    let inComment = false;
    let start = -1;
    for (let index = 0; index < source.length; index += 1) {
        const line = source[index] ?? '';
        if (fence !== undefined) {
            const close = fenceAt(line);
            if (close !== undefined && close.char === fence.char && close.length >= fence.length && close.rest.trim() === '')
                fence = undefined;
            continue;
        }
        if (inComment) {
            if (line.includes('-->'))
                inComment = false;
            continue;
        }
        const open = fenceAt(line);
        if (open !== undefined) {
            fence = { char: open.char, length: open.length };
            continue;
        }
        if (/^\s*<!--/.test(line)) {
            if (!line.includes('-->'))
                inComment = true;
            continue;
        }
        if (pattern.test(line)) {
            start = index;
            break;
        }
    }
    if (start === -1)
        return undefined;
    fence = undefined;
    inComment = false;
    let end = source.length;
    for (let index = start + 1; index < source.length; index += 1) {
        const line = source[index] ?? '';
        if (fence !== undefined) {
            const close = fenceAt(line);
            if (close !== undefined && close.char === fence.char && close.length >= fence.length && close.rest.trim() === '')
                fence = undefined;
            continue;
        }
        if (inComment) {
            if (line.includes('-->'))
                inComment = false;
            continue;
        }
        const open = fenceAt(line);
        if (open !== undefined) {
            fence = { char: open.char, length: open.length };
            continue;
        }
        if (/^\s*<!--/.test(line)) {
            if (!line.includes('-->'))
                inComment = true;
            continue;
        }
        if (/^##\s+/.test(line)) {
            end = index;
            break;
        }
    }
    return { start, end };
}
