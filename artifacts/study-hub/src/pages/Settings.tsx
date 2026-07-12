import { useStudyData } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
import { Moon, Sun } from "lucide-react";

export function Settings() {
  const { settings, updateSettings } = useStudyData();

  const toggleTheme = () => {
    updateSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' });
  };

  return (
    <div className="space-y-8 pb-20 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Settings</h1>
          <p className="text-muted-foreground text-lg">Customize your experience</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Appearance */}
        <GlassCard className="p-6">
          <h2 className="text-xl font-semibold mb-6">Appearance</h2>

          <div className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium text-lg">Dark Mode</p>
              <p className="text-sm text-muted-foreground">Switch to a true dark gray theme.</p>
            </div>
            <button
              onClick={toggleTheme}
              className={`w-16 h-10 rounded-full p-1 transition-colors duration-300 ${settings.theme === 'dark' ? 'bg-primary' : 'bg-secondary'}`}
              data-testid="toggle-dark-mode"
            >
              <div className={`w-8 h-8 rounded-full bg-background flex items-center justify-center transition-transform duration-300 shadow-sm ${settings.theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`}>
                {settings.theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </div>
            </button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
