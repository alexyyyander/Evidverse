export function sanitizeParticipatedBranchNames(branchNames?: string[] | null): string[] {
  if (!Array.isArray(branchNames)) return [];
  const seen = new Set<string>();
  const sanitized: string[] = [];
  for (const branchName of branchNames) {
    if (typeof branchName !== "string") continue;
    const trimmed = branchName.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    sanitized.push(trimmed);
  }
  return sanitized;
}

export function resolveParticipatedBranch(branchNames: string[], selectedBranch?: string | null): string {
  if (branchNames.length === 0) return "";
  if (typeof selectedBranch === "string" && branchNames.includes(selectedBranch)) {
    return selectedBranch;
  }
  return branchNames[0];
}

