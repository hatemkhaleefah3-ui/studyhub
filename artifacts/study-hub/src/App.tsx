import { ReactNode, useEffect, useLayoutEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter, useLocation, useSearch } from 'wouter';
import { StudyDataProvider, useStudyData } from '@/hooks/useStudyData';
import { AppShell } from '@/components/layout/AppShell';
import { AttachmentFormatNormalizer } from '@/components/shared/AttachmentFormatNormalizer';
import { FinalExamImportSheet } from '@/components/shared/FinalExamImportSheet';
import { Dashboard } from '@/pages/Dashboard';
import { Subjects } from '@/pages/Subjects';
import { SubjectStudyHub } from '@/pages/SubjectStudyHub';
import { LectureEdit } from '@/pages/LectureEdit';
import { ExamEdit } from '@/pages/ExamEdit';
import { ExamTake } from '@/pages/ExamTake';
import { FinalExamQuestions } from '@/pages/FinalExamQuestions';
import { FlashcardsMaker } from '@/pages/FlashcardsMaker';
import { FlashcardsReader } from '@/pages/FlashcardsReader';
import { Schedule } from '@/pages/Schedule';
import { Checklist } from '@/pages/Checklist';
import { TaskListDetail } from '@/pages/TaskListDetail';
import { Progress } from '@/pages/Progress';
import { Settings } from '@/pages/Settings';
import { Archive } from '@/pages/Archive';

const queryClient = new QueryClient();

function ThemePersistence() {
  const { settings, isLoaded } = useStudyData();
  useLayoutEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem('studyhub:theme', settings.theme);
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
    document.documentElement.style.colorScheme = settings.theme;
    document.documentElement.style.backgroundColor = settings.theme === 'dark'
      ? 'hsl(240 5% 8%)'
      : 'hsl(240 10% 96%)';
  }, [isLoaded, settings.theme]);
  return null;
}

function AppReady({ children }: { children: ReactNode }) {
  const { isLoaded } = useStudyData();
  return isLoaded ? <>{children}</> : null;
}

/**
 * Quick-added exams share the schedule-plan data model so they can appear in
 * Calendar, Next Exam, and Exams. They must not also appear as generic schedule
 * cards. The Schedule page renders plans in source order, so rows can be hidden
 * by the corresponding source tag without changing its established internals.
 */
function QuickExamScheduleVisibility() {
  const { schedulePlans } = useStudyData();
  const [location] = useLocation();

  useLayoutEffect(() => {
    if (location !== '/schedule') return;

    const apply = () => {
      const schedulesSection = Array.from(document.querySelectorAll<HTMLElement>('section')).find((section) =>
        Array.from(section.querySelectorAll('h2')).some((heading) => heading.textContent?.trim() === 'Schedules')
      );
      if (!schedulesSection) return;

      const list = schedulesSection.querySelector<HTMLElement>(':scope > div.space-y-3');
      if (!list) return;

      const rows = Array.from(list.children) as HTMLElement[];
      rows.forEach((row, index) => {
        row.hidden = schedulePlans[index]?.source === 'quickExam';
      });

      schedulesSection.hidden = !schedulePlans.some((plan) => plan.source !== 'quickExam');
    };

    apply();
    const frame = requestAnimationFrame(apply);
    return () => cancelAnimationFrame(frame);
  }, [location, schedulePlans]);

  return null;
}

function ExamBrowserGuard() {
  const [location] = useLocation();
  const active = /\/subjects\/[^/]+\/(?:exams\/[^/]+\/take|lectures\/[^/]+\/study)$/.test(location);
  useEffect(() => {
    if (!active) return;
    const requestFullscreen = () => {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => undefined);
    };
    const preventUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    const preventShortcuts = (event: KeyboardEvent) => {
      const browserNavigation = (event.metaKey || event.ctrlKey) && ['l', 't', 'n', 'w', 'r'].includes(event.key.toLowerCase());
      if (browserNavigation || event.key === 'F11') event.preventDefault();
    };
    document.addEventListener('pointerdown', requestFullscreen, { once: true, capture: true });
    window.addEventListener('beforeunload', preventUnload);
    window.addEventListener('keydown', preventShortcuts, true);
    return () => {
      document.removeEventListener('pointerdown', requestFullscreen, true);
      window.removeEventListener('beforeunload', preventUnload);
      window.removeEventListener('keydown', preventShortcuts, true);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined);
    };
  }, [active]);
  return null;
}

function SubjectStudyHubRoute() { const search = useSearch(); return <SubjectStudyHub key={search} />; }
function ExamTakeRoute() { const { isLoaded } = useStudyData(); return isLoaded ? <ExamTake /> : <div className="p-8 text-center text-muted-foreground">Loading exam…</div>; }
function FlashcardsReaderRoute() { const { isLoaded } = useStudyData(); return isLoaded ? <FlashcardsReader /> : <div className="p-8 text-center text-muted-foreground">Loading flashcards…</div>; }
function Router() { return <><ExamBrowserGuard /><QuickExamScheduleVisibility /><FinalExamImportSheet /><Switch>
  <Route path="/" component={Dashboard} /><Route path="/subjects" component={Subjects} />
  <Route path="/subjects/:id/progress" component={SubjectStudyHubRoute} /><Route path="/subjects/:id/lectures" component={SubjectStudyHubRoute} /><Route path="/subjects/:id/attachments" component={SubjectStudyHubRoute} /><Route path="/subjects/:id" component={SubjectStudyHubRoute} />
  <Route path="/subjects/:subjectId/lectures/:lectureId" component={LectureEdit} /><Route path="/subjects/:subjectId/lectures/:lectureId/flashcards" component={FlashcardsMaker} /><Route path="/subjects/:subjectId/lectures/:lectureId/study" component={FlashcardsReaderRoute} />
  <Route path="/subjects/:subjectId/exams/:examId/questions" component={FinalExamQuestions} /><Route path="/subjects/:subjectId/exams/:examId/edit" component={ExamEdit} /><Route path="/subjects/:subjectId/exams/:examId/take" component={ExamTakeRoute} />
  <Route path="/schedule" component={Schedule} /><Route path="/checklist" component={Checklist} /><Route path="/checklist/:id" component={TaskListDetail} /><Route path="/progress" component={Progress} /><Route path="/settings" component={Settings} /><Route path="/archive" component={Archive} /><Route component={NotFound} />
</Switch></>; }
function App() { return <QueryClientProvider client={queryClient}><TooltipProvider><StudyDataProvider><ThemePersistence /><AttachmentFormatNormalizer /><AppReady><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><AppShell><Router /></AppShell></WouterRouter></AppReady></StudyDataProvider><Toaster /></TooltipProvider></QueryClientProvider>; }
export default App;
