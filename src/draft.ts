import { parseMap, serializeMap, validateMap, type TileMap } from './model';

export const DRAFT_KEY = 'tile-studio.draft.v1';
export interface Draft {
  map: TileMap;
  saved: string | null;
}
export type DraftResult =
  | { kind: 'empty' }
  | { kind: 'restored'; draft: Draft }
  | { kind: 'error'; message: string };
type StorageAccess = () => Pick<Storage, 'getItem' | 'setItem'>;

export function readDraft(storage: StorageAccess): DraftResult {
  try {
    const text = storage().getItem(DRAFT_KEY);
    if (!text) return { kind: 'empty' };
    if (text.length > 600000) throw new Error('Draft too large');
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== 'object') throw new Error('Invalid draft');
    const envelope = value as Record<string, unknown>;
    if (envelope.version !== 1) throw new Error('Invalid draft version');
    const map = validateMap(envelope.map);
    const saved = envelope.saved;
    if (saved !== null && typeof saved !== 'string')
      throw new Error('Invalid saved state');
    if (typeof saved === 'string') parseMap(saved);
    return { kind: 'restored', draft: { map, saved } };
  } catch {
    return {
      kind: 'error',
      message:
        'Local draft unavailable or damaged. Your map is safe in this tab; save JSON to keep it.',
    };
  }
}

export function writeDraft(
  storage: StorageAccess,
  draft: Draft,
): string | null {
  try {
    storage().setItem(
      DRAFT_KEY,
      JSON.stringify({ version: 1, map: draft.map, saved: draft.saved }),
    );
    return null;
  } catch {
    return 'Draft could not be stored. Save JSON before closing this tab.';
  }
}

export function isDirty(map: TileMap, saved: string | null): boolean {
  return serializeMap(map) !== saved;
}
