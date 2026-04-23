import { Badge } from "@/components/ui/badge";
import { TaskPriority, TaskStatus } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  const map: Record<TaskStatus, { label: string; className: string }> = {
    todo: { label: "未対応", className: "bg-muted text-muted-foreground border-transparent hover:bg-muted/80" },
    in_progress: { label: "進行中", className: "bg-blue-100 text-blue-700 border-transparent hover:bg-blue-100/80 dark:bg-blue-900/30 dark:text-blue-400" },
    in_review: { label: "レビュー中", className: "bg-amber-100 text-amber-700 border-transparent hover:bg-amber-100/80 dark:bg-amber-900/30 dark:text-amber-400" },
    done: { label: "完了", className: "bg-primary/10 text-primary border-transparent hover:bg-primary/20 dark:bg-primary/20 dark:text-primary" },
  };

  const { label, className: variantClass } = map[status];

  return (
    <Badge variant="outline" className={cn(variantClass, className)}>
      {label}
    </Badge>
  );
}

export function PriorityBadge({ priority, className }: { priority: TaskPriority; className?: string }) {
  const map: Record<TaskPriority, { label: string; className: string; icon?: React.ReactNode }> = {
    low: { label: "低", className: "bg-muted text-muted-foreground border-transparent hover:bg-muted/80" },
    medium: { label: "中", className: "bg-slate-100 text-slate-700 border-transparent hover:bg-slate-100/80 dark:bg-slate-800 dark:text-slate-300" },
    high: { label: "高", className: "bg-orange-100 text-orange-700 border-transparent hover:bg-orange-100/80 dark:bg-orange-900/30 dark:text-orange-400" },
    urgent: { label: "緊急", className: "bg-destructive/10 text-destructive border-transparent hover:bg-destructive/20 dark:bg-destructive/20 dark:text-destructive" },
  };

  const { label, className: variantClass } = map[priority];

  return (
    <Badge variant="outline" className={cn(variantClass, className)}>
      {label}
    </Badge>
  );
}
