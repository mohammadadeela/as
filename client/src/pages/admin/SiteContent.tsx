import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Save, Upload, Image, ChevronDown, ChevronUp } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { defaultSettings, getSetting } from "@/hooks/use-site-settings";

interface PageSection {
  id: string;
  labelAr: string;
  labelEn: string;
  hasTitle: boolean;
  hasTag: boolean;
  keys: string[];
}

const PAGE_SECTIONS: PageSection[] = [
  {
    id: "home",
    labelAr: "الصفحة الرئيسية",
    labelEn: "Home Page",
    hasTitle: true,
    hasTag: true,
    keys: [
      "home_hero_image",
      "home_hero_tag_ar",
      "home_hero_tag_en",
      "home_hero_title_ar",
      "home_hero_title_en",
      "home_hero_subtitle_ar",
      "home_hero_subtitle_en",
    ],
  },
  {
    id: "dresses",
    labelAr: "صفحة الفساتين",
    labelEn: "Dresses Page",
    hasTitle: false,
    hasTag: false,
    keys: ["dresses_hero_image", "dresses_hero_subtitle_ar", "dresses_hero_subtitle_en"],
  },
  {
    id: "clothes",
    labelAr: "صفحة الملابس",
    labelEn: "Clothes Page",
    hasTitle: false,
    hasTag: false,
    keys: ["clothes_hero_image", "clothes_hero_subtitle_ar", "clothes_hero_subtitle_en"],
  },
  {
    id: "shoes",
    labelAr: "صفحة الأحذية",
    labelEn: "Shoes Page",
    hasTitle: false,
    hasTag: false,
    keys: ["shoes_hero_image", "shoes_hero_subtitle_ar", "shoes_hero_subtitle_en"],
  },
  {
    id: "sales",
    labelAr: "صفحة التخفيضات",
    labelEn: "Sales Page",
    hasTitle: false,
    hasTag: false,
    keys: ["sales_hero_image", "sales_hero_subtitle_ar", "sales_hero_subtitle_en"],
  },
];

function ImageUploadField({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("images", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.urls?.[0]) onChange(data.urls[0]);
    } catch {
      toast({ title: "فشل رفع الصورة", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      {value && (
        <div className="relative w-full h-36 rounded overflow-hidden border border-border">
          <img src={value} alt="preview" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://... أو ارفع صورة"
          className="flex-1 text-sm"
          data-testid="input-hero-image-url"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="shrink-0"
          data-testid="button-upload-image"
        >
          {uploading ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
        </Button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    </div>
  );
}

function SectionCard({
  section,
  values,
  onChange,
}: {
  section: PageSection;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  const [open, setOpen] = useState(section.id === "home");
  const prefix = section.id;

  return (
    <div className="border border-border rounded-lg overflow-hidden" data-testid={`section-${section.id}`}>
      <button
        type="button"
        className="w-full flex items-center justify-between px-5 py-4 bg-muted/40 hover:bg-muted/70 transition-colors"
        onClick={() => setOpen(!open)}
        data-testid={`toggle-section-${section.id}`}
      >
        <div className="text-right">
          <p className="font-semibold text-sm">{section.labelAr}</p>
          <p className="text-xs text-muted-foreground">{section.labelEn}</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="p-5 space-y-5">
          <div>
            <Label className="mb-2 block text-sm font-medium">
              <Image className="inline w-4 h-4 ml-1" />
              صورة الخلفية
            </Label>
            <ImageUploadField
              value={values[`${prefix}_hero_image`] ?? ""}
              onChange={(url) => onChange(`${prefix}_hero_image`, url)}
            />
          </div>

          {section.hasTag && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">النص الصغير (عربي)</Label>
                <Input
                  value={values[`${prefix}_hero_tag_ar`] ?? ""}
                  onChange={(e) => onChange(`${prefix}_hero_tag_ar`, e.target.value)}
                  data-testid="input-hero-tag-ar"
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">Small Tag (English)</Label>
                <Input
                  value={values[`${prefix}_hero_tag_en`] ?? ""}
                  onChange={(e) => onChange(`${prefix}_hero_tag_en`, e.target.value)}
                  data-testid="input-hero-tag-en"
                />
              </div>
            </div>
          )}

          {section.hasTitle && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">العنوان الرئيسي (عربي)</Label>
                <Input
                  value={values[`${prefix}_hero_title_ar`] ?? ""}
                  onChange={(e) => onChange(`${prefix}_hero_title_ar`, e.target.value)}
                  data-testid="input-hero-title-ar"
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">Main Title (English)</Label>
                <Input
                  value={values[`${prefix}_hero_title_en`] ?? ""}
                  onChange={(e) => onChange(`${prefix}_hero_title_en`, e.target.value)}
                  data-testid="input-hero-title-en"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">النص التوضيحي (عربي)</Label>
              <Textarea
                value={values[`${prefix}_hero_subtitle_ar`] ?? ""}
                onChange={(e) => onChange(`${prefix}_hero_subtitle_ar`, e.target.value)}
                rows={2}
                data-testid="input-hero-subtitle-ar"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">Subtitle (English)</Label>
              <Textarea
                value={values[`${prefix}_hero_subtitle_en`] ?? ""}
                onChange={(e) => onChange(`${prefix}_hero_subtitle_en`, e.target.value)}
                rows={2}
                data-testid="input-hero-subtitle-en"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SiteContent() {
  const { toast } = useToast();
  const { data: saved, isLoading } = useQuery<Record<string, string>>({
    queryKey: ["/api/site-settings"],
  });

  const [local, setLocal] = useState<Record<string, string>>({});

  const merged: Record<string, string> = { ...defaultSettings, ...saved, ...local };

  const handleChange = (key: string, value: string) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/site-settings/bulk", local);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/site-settings"] });
      setLocal({});
      toast({ title: "تم الحفظ بنجاح" });
    },
    onError: () => {
      toast({ title: "فشل الحفظ", variant: "destructive" });
    },
  });

  const hasChanges = Object.keys(local).length > 0;

  return (
    <AdminLayout>
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">محتوى الصفحات</h1>
            <p className="text-muted-foreground text-sm mt-1">تخصيص صور وعناوين الأقسام البارزة في الموقع</p>
          </div>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!hasChanges || saveMutation.isPending}
            className="gap-2"
            data-testid="button-save-settings"
          >
            {saveMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            حفظ التغييرات
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {PAGE_SECTIONS.map((section) => (
              <SectionCard
                key={section.id}
                section={section}
                values={merged}
                onChange={handleChange}
              />
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
