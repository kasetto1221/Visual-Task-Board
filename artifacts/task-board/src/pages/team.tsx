import { useGetWorkload } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

export default function Team() {
  const { data: workload, isLoading } = useGetWorkload();

  return (
    <Layout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">チーム負荷</h2>
        <p className="text-muted-foreground mt-1 text-sm">メンバーごとの割り当てタスク数と進捗状況</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {workload?.map((stat) => {
            // max realistic tasks for progress bar scaling
            const maxTasks = 20; 
            const progressPercent = Math.min((stat.total / maxTasks) * 100, 100);
            
            return (
              <Card key={stat.member.id}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4 min-w-[200px]">
                      <Avatar className="h-10 w-10">
                        <div 
                          className="w-full h-full flex items-center justify-center text-sm text-white font-medium"
                          style={{ backgroundColor: stat.member.avatarColor || '#ccc' }}
                        >
                          {stat.member.name.charAt(0).toUpperCase()}
                        </div>
                      </Avatar>
                      <div>
                        <h4 className="font-semibold text-base">{stat.member.name}</h4>
                        <p className="text-sm text-muted-foreground">{stat.member.role}</p>
                      </div>
                    </div>

                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex gap-4">
                          <span className="font-medium text-foreground">{stat.total} タスク</span>
                          {stat.overdue > 0 && (
                            <span className="text-destructive font-medium">{stat.overdue} 期限切れ</span>
                          )}
                        </div>
                        <div className="flex gap-3 text-muted-foreground text-xs">
                          <span>未対応: {stat.todo}</span>
                          <span>進行中: {stat.inProgress}</span>
                          <span>レビュー: {stat.inReview}</span>
                        </div>
                      </div>
                      
                      <Progress value={progressPercent} className="h-2 bg-muted">
                        <div 
                          className="h-full bg-primary transition-all" 
                          style={{ width: `${progressPercent}%`, backgroundColor: stat.overdue > 0 ? 'var(--color-destructive)' : 'var(--color-primary)' }}
                        />
                      </Progress>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {workload?.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              チームメンバーが見つかりません
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
