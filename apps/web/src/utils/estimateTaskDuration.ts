export function estimateTaskDuration(title: string): number {
  const words = title.trim().split(/\s+/).filter(Boolean).length;
  if (words <= 3) return 15;
  if (words <= 6) return 30;
  return 60;
}
