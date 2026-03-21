// =============================================================
// renderer/utils/renderMarkdown.ts — 간이 마크다운 → HTML 변환
// 외부 패키지 없이 구현. GitHub README에서 자주 쓰이는 문법 지원.
// XSS 방지: 태그 이스케이프 후 마크다운 패턴 적용
// =============================================================

/**
 * escape — HTML 태그/속성 문자 이스케이프 (XSS 방지)
 */
function escape(str: string): string {
  return str
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;");
}

/**
 * inlineMarkdown — 인라인 요소 변환 (bold, italic, code, link, image)
 * 이미 escape된 문자열에 적용
 */
function inlineMarkdown(escaped: string): string {
  return escaped
    // 이미지: ![alt](url)
    .replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      (_m, alt, src) =>
        `<img src="${src}" alt="${alt}" style="max-width:100%;border-radius:6px;" />`
    )
    // 링크: [text](url)
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      (_m, text, href) =>
        `<a href="${href}" target="_blank" rel="noreferrer" style="color:#60a5fa;text-decoration:underline;">${text}</a>`
    )
    // 인라인 코드: `code`
    .replace(
      /`([^`]+)`/g,
      (_m, code) =>
        `<code style="background:#0a0c14;color:#94a3b8;padding:2px 6px;border-radius:4px;font-size:0.85em;">${code}</code>`
    )
    // Bold+Italic: ***text***
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    // Bold: **text** or __text__
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g,     "<strong>$1</strong>")
    // Italic: *text* or _text_
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/_([^_]+)_/g, "<em>$1</em>")
    // Strikethrough: ~~text~~
    .replace(/~~(.+?)~~/g, "<del>$1</del>");
}

/**
 * renderMarkdown — 마크다운 → HTML 변환
 * 블록 레벨 요소 순차 처리 후 인라인 요소 처리
 */
export function renderMarkdown(markdown: string): string {
  const lines  = markdown.split("\n");
  const output: string[] = [];

  let inCodeBlock  = false;
  let codeLines:  string[] = [];
  let codeLang    = "";
  let inList      = false;
  let listItems:  string[] = [];
  let inOrderList = false;

  const flushList = () => {
    if (inList) {
      output.push(
        `<ul style="margin:0.5em 0 0.5em 1.5em;list-style:disc;">${listItems
          .map((li) => `<li style="margin:0.2em 0;">${li}</li>`)
          .join("")}</ul>`
      );
      inList      = false;
      listItems   = [];
    }
    if (inOrderList) {
      output.push(
        `<ol style="margin:0.5em 0 0.5em 1.5em;">${listItems
          .map((li) => `<li style="margin:0.2em 0;">${li}</li>`)
          .join("")}</ol>`
      );
      inOrderList = false;
      listItems   = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const raw  = lines[i];
    const line = raw;

    // 코드 블록 시작/끝
    if (/^```/.test(line)) {
      if (!inCodeBlock) {
        flushList();
        inCodeBlock = true;
        codeLang    = line.slice(3).trim();
        codeLines   = [];
      } else {
        const langLabel = codeLang
          ? `<span style="font-size:0.75em;color:#475569;margin-bottom:4px;display:block;">${escape(codeLang)}</span>`
          : "";
        output.push(
          `<pre style="background:#0a0c14;border:1px solid #1f2535;border-radius:8px;padding:12px 16px;overflow-x:auto;margin:0.75em 0;">${langLabel}<code style="font-size:0.85em;color:#94a3b8;white-space:pre;">${codeLines.map(escape).join("\n")}</code></pre>`
        );
        inCodeBlock = false;
        codeLines   = [];
        codeLang    = "";
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // 빈 줄
    if (!line.trim()) {
      flushList();
      output.push(`<div style="height:0.5em;"></div>`);
      continue;
    }

    // 수평선
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      flushList();
      output.push(`<hr style="border:none;border-top:1px solid #1f2535;margin:1em 0;" />`);
      continue;
    }

    // 제목
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const text  = inlineMarkdown(escape(headingMatch[2]));
      const sizes = ["1.4em","1.25em","1.1em","1em","0.95em","0.9em"];
      const size  = sizes[level - 1] ?? "1em";
      output.push(
        `<h${level} style="font-size:${size};font-weight:700;color:#f1f5f9;margin:1em 0 0.3em;">${text}</h${level}>`
      );
      continue;
    }

    // blockquote
    if (/^>\s?/.test(line)) {
      flushList();
      const text = inlineMarkdown(escape(line.replace(/^>\s?/, "")));
      output.push(
        `<blockquote style="border-left:3px solid #3b82f6;padding:4px 12px;margin:0.5em 0;color:#64748b;">${text}</blockquote>`
      );
      continue;
    }

    // 순서 없는 목록
    const ulMatch = line.match(/^(\s*)[*\-+]\s+(.+)/);
    if (ulMatch) {
      if (inOrderList) flushList();
      inList = true;
      listItems.push(inlineMarkdown(escape(ulMatch[2])));
      continue;
    }

    // 순서 있는 목록
    const olMatch = line.match(/^\s*\d+\.\s+(.+)/);
    if (olMatch) {
      if (inList) flushList();
      inOrderList = true;
      listItems.push(inlineMarkdown(escape(olMatch[1])));
      continue;
    }

    // 일반 단락
    flushList();
    output.push(
      `<p style="margin:0.3em 0;color:#94a3b8;line-height:1.7;">${inlineMarkdown(escape(line))}</p>`
    );
  }

  // 미완료 목록 flush
  flushList();

  return output.join("\n");
}
