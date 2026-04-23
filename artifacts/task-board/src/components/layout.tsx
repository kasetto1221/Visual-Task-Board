import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, CalendarClock, Plus, CheckCircle2, Clock, AlertCircle, BarChart3 } from "lucide-react";
import { useGetStatsSummary } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      <Sidebar location={location} />
      <main className="flex-1 overflow-y-auto">
        <div className="h-full px-8 py-8 max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

function Sidebar({ location }: { location: string }) {
  const { data: stats } = useGetStatsSummary();

  const links = [
    { href: "/", label: "ボード", icon: LayoutDashboard },
    { href: "/dashboard", label: "ダッシュボード", icon: BarChart3 },
    { href: "/team", label: "チーム負荷", icon: Users },
    { href: "/upcoming", label: "今後のタスク", icon: CalendarClock },
  ];

  return (
    <aside className="w-64 border-r border-sidebar-border bg-sidebar flex flex-col hidden md:flex shrink-0">
      <div className="p-6">
        <h1 className="text-xl font-bold text-sidebar-foreground tracking-tight flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
          </div>
          Task Board
        </h1>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4">
        {links.map((link) => {
          const active = location === link.href;
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </div>
            </Link>
          );
        })}
      </nav>

      {stats && (
        <div className="p-6">
          <div className="bg-sidebar-accent/50 rounded-lg p-4">
            <h3 className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider mb-3">サマリー</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-sidebar-foreground/80 flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> 全タスク</span>
                <span className="font-medium">{stats.total}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-destructive flex items-center gap-2"><AlertCircle className="w-3.5 h-3.5" /> 期限切れ</span>
                <span className="font-medium text-destructive">{stats.overdue}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-sidebar-foreground/80 flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5" /> 今週完了</span>
                <span className="font-medium text-primary">{stats.completedThisWeek}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
