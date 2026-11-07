/**
 * Formats a byte value into a human-readable string using B, KB, MB or GB.
 *
 * @param bytes the number of bytes
 *
 * @returns Formatted size string. Ex("4.2 KB", "1.8 MB" or "10 GB")
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;

  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb >= 10 ? 0 : 1)} KB`;

  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;

  const gb = mb / 1024;
  return `${gb.toFixed(gb >= 10 ? 0 : 1)} GB`;
}
