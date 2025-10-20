declare module 'node:sqlite' {
  export class DatabaseSync {
    constructor(filename: string);
    exec(sql: string): void;
    prepare<T = unknown>(sql: string): StatementSync<T>;
    close(): void;
  }

  export class StatementSync<T = unknown> {
    run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
    get(...params: unknown[]): T | undefined;
    all(...params: unknown[]): T[];
  }
}