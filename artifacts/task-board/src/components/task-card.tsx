import React from "react";
import { format, isPast, isToday, startOfDay } from "date-fns";
import { ja } from "date-fns/locale";
import { Task, Member } from "@workspace/api-client-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge, PriorityBadge } from "./ui/badges";
import { Calendar, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface TaskCardProps {
  task: Task;
  onClick: (task: Task) => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate) && task.status !== 'done';
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      className="mb-3"
    >
      <Card 
        className={cn(
          "cursor-pointer hover:shadow-md transition-all border-l-4",
          isOverdue ? "border-l-destructive" : "border-l-transparent",
          task.status === 'done' ? "opacity-60 grayscale-[0.5]" : ""
        )}
        onClick={() => onClick(task)}
      >
        <CardContent className="p-4">
          <div className="flex justify-between items-start gap-2 mb-2">
            <div className="flex flex-wrap gap-1.5">
              <PriorityBadge priority={task.priority} />
            </div>
            {task.assignee && (
              <Avatar className="h-6 w-6">
                <div 
                  className="w-full h-full flex items-center justify-center text-[10px] text-white font-medium"
                  style={{ backgroundColor: task.assignee.avatarColor || '#ccc' }}
                >
                  {task.assignee.name.charAt(0).toUpperCase()}
                </div>
              </Avatar>
            )}
          </div>
          
          <h4 className="text-sm font-medium text-foreground leading-snug mb-3">
            {task.title}
          </h4>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-2 border-t border-border/50">
            {dueDate ? (
              <div className={cn("flex items-center gap-1", isOverdue && "text-destructive font-medium")}>
                <Calendar className="h-3.5 w-3.5" />
                <span>{format(dueDate, "M/d (E)", { locale: ja })}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 opacity-50">
                <Calendar className="h-3.5 w-3.5" />
                <span>期限なし</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
