/** Découvre un module commun prof/étudiant sur la prod (sans logger d'identifiants). */
const base = process.env.AXELMOND_BASE_URL || "https://axelmond.com";

async function login(email, password, role) {
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, role }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const body = await res.json();
  const cookies = (res.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]).join("; ");
  return { token: body.token, csrf: body.csrfToken, cookies };
}

async function getJson(path, session) {
  const res = await fetch(`${base}${path}`, {
    headers: {
      Cookie: session.cookies,
      Authorization: `Bearer ${session.token}`,
    },
  });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json();
}

const profEmail = process.env.AXELMOND_LIVE_PROF_EMAIL || process.env.AXELMOND_PROF_EMAIL;
const profPass = process.env.AXELMOND_LIVE_PROF_PASSWORD || process.env.AXELMOND_PROF_PASSWORD;
const studEmail = process.env.AXELMOND_LIVE_STUDENT_EMAIL || process.env.AXELMOND_STUDENT_EMAIL;
const studPass = process.env.AXELMOND_LIVE_STUDENT_PASSWORD || process.env.AXELMOND_STUDENT_PASSWORD;

const profSession = await login(profEmail, profPass, "PROFESSOR");
const studSession = await login(studEmail, studPass, "STUDENT");

const profProfile = await getJson("/api/me/profile", profSession);
const studCourses = await getJson("/api/courses", studSession);

const profList = profProfile?.courses || [];
const studCourseIds = new Set(
  (Array.isArray(studCourses) ? studCourses : [])
    .filter((c) => c.enrollment?.active)
    .map((c) => c.id),
);

const common = profList.filter((c) => studCourseIds.has(c.id));
const pick = common.find((c) => c.published) || common[0] || profList.find((c) => c.published) || profList[0];
if (!pick) {
  console.error("Aucun module trouvé — vérifier inscription étudiant et ownership prof.");
  process.exit(1);
}
console.log(`AXELMOND_LIVE_TEST_COURSE_ID=${pick.id}`);
console.log(`# title: ${pick.title}`);
