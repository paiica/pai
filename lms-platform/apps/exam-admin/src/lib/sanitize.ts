import DOMPurify from "isomorphic-dompurify";

// Every question/page HTML field rendered in this app can come from an admin's
// rich-text editor OR from the AI question-generation endpoint — model output
// is untrusted the same way user input is. A prompt-injected or compromised AI
// response could otherwise plant a script that runs in an authenticated exam-
// admin session (which holds tokens with full answer-key access) and exfiltrate
// them. Run every dangerouslySetInnerHTML value through this first.
//
// Uses isomorphic-dompurify (not plain dompurify) so this produces identical
// output on the server-rendered pass and the client hydration pass — plain
// dompurify has no DOM on the server, and returning "" there while the client
// renders real sanitized HTML would be a hydration mismatch.
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "b", "em", "i", "u", "s", "span", "div",
      "ul", "ol", "li", "table", "thead", "tbody", "tr", "th", "td",
      "a", "img", "code", "pre", "blockquote", "h1", "h2", "h3", "h4",
      "sub", "sup", "hr", "form", "input", "label",
    ],
    ALLOWED_ATTR: ["href", "src", "alt", "title", "class", "target", "rel", "name", "placeholder", "type", "colspan", "rowspan"],
  });
}
