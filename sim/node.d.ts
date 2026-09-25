// The runner writes its report to disk. The app has no Node types, so this
// declares the handful of calls the simulator uses rather than pulling
// @types/node into a browser project.
declare module 'node:fs' {
  export function readFileSync(path: string, encoding: 'utf8'): string;
  export function writeFileSync(path: string, data: string): void;
  export function existsSync(path: string): boolean;
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void;
}
declare const process: { env: Record<string, string | undefined> };
