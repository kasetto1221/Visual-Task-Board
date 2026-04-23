import {
  useGetStatsSummary,
  useGetVelocity,
  useGetWorkload,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Line,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  CheckCircle2,
  Timer,
  Activity,
  Target,
  AlertCircle,
} from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  todo: "未対応",
  in_progress: "進行中",
  in_review: "レビュー中",
  done: "完了",
};

const STATUS_COLORS: Record<string, string> = {
  todo: "hsl(var(--chart-1))",
  in_progress: "hsl(var(--chart-2))",
  in_review: "hsl(var(--chart-3))",
  done: "hsl(var(--chart-4))",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "低",
  medium: "中",
  high: "高",
  urgent: "緊急",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "hsl(var(--chart-3))",
  medium: "hsl(var(--chart-2))",
  high: "hsl(var(--chart-5))",
  urgent: "hsl(var(--destructive))",
};

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </div>
            <div className="text-3xl font-bold mt-2 tracking-tight">{value}</div>
            {hint && (
              <div className="text-xs text-muted-foreground mt-1">{hint}</div>
            )}
          </div>
          <div
            className="w-9 h-9 rounded-md flex items-center justify-center"
            style={{ background: accent ?? "hsl(var(--primary) / 0.12)" }}
          >
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: summary } = useGetStatsSummary();
  const { data: velocity, isLoading: velLoading } = useGetVelocity({ weeks: 8 });
  const { data: workload } = useGetWorkload();

  const completionRatePct = velocity
    ? Math.round(velocity.completionRate * 100)
    : 0;

  const statusData = (summary?.byStatus ?? []).map((s) => ({
    name: STATUS_LABELS[s.status] ?? s.status,
    value: s.count,
    key: s.status,
  }));

  const priorityData = (summary?.byPriority ?? []).map((p) => ({
    name: PRIORITY_LABELS[p.priority] ?? p.priority,
    value: p.count,
    key: p.priority,
  }));

  const topAssignees = [...(workload ?? [])]
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <Layout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">ダッシュボード</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          ベロシティとチームのパフォーマンスを俯瞰します。
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="週平均ベロシティ"
          value={velocity?.averageCompletedPerWeek ?? "—"}
          hint="直近8週間 / 完了タスク"
          icon={TrendingUp}
        />
        <KpiCard
          label="期間内 完了"
          value={velocity?.totalCompleted ?? "—"}
          hint={`新規 ${velocity?.totalCreated ?? 0} 件中`}
          icon={CheckCircle2}
        />
        <KpiCard
          label="平均サイクルタイム"
          value={velocity ? `${velocity.averageCycleTimeDays} 日` : "—"}
          hint="作成から完了まで"
          icon={Timer}
        />
        <KpiCard
          label="完了率"
          value={`${completionRatePct}%`}
          hint="期間内 完了 / 新規"
          icon={Target}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4" />
              週次ベロシティ（直近8週間）
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {velLoading || !velocity ? (
              <div className="h-72 bg-muted/40 rounded animate-pulse" />
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={velocity.weeks}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar
                      dataKey="completed"
                      name="完了"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="created"
                      name="新規"
                      fill="hsl(var(--chart-3))"
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      type="monotone"
                      dataKey="completed"
                      name="完了トレンド"
                      stroke="hsl(var(--chart-5))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">ステータス内訳</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <div className="h-72 bg-muted/40 rounded animate-pulse" />
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {statusData.map((d) => (
                        <Cell key={d.key} fill={STATUS_COLORS[d.key]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">優先度の分布</CardTitle>
          </CardHeader>
          <CardContent>
            {priorityData.length === 0 ? (
              <div className="h-64 bg-muted/40 rounded animate-pulse" />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorityData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={50} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="value" name="件数" radius={[0, 4, 4, 0]}>
                      {priorityData.map((d) => (
                        <Cell key={d.key} fill={PRIORITY_COLORS[d.key]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">担当者別ワークロード Top 5</CardTitle>
          </CardHeader>
          <CardContent>
            {topAssignees.length === 0 ? (
              <div className="h-64 bg-muted/40 rounded animate-pulse" />
            ) : (
              <div className="space-y-3">
                {topAssignees.map((w) => {
                  const max = topAssignees[0]?.total || 1;
                  const pct = (w.total / max) * 100;
                  return (
                    <div key={w.member.id}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-medium"
                            style={{ backgroundColor: w.member.avatarColor }}
                          >
                            {w.member.name.charAt(0)}
                          </div>
                          <span className="font-medium">{w.member.name}</span>
                          {w.overdue > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs text-destructive ml-1">
                              <AlertCircle className="w-3 h-3" />
                              {w.overdue}
                            </span>
                          )}
                        </div>
                        <span className="text-muted-foreground text-xs">
                          全{w.total}件 / 進行中 {w.inProgress}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
