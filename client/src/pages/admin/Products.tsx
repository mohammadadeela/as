import { useState, useRef } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from "@/hooks/use-products";
import { useCategories } from "@/hooks/use-categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit2, Trash2, Upload, X, ImageIcon, Palette, Search } from "lucide-react";
import { type InsertProduct, type Product, type ColorVariant } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n";

interface VariantState {
  name: string;
  colorCode: string;
  mainImage: string;
  images: string[];
  sizeRows: { size: string; qty: number }[];
  newSizeName: string;
}

export default function Products() {
  const { data: products, isLoading } = useProducts();
  const { data: categories } = useCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");

  const initialForm: any = {
    name: "", description: "", price: "", discountPrice: "",
    categoryId: 1, isFeatured: false, isNewArrival: false, isBestSeller: false, brand: "",
  };
  const [formData, setFormData] = useState(initialForm);
  const [variants, setVariants] = useState<VariantState[]>([]);

  const filteredProducts = products?.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase().replace(/^#/, "");
    const productNum = String(p.id).padStart(4, "0");
    return (
      p.name.toLowerCase().includes(q) ||
      (p.brand || "").toLowerCase().includes(q) ||
      (p.colors || []).some(c => c.toLowerCase().includes(q)) ||
      productNum.includes(q) ||
      String(p.id).includes(q)
    );
  });

  const uploadFiles = async (files: FileList | File[]): Promise<string[]> => {
    const fd = new FormData();
    Array.from(files).forEach(file => fd.append("images", file));
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Upload failed");
    }
    const data = await res.json();
    return data.urls as string[];
  };

  const openCreate = () => {
    setFormData(initialForm);
    setVariants([]);
    setEditingId(null);
    setIsDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setFormData({
      name: p.name, description: p.description, price: p.price,
      discountPrice: p.discountPrice || "",
      categoryId: p.categoryId, isFeatured: p.isFeatured, isNewArrival: p.isNewArrival,
      isBestSeller: (p as any).isBestSeller || false, brand: p.brand || "",
    });

    const cv = (p as any).colorVariants as ColorVariant[] | undefined;
    if (cv && cv.length > 0) {
      setVariants(cv.map(v => ({
        name: v.name,
        colorCode: v.colorCode || "#000000",
        mainImage: v.mainImage,
        images: v.images || [],
        sizeRows: Object.entries(v.sizeInventory || {}).map(([size, qty]) => ({ size, qty: qty as number })),
        newSizeName: "",
      })));
    } else {
      const inv = (p as any).sizeInventory || {};
      const rows = Object.entries(inv).map(([size, qty]) => ({ size, qty: qty as number }));
      if (rows.length === 0 && p.sizes && p.sizes.length > 0) {
        const perSize = p.sizes.length > 0 ? Math.floor(p.stockQuantity / p.sizes.length) : 0;
        p.sizes.forEach(s => rows.push({ size: s, qty: perSize }));
      }
      const colors = p.colors || [];
      if (colors.length > 0) {
        setVariants(colors.map((c, i) => ({
          name: c,
          colorCode: "#000000",
          mainImage: i === 0 ? p.mainImage : "",
          images: i === 0 ? (p.images || []) : [],
          sizeRows: [...rows],
          newSizeName: "",
        })));
      } else {
        setVariants([{
          name: "Default",
          colorCode: "#000000",
          mainImage: p.mainImage,
          images: p.images || [],
          sizeRows: rows,
          newSizeName: "",
        }]);
      }
    }

    setEditingId(p.id);
    setIsDialogOpen(true);
  };

  const addVariant = () => {
    setVariants(prev => [...prev, {
      name: "", colorCode: "#000000", mainImage: "", images: [],
      sizeRows: [], newSizeName: "",
    }]);
  };

  const removeVariant = (idx: number) => {
    setVariants(prev => prev.filter((_, i) => i !== idx));
  };

  const updateVariant = (idx: number, updates: Partial<VariantState>) => {
    setVariants(prev => prev.map((v, i) => i === idx ? { ...v, ...updates } : v));
  };

  const handleVariantMainImage = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const urls = await uploadFiles(files);
      if (urls.length > 0) {
        updateVariant(idx, { mainImage: urls[0] });
      }
    } catch (err: any) {
      toast({ title: t.auth.error, description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleVariantExtraImages = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const urls = await uploadFiles(files);
      updateVariant(idx, { images: [...variants[idx].images, ...urls] });
    } catch (err: any) {
      toast({ title: t.auth.error, description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeVariantExtraImage = (variantIdx: number, imgIdx: number) => {
    const v = variants[variantIdx];
    updateVariant(variantIdx, { images: v.images.filter((_, i) => i !== imgIdx) });
  };

  const addSizeToVariant = (idx: number) => {
    const v = variants[idx];
    const name = v.newSizeName.trim().toUpperCase();
    if (!name) return;
    if (v.sizeRows.some(r => r.size === name)) {
      toast({ title: t.auth.error, description: `${name} already exists`, variant: "destructive" });
      return;
    }
    updateVariant(idx, {
      sizeRows: [...v.sizeRows, { size: name, qty: 0 }],
      newSizeName: "",
    });
  };

  const updateSizeQtyInVariant = (variantIdx: number, sizeIdx: number, qty: number) => {
    const v = variants[variantIdx];
    updateVariant(variantIdx, {
      sizeRows: v.sizeRows.map((r, i) => i === sizeIdx ? { ...r, qty: Math.max(0, qty) } : r),
    });
  };

  const removeSizeFromVariant = (variantIdx: number, sizeIdx: number) => {
    const v = variants[variantIdx];
    updateVariant(variantIdx, { sizeRows: v.sizeRows.filter((_, i) => i !== sizeIdx) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (variants.length === 0) {
      toast({ title: t.auth.error, description: t.admin.noVariantsNote, variant: "destructive" });
      return;
    }
    const usedNames = new Set<string>();
    for (const v of variants) {
      if (!v.name.trim()) {
        toast({ title: t.auth.error, description: "Color name required", variant: "destructive" });
        return;
      }
      const lowerName = v.name.trim().toLowerCase();
      if (usedNames.has(lowerName)) {
        toast({ title: t.auth.error, description: `Duplicate color: ${v.name}`, variant: "destructive" });
        return;
      }
      usedNames.add(lowerName);
      if (!v.mainImage) {
        toast({ title: t.auth.error, description: `${v.name}: ${t.admin.variantMainImage} required`, variant: "destructive" });
        return;
      }
    }

    try {
      const colorVariantsData: ColorVariant[] = variants.map(v => {
        const sizeInventory: Record<string, number> = {};
        v.sizeRows.forEach(r => { sizeInventory[r.size] = r.qty; });
        return {
          name: v.name.trim(),
          colorCode: v.colorCode,
          mainImage: v.mainImage,
          images: v.images,
          sizes: v.sizeRows.map(r => r.size),
          sizeInventory,
        };
      });

      const allSizes = [...new Set(colorVariantsData.flatMap(v => v.sizes))];
      const allColors = colorVariantsData.map(v => v.name);
      const totalStock = colorVariantsData.reduce((sum, v) =>
        sum + Object.values(v.sizeInventory).reduce((s, q) => s + q, 0), 0);
      const mergedSizeInventory: Record<string, number> = {};
      colorVariantsData.forEach(v => {
        Object.entries(v.sizeInventory).forEach(([size, qty]) => {
          mergedSizeInventory[size] = (mergedSizeInventory[size] || 0) + qty;
        });
      });

      const payload = {
        ...formData,
        categoryId: Number(formData.categoryId),
        mainImage: colorVariantsData[0].mainImage,
        images: colorVariantsData[0].images,
        sizes: allSizes,
        colors: allColors,
        sizeInventory: mergedSizeInventory,
        colorVariants: colorVariantsData,
        stockQuantity: totalStock,
        discountPrice: formData.discountPrice ? formData.discountPrice : null,
      };

      if (editingId) {
        await updateProduct.mutateAsync({ id: editingId, ...payload });
        toast({ title: t.admin.productUpdated });
      } else {
        await createProduct.mutateAsync(payload);
        toast({ title: t.admin.productCreated });
      }
      setIsDialogOpen(false);
    } catch (err: any) {
      toast({ title: t.auth.error, description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm(t.admin.confirmDelete)) {
      try {
        await deleteProduct.mutateAsync(id);
        toast({ title: t.admin.productDeleted });
      } catch (err: any) {
        toast({ title: t.auth.error, description: err.message, variant: "destructive" });
      }
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-foreground" data-testid="text-products-title">{t.admin.products}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t.admin.manageProducts}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t.admin.searchProducts}
              className="border border-border bg-background ps-9 pe-3 py-2 text-sm rounded-none outline-none focus:border-primary transition-colors w-full sm:w-56"
              data-testid="input-admin-search-products"
            />
          </div>
          <Button onClick={openCreate} className="bg-primary text-primary-foreground hover:bg-primary/90" data-testid="button-add-product">
            <Plus className="w-4 h-4 me-2" /> {t.admin.addProduct}
          </Button>
        </div>
      </div>

      <div className="hidden md:block bg-card border border-border overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow>
              <TableHead>{t.admin.image}</TableHead>
              <TableHead className="text-muted-foreground font-mono">#</TableHead>
              <TableHead>{t.admin.name}</TableHead>
              <TableHead>{t.admin.price}</TableHead>
              <TableHead>{t.admin.colors}</TableHead>
              <TableHead>{t.admin.stock}</TableHead>
              <TableHead>{t.admin.featuredNew}</TableHead>
              <TableHead className="text-end">{t.admin.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="py-8"><div className="flex justify-center"><div className="w-7 h-7 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" /></div></TableCell></TableRow>
            ) : filteredProducts?.map((p) => {
              const cv = (p as any).colorVariants as ColorVariant[] | undefined;
              return (
                <TableRow key={p.id} data-testid={`row-product-${p.id}`}>
                  <TableCell>
                    <img src={p.mainImage} alt={p.name} className="w-12 h-16 object-cover bg-secondary" />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap" data-testid={`text-product-num-${p.id}`}>
                    #{String(p.id).padStart(4, "0")}
                  </TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>₪{parseFloat(p.price.toString()).toFixed(2)}</TableCell>
                  <TableCell>
                    {cv && cv.length > 0 ? (
                      <div className="flex gap-1">
                        {cv.map((v, i) => (
                          <span
                            key={i}
                            className="w-5 h-5 rounded-full border border-border inline-block"
                            style={{ backgroundColor: v.colorCode }}
                            title={v.name}
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {cv && cv.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {cv.map((v, i) => {
                          const variantTotal = Object.values(v.sizeInventory).reduce((s, q) => s + q, 0);
                          return (
                            <span key={i} className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${variantTotal > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {v.name}:{variantTotal}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${p.stockQuantity > 5 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {p.stockQuantity}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {p.isFeatured && <span className="text-xs bg-purple-100 text-purple-800 px-2 rounded-full">F</span>}
                      {p.isNewArrival && <span className="text-xs bg-blue-100 text-blue-800 px-2 rounded-full">N</span>}
                      {(p as any).isBestSeller && <span className="text-xs bg-amber-100 text-amber-800 px-2 rounded-full">B</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-end">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)} className="text-blue-600 hover:text-blue-800 hover:bg-blue-50" data-testid={`button-edit-product-${p.id}`}><Edit2 className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="text-red-600 hover:text-red-800 hover:bg-red-50" data-testid={`button-delete-product-${p.id}`}><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden space-y-3">
        {isLoading ? (
          <div className="py-8 flex justify-center"><div className="w-7 h-7 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" /></div>
        ) : filteredProducts?.map((p) => {
          const cv = (p as any).colorVariants as ColorVariant[] | undefined;
          return (
            <div key={p.id} className="bg-card border border-border p-3 space-y-3" data-testid={`card-product-${p.id}`}>
              <div className="flex gap-3">
                <img src={p.mainImage} alt={p.name} className="w-16 h-20 object-cover bg-secondary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-[10px] text-muted-foreground">#{String(p.id).padStart(4, "0")}</span>
                  <p className="font-semibold text-sm truncate">{p.name}</p>
                  <p className="text-sm font-bold mt-1">
                    {p.discountPrice ? (
                      <>
                        <span className="text-destructive">₪{parseFloat(p.discountPrice.toString()).toFixed(2)}</span>
                        <span className="text-muted-foreground line-through text-xs ms-2">₪{parseFloat(p.price.toString()).toFixed(2)}</span>
                      </>
                    ) : (
                      <>₪{parseFloat(p.price.toString()).toFixed(2)}</>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {p.isFeatured && <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-full">F</span>}
                    {p.isNewArrival && <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">N</span>}
                    {(p as any).isBestSeller && <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">B</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {cv && cv.length > 0 ? cv.map((v, i) => {
                    const variantTotal = Object.values(v.sizeInventory).reduce((s, q) => s + q, 0);
                    return (
                      <span key={i} className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${variantTotal > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {v.name}:{variantTotal}
                      </span>
                    );
                  }) : (
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${p.stockQuantity > 5 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {t.admin.stock}: {p.stockQuantity}
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)} className="text-blue-600 h-8 w-8" data-testid={`button-edit-product-mobile-${p.id}`}><Edit2 className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="text-red-600 h-8 w-8" data-testid={`button-delete-product-mobile-${p.id}`}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-none w-[95vw] sm:w-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editingId ? t.admin.editProduct : t.admin.addNewProduct}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">{t.admin.productName} *</label>
                <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="rounded-none" data-testid="input-product-name" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">{t.admin.description} *</label>
                <Textarea required value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="rounded-none resize-none" rows={3} data-testid="textarea-description" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.admin.priceILS} *</label>
                <Input required type="number" step="0.01" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="rounded-none" data-testid="input-price" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.admin.discountPriceILS}</label>
                <Input type="number" step="0.01" value={formData.discountPrice} onChange={e => setFormData({ ...formData, discountPrice: e.target.value })} className="rounded-none" data-testid="input-discount-price" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.admin.category} *</label>
                <select
                  className="flex h-10 w-full rounded-none border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formData.categoryId}
                  onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                  data-testid="select-category"
                >
                  {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.admin.brand}</label>
                <Input value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })} className="rounded-none" data-testid="input-brand" />
              </div>
            </div>

            <div className="border-t border-border pt-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <Palette className="w-4 h-4" /> {t.admin.colorVariants}
                </h3>
                <Button type="button" variant="outline" onClick={addVariant} className="rounded-none" data-testid="button-add-variant">
                  <Plus className="w-4 h-4 me-1" /> {t.admin.addColorVariant}
                </Button>
              </div>

              {variants.length === 0 && (
                <p className="text-sm text-muted-foreground border border-dashed border-border p-4 text-center">{t.admin.noVariantsNote}</p>
              )}

              <div className="space-y-4">
                {variants.map((variant, vIdx) => (
                  <div key={vIdx} className="border border-border bg-card" data-testid={`card-variant-${vIdx}`}>
                    <div className="flex items-center justify-between bg-secondary/50 px-4 py-2 border-b border-border">
                      <div className="flex items-center gap-3">
                        <span
                          className="w-6 h-6 rounded-full border-2 border-border flex-shrink-0"
                          style={{ backgroundColor: variant.colorCode }}
                        />
                        <span className="text-sm font-semibold">{variant.name || `Color ${vIdx + 1}`}</span>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeVariant(vIdx)} className="text-destructive hover:text-destructive/80 h-7 text-xs" data-testid={`button-remove-variant-${vIdx}`}>
                        <Trash2 className="w-3 h-3 me-1" /> {t.admin.removeVariant}
                      </Button>
                    </div>

                    <div className="p-4 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-medium">{t.admin.colorName} *</label>
                          <Input
                            value={variant.name}
                            onChange={e => updateVariant(vIdx, { name: e.target.value })}
                            className="rounded-none h-9 text-sm"
                            placeholder={t.admin.colorPlaceholder}
                            data-testid={`input-variant-name-${vIdx}`}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium">{t.admin.colorCode}</label>
                          <div className="flex gap-2 items-center">
                            <input
                              type="color"
                              value={variant.colorCode}
                              onChange={e => updateVariant(vIdx, { colorCode: e.target.value })}
                              className="w-9 h-9 border border-border cursor-pointer rounded-none p-0"
                              data-testid={`input-variant-color-${vIdx}`}
                            />
                            <Input
                              value={variant.colorCode}
                              onChange={e => updateVariant(vIdx, { colorCode: e.target.value })}
                              className="rounded-none h-9 text-sm flex-1 font-mono"
                              data-testid={`input-variant-hex-${vIdx}`}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-medium">{t.admin.variantMainImage} *</label>
                          {variant.mainImage ? (
                            <div className="relative inline-block">
                              <img src={variant.mainImage} alt="" className="w-24 h-28 object-cover border border-border" />
                              <button
                                type="button"
                                onClick={() => updateVariant(vIdx, { mainImage: "" })}
                                className="absolute -top-2 -end-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border cursor-pointer hover:border-primary transition-colors bg-muted/30">
                              <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                              <span className="text-xs text-muted-foreground">{uploading ? t.admin.uploading : t.admin.dragOrClick}</span>
                              <input type="file" accept="image/*" className="hidden" onChange={e => handleVariantMainImage(vIdx, e)} disabled={uploading} data-testid={`input-variant-main-image-${vIdx}`} />
                            </label>
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium">{t.admin.variantExtraImages}</label>
                          {variant.images.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {variant.images.map((img, imgIdx) => (
                                <div key={imgIdx} className="relative">
                                  <img src={img} alt="" className="w-14 h-16 object-cover border border-border" />
                                  <button type="button" onClick={() => removeVariantExtraImage(vIdx, imgIdx)} className="absolute -top-1 -end-1 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center">
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          <label className="flex items-center justify-center w-full h-16 border-2 border-dashed border-border cursor-pointer hover:border-primary transition-colors bg-muted/30 gap-2">
                            <ImageIcon className="w-4 h-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{uploading ? t.admin.uploading : t.admin.uploadImages}</span>
                            <input type="file" accept="image/*" multiple className="hidden" onChange={e => handleVariantExtraImages(vIdx, e)} disabled={uploading} data-testid={`input-variant-extra-images-${vIdx}`} />
                          </label>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-medium">{t.admin.sizeInventory}</label>
                        {variant.sizeRows.length > 0 && (
                          <div className="border border-border rounded-none overflow-hidden">
                            <div className="grid grid-cols-[1fr_80px_32px] bg-secondary/50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider">
                              <span>{t.admin.sizeLabel}</span>
                              <span>{t.admin.qtyLabel}</span>
                              <span></span>
                            </div>
                            {variant.sizeRows.map((row, sIdx) => (
                              <div key={sIdx} className="grid grid-cols-[1fr_80px_32px] items-center px-3 py-1.5 border-t border-border">
                                <span className="font-medium text-sm">{row.size}</span>
                                <Input
                                  type="number" min="0" value={row.qty}
                                  onChange={e => updateSizeQtyInVariant(vIdx, sIdx, parseInt(e.target.value) || 0)}
                                  className="rounded-none h-7 w-16 text-center text-sm"
                                  data-testid={`input-variant-${vIdx}-qty-${row.size}`}
                                />
                                <button type="button" onClick={() => removeSizeFromVariant(vIdx, sIdx)} className="text-destructive hover:text-destructive/80">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                            <div className="px-3 py-1.5 border-t border-border bg-secondary/30 text-xs font-semibold flex justify-between">
                              <span>{t.admin.totalStock}</span>
                              <span>{variant.sizeRows.reduce((sum, r) => sum + r.qty, 0)}</span>
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Input
                            value={variant.newSizeName}
                            onChange={e => updateVariant(vIdx, { newSizeName: e.target.value })}
                            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSizeToVariant(vIdx); } }}
                            className="rounded-none flex-1 h-8 text-sm"
                            placeholder="XS, S, M, L, XL, 36, 37..."
                            data-testid={`input-variant-${vIdx}-new-size`}
                          />
                          <Button type="button" variant="outline" size="sm" onClick={() => addSizeToVariant(vIdx)} className="rounded-none h-8 text-xs" data-testid={`button-variant-${vIdx}-add-size`}>
                            <Plus className="w-3 h-3 me-1" /> {t.admin.addSize}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-6 py-2 border-t border-border pt-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={formData.isFeatured} onChange={e => setFormData({ ...formData, isFeatured: e.target.checked })} className="rounded border-gray-300 text-primary focus:ring-primary" data-testid="checkbox-featured" />
                <span>{t.admin.featuredProduct}</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={formData.isNewArrival} onChange={e => setFormData({ ...formData, isNewArrival: e.target.checked })} className="rounded border-gray-300 text-primary focus:ring-primary" data-testid="checkbox-new-arrival" />
                <span>{t.admin.newArrival}</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={formData.isBestSeller} onChange={e => setFormData({ ...formData, isBestSeller: e.target.checked })} className="rounded border-gray-300 text-primary focus:ring-primary" data-testid="checkbox-best-seller" />
                <span>{t.admin.bestSeller}</span>
              </label>
            </div>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-none" data-testid="button-cancel">{t.admin.cancel}</Button>
              <Button type="submit" className="rounded-none px-8" disabled={createProduct.isPending || updateProduct.isPending} data-testid="button-save">{t.admin.save}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
