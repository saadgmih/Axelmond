import fs from "fs";
import path from "path";

const root = path.resolve("C:/Users/saadg/Desktop/unicode");
const APP = path.join(root, "src/App.tsx");
const OUT_CURR = path.join(root, "src/views/teacher/TeacherCurriculumView.tsx");

let text = fs.readFileSync(APP, "utf8");
const beforeAppLines = text.split(/\r?\n/).length;

function findLine(lines, pred, label) {
  const i = lines.findIndex(pred);
  if (i < 0) throw new Error(`Line not found: ${label}`);
  return i;
}

function replaceRange(lines, start, endExclusive, insert) {
  return [...lines.slice(0, start), ...insert, ...lines.slice(endExclusive)];
}

// --- imports & router ---
if (!text.includes('useNavigate')) {
  text = text.replace(
    'import React, { useState, useEffect, useRef } from "react";',
    'import React, { useState, useEffect, useRef } from "react";\nimport { useNavigate, useLocation } from "react-router-dom";',
  );
}

text = text.replace(
  /import ContactView from "\.\/components\/ContactView";\r?\nimport SupportView from "\.\/components\/SupportView";\r?\nimport AboutView from "\.\/components\/AboutView";\r?\nimport PrivacyView from "\.\/components\/PrivacyView";\r?\nimport TermsView from "\.\/components\/TermsView";\r?\nimport CookiesView from "\.\/components\/CookiesView";\r?\nimport LegalView from "\.\/components\/LegalView";\r?\nimport ResearchView from "\.\/components\/ResearchView";\r?\nimport PublicationsView from "\.\/components\/PublicationsView";\r?\n/,
  `import InstitutionalViewSwitch from "./views/InstitutionalViewSwitch";
import { buildPlatformPath, INSTITUTIONAL_VIEWS, parsePlatformPath } from "./navigation/platformPaths";
import TeacherWorkspace from "./views/teacher/TeacherWorkspace";
import TeacherDashboardView from "./views/teacher/TeacherDashboardView";
import TeacherAcademicProfileView from "./views/teacher/TeacherAcademicProfileView";
import TeacherCurriculumView from "./views/teacher/TeacherCurriculumView";
import StudentDashboardView from "./views/student/StudentDashboardView";
import StudentCatalogView from "./views/student/StudentCatalogView";
import StudentCourseView from "./views/student/StudentCourseView";
import StudentProfileView from "./views/student/StudentProfileView";
import StudentLiveView from "./views/student/StudentLiveView";
`,
);

text = text.replace(
  'export default function App() {\n  const [courses, setCourses]',
  'export default function App() {\n  const navigate = useNavigate();\n  const location = useLocation();\n  const [courses, setCourses]',
);

const rbacEffectOld = `  useEffect(() => {
    if (!currentUser) return;
    const redirectPath = getRedirectPathForRole(currentUser.role, window.location.pathname);
    if (redirectPath) {
      console.info("[rbac] Client route redirected", {
        role: currentUser.role,
        from: window.location.pathname,
        to: redirectPath,
      });
      window.history.replaceState(null, "", redirectPath);
      if (isStudentRole(currentUser.role)) {
        setCurrentView("dashboard");
      } else {
        setTeacherView("dashboard");
      }
    }
  }, [currentUser]);`;

const rbacEffectNew = `  useEffect(() => {
    if (!currentUser) return;
    const redirectPath = getRedirectPathForRole(currentUser.role, location.pathname);
    if (redirectPath) {
      console.info("[rbac] Client route redirected", {
        role: currentUser.role,
        from: location.pathname,
        to: redirectPath,
      });
      navigate(redirectPath, { replace: true });
      if (isStudentRole(currentUser.role)) {
        setCurrentView("dashboard");
      } else {
        setTeacherView("dashboard");
      }
    }
  }, [currentUser, location.pathname, navigate]);

  useEffect(() => {
    if (!currentUser) return;
    const parsed = parsePlatformPath(location.pathname);
    if (parsed.institutionalView) {
      setCurrentView(parsed.institutionalView);
      return;
    }
    if (isStudentRole(currentUser.role)) {
      setCurrentView(parsed.studentView);
    } else {
      setTeacherView(parsed.teacherView);
    }
  }, [location.pathname, currentUser]);`;

if (!text.includes("parsePlatformPath(location.pathname)")) {
  text = text.replace(
    /  useEffect\(\(\) => \{\r?\n    if \(!currentUser\) return;\r?\n    const redirectPath = getRedirectPathForRole\(currentUser\.role, window\.location\.pathname\);[\s\S]*?  \}, \[currentUser\]\);/,
    rbacEffectNew,
  );
  if (!text.includes("parsePlatformPath(location.pathname)")) {
    throw new Error("RBAC effect block not found");
  }
}

text = text.replace(
  `    setCurrentView(view);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };`,
  `    setCurrentView(view);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (currentUser) {
      const uiRole = getAllowedUiRole(currentUser.role);
      navigate(buildPlatformPath(uiRole, view, uiRole === "teacher" ? teacherView : undefined));
    }
  };

  const handleTeacherViewChange = (view: string) => {
    setTeacherView(view);
    setIsMobileMenuOpen(false);
    navigate(buildPlatformPath("teacher", currentView, view));
  };`,
);

text = text.replace('setTeacherView={setTeacherView}', 'setTeacherView={handleTeacherViewChange}');

// Line-based institutional cleanup (avoid catastrophic regex backtracking)
let lines = text.split(/\r?\n/);
const ipStart = findLine(lines, (l) => l.includes("const institutionalPages"), "institutionalPages");
const ipEnd = findLine(lines, (l) => l.includes("const institutionalPage = institutionalPages"), "institutionalPage");
lines = replaceRange(lines, ipStart, ipEnd + 1, []);

const jsxStart = findLine(lines, (l) => l.includes('currentView === "contact"'), "contact branch");
const jsxEnd = findLine(lines, (l) => l.includes(') : role === "teacher" ? ('), "teacher branch open");
const instBlock = `{INSTITUTIONAL_VIEWS.has(currentView) ? (
            <InstitutionalViewSwitch currentView={currentView} currentUser={currentUser} navigateTo={navigateTo} />
          ) : role === "teacher" ? (`;
lines = replaceRange(lines, jsxStart, jsxEnd + 1, instBlock.split("\n"));

// continue with lines (was: let lines = text.split(/\r?\n/);

// Teacher wrapper div -> TeacherWorkspace
const teacherOpen = findLine(lines, (l) => l.includes(') : role === "teacher" ? ('), 'teacher branch');
const teacherDivLine = teacherOpen + 1;
if (!lines[teacherDivLine].includes('max-w-7xl')) throw new Error('Teacher wrapper div unexpected');
lines[teacherDivLine] = '            <TeacherWorkspace>';

const stuMarker = findLine(lines, (l) => l.includes('VIEW 1: DASHBOARD STUDENT'), 'student home marker');
let teacherClose = stuMarker - 1;
while (teacherClose > teacherOpen && !lines[teacherClose].includes('</div>')) teacherClose--;
if (teacherClose <= teacherOpen || !lines[teacherClose].includes('</div>')) {
  throw new Error('Teacher close div not found near student home');
}
lines[teacherClose] = lines[teacherClose].replace('</div>', '</TeacherWorkspace>');

// Teacher dashboard block
const dashStart = findLine(lines, (l) => l.includes('1. VIEW: TEACHER DASHBOARD'), 'dash marker');
const dashEnd = findLine(lines, (l) => l.includes('2. VIEW: ACADEMIC PROFILE'), 'academic marker');
const teacherDashboard = `              {teacherView === "dashboard" && (
                <TeacherDashboardView
                  currentUser={currentUser}
                  emailDeliverySummary={emailDeliverySummary}
                  formatEmailLogDate={formatEmailLogDate}
                  emailDeliveryStatusMsg={emailDeliveryStatusMsg}
                  handleSendTestEmail={handleSendTestEmail}
                  testEmailTo={testEmailTo}
                  setTestEmailTo={setTestEmailTo}
                  isSendingTestEmail={isSendingTestEmail}
                  testEmailStatusMsg={testEmailStatusMsg}
                  teacherChartTab={teacherChartTab}
                  setTeacherChartTab={setTeacherChartTab}
                  managedCourses={managedCourses}
                  courses={courses}
                  handleUpdateCoursePrice={handleUpdateCoursePrice}
                  handleToggleCourseLive={handleToggleCourseLive}
                  gradesCourseId={gradesCourseId}
                  setGradesCourseId={setGradesCourseId}
                  selectedGradesCourse={selectedGradesCourse}
                  gradesStatusMsg={gradesStatusMsg}
                  courseGrades={courseGrades}
                  getInitials={getInitials}
                  getGradeBadgeClass={getGradeBadgeClass}
                />
              )}`;
lines = replaceRange(lines, dashStart, dashEnd, teacherDashboard.split('\n'));

// Academic profile block
const acadStart = findLine(lines, (l) => l.includes('2. VIEW: ACADEMIC PROFILE'), 'acad marker');
const acadEnd = findLine(lines, (l) => l.includes('2. VIEW: SYLLABUS CURRICULUM'), 'curr marker');
const academic = `              {teacherView === "academic-profile" && currentUser && (
                <TeacherAcademicProfileView
                  currentUser={currentUser}
                  academicProfileData={academicProfileData}
                  academicProfileForm={academicProfileForm}
                  setAcademicProfileForm={setAcademicProfileForm}
                  academicProfileStatusMsg={academicProfileStatusMsg}
                  academicProfileErrorMsg={academicProfileErrorMsg}
                  refreshAcademicProfile={refreshAcademicProfile}
                  handleUpdateAcademicProfile={handleUpdateAcademicProfile}
                  handleUploadAvatar={handleUploadAvatar}
                  handleUpdateAcademicAvatar={handleUpdateAcademicAvatar}
                  handleDeleteAvatar={handleDeleteAvatar}
                  setAvatarFile={setAvatarFile}
                  avatarStatusMsg={avatarStatusMsg}
                  academicPasswordForm={academicPasswordForm}
                  setAcademicPasswordForm={setAcademicPasswordForm}
                  handleChangeAcademicPassword={handleChangeAcademicPassword}
                />
              )}`;
lines = replaceRange(lines, acadStart, acadEnd, academic.split('\n'));

// Curriculum extract
const currMarker = findLine(lines, (l) => l.includes('2. VIEW: SYLLABUS CURRICULUM'), 'curr marker');
const currCond = findLine(lines, (l, i) => i >= currMarker && l.includes('teacherView === "curriculum"'), 'curr cond');
const liveMarker = findLine(lines, (l) => l.includes('3. VIEW: SEMINAR LIVE CONTROL'), 'live marker');
const currClose = liveMarker - 1;
while (currClose > currCond && lines[currClose].trim() === '') {}
// find closing )} before live marker
let currEnd = liveMarker - 1;
while (currEnd > currCond && !lines[currEnd].includes(')}')) currEnd--;
if (currEnd <= currCond) throw new Error('curriculum end not found');
const innerStart = currCond + 1;
const innerEnd = currEnd;
const jsxInner = lines.slice(innerStart, innerEnd).join('\n');

function uses(name, jsx) {
  return new RegExp(`\\b${name}\\b`).test(jsx);
}

const appBefore = lines.slice(0, currCond).join('\n');
const statePairs = [...appBefore.matchAll(/const \[(\w+), (set\w+)\]/g)]
  .map((m) => [m[1], m[2]])
  .filter(([name, setter]) => uses(name, jsxInner) || uses(setter, jsxInner));
const handlers = [...appBefore.matchAll(/const ((?:handle|show|load)\w+) =/g)]
  .map((m) => m[1])
  .filter((name) => uses(name, jsxInner));
const computed = [
  'allDisciplines',
  'managedCourses',
  'managedCourse',
  'managedSections',
  'chapterSections',
  'uploadPartOptions',
  'selectedManagedContents',
  'handleSetUploadSectionId',
].filter((name) => uses(name, jsxInner));

const typeMap = {
  domains: 'FacultyDomain[]',
  allDisciplines: "FacultyDomain['disciplines'][number][]",
  managedCourses: 'Course[]',
  managedCourse: 'Course | null',
  managedSections: 'ContentSection[]',
  chapterSections: 'ContentSection[]',
  uploadPartOptions: 'ContentSection[]',
  selectedManagedContents: 'LessonContent[]',
  activeCurriculumStep: 'number',
  curriculumSuccessMsg: 'string',
  curriculumErrorMsg: 'string',
  selectedChapterId: 'string',
  selectedPartieId: 'string',
  newSectionMode: '"chapter" | "part" | "subpart"',
  uploadChapterId: 'string',
  uploadPartId: 'string',
  uploadSubpartId: 'string',
  quizChapterId: 'string',
  quizPartId: 'string',
  quizSubpartId: 'string',
  newCourseTitle: 'string',
  newCourseDescription: 'string',
  newCourseDisciplineId: 'number',
  newCourseLevel: 'string',
  newCourseCredits: 'number',
  newCourseDuration: 'string',
  newCoursePrice: 'number',
  newCoursePublished: 'boolean',
  newSectionCourseId: 'number',
  newSectionTitle: 'string',
  newSectionParentId: 'string',
  newSectionPublished: 'boolean',
  uploadSectionId: 'string',
  uploadTitle: 'string',
  uploadType: '"VIDEO" | "PDF" | "IMAGE"',
  uploadFile: 'File | null',
  uploadPublished: 'boolean',
  uploadStatusMsg: 'string',
  editingCourse: 'Course | null',
  editCourseForm: '{ title: string; description: string; level: string; duration: string; credits: number; disciplineId: number; price: number }',
  teacherQuizzes: 'any[]',
  quizCourseId: 'number',
  newQuizTitle: 'string',
  selectedQuizId: 'string',
  newQuestionText: 'string',
  newQuestionOptions: 'string[]',
  newQuestionAnswer: 'string',
  newQuestionExplanation: 'string',
  quizManagerMsg: 'string',
  quizManagerError: 'string',
};

const iconImports = [
  'BookOpen','Layers','FolderTree','Video','HelpCircle','Plus','Trash2','Edit3','Save','Check',
  'ChevronDown','ChevronUp','FilePlus','Eye','EyeOff','FileText','Download','CheckCircle','X',
  'Sparkles','Info','GraduationCap','DollarSign','Clock','Award','ChevronRight','ChevronLeft',
];
const usedIcons = iconImports.filter((icon) => uses(icon, jsxInner));

const propLines = [];
for (const [name, setter] of statePairs) {
  const t = typeMap[name] || 'unknown';
  propLines.push(`  ${name}: ${t};`);
  if (uses(setter, jsxInner)) {
    const st = typeMap[name] ? `(value: ${typeMap[name]}) => void` : '(value: unknown) => void';
    propLines.push(`  ${setter}: ${st};`);
  }
}
for (const name of computed) {
  if (statePairs.some(([n]) => n === name)) continue;
  const t = typeMap[name] || 'unknown';
  propLines.push(`  ${name}: ${t};`);
}
for (const name of handlers) {
  propLines.push(`  ${name}: (...args: any[]) => void | Promise<void>;`);
}

const destructured = [
  ...statePairs.flatMap(([name, setter]) => {
    const items = [name];
    if (uses(setter, jsxInner)) items.push(setter);
    return items;
  }),
  ...computed.filter((n) => !statePairs.some(([sn]) => sn === n)),
  ...handlers,
];

const currHeader = `import {
  ${usedIcons.join(',\n  ')}
} from "lucide-react";
import type { Course, ContentSection, FacultyDomain, LessonContent } from "../../types";

export interface TeacherCurriculumViewProps {
${propLines.join('\n')}
}

export default function TeacherCurriculumView({
  ${destructured.join(',\n  ')}
}: TeacherCurriculumViewProps) {
  return (
${jsxInner}
  );
}
`;
fs.writeFileSync(OUT_CURR, currHeader, 'utf8');

const jsxUsageProps = destructured.map((p) => `                  ${p}={${p}}`).join('\n');
const currReplacement = `{teacherView === "curriculum" && (
                <TeacherCurriculumView
${jsxUsageProps}
                />
              )}`.split('\n');
lines = replaceRange(lines, currMarker, currEnd + 1, currReplacement);

// Student views
const stuDashStart = findLine(lines, (l) => l.includes('VIEW 1: DASHBOARD STUDENT'), 'stu dash');
const stuDashEnd = findLine(lines, (l) => l.includes('VIEW 2: COURSE CATALOG'), 'stu cat');
const stuDashboard = `              {currentView === "dashboard" && (
                <StudentDashboardView
                  currentUser={currentUser}
                  navigateTo={navigateTo}
                  studentChartTab={studentChartTab}
                  setStudentChartTab={setStudentChartTab}
                  enrolledCourses={enrolledCourses}
                  courses={courses}
                  getCourseIcon={getCourseIcon}
                />
              )}`;
lines = replaceRange(lines, stuDashStart, stuDashEnd, stuDashboard.split('\n'));

const stuCatStart = findLine(lines, (l) => l.includes('VIEW 2: COURSE CATALOG'), 'stu cat2');
const stuCatEnd = findLine(lines, (l) => l.includes('VIEW 3: DETAILED SYLLABUS'), 'stu course');
const stuCatalog = `          {currentView === "catalog" && (
            <StudentCatalogView
              domains={domains}
              selectedDomain={selectedDomain}
              selectedDiscipline={selectedDiscipline}
              catalogCourses={catalogCourses}
              enrolledCourses={enrolledCourses}
              getCourseIcon={getCourseIcon}
              getDomainIcon={getDomainIcon}
              navigateTo={navigateTo}
              setCourseToPurchase={setCourseToPurchase}
              setSelectedDomainId={setSelectedDomainId}
              setSelectedDisciplineId={setSelectedDisciplineId}
              setSearchQuery={setSearchQuery}
            />
          )}`;
lines = replaceRange(lines, stuCatStart, stuCatEnd, stuCatalog.split('\n'));

const stuCourseStart = findLine(lines, (l) => l.includes('VIEW 3: DETAILED SYLLABUS'), 'stu course2');
const stuCourseEnd = findLine(lines, (l) => l.includes('VIEW 4: PROFILE'), 'stu profile');
const stuCourse = `          {currentView === "course" && selectedCourse && selectedModule && (
            <StudentCourseView
              selectedCourse={selectedCourse}
              selectedModule={selectedModule}
              courseContentSections={courseContentSections}
              flattenSections={flattenSections}
              selectedLessonContent={selectedLessonContent}
              showAITutor={showAITutor}
              isVideoPlaying={isVideoPlaying}
              videoProgress={videoProgress}
              videoSpeed={videoSpeed}
              quizQuestions={quizQuestions}
              quizAnswers={quizAnswers}
              quizSubmitted={quizSubmitted}
              quizScore={quizScore}
              quizSubmitError={quizSubmitError}
              navigateTo={navigateTo}
              onModuleSelect={(mod) => setSelectedModule(mod)}
              setSelectedLessonContent={setSelectedLessonContent}
              setShowAITutor={setShowAITutor}
              setIsVideoPlaying={setIsVideoPlaying}
              setVideoProgress={setVideoProgress}
              setVideoSpeed={setVideoSpeed}
              markModuleCompleted={markModuleCompleted}
              handleQuizAnswerSelect={handleQuizAnswerSelect}
              handleQuizSubmit={handleQuizSubmit}
              resetQuiz={resetQuiz}
            />
          )}`;
lines = replaceRange(lines, stuCourseStart, stuCourseEnd, stuCourse.split('\n'));

const stuProfStart = findLine(lines, (l) => l.includes('VIEW 4: PROFILE'), 'stu prof');
const stuProfEnd = findLine(lines, (l) => l.includes('VIEW 5: VIRTUAL CLASSROOM'), 'stu live');
const stuProfile = `          {currentView === "profile" && (
            <StudentProfileView
              currentUser={currentUser}
              enrolledCourses={enrolledCourses}
              courses={courses}
              invoices={invoices}
              avatarStatusMsg={avatarStatusMsg}
              handleUploadAvatar={handleUploadAvatar}
              handleDeleteAvatar={handleDeleteAvatar}
              setAvatarFile={setAvatarFile}
            />
          )}`;
lines = replaceRange(lines, stuProfStart, stuProfEnd, stuProfile.split('\n'));

const stuLiveStart = findLine(lines, (l) => l.includes('VIEW 5: VIRTUAL CLASSROOM'), 'stu live2');
const stuLiveEnd = stuLiveStart + 2;
const stuLive = `          {currentView === "live" && activeLiveCourse && (
            <StudentLiveView
              course={activeLiveCourse}
              currentUserRole={currentUser?.role || "STUDENT"}
              liveRoom={liveRoom}
              participants={liveParticipants}
              chatMessages={liveChatMessages}
              chatDraft={liveChatDraft}
              setChatDraft={setLiveChatDraft}
              statusMessage={liveStatusMsg}
              isMicEnabled={isMicEnabled}
              isCameraEnabled={isCameraEnabled}
              isScreenShareEnabled={isScreenShareEnabled}
              isFullscreen={isLiveFullscreen}
              isRecording={isLiveRecording}
              activeSpeakerIdentity={activeSpeakerIdentity}
              attendanceReport={liveAttendanceReport}
              primaryVideoRef={primaryLiveVideoRef}
              videoRefs={liveVideoRefs}
              stageRef={liveStageRef}
              onBack={() => navigateTo("course", activeLiveCourse)}
              onToggleMic={toggleLiveMic}
              onToggleCamera={toggleLiveCamera}
              onToggleScreenShare={toggleLiveScreenShare}
              onToggleFullscreen={toggleLiveFullscreen}
              onLeave={leaveLiveRoom}
              onSendMessage={sendLiveChatMessage}
              onRaiseHand={toggleLiveHand}
              onReaction={sendLiveReaction}
              onRecordToggle={toggleLiveRecording}
              onModerateParticipant={handleLiveModeration}
              onLiveEvent={publishLiveAction}
            />
          )}`.split('\n');
lines = replaceRange(lines, stuLiveStart, stuLiveEnd, stuLive);

text = lines.join('\n');
fs.writeFileSync(APP, text, 'utf8');

const afterAppLines = text.split(/\r?\n/).length;
const currLines = fs.readFileSync(OUT_CURR, 'utf8').split(/\r?\n/).length;
console.log(JSON.stringify({ beforeAppLines, afterAppLines, teacherCurriculumLines: currLines }));





