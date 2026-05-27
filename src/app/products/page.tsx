"use client";
import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, X, Trash2, ImagePlus, Loader2, Pencil, Check, Search, ChevronDown, ChevronUp, Package } from "lucide-react";
import { useAppSession } from "@/components/SessionProvider";
import { uploadImage } from "@/lib/upload";

const schema = z.object({
  name: z.string().min(1, "Required"),
  sku: z.string().min(1, "Required"),
  designNumber: z.string().optional(),
  colorCategory: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

// Inline edit row
function ProductRow({ p, canEdit, canDelete, onUpdated, onDeleted }: {
  p: any; canEdit: boolean; canDelete: boolean; onUpdated: () => void; onDeleted: () => void;
}) {
  const [editing, setEditing]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset } = useForm<FormData>({
    defaultValues: { name: p.name, sku: p.sku, designNumber: p.designNumber ?? "", colorCategory: p.colorCategory ?? "" },
  });

  function handleImg(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); }
  }

  async function onSave(data: FormData) {
    setSaving(true);
    try {
      let imageUrl = p.imageUrl;
      if (imageFile) { setUploading(true); imageUrl = await uploadImage(imageFile); setUploading(false); }
      await fetch(`/api/products/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, imageUrl }),
      });
      setEditing(false); setImageFile(null); setImagePreview(null);
      onUpdated();
    } finally { setSaving(false); setUploading(false); }
  }

  async function handleDelete() {
    if (!confirmDel) { setConfirmDel(true); return; }
    setDeleting(true);
    const res = await fetch(`/api/products/${p.id}`, { method: "DELETE" });
    if (res.ok) onDeleted();
    else { setConfirmDel(false); }
    setDeleting(false);
  }

  if (editing) return (
    <div className="px-4 py-3 bg-blue-50 border-b border-slate-100">
      {/* Photo */}
      <div className="flex items-center gap-3 mb-3">
        {(imagePreview || p.imageUrl) && (
          <img src={imagePreview || p.imageUrl} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" alt="" />
        )}
        <button type="button" onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 border border-blue-200 bg-white rounded-lg px-3 py-1.5">
          <ImagePlus size={13} /> {p.imageUrl ? "Replace photo" : "Add photo"}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleImg} className="hidden" />
      </div>
      <form onSubmit={handleSubmit(onSave)} className="space-y-2">
        <input {...register("name")} placeholder="Product name"
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        <div className="grid grid-cols-2 gap-2">
          <input {...register("sku")} placeholder="SKU"
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
          <input {...register("designNumber")} placeholder="Design #"
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        </div>
        <input {...register("colorCategory")} placeholder="Color / Category"
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        <div className="flex gap-2">
          <button type="submit" disabled={saving}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
            {uploading ? <><Loader2 size={13} className="animate-spin" /> Uploading…</> : saving ? "Saving…" : <><Check size={13} /> Save</>}
          </button>
          <button type="button" onClick={() => { setEditing(false); setImageFile(null); setImagePreview(null); reset(); }}
            className="px-3 py-2 rounded-xl text-sm text-slate-500 hover:bg-white transition-colors">Cancel</button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors group">
      {p.imageUrl ? (
        <img src={p.imageUrl} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" alt="" />
      ) : (
        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <Package size={12} className="text-slate-400" />
        </div>
      )}
      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
        <span className="text-xs font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{p.sku}</span>
        {p.designNumber && <span className="text-xs text-slate-500">D{p.designNumber}</span>}
        {p.colorCategory && <span className="text-xs text-slate-600">{p.colorCategory}</span>}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {canEdit && (
          <button onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
            <Pencil size={10} /> Edit
          </button>
        )}
        {canDelete && (
          <button onClick={handleDelete} disabled={deleting}
            className={"flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors " +
              (confirmDel ? "bg-red-600 text-white" : "bg-red-50 text-red-500 hover:bg-red-100")}>
            <Trash2 size={10} />
            {confirmDel ? "Sure?" : "Del"}
          </button>
        )}
      </div>
    </div>
  );
}

// Group card
function ProductGroup({ name, products, canEdit, canDelete, onUpdated, onDeleted }: {
  name: string; products: any[]; canEdit: boolean; canDelete: boolean; onUpdated: () => void; onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const hasImage = products.find(p => p.imageUrl);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors">
        {hasImage ? (
          <img src={hasImage.imageUrl} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" alt="" />
        ) : (
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Package size={16} className="text-slate-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 text-sm">{name}</p>
          <p className="text-xs text-slate-400 mt-0.5">{products.length} variant{products.length !== 1 ? "s" : ""}</p>
        </div>
        {open ? <ChevronUp size={16} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="border-t border-slate-100">
          {products.map(p => (
            <ProductRow key={p.id} p={p} canEdit={canEdit} canDelete={canDelete} onUpdated={onUpdated} onDeleted={onDeleted} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  const [products, setProducts]         = useState<any[]>([]);
  const [showForm, setShowForm]         = useState(false);
  const [loading, setLoading]           = useState(true);
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState("");
  const [search, setSearch]             = useState("");
  const [imageFile, setImageFile]       = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading]       = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { canEdit, canDelete } = useAppSession();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function fetchProducts() {
    const res = await fetch("/api/products");
    const data = await res.json();
    setProducts(Array.isArray(data) ? data : []);
    setLoading(false);
  }
  useEffect(() => { fetchProducts(); }, []);

  async function onSubmit(data: FormData) {
    setSubmitting(true); setError("");
    try {
      let imageUrl: string | undefined;
      if (imageFile) { setUploading(true); imageUrl = await uploadImage(imageFile); setUploading(false); }
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, imageUrl }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      reset(); setImageFile(null); setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setShowForm(false); fetchProducts();
    } catch (e: any) { setError(e.message); }
    finally { setSubmitting(false); setUploading(false); }
  }

  // Filter by search
  const q = search.toLowerCase();
  const filtered = products.filter(p =>
    !q ||
    p.name.toLowerCase().includes(q) ||
    p.sku.toLowerCase().includes(q) ||
    (p.colorCategory ?? "").toLowerCase().includes(q) ||
    (p.designNumber ?? "").toLowerCase().includes(q)
  );

  // Group by name
  const groups = new Map<string, any[]>();
  for (const p of filtered) {
    const key = p.name.toLowerCase().trim();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }
  const groupEntries = Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Products / SKUs</h1>
        {canEdit && (
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? "Cancel" : "New Product"}
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, SKU, color, design…"
          className="w-full bg-white border border-slate-200 rounded-2xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        )}
      </div>

      {/* New product form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-700 mb-4">Create Product</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Product Photo</label>
              {imagePreview ? (
                <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200">
                  <img src={imagePreview} className="w-full h-full object-cover" alt="" />
                  <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow text-slate-500 hover:text-red-500">
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 border-2 border-dashed border-slate-200 rounded-xl px-4 py-3 w-full text-sm text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-colors">
                  <ImagePlus size={15} /> Add photo
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); } }} className="hidden" />
            </div>
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
                <label className="block text-xs font-medium text-slate-600 mb-1">Design #</label>
                <input {...register("designNumber")} placeholder="e.g. 01"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Color / Category</label>
                <input {...register("colorCategory")} placeholder="e.g. Black to Gold"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={submitting}
              className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
              {uploading ? <><Loader2 size={15} className="animate-spin" /> Uploading…</> : submitting ? "Creating…" : "Create Product"}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-slate-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Package size={36} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">{search ? `No products matching "${search}"` : "No products yet."}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-slate-400 px-1">{groupEntries.length} product{groupEntries.length !== 1 ? "s" : ""} · {filtered.length} variant{filtered.length !== 1 ? "s" : ""}</p>
          {groupEntries.map(([key, prods]) => {
            const displayName = prods[0].name;
            if (prods.length === 1) {
              return (
                <div key={key} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-50">
                    {prods[0].imageUrl ? (
                      <img src={prods[0].imageUrl} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" alt="" />
                    ) : (
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Package size={16} className="text-slate-400" />
                      </div>
                    )}
                    <p className="font-semibold text-slate-800 text-sm">{displayName}</p>
                  </div>
                  <ProductRow p={prods[0]} canEdit={canEdit} canDelete={canDelete} onUpdated={fetchProducts} onDeleted={fetchProducts} />
                </div>
              );
            }
            return (
              <ProductGroup key={key} name={displayName} products={prods}
                canEdit={canEdit} canDelete={canDelete} onUpdated={fetchProducts} onDeleted={fetchProducts} />
            );
          })}
        </div>
      )}
    </div>
  );
}
