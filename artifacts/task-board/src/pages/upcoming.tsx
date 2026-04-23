import { useGetUpcomingTasks, Task } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { format, isPast, isToday, isTomorrow, isThisWeek, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { TaskCard } from "@/components/task-card";
import { useState } from "react";
import { TaskDialog } from "@/components/task-dialog";

export default function Upcoming() {
  const { data: tasks, isLoading } = useGetUpcomingTasks({ limit: 50 });
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Group tasks by temporal bucket
  const groupedTasks: Record<string, Task[]> = {
    "期限切れ": [],
    "今日": [],
    "明日": [],
    "今週": [],
    "それ以降": []
  };

  tasks?.forEach(task => {
    if (!task.dueDate) return;
    const date = parseISO(task.dueDate);
    
    if (isPast(date) && !isToday(date)) {
      groupedTasks["期限切れ"].push(task);
    } else if (isToday(date)) {
      groupedTasks["今日"].push(task);
    } else if (isTomorrow(date)) {
      groupedTasks["明日"].push(task);
    } else if (isThisWeek(date)) {
      groupedTasks["今週"].push(task);
    } else {
      groupedTasks["それ以降"].push(task);
    }
  });

  return (
    <Layout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">今後のタスク</h2>
        <p className="text-muted-foreground mt-1 text-sm">期限順にタスクを確認します</p>
      </div>

      {isLoading ? (
        <div className="space-y-8">
          {[1, 2].map(i => (
            <div key={i} className="space-y-4">
              <div className="w-32 h-6 bg-muted animate-pulse rounded" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="h-32 bg-muted/50 rounded-lg animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-10 pb-12">
          {Object.entries(groupedTasks).map(([label, groupTasks]) => {
            if (groupTasks.length === 0) return null;
            
            return (
              <div key={label}>
                <h3 className={`text-lg font-semibold mb-4 border-b border-border pb-2 ${label === '期限切れ' ? 'text-destructive' : ''}`}>
                  {label} <span className="text-sm font-normal text-muted-foreground ml-2">({groupTasks.length})</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {groupTasks.map(task => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      onClick={(t) => setSelectedTaskId(t.id)} 
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {tasks?.length === 0 && (
            <div className="text-center py-24 text-muted-foreground">
              <p>予定されているタスクはありません</p>
            </div>
          )}
        </div>
      )}

      <TaskDialog 
        taskId={selectedTaskId} 
        open={!!selectedTaskId} 
        onOpenChange={(open) => !open && setSelectedTaskId(null)} 
      />
    </Layout>
  );
}
