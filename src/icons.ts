const paths: Record<string, string> = {
  brush: '<path d="m14 3 7 7-10 10H4v-7Z"/><path d="m12 5 7 7M4 17l3 3"/>',
  eraser: '<path d="m14 3 7 7-11 11H5l-4-4Z"/><path d="m8 9 7 7M10 21h12"/>',
  hand: '<path d="M8 12V5a2 2 0 0 1 4 0v6-8a2 2 0 0 1 4 0v8-5a2 2 0 0 1 4 0v10c0 5-3 7-7 7-3 0-5-2-7-5l-3-5a2 2 0 0 1 3-2l2 2"/>',
  undo: '<path d="m8 4-6 6 6 6M2 10h12a7 7 0 0 1 0 14" transform="translate(1 -2) scale(.9)"/>',
  redo: '<path d="m16 4 6 6-6 6M22 10H10a7 7 0 0 0 0 14" transform="translate(1 -2) scale(.9)"/>',
  grid: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
  fit: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/><rect x="7" y="7" width="10" height="10" rx="1"/>',
  open: '<path d="M3 8V5h7l2 3h9v12H3Z"/><path d="m3 12 3-2h16l-3 10H3"/>',
  save: '<path d="M4 3h14l3 3v15H3V3Z"/><path d="M7 3v6h10V3M7 21v-8h10v8"/>',
  export: '<path d="M12 3v12m-5-7 5-5 5 5M4 14v7h16v-7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 8a3 3 0 0 1 6 0c0 3-3 2-3 5M12 17v.1"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  layers:
    '<path d="m12 3 10 6-10 6L2 9Zm-10 11 10 6 10-6M2 19l10 6 10-6" transform="translate(1 0) scale(.9)"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
};
export function icon(name: string): string {
  return `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? ''}</svg>`;
}
