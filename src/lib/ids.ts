export function createId(prefix: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const token = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${prefix}_${token}`;
}
