import { useStudyData } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
import { BottomSheet } from "@/components/shared/BottomSheet";
import { Moon, Sun, Download, Upload, Trash2 } from "lucide-react";
import { useState, useRef } from "react";
import { api } from "@/lib/api";

export function Settings() {
  const { settings, updateSettings, resetData, importData } = useStudyData();
  const [isResetOpen, setIsResetOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleTheme = () => {
    updateSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' });
  };

  const handleExport = async () => {
    try {
      const data = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `studyhub-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Export failed. Please try again.');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        importData(data);
        alert("Data imported successfully!");
      } catch {
        alert("Invalid file format. Please upload a valid StudyHub backup JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleReset = () => {
    resetData();
    setIsResetOpen(false);
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

        {/* Data Management */}
        <GlassCard className="p-6">
          <h2 className="text-xl font-semibold mb-6">Data Management</h2>
          <p className="text-sm text-muted-foreground mb-6">
            All your data is stored on the server. Export regularly to keep a local backup.
          </p>

          <div className="space-y-4">
            <button
              onClick={handleExport}
              className="w-full flex items-center justify-between p-4 bg-secondary/50 hover:bg-secondary rounded-2xl transition-colors font-medium"
              data-testid="btn-export-data"
            >
              <span className="flex items-center gap-3">
                <Download className="w-5 h-5 text-primary" /> Export Data Backup
              </span>
            </button>

            <button
              onClick={handleImportClick}
              className="w-full flex items-center justify-between p-4 bg-secondary/50 hover:bg-secondary rounded-2xl transition-colors font-medium"
              data-testid="btn-import-data"
            >
              <span className="flex items-center gap-3">
                <Upload className="w-5 h-5 text-primary" /> Import Data Backup
              </span>
              <input
                type="file"
                accept=".json"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
            </button>

            <button
              onClick={() => setIsResetOpen(true)}
              className="w-full flex items-center justify-between p-4 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-2xl transition-colors font-bold mt-8"
              data-testid="btn-reset-data"
            >
              <span className="flex items-center gap-3">
                <Trash2 className="w-5 h-5" /> Erase All Data
              </span>
            </button>
          </div>
        </GlassCard>
      </div>

      <BottomSheet
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        title="Reset App Data"
        className="bg-destructive/5 text-foreground border-destructive/20"
      >
        <div className="space-y-6 pb-6">
          <div className="bg-destructive/10 p-6 rounded-2xl text-destructive text-center">
            <Trash2 className="w-12 h-12 mx-auto mb-4 opacity-80" />
            <p className="font-bold text-lg mb-2">Are you absolutely sure?</p>
            <p className="text-sm opacity-90">
              This action cannot be undone. All your subjects, schedule, grades, and tasks will be
              permanently deleted from the server.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setIsResetOpen(false)}
              className="py-4 rounded-xl font-semibold bg-secondary text-secondary-foreground hover:opacity-80 transition-opacity"
            >
              Cancel
            </button>
            <button
              onClick={handleReset}
              className="py-4 rounded-xl font-bold bg-destructive text-destructive-foreground shadow-lg shadow-destructive/30 hover:opacity-90 transition-opacity"
            >
              Yes, Erase Everything
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
