let lastHtml: string | null = null;

export function setMatchupCardHtml(html: string): void {
  lastHtml = html;
}

export function getMatchupCardHtml(): string | null {
  return lastHtml;
}
