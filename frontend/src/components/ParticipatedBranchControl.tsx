import { MouseEvent, ReactNode, useMemo } from "react";
import { resolveParticipatedBranch } from "@/lib/projectBranchSelection";

interface ParticipatedBranchControlProps {
  branchNames: string[];
  selectedBranch: string;
  selectAriaLabel: string;
  onSelectedBranchChange: (branchName: string) => void;
  renderOpenControl: (effectiveBranch: string) => ReactNode;
  containerClassName?: string;
  selectClassName?: string;
  onSelectClick?: (event: MouseEvent<HTMLSelectElement>) => void;
}

export default function ParticipatedBranchControl({
  branchNames,
  selectedBranch,
  selectAriaLabel,
  onSelectedBranchChange,
  renderOpenControl,
  containerClassName = "flex items-center gap-2",
  selectClassName = "h-8 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring",
  onSelectClick,
}: ParticipatedBranchControlProps) {
  const effectiveBranch = useMemo(
    () => resolveParticipatedBranch(branchNames, selectedBranch),
    [branchNames, selectedBranch],
  );

  if (branchNames.length === 0 || !effectiveBranch) return null;

  return (
    <div className={containerClassName}>
      {branchNames.length > 1 ? (
        <select
          aria-label={selectAriaLabel}
          value={effectiveBranch}
          onClick={onSelectClick}
          onChange={(event) => onSelectedBranchChange(event.target.value)}
          className={selectClassName}
        >
          {branchNames.map((branchName) => (
            <option key={branchName} value={branchName}>
              {branchName}
            </option>
          ))}
        </select>
      ) : null}
      {renderOpenControl(effectiveBranch)}
    </div>
  );
}
