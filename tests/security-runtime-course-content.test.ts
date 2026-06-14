import assert from "node:assert/strict";
import {
  authedFetch,
  DEFAULT_SECURITY_RUNTIME_PORT,
  isSecurityRuntimeDatabaseAvailable,
  loginViaHttp,
  startSecurityRuntimeServer,
  stopSecurityRuntimeServer,
  waitForSecurityRuntimeHealth,
  type SecurityRuntimeSession,
} from "./helpers/security-runtime-harness.ts";
import { skipSecurityRuntimeTests } from "./helpers/security-runtime-harness.ts";
import {
  cleanupCourseContentRuntimeFixtures,
  COURSE_CONTENT_RUNTIME_DRAFT_MODULE_CONTENT_TITLE,
  COURSE_CONTENT_RUNTIME_DRAFT_SECTION_TITLE,
  COURSE_CONTENT_RUNTIME_DRAFT_TREE_CONTENT_TITLE,
  COURSE_CONTENT_RUNTIME_PUBLISHED_MODULE_CONTENT_TITLE,
  COURSE_CONTENT_RUNTIME_PUBLISHED_SECTION_TITLE,
  COURSE_CONTENT_RUNTIME_PUBLISHED_TREE_CONTENT_TITLE,
  seedCourseContentRuntimeFixtures,
  type CourseContentRuntimeFixture,
} from "./helpers/security-runtime-course-content-fixtures.ts";
import { SECURITY_RUNTIME_TEST_PASSWORD } from "./helpers/security-runtime-fixtures.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("security-runtime-course-content", async () => {
  const RUNTIME_PORT = DEFAULT_SECURITY_RUNTIME_PORT;

  type ContentTreeNode = {
    title: string;
    contents?: Array<{ title: string }>;
    children?: ContentTreeNode[];
  };

  function courseContentPath(courseId: number) {
    return `/api/courses/${courseId}/content`;
  }

  function moduleContentsPath(courseId: number) {
    return `/api/courses/${courseId}/module-contents`;
  }

  function collectTreeTitles(nodes: ContentTreeNode[]): string[] {
    const titles: string[] = [];
    for (const node of nodes) {
      titles.push(node.title);
      for (const content of node.contents ?? []) {
        titles.push(content.title);
      }
      titles.push(...collectTreeTitles(node.children ?? []));
    }
    return titles;
  }

  function collectModuleContentTitles(items: Array<{ title: string }>): string[] {
    return items.map((item) => item.title);
  }

  async function getCourseContent(baseUrl: string, courseId: number, session?: SecurityRuntimeSession) {
    if (session) {
      return authedFetch(baseUrl, session, "GET", courseContentPath(courseId));
    }
    return fetch(`${baseUrl}${courseContentPath(courseId)}`);
  }

  async function getModuleContents(baseUrl: string, courseId: number, session?: SecurityRuntimeSession) {
    if (session) {
      return authedFetch(baseUrl, session, "GET", moduleContentsPath(courseId));
    }
    return fetch(`${baseUrl}${moduleContentsPath(courseId)}`);
  }

  function assertPublishedTreeVisible(titles: string[]) {
    assert.ok(titles.includes(COURSE_CONTENT_RUNTIME_PUBLISHED_SECTION_TITLE));
    assert.ok(titles.includes(COURSE_CONTENT_RUNTIME_PUBLISHED_TREE_CONTENT_TITLE));
  }

  function assertDraftTreeHidden(titles: string[]) {
    assert.ok(!titles.includes(COURSE_CONTENT_RUNTIME_DRAFT_SECTION_TITLE));
    assert.ok(!titles.includes(COURSE_CONTENT_RUNTIME_DRAFT_TREE_CONTENT_TITLE));
  }

  function assertDraftTreeVisible(titles: string[]) {
    assert.ok(titles.includes(COURSE_CONTENT_RUNTIME_DRAFT_SECTION_TITLE));
    assert.ok(titles.includes(COURSE_CONTENT_RUNTIME_DRAFT_TREE_CONTENT_TITLE));
  }

  function assertPublishedModuleContentVisible(titles: string[]) {
    assert.ok(titles.includes(COURSE_CONTENT_RUNTIME_PUBLISHED_MODULE_CONTENT_TITLE));
  }

  function assertDraftModuleContentHidden(titles: string[]) {
    assert.ok(!titles.includes(COURSE_CONTENT_RUNTIME_DRAFT_MODULE_CONTENT_TITLE));
  }

  function assertDraftModuleContentVisible(titles: string[]) {
    assert.ok(titles.includes(COURSE_CONTENT_RUNTIME_DRAFT_MODULE_CONTENT_TITLE));
  }

  if (skipSecurityRuntimeTests()) return;

  let fixture: CourseContentRuntimeFixture;
  let handle: ReturnType<typeof startSecurityRuntimeServer> | undefined;

  try {
    fixture = await seedCourseContentRuntimeFixtures();
    handle = startSecurityRuntimeServer(RUNTIME_PORT);
    await waitForSecurityRuntimeHealth(handle.baseUrl, { process: handle.process });

    const ownerSession = await loginViaHttp(handle.baseUrl, {
      email: fixture.users.ownerProfessor.email,
      password: SECURITY_RUNTIME_TEST_PASSWORD,
      role: "PROFESSOR",
    });
    const enrolledSession = await loginViaHttp(handle.baseUrl, {
      email: fixture.users.enrolledStudent.email,
      password: SECURITY_RUNTIME_TEST_PASSWORD,
      role: "STUDENT",
    });
    const unenrolledSession = await loginViaHttp(handle.baseUrl, {
      email: fixture.users.unenrolledStudent.email,
      password: SECURITY_RUNTIME_TEST_PASSWORD,
      role: "STUDENT",
    });
    const foreignSession = await loginViaHttp(handle.baseUrl, {
      email: fixture.users.foreignProfessor.email,
      password: SECURITY_RUNTIME_TEST_PASSWORD,
      role: "PROFESSOR",
    });
    const adminSession = await loginViaHttp(handle.baseUrl, {
      email: fixture.users.admin.email,
      password: SECURITY_RUNTIME_TEST_PASSWORD,
      role: "ADMIN",
    });

    // 1. Sans auth → 401
    {
      const contentResponse = await getCourseContent(handle.baseUrl, fixture.courseId);
      assert.equal(contentResponse.status, 401);

      const moduleResponse = await getModuleContents(handle.baseUrl, fixture.courseId);
      assert.equal(moduleResponse.status, 401);
    }

    // 2. Étudiant inscrit → 200 + contenu publié uniquement
    {
      const contentResponse = await getCourseContent(handle.baseUrl, fixture.courseId, enrolledSession);
      assert.equal(contentResponse.status, 200);
      const tree = (await contentResponse.json()) as ContentTreeNode[];
      assert.ok(Array.isArray(tree));
      const treeTitles = collectTreeTitles(tree);
      assertPublishedTreeVisible(treeTitles);
      assertDraftTreeHidden(treeTitles);

      const moduleResponse = await getModuleContents(handle.baseUrl, fixture.courseId, enrolledSession);
      assert.equal(moduleResponse.status, 200);
      const moduleItems = (await moduleResponse.json()) as Array<{ title: string }>;
      assert.ok(Array.isArray(moduleItems));
      const moduleTitles = collectModuleContentTitles(moduleItems);
      assertPublishedModuleContentVisible(moduleTitles);
      assertDraftModuleContentHidden(moduleTitles);
    }

    // 3. Étudiant non inscrit → 403
    {
      const contentResponse = await getCourseContent(handle.baseUrl, fixture.courseId, unenrolledSession);
      assert.equal(contentResponse.status, 403);
      const contentPayload = (await contentResponse.json()) as { error?: string };
      assert.match(contentPayload.error || "", /Inscription requise/i);

      const moduleResponse = await getModuleContents(handle.baseUrl, fixture.courseId, unenrolledSession);
      assert.equal(moduleResponse.status, 403);
      const modulePayload = (await moduleResponse.json()) as { error?: string };
      assert.match(modulePayload.error || "", /Inscription requise/i);
    }

    // 4. Prof propriétaire → 200 + brouillons visibles
    {
      const contentResponse = await getCourseContent(handle.baseUrl, fixture.courseId, ownerSession);
      assert.equal(contentResponse.status, 200);
      const treeTitles = collectTreeTitles((await contentResponse.json()) as ContentTreeNode[]);
      assertPublishedTreeVisible(treeTitles);
      assertDraftTreeVisible(treeTitles);

      const moduleResponse = await getModuleContents(handle.baseUrl, fixture.courseId, ownerSession);
      assert.equal(moduleResponse.status, 200);
      const moduleTitles = collectModuleContentTitles((await moduleResponse.json()) as Array<{ title: string }>);
      assertPublishedModuleContentVisible(moduleTitles);
      assertDraftModuleContentVisible(moduleTitles);
    }

    // 5. Prof non propriétaire → 403
    {
      const contentResponse = await getCourseContent(handle.baseUrl, fixture.courseId, foreignSession);
      assert.equal(contentResponse.status, 403);
      const contentPayload = (await contentResponse.json()) as { error?: string };
      assert.match(contentPayload.error || "", /Accès refusé/i);

      const moduleResponse = await getModuleContents(handle.baseUrl, fixture.courseId, foreignSession);
      assert.equal(moduleResponse.status, 403);
      const modulePayload = (await moduleResponse.json()) as { error?: string };
      assert.match(modulePayload.error || "", /Accès refusé/i);
    }

    // 6. Admin → 200 + brouillons visibles
    {
      const contentResponse = await getCourseContent(handle.baseUrl, fixture.courseId, adminSession);
      assert.equal(contentResponse.status, 200);
      const treeTitles = collectTreeTitles((await contentResponse.json()) as ContentTreeNode[]);
      assertPublishedTreeVisible(treeTitles);
      assertDraftTreeVisible(treeTitles);

      const moduleResponse = await getModuleContents(handle.baseUrl, fixture.courseId, adminSession);
      assert.equal(moduleResponse.status, 200);
      const moduleTitles = collectModuleContentTitles((await moduleResponse.json()) as Array<{ title: string }>);
      assertPublishedModuleContentVisible(moduleTitles);
      assertDraftModuleContentVisible(moduleTitles);
    }

    // 7. courseId inexistant → 404
    {
      const contentResponse = await getCourseContent(handle.baseUrl, fixture.missingCourseId, enrolledSession);
      assert.equal(contentResponse.status, 404);
      const contentPayload = (await contentResponse.json()) as { error?: string };
      assert.match(contentPayload.error || "", /Module introuvable/i);

      const moduleResponse = await getModuleContents(handle.baseUrl, fixture.missingCourseId, enrolledSession);
      assert.equal(moduleResponse.status, 404);
      const modulePayload = (await moduleResponse.json()) as { error?: string };
      assert.match(modulePayload.error || "", /Module introuvable/i);
    }

    console.log("Security runtime course-content ACL tests passed");
  } finally {
    if (handle) {
      await stopSecurityRuntimeServer(handle);
    }
    await cleanupCourseContentRuntimeFixtures();
  }
});
