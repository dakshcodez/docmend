export function assertSafeGitRef(ref: string, label: string): void {
  if (ref.startsWith('-')) {
    throw new Error(`Refusing to pass ${label} starting with "-" to git: ${ref}`);
  }
}
