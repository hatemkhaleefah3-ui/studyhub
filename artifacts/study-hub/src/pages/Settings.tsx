import { useStudyData } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
import { ArrowLeft, Moon, Sun } from "lucide-react";
import { Link } from "wouter";

export function Settings() {
  const { settings, updateSettings } = useStudyData();

  const toggleTheme = () => {
    const theme = settings.theme === "light" ? "dark" : "light";
    localStorage.setItem("studyhub:theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
    updateSettings({ theme });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-20">
      <header className="flex items-start gap-4">
        <Link
          href="/"
          aria-label="Back to Dashboard"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border/50 bg-secondary/60 transition-colors hover:bg-secondary"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Settings</h1>
          <p className="mt-2 text-lg text-muted-foreground">Customize your experience</p>
        </div>
      </header>

      <GlassCard className="p-6">
        <h2 className="mb-6 text-xl font-semibold">Appearance</h2>
        <div className="flex items-center justify-between gap-4 py-4">
          <div className="min-w-0">
            <p className="text-lg font-medium">Dark Mode</p>
            <p className="text-sm text-muted-foreground">Switch to a true dark gray theme.</p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className={`h-10 w-16 shrink-0 rounded-full p-1 transition-colors duration-300 ${settings.theme === "dark" ? "bg-primary" : "bg-secondary"}`}
            data-testid="toggle-dark-mode"
          >
            <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-background shadow-sm transition-transform duration-300 ${settings.theme === "dark" ? "translate-x-6" : "translate-x-0"}`}>
              {settings.theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </div>
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
