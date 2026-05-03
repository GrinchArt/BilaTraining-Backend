export function normalizeColorHex(colorHex: string | null | undefined): string {
  if (colorHex && /^#[0-9a-fA-F]{6}$/.test(colorHex)) {
    return colorHex;
  }

  return '#2575ff';
}

export function hexToRgba(hex: string, alpha: number): string {
  const normalized = normalizeColorHex(hex);
  const red = Number.parseInt(normalized.slice(1, 3), 16);
  const green = Number.parseInt(normalized.slice(3, 5), 16);
  const blue = Number.parseInt(normalized.slice(5, 7), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
