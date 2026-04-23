import { useState } from "react";
import {
  useListTasks,
  useUpdateTask,
  Task,
  TaskStatus,
  getListTasksQueryKey,
  getGetStatsSummaryQueryKey,
  getGetUpcomingTasksQueryKey,
  getGetWorkloadQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { TaskCard } from "@/components/task-card";
import { TaskDialog } from "@/components/task-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "todo", label: "未対応" },
  { id: "in_progress", label: "進行中" },
  { id: "in_review", label: "レビュー中" },
  { id: "done", label: "完了" },
];

export default function Home() {
  const { data: tasks, isLoading } = useListTasks();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  const queryClient = useQueryClient();
  const updateMutation = useUpdateTask();

  const handleTaskClick = (task: Task) => {
    setSelectedTaskId(task.id);
    setIsDialogOpen(true);
  };

  const handleNewTask = () => {
    setSelectedTaskId("new");
    setIsDialogOpen(true);
  };

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks?.filter((t) => t.status === status) || [];
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetStatsSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetUpcomingTasksQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetWorkloadQueryKey() });
  };

  const handleDrop = (status: TaskStatus) => {
    const id = draggingTaskId;
    setDragOverColumn(null);
    setDraggingTaskId(null);
    if (!id) return;
    const task = tasks?.find((t) => t.id === id);
    if (!task || task.status === status) return;
    updateMutation.mutate(
      { id, data: { status } },
      { onSuccess: () => invalidateAll() },
    );
  };

  return (
    <Layout>
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">ボード</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            チームのタスク状況を一目で確認できます。カードをドラッグしてステータスを変更できます。
          </p>
        </div>
        <Button onClick={handleNewTask}>
          <Plus className="w-4 h-4 mr-2" />
          タスク追加
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[70vh]">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-muted/50 rounded-lg p-4 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-140px)] min-h-[500px]">
          {COLUMNS.map((column) => {
            const columnTasks = getTasksByStatus(column.id);
            const isOver = dragOverColumn === column.id;
            return (
              <div
                key={column.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOverColumn !== column.id) setDragOverColumn(column.id);
                }}
                onDragLeave={(e) => {
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                  setDragOverColumn((c) => (c === column.id ? null : c));
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(column.id);
                }}
                className={cn(
                  "flex flex-col h-full bg-sidebar/50 rounded-xl border p-3 overflow-hidden transition-colors",
                  isOver
                    ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                    : "border-border",
                )}
              >
                <div className="flex items-center justify-between mb-4 px-1">
                  <h3 className="font-medium text-sm text-foreground/80">
                    {column.label}
                  </h3>
                  <span className="text-xs font-semibold bg-background text-muted-foreground px-2 py-0.5 rounded-full border border-border/50">
                    {columnTasks.length}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto pr-1 pb-4">
                  <AnimatePresence>
                    {columnTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onClick={handleTaskClick}
                        draggable
                        onDragStart={(t) => setDraggingTaskId(t.id)}
                        onDragEnd={() => {
                          setDraggingTaskId(null);
                          setDragOverColumn(null);
                        }}
                        isDragging={draggingTaskId === task.id}
                      />
                    ))}
                  </AnimatePresence>

                  {columnTasks.length === 0 && (
                    <div
                      className={cn(
                        "h-24 border-2 border-dashed rounded-lg flex items-center justify-center text-sm text-muted-foreground transition-colors",
                        isOver ? "border-primary text-primary" : "border-border/50",
                      )}
                    >
                      {isOver ? "ここにドロップ" : "タスクなし"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TaskDialog
        taskId={selectedTaskId}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </Layout>
  );
}
