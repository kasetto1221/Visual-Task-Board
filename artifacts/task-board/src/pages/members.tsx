import { useState } from "react";
import {
  useListMembers,
  useCreateMember,
  useUpdateMember,
  useDeleteMember,
  useGetWorkload,
  getListMembersQueryKey,
} from "@workspace/api-client-react";
import type { Member } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Pencil, Trash2, Mail, Briefcase, CheckCircle2 } from "lucide-react";

const AVATAR_COLORS = [
  "#4f46e5", "#0891b2", "#059669", "#d97706",
  "#dc2626", "#7c3aed", "#db2777", "#16a34a",
  "#ea580c", "#0284c7",
];

function Avatar({ member, size = 10 }: { member: Pick<Member, "name" | "avatarColor">; size?: number }) {
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white font-semibold shrink-0`}
      style={{ backgroundColor: member.avatarColor, fontSize: size <= 8 ? 12 : 16 }}
    >
      {member.name.charAt(0)}
    </div>
  );
}

type MemberFormValues = {
  name: string;
  email: string;
  role: string;
  avatarColor: string;
};

const defaultForm: MemberFormValues = {
  name: "",
  email: "",
  role: "",
  avatarColor: AVATAR_COLORS[0],
};

function MemberFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
  loading,
  title,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: MemberFormValues;
  onSubmit: (vals: MemberFormValues) => void;
  loading: boolean;
  title: string;
}) {
  const [form, setForm] = useState<MemberFormValues>(initial);

  function set(key: keyof MemberFormValues) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
  }

  function handleOpenChange(v: boolean) {
    if (v) setForm(initial);
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="name">名前</Label>
            <Input
              id="name"
              className="mt-1.5"
              placeholder="田中 太郎"
              value={form.name}
              onChange={set("name")}
            />
          </div>
          <div>
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              type="email"
              className="mt-1.5"
              placeholder="tanaka@example.com"
              value={form.email}
              onChange={set("email")}
            />
          </div>
          <div>
            <Label htmlFor="role">役職</Label>
            <Input
              id="role"
              className="mt-1.5"
              placeholder="フロントエンドエンジニア"
              value={form.role}
              onChange={set("role")}
            />
          </div>
          <div>
            <Label>アバターカラー</Label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, avatarColor: color }))}
                  className="w-7 h-7 rounded-full transition-transform hover:scale-110 focus:outline-none"
                  style={{
                    backgroundColor: color,
                    boxShadow: form.avatarColor === color ? "0 0 0 2px white, 0 0 0 4px " + color : "none",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">キャンセル</Button>
          </DialogClose>
          <Button
            onClick={() => onSubmit(form)}
            disabled={loading || !form.name.trim() || !form.email.trim() || !form.role.trim()}
          >
            {loading ? "保存中…" : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Members() {
  const { data: members, isLoading } = useListMembers();
  const { data: workload } = useGetWorkload();
  const qc = useQueryClient();
  const { toast } = useToast();

  const createMember = useCreateMember();
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Member | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);

  const workloadMap = new Map(workload?.map((w) => [w.member.id, w]) ?? []);

  async function invalidate() {
    await qc.invalidateQueries({ queryKey: getListMembersQueryKey() });
  }

  function handleCreate(vals: MemberFormValues) {
    createMember.mutate(
      { data: { name: vals.name, email: vals.email, role: vals.role, avatarColor: vals.avatarColor } },
      {
        onSuccess: () => {
          setCreateOpen(false);
          invalidate();
          toast({ title: "メンバーを追加しました" });
        },
        onError: () => {
          toast({ title: "追加に失敗しました", variant: "destructive" });
        },
      },
    );
  }

  function handleEdit(vals: MemberFormValues) {
    if (!editTarget) return;
    updateMember.mutate(
      { id: editTarget.id, data: { name: vals.name, email: vals.email, role: vals.role, avatarColor: vals.avatarColor } },
      {
        onSuccess: () => {
          setEditTarget(null);
          invalidate();
          toast({ title: "メンバー情報を更新しました" });
        },
        onError: () => {
          toast({ title: "更新に失敗しました", variant: "destructive" });
        },
      },
    );
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteMember.mutate(
      { id: deleteTarget.id },
      {
        onSuccess: () => {
          setDeleteTarget(null);
          invalidate();
          toast({ title: "メンバーを削除しました" });
        },
        onError: () => {
          toast({ title: "削除に失敗しました", variant: "destructive" });
        },
      },
    );
  }

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">ユーザー管理</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            チームメンバーの追加・編集・削除ができます。
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <UserPlus className="w-4 h-4" />
          メンバーを追加
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-40 rounded-lg bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : !members?.length ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <UserPlus className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">メンバーがいません。追加してください。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((m) => {
            const wl = workloadMap.get(m.id);
            return (
              <Card key={m.id} className="relative overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <Avatar member={m} size={12} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-base leading-tight truncate">{m.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
                        <Briefcase className="w-3 h-3 shrink-0" />
                        {m.role}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
                        <Mail className="w-3 h-3 shrink-0" />
                        {m.email}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setEditTarget(m)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(m)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {wl && (
                    <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-lg font-bold">{wl.total}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">全タスク</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-blue-500">{wl.inProgress}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">進行中</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          {wl.done}
                        </div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">完了</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <MemberFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        initial={defaultForm}
        onSubmit={handleCreate}
        loading={createMember.isPending}
        title="新しいメンバーを追加"
      />

      {editTarget && (
        <MemberFormDialog
          open={true}
          onOpenChange={(v) => !v && setEditTarget(null)}
          initial={{
            name: editTarget.name,
            email: editTarget.email,
            role: editTarget.role,
            avatarColor: editTarget.avatarColor,
          }}
          onSubmit={handleEdit}
          loading={updateMember.isPending}
          title="メンバーを編集"
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{deleteTarget?.name}」を削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteMember.isPending}
            >
              {deleteMember.isPending ? "削除中…" : "削除する"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
