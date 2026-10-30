import type { TileMap } from './model';
import { lineCells, type Point } from './geometry';

interface Change {
  index: number;
  before: number;
  after: number;
}
export type Command = Change[];
export const HISTORY_LIMIT = 100;
export const HISTORY_CELL_BUDGET = 32768;

export class Stroke {
  private changes = new Map<number, Change>();
  private last: Point | null = null;
  constructor(
    private map: TileMap,
    private tile: number,
  ) {}

  visit(cell: Point | null): void {
    if (
      !cell ||
      cell.x < 0 ||
      cell.y < 0 ||
      cell.x >= this.map.width ||
      cell.y >= this.map.height
    ) {
      this.last = null;
      return;
    }
    for (const point of lineCells(this.last ?? cell, cell)) {
      const index = point.y * this.map.width + point.x;
      const before = this.map.cells[index]!;
      if (before === this.tile) continue;
      if (!this.changes.has(index))
        this.changes.set(index, { index, before, after: this.tile });
      this.map.cells[index] = this.tile;
    }
    this.last = cell;
  }

  finish(): Command {
    return [...this.changes.values()];
  }
  cancel(): void {
    for (const change of this.changes.values())
      this.map.cells[change.index] = change.before;
    this.changes.clear();
  }
}

export class History {
  private past: Command[] = [];
  private future: Command[] = [];
  get undoCount(): number {
    return this.past.length;
  }
  get redoCount(): number {
    return this.future.length;
  }
  get storedCells(): number {
    return [...this.past, ...this.future].reduce(
      (sum, command) => sum + command.length,
      0,
    );
  }

  push(command: Command): boolean {
    if (!command.length) return false;
    this.future = [];
    this.past.push(command);
    while (
      this.past.length > HISTORY_LIMIT ||
      this.storedCells > HISTORY_CELL_BUDGET
    )
      this.past.shift();
    return true;
  }
  undo(map: TileMap): boolean {
    const command = this.past.pop();
    if (!command) return false;
    for (const change of command) map.cells[change.index] = change.before;
    this.future.push(command);
    return true;
  }
  redo(map: TileMap): boolean {
    const command = this.future.pop();
    if (!command) return false;
    for (const change of command) map.cells[change.index] = change.after;
    this.past.push(command);
    return true;
  }
  clear(): void {
    this.past = [];
    this.future = [];
  }
}
