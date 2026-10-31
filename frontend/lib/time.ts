const pad = (value: number) => String(value).padStart(2, "0");

export function toLocalIso(date: Date = new Date()): string {
  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
  ].join("T");
}

export function nowLocalIso(): string {
  return toLocalIso();
}

export function parseLocalIso(value: string): Date {
  return new Date(value);
}
