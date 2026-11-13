/** Canonical internal links created by the item picker; no external URLs are indexed. */
export function documentLinks(markdown: string): string[] {
  const withoutCode = markdown.replace(/```[\s\S]*?```|`[^`]*`/g, '')
  return [...new Set([...withoutCode.matchAll(/\]\(\/workspaces\/[0-9a-f-]{36}\/items\/([0-9a-f-]{36})(?:\s+"[^"]*")?\)/gi)].map(match => match[1]!))]
}
