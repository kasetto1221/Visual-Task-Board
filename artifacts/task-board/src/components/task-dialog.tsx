import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetTask, 
  useCreateTask, 
  useUpdateTask, 
  useDeleteTask,
  useListMembers,
  Task,
  CreateTaskBody,
  UpdateTaskBody,
  TaskStatus,
  TaskPriority,
  getListTasksQueryKey,
  getGetStatsSummaryQueryKey,
  getGetUpcomingTasksQueryKey,
  getGetWorkloadQueryKey,
  getGetTaskQueryKey
} from "@workspace/api-client-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";

const taskSchema = z.object({
  title: z.string().min(1, { message: "タイトルを入力してください" }),
  description: z.string().optional().nullable(),
  status: z.enum(["todo", "in_progress", "in_review", "done"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  dueDate: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface TaskDialogProps {
  taskId: string | null | "new";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDialog({ taskId, open, onOpenChange }: TaskDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isNew = taskId === "new";
  
  const { data: task, isLoading: isTaskLoading } = useGetTask(
    taskId !== "new" && taskId !== null ? taskId : "", 
    { query: { enabled: !!taskId && !isNew, queryKey: getGetTaskQueryKey(taskId || "") } }
  );
  
  const { data: members } = useListMembers();
  
  const createMutation = useCreateTask();
  const updateMutation = useUpdateTask();
  const deleteMutation = useDeleteTask();

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      dueDate: "",
      assigneeId: "none",
    }
  });

  useEffect(() => {
    if (task && !isNew) {
      form.reset({
        title: task.title,
        description: task.description || "",
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate || "",
        assigneeId: task.assigneeId || "none",
      });
    } else if (isNew) {
      form.reset({
        title: "",
        description: "",
        status: "todo",
        priority: "medium",
        dueDate: "",
        assigneeId: "none",
      });
    }
  }, [task, isNew, form, open]);

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetStatsSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetUpcomingTasksQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetWorkloadQueryKey() });
  };

  const onSubmit = (values: TaskFormValues) => {
    const payload = {
      ...values,
      assigneeId: values.assigneeId === "none" ? null : values.assigneeId,
      dueDate: values.dueDate ? values.dueDate : null,
    };

    if (isNew) {
      createMutation.mutate({ data: payload }, {
        onSuccess: () => {
          toast({ title: "タスクを作成しました" });
          invalidateQueries();
          onOpenChange(false);
        },
        onError: () => {
          toast({ title: "エラーが発生しました", variant: "destructive" });
        }
      });
    } else if (taskId) {
      updateMutation.mutate({ id: taskId, data: payload }, {
        onSuccess: () => {
          toast({ title: "タスクを更新しました" });
          invalidateQueries();
          onOpenChange(false);
        },
        onError: () => {
          toast({ title: "エラーが発生しました", variant: "destructive" });
        }
      });
    }
  };

  const handleDelete = () => {
    if (taskId && !isNew && window.confirm("このタスクを削除しますか？")) {
      deleteMutation.mutate({ id: taskId }, {
        onSuccess: () => {
          toast({ title: "タスクを削除しました" });
          invalidateQueries();
          onOpenChange(false);
        },
        onError: () => {
          toast({ title: "エラーが発生しました", variant: "destructive" });
        }
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isNew ? "新規タスク" : "タスクの編集"}</DialogTitle>
          <DialogDescription>
            タスクの詳細を入力してください。
          </DialogDescription>
        </DialogHeader>
        
        {isTaskLoading && !isNew ? (
          <div className="py-8 text-center text-muted-foreground">読み込み中...</div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">タイトル</Label>
              <Input id="title" {...form.register("title")} placeholder="タスクのタイトル" />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">詳細</Label>
              <Textarea 
                id="description" 
                {...form.register("description")} 
                placeholder="タスクの詳細な説明..." 
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">ステータス</Label>
                <Controller
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="ステータス" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">未対応</SelectItem>
                        <SelectItem value="in_progress">進行中</SelectItem>
                        <SelectItem value="in_review">レビュー中</SelectItem>
                        <SelectItem value="done">完了</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">優先度</Label>
                <Controller
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="優先度" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">低</SelectItem>
                        <SelectItem value="medium">中</SelectItem>
                        <SelectItem value="high">高</SelectItem>
                        <SelectItem value="urgent">緊急</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dueDate">期限</Label>
                <Input id="dueDate" type="date" {...form.register("dueDate")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="assigneeId">担当者</Label>
                <Controller
                  control={form.control}
                  name="assigneeId"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || "none"}>
                      <SelectTrigger>
                        <SelectValue placeholder="担当者を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">未割り当て</SelectItem>
                        {members?.map(member => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <DialogFooter className="mt-6 flex items-center justify-between sm:justify-between">
              {!isNew ? (
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  削除
                </Button>
              ) : <div></div>}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  キャンセル
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {isNew ? "作成" : "保存"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
