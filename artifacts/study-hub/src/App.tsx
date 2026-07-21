import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';

import { StudyDataProvider } from '@/hooks/useStudyData';
import { AppShell } from '@/components/layout/AppShell';

import { Dashboard } from '@/pages/Dashboard';
import { Subjects } from '@/pages/Subjects';
import { SubjectStudyHub } from '@/pages/SubjectStudyHub';
import { LectureEdit } from '@/pages/LectureEdit';
import { ExamEdit } from '@/pages/ExamEdit';
import { ExamTake } from '@/pages/ExamTake';
import { FlashcardsMaker } from '@/pages/FlashcardsMaker';
import { FlashcardsReader } from '@/pages/FlashcardsReader';
import { Schedule } from '@/pages/Schedule';
import { Checklist } from '@/pages/Checklist';
import { TaskListDetail } from '@/pages/TaskListDetail';
import { Progress } from '@/pages/Progress';
import { Settings } from '@/pages/Settings';
import { Archive } from '@/pages/Archive';

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/subjects" component={Subjects} />
      <Route path="/subjects/:id" component={SubjectStudyHub} />
      <Route path="/subjects/:subjectId/lectures/:lectureId" component={LectureEdit} />
      <Route path="/subjects/:subjectId/lectures/:lectureId/flashcards" component={FlashcardsMaker} />
      <Route path="/subjects/:subjectId/lectures/:lectureId/study" component={FlashcardsReader} />
      <Route path="/subjects/:subjectId/exams/:examId/edit" component={ExamEdit} />
      <Route path="/subjects/:subjectId/exams/:examId/take" component={ExamTake} />
      <Route path="/schedule" component={Schedule} />
      <Route path="/checklist" component={Checklist} />
      <Route path="/checklist/:id" component={TaskListDetail} />
      <Route path="/progress" component={Progress} />
      <Route path="/settings" component={Settings} />
      <Route path="/archive" component={Archive} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <StudyDataProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <AppShell>
              <Router />
            </AppShell>
          </WouterRouter>
        </StudyDataProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
