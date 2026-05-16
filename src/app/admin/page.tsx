"use client";
import { useEffect, useState } from "react";
import { useAppSession } from "@/components/SessionProvider";
import { useRouter } from "next/navigation";
import { ShieldCheck, Plus, X, Trash2, UserCog } from "lucide-react";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: "admin" | "staff" | "viewer";
  createdAt: string;
}

const roleColors: Record<string, string> = {
  admin:  "bg-red-50 text-red-600 border-red-200",
  staff:  "bg-blue-50 text-blue-600 border-blue-200",
  viewer: "bg-slate-100 text-slate-500 border-slate-200",
};

export default function AdminPage() {
  const { isAdmin, isPending, user: me } = useAppSession();
  const router = useRouter();

  const [users, setUsers]       = useState<UserRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ name: "", email: "", password: "", role: "staff" as UserRow["role"] });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending && !isAdmin) router.replace("/");
  }, [isPending, isAdmin]);

  async function fetchUsers() {
    const res = await fetch("/api/admin/users");
    setUsers(await res.json());
    setLoading(false);
  }
  useEffect(() => { if (isAdmin) fetchUsers(); }, [isAdmin]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setError("");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ name: "", email: "", password: "", role: "staff" });
      setShowForm(false);
      fetchUsers();
    } else {
      const e = await res.json();
      setError(e.error || "Failed");
    }
    setSubmitting(false);
  }

  async function handleRoleChange(id: string, role: UserRow["role"]) {
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    fetchUsers();
  }

  async function handleDelete(id: string) {
    if (confirmId !== id) { setConfirmId(id); return; }
    await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    setConfirmId(null);
    fetchUsers();
  }

  if (isPending || !isAdmin) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck size={22} className="text-red-500" />
          <h1 className="text-xl font-bold text-slate-800">Admin</h1>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "Cancel" : "Add User"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-700 mb-4">Create User</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Full name" required
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="email@example.com" required
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Password</label>
                <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Min 6 chars" required minLength={6}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRow["role"] }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="viewer">Viewer</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={submitting}
              className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {submitting ? "Creating…" : "Create User"}
            </button>
          </form>
        </div>
      )}

      {/* Role legend */}
      <div className="bg-slate-50 rounded-xl p-4 space-y-1.5 text-xs text-slate-600">
        <div className="flex gap-2"><span className="font-semibold text-red-600 w-14">Admin</span> Full access — create, edit, delete, manage users</div>
        <div className="flex gap-2"><span className="font-semibold text-blue-600 w-14">Staff</span> Can create labels, pack cartons, update status — no delete</div>
        <div className="flex gap-2"><span className="font-semibold text-slate-500 w-14">Viewer</span> Read-only — can scan QRs and view everything</div>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-8">Loading…</div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1">
            Users ({users.length})
          </h2>
          {users.map(u => (
            <div key={u.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <UserCog size={16} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-slate-800 text-sm truncate">{u.name}</p>
                  {u.id === me?.id && <span className="text-xs text-slate-400">(you)</span>}
                </div>
                <p className="text-xs text-slate-400 truncate">{u.email}</p>
              </div>
              <select
                value={u.role}
                onChange={e => handleRoleChange(u.id, e.target.value as UserRow["role"])}
                disabled={u.id === me?.id}
                className={`text-xs font-medium px-2 py-1 rounded-lg border cursor-pointer disabled:opacity-60 ${roleColors[u.role]}`}
              >
                <option value="viewer">viewer</option>
                <option value="staff">staff</option>
                <option value="admin">admin</option>
              </select>
              {u.id !== me?.id && (
                <button
                  onClick={() => handleDelete(u.id)}
                  className={`flex-shrink-0 text-xs px-2 py-1.5 rounded-lg transition-colors ${
                    confirmId === u.id ? "bg-red-600 text-white" : "bg-red-50 text-red-500 hover:bg-red-100"
                  }`}
                >
                  {confirmId === u.id ? "Confirm?" : <Trash2 size={12} />}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
