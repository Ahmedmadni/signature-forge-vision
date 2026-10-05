import { Link } from "@tanstack/react-router";

export function DeveloperFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`border-t border-border/60 px-4 py-5 text-center ${className}`}>
      <p className="text-xs leading-relaxed text-muted-foreground">
        تطوير{" "}
        <a
          href="https://ahmedelmadni.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary hover:underline"
        >
          المهندس أحمد المدني
        </a>
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground/80">
        جميع الحقوق محفوظة © {new Date().getFullYear()} · وقِّع
      </p>
      <div className="mt-2 flex justify-center gap-3 text-[11px] text-muted-foreground/80">
        <Link to="/privacy" className="hover:text-foreground">سياسة الخصوصية</Link>
        <span>·</span>
        <Link to="/terms" className="hover:text-foreground">شروط الاستخدام</Link>
        <span>·</span>
        <Link to="/delete-account" className="hover:text-foreground">حذف الحساب</Link>
      </div>
    </footer>
  );
}
