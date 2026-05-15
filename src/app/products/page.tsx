"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Package, X, Trash2 } from "lucide-react";
import type { Product } from "@/db/schema";

const schema = z.object({
  name: z.string().min(1, "Required"),
  sku: z.string().min(1, "Required"),
  designNumber: z.string().optional(),
  colorCategory: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function ProductsPage() {
  const [products, setProducts]       = useState<Product[]>([]);
  const [showForm, setShowForm]       = useState(false);
  const [loading, setLoading]         = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState("");
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const [confirmId, setConfirmId]     = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string>("");

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function fetchProducts() {
    const res = await fetch("/api/products");
    setProducts(await res.json());
    setLoading(false);
  }
  useEffect(() => { fetchProducts(); }, []);

  async function onSubmit(data: FormData) {
    setSubmitting(true); setError("");
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      reset(); setShowForm(false); fetchProducts();
    } catch (e: any) { setError(e.message); }
    finally { setSubmitting(false); }
  }

  async function handleDelete(id: string) {
    if (confirmId !== id) { setConfirmId(id); setDeleteError(""); return; }
    setDeletingId(id);
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (res.ok) {
      setConfirmId(null);
      fetchProducts();
    } else {
      const err = await res.json();
      setDeleteError(err.error || "Delete failed");
      setConfirmId(null);
    }
    setDeletingId(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Products / SKUs</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "Cancel" : "New Product"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-700 mb-4">Create Product</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Product Name *</label>
                <input {...register("name")} placeholder="e.g. Kaftan Design 142"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">SKU *</label>
                <input {...register("sku")} placeholder="e.g. KFT-142"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {errors.sku && <p className="text-red-500 text-xs mt-1">{errors.sku.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Design Number</label>
                <input {...register("designNumber")} placeholder="e.g. 142"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Color / Category</label>
                <input {...register("colorCategory")} placeholder="e.g. Blue, Lace, Scarf"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={submitting}
              className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {submitting ? "Creating..." : "Create Product"}
            </button>
          </form>
        </div>
      )}

      {deleteError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          {deleteError}
          <button onClick={() => setDeleteError("")}><X size={14} /></button>
        </div>
      )}

      {loading ? (
        <div className="text-center text-slate-400 py-8">Loading...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <Package size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">No products yet. Create your first product above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-800">{p.name}</h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="bg-blue-50 text-blue-700 text-xs font-mono px-2 py-0.5 rounded-lg">{p.sku}</span>
                  {p.designNumber && (
                    <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-lg">Design {p.designNumber}</span>
                  )}
                  {p.colorCategory && (
                    <span className="bg-emerald-50 text-emerald-700 text-xs px-2 py-0.5 rounded-lg">{p.colorCategory}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDelete(p.id)}
                disabled={deletingId === p.id}
                className={`flex-shrink-0 flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                  confirmId === p.id
                    ? "bg-red-600 text-white"
                    : "bg-red-50 text-red-500 hover:bg-red-100"
                }`}
              >
                <Trash2 size={12} />
                {confirmId === p.id ? "Confirm?" : "Delete"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
