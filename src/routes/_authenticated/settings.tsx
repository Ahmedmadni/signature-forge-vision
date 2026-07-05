import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { User, Palette, ShieldCheck, Bell, Save } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "الإعدادات — ساين فورج" }] }),
  component: Settings,
});

function Section({ icon: Icon, title, desc, children }: { icon: typeof User; title: string; desc: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
      <div className="mb-5 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
        <div>
          <h3 className="font-display font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      {children}
    </motion.div>
  );
}

function Settings() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name, company").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) { setName(data.display_name ?? ""); setCompany(data.company ?? ""); }
    });
  }, [user]);

  const save = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ display_name: name, company }).eq("id", user.id);
    if (error) toast.error(error.message); else toast.success("تم تحديث الملف الشخصي");
  };

  return (
    <>
      <PageHeader title="الإعدادات" subtitle="أدر ملفك الشخصي والمظهر وتفضيلات الأمان." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section icon={User} title="الملف الشخصي" desc="بياناتك الشخصية">
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>الاسم الكامل</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="أليكس ريفيرا" /></div>
            <div className="space-y-1.5"><Label>البريد الإلكتروني</Label><Input value={user?.email ?? ""} disabled /></div>
            <div className="space-y-1.5"><Label>الشركة</Label><Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="شركة أكمي" /></div>
            <Button onClick={save} className="bg-gradient-brand text-primary-foreground shadow-glow"><Save className="h-4 w-4" /> حفظ التغييرات</Button>
          </div>
        </Section>

        <Section icon={Palette} title="المظهر" desc="خصّص الواجهة">
          <div className="flex items-center justify-between rounded-xl border border-border p-4">
            <div><p className="text-sm font-medium">الوضع الداكن</p><p className="text-xs text-muted-foreground">التبديل بين السمة الفاتحة والداكنة</p></div>
            <Switch checked={theme === "dark"} onCheckedChange={(v) => setTheme(v ? "dark" : "light")} />
          </div>
        </Section>

        <Section icon={ShieldCheck} title="الأمان" desc="احمِ حسابك">
          <div className="space-y-3">
            {["المصادقة الثنائية", "طلب التحقق من الموقّع", "انتهاء الجلسة بعد الخمول"].map((s) => (
              <div key={s} className="flex items-center justify-between rounded-xl border border-border p-4">
                <p className="text-sm font-medium">{s}</p><Switch defaultChecked />
              </div>
            ))}
          </div>
        </Section>

        <Section icon={Bell} title="الإشعارات" desc="كيف تصلك التحديثات">
          <div className="space-y-3">
            {["بريد عند توقيع مستند", "تذكيرات للتوقيعات المعلّقة", "ملخّص تحليلات أسبوعي"].map((s, i) => (
              <div key={s} className="flex items-center justify-between rounded-xl border border-border p-4">
                <p className="text-sm font-medium">{s}</p><Switch defaultChecked={i !== 2} />
              </div>
            ))}
          </div>
        </Section>
      </div>
    </>
  );
}
