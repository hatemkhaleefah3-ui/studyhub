import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter, useSearch } from 'wouter';
import { StudyDataProvider, useStudyData } from '@/hooks/useStudyData';
import { AppShell } from '@/components/layout/AppShell';
import { AttachmentFormatNormalizer } from '@/components/shared/AttachmentFormatNormalizer';
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
function SubjectStudyHubRoute() { const search = useSearch(); return <SubjectStudyHub key={search} />; }
function ExamTakeRoute() { const { isLoaded } = useStudyData(); return isLoaded ? <ExamTake /> : <div className="p-8 text-center text-muted-foreground">Loading exam…</div>; }
function FlashcardsReaderRoute() { const { isLoaded } = useStudyData(); return isLoaded ? <FlashcardsReader /> : <div className="p-8 text-center text-muted-foreground">Loading flashcards…</div>; }
function Router() { return <Switch>
  <Route path="/" component={Dashboard} /><Route path="/subjects" component={Subjects} />
  <Route path="/subjects/:id/progress" component={SubjectStudyHubRoute} /><Route path="/subjects/:id/lectures" component={SubjectStudyHubRoute} /><Route path="/subjects/:id/attachments" component={SubjectStudyHubRoute} /><Route path="/subjects/:id" component={SubjectStudyHubRoute} />
  <Route path="/subjects/:subjectId/lectures/:lectureId" component={LectureEdit} /><Route path="/subjects/:subjectId/lectures/:lectureId/flashcards" component={FlashcardsMaker} /><Route path="/subjects/:subjectId/lectures/:lectureId/study" component={FlashcardsReaderRoute} />
  <Route path="/subjects/:subjectId/exams/:examId/questions" component={FinalExamQuestions} /><Route path="/subjects/:subjectId/exams/:examId/edit" component={ExamEdit} /><Route path="/subjects/:subjectId/exams/:examId/take" component={ExamTakeRoute} />
  <Route path="/schedule" component={Schedule} /><Route path="/checklist" component={Checklist} /><Route path="/checklist/:id" component={TaskListDetail} /><Route path="/progress" component={Progress} /><Route path="/settings" component={Settings} /><Route path="/archive" component={Archive} /><Route component={NotFound} />
</Switch>; }
function App() { return <QueryClientProvider client={queryClient}><TooltipProvider><StudyDataProvider><AttachmentFormatNormalizer /><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><AppShell><Router /></AppShell></WouterRouter></StudyDataProvider><Toaster /></TooltipProvider></QueryClientProvider>; }
export default App;
