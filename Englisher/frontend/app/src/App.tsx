import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { RequireRole } from './components/RequireRole';
import { Home } from './features/learner/Home';
import { SignIn } from './features/learner/SignIn';
import { SignUp } from './features/learner/SignUp';
import { PlacementTest } from './features/learner/PlacementTest';
import { OnboardingGoal } from './features/onboarding/Goal';
import { OnboardingLanguage } from './features/onboarding/Language';
import { OnboardingStreak } from './features/onboarding/Streak';
import { OnboardingWalkthrough } from './features/onboarding/Walkthrough';
import { Roadmap } from './features/learner/Roadmap';
import { StageLessons } from './features/learner/StageLessons';
import { LessonPage } from './features/learner/Lesson';
import { ExercisePage } from './features/learner/Exercise';
import { GuidedEssay } from './features/learner/GuidedEssay';
import { SoloEssay } from './features/learner/SoloEssay';
import { FormalLetter } from './features/learner/FormalLetter';
import { ProgressPage } from './features/learner/Progress';
import { Profile } from './features/learner/Profile';
import { ParentAccess } from './features/parent/ParentAccess';
import { ParentDashboard } from './features/parent/ParentDashboard';
import { CourseDashboard } from './features/admin/CourseDashboard';
import { CourseEditor } from './features/admin/CourseEditor';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/placement" element={<PlacementTest />} />

        {/* Goal → Language → Streak → Walkthrough → Placement Test, matching
            the progress dots in the Onboarding *.dc.html prototype pages. */}
        <Route path="/onboarding" element={<Navigate to="/onboarding/goal" replace />} />
        <Route path="/onboarding/goal" element={<OnboardingGoal />} />
        <Route path="/onboarding/language" element={<OnboardingLanguage />} />
        <Route path="/onboarding/streak" element={<OnboardingStreak />} />
        <Route path="/onboarding/walkthrough" element={<OnboardingWalkthrough />} />

        {/* Student — the course page */}
        <Route path="/learn" element={<RequireRole role="student"><Roadmap /></RequireRole>} />
        <Route path="/learn/:stageId" element={<RequireRole role="student"><StageLessons /></RequireRole>} />
        <Route path="/learn/:stageId/:lessonId" element={<RequireRole role="student"><LessonPage /></RequireRole>} />
        <Route path="/learn/:stageId/:lessonId/practice" element={<RequireRole role="student"><ExercisePage /></RequireRole>} />

        <Route path="/write/guided" element={<RequireRole role="student"><GuidedEssay /></RequireRole>} />
        <Route path="/write/solo" element={<RequireRole role="student"><SoloEssay /></RequireRole>} />
        <Route path="/write/letter" element={<RequireRole role="student"><FormalLetter /></RequireRole>} />

        <Route path="/progress" element={<RequireRole role="student"><ProgressPage /></RequireRole>} />
        <Route path="/profile" element={<RequireRole role="student"><Profile /></RequireRole>} />

        {/* The child (student) manages the invite; the parent account views the
            result — see the note in useAuth.tsx. */}
        <Route path="/parent/access" element={<RequireRole role="student"><ParentAccess /></RequireRole>} />
        <Route path="/parent" element={<RequireRole role="parent"><ParentDashboard /></RequireRole>} />

        {/* Admin — the admin dashboard */}
        <Route path="/admin" element={<RequireRole role="admin"><CourseDashboard /></RequireRole>} />
        <Route path="/admin/editor" element={<RequireRole role="admin"><CourseEditor /></RequireRole>} />

        <Route path="*" element={<Home />} />
      </Routes>
    </AuthProvider>
  );
}
