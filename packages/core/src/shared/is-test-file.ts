const TEST_FILE_PATTERN = /(^|\/)(__tests__|tests?)\/|\.(test|spec)\.[^/]+$/;

export function isTestFile(filePath: string): boolean {
  return TEST_FILE_PATTERN.test(filePath);
}
