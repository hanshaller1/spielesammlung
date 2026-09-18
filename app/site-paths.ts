export const publicBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function sitePath(path: string): string {
  return `${publicBasePath}${path}`;
}
