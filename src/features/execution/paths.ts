/**
 * Paths in compiler/runtime messages, as the sandbox prints them
 * ("./main.go", "/workspace/main.ksj"), mapped to workspace file names ("main.go").
 */
export function workspacePath(path: string): string {
  return path.replace(/^\/workspace\//, '').replace(/^(\.\/)+/, '');
}
