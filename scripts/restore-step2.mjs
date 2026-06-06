import fs from "fs";
const APP = "C:/Users/saadg/Desktop/unicode/src/App.tsx";
const OUT_CURR = "C:/Users/saadg/Desktop/unicode/src/views/teacher/TeacherCurriculumView.tsx";

function findLine(lines, pred, label) {
  const i = lines.findIndex(pred);
  if (i < 0) throw new Error(`Line not found: ${label}`);
  return i;
}
function replaceRange(lines, start, endExclusive, insert) {
  return [...lines.slice(0, start), ...insert, ...lines.slice(endExclusive)];
}

let lines = fs.readFileSync(APP, "utf8").split(/\r?\n/);
const ipStart = findLine(lines, (l) => l.includes("const institutionalPages"), "institutionalPages");
const ipEnd = findLine(lines, (l) => l.includes("const institutionalPage = institutionalPages"), "institutionalPage");
lines = replaceRange(lines, ipStart, ipEnd + 1, []);

const jsxStart = findLine(lines, (l) => l.includes('currentView === "contact"'), "contact");
const jsxEnd = findLine(lines, (l) => l.includes(') : role === "teacher" ? ('), "teacher");
lines = replaceRange(lines, jsxStart, jsxEnd + 1, [
  "{INSTITUTIONAL_VIEWS.has(currentView) ? (",
  "            <InstitutionalViewSwitch currentView={currentView} currentUser={currentUser} navigateTo={navigateTo} />",
  "          ) : role === \"teacher\" ? (",
]);

const teacherOpen = findLine(lines, (l) => l.includes(') : role === "teacher" ? ('), "teacherOpen");
lines[teacherOpen + 1] = "            <TeacherWorkspace>";
const stuMarker = findLine(lines, (l) => l.includes("VIEW 1: DASHBOARD STUDENT"), "stu");
let teacherClose = stuMarker - 1;
while (teacherClose > teacherOpen && !lines[teacherClose].includes("</div>")) teacherClose--;
lines[teacherClose] = lines[teacherClose].replace("</div>", "</TeacherWorkspace>");

const dashStart = findLine(lines, (l) => l.includes("1. VIEW: TEACHER DASHBOARD"), "dash");
const dashEnd = findLine(lines, (l) => l.includes("2. VIEW: ACADEMIC PROFILE"), "acad");
lines = replaceRange(lines, dashStart, dashEnd, `              {teacherView === "dashboard" && (
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
              )}`.split("\n"));

const acadStart = findLine(lines, (l) => l.includes("2. VIEW: ACADEMIC PROFILE"), "acad2");
const acadEnd = findLine(lines, (l) => l.includes("2. VIEW: SYLLABUS CURRICULUM"), "curr");
lines = replaceRange(lines, acadStart, acadEnd, `              {teacherView === "academic-profile" && currentUser && (
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
              )}`.split("\n"));

const currMarker = findLine(lines, (l) => l.includes("2. VIEW: SYLLABUS CURRICULUM"), "currM");
const currCond = findLine(lines, (l) => l.includes('teacherView === "curriculum"'), "currC");
const liveMarker = findLine(lines, (l) => l.includes("3. VIEW: SEMINAR LIVE CONTROL"), "liveM");
let currEnd = liveMarker - 1;
while (currEnd > currCond && lines[currEnd].trim() !== ")}") currEnd--;
if (currEnd <= currCond) throw new Error("curriculum close not found");
const jsxInner = lines.slice(currCond + 1, currEnd).join("\n");

function uses(name, jsx) {
  return new RegExp(`\\b${name}\\b`).test(jsx);
}
const appBefore = lines.slice(0, currCond).join("\n");
const statePairs = [...appBefore.matchAll(/const \[(\w+), (set\w+)\]/g)]
  .map((m) => [m[1], m[2]])
  .filter(([name, setter]) => uses(name, jsxInner) || uses(setter, jsxInner));
const handlers = [...appBefore.matchAll(/const ((?:handle|show|load)\w+) =/g)].map((m) => m[1]).filter((n) => uses(n, jsxInner));
const computed = ["allDisciplines","managedCourses","managedCourse","managedSections","chapterSections","uploadPartOptions","selectedManagedContents","handleSetUploadSectionId"].filter((n) => uses(n, jsxInner));
const typeMap = { domains:"FacultyDomain[]", allDisciplines:"FacultyDomain['disciplines'][number][]", managedCourses:"Course[]", managedCourse:"Course | null", managedSections:"ContentSection[]", chapterSections:"ContentSection[]", uploadPartOptions:"ContentSection[]", selectedManagedContents:"LessonContent[]", activeCurriculumStep:"number", curriculumSuccessMsg:"string", curriculumErrorMsg:"string", selectedChapterId:"string", selectedPartieId:"string", newSectionMode:'"chapter" | "part" | "subpart"', uploadChapterId:"string", uploadPartId:"string", uploadSubpartId:"string", quizChapterId:"string", quizPartId:"string", quizSubpartId:"string", newCourseTitle:"string", newCourseDescription:"string", newCourseDisciplineId:"number", newCourseLevel:"string", newCourseCredits:"number", newCourseDuration:"string", newCoursePrice:"number", newCoursePublished:"boolean", newSectionCourseId:"number", newSectionTitle:"string", newSectionParentId:"string", newSectionPublished:"boolean", uploadSectionId:"string", uploadTitle:"string", uploadType:'"VIDEO" | "PDF" | "IMAGE"', uploadFile:"File | null", uploadPublished:"boolean", uploadStatusMsg:"string", editingCourse:"Course | null", editCourseForm:"{ title: string; description: string; level: string; duration: string; credits: number; disciplineId: number; price: number }", teacherQuizzes:"any[]", quizCourseId:"number", newQuizTitle:"string", selectedQuizId:"string", newQuestionText:"string", newQuestionOptions:"string[]", newQuestionAnswer:"string", newQuestionExplanation:"string", quizManagerMsg:"string", quizManagerError:"string" };
const icons = ["BookOpen","Layers","FolderTree","Video","HelpCircle","Plus","Trash2","Edit3","Save","Check","ChevronDown","ChevronUp","FilePlus","Eye","EyeOff","FileText","Download","CheckCircle","X","Sparkles","Info","GraduationCap","DollarSign","Clock","Award","ChevronRight","ChevronLeft"].filter((i) => uses(i, jsxInner));
const propLines = [];
for (const [name, setter] of statePairs) {
  propLines.push(`  ${name}: ${typeMap[name] || "unknown"};`);
  if (uses(setter, jsxInner)) propLines.push(`  ${setter}: ${typeMap[name] ? `(value: ${typeMap[name]}) => void` : "(value: unknown) => void"};`);
}
for (const name of computed) if (!statePairs.some(([n]) => n === name)) propLines.push(`  ${name}: ${typeMap[name] || "unknown"};`);
for (const name of handlers) propLines.push(`  ${name}: (...args: any[]) => void | Promise<void>;`);
const destructured = [...statePairs.flatMap(([n, s]) => (uses(s, jsxInner) ? [n, s] : [n])), ...computed.filter((n) => !statePairs.some(([sn]) => sn === n)), ...handlers];
const currFile = `import {\n  ${icons.join(",\n  ")}\n} from "lucide-react";\nimport type { Course, ContentSection, FacultyDomain, LessonContent } from "../../types";\n\nexport interface TeacherCurriculumViewProps {\n${propLines.join("\n")}\n}\n\nexport default function TeacherCurriculumView({\n  ${destructured.join(",\n  ")}\n}: TeacherCurriculumViewProps) {\n  return (\n${jsxInner}\n  );\n}\n`;
fs.writeFileSync(OUT_CURR, currFile);
const currReplacement = [`{teacherView === "curriculum" && (`, `                <TeacherCurriculumView`, ...destructured.map((p) => `                  ${p}={${p}}`), `                />`, `              )}`];
lines = replaceRange(lines, currMarker, currEnd + 1, currReplacement);

const blocks = [
  ["VIEW 1: DASHBOARD STUDENT", "VIEW 2: COURSE CATALOG", `              {currentView === "dashboard" && (
                <StudentDashboardView
                  currentUser={currentUser}
                  navigateTo={navigateTo}
                  studentChartTab={studentChartTab}
                  setStudentChartTab={setStudentChartTab}
                  enrolledCourses={enrolledCourses}
                  courses={courses}
                  getCourseIcon={getCourseIcon}
                />
              )}`],
  ["VIEW 2: COURSE CATALOG", "VIEW 3: DETAILED SYLLABUS", `          {currentView === "catalog" && (
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
          )}`],
  ["VIEW 3: DETAILED SYLLABUS", "VIEW 4: PROFILE", `          {currentView === "course" && selectedCourse && selectedModule && (
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
          )}`],
  ["VIEW 4: PROFILE", "VIEW 5: VIRTUAL CLASSROOM", `          {currentView === "profile" && (
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
          )}`],
];
for (const [a, b, repl] of blocks) {
  const s = findLine(lines, (l) => l.includes(a), a);
  const e = findLine(lines, (l) => l.includes(b), b);
  lines = replaceRange(lines, s, e, repl.split("\n"));
}
const liveS = findLine(lines, (l) => l.includes("VIEW 5: VIRTUAL CLASSROOM"), "live");
lines = replaceRange(lines, liveS, liveS + 2, `          {currentView === "live" && activeLiveCourse && (
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
          )}`.split("\n"));

fs.writeFileSync(APP, lines.join("\n"));
console.log("step2", lines.length, "curriculum", currFile.split(/\r?\n/).length);
