/** Extract just the base64 payload from a data URL (drops the `data:...;base64,` prefix). */
export function dataUrlToBase64(dataUrl: string): string {
  return dataUrl.split(",")[1] ?? "";
}
