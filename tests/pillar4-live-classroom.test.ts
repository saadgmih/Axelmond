import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "vitest";

test("Pilier 4: Teacher Live Control Console comprehensive features", () => {
  const teacherLiveSource = fs.readFileSync("src/views/teacher/TeacherLiveControlView.tsx", "utf8");
  
  // Direct student share link and copy button
  assert.match(teacherLiveSource, /Lien d'accès direct étudiant/i);
  assert.match(teacherLiveSource, /liveShareUrl/);
  assert.match(teacherLiveSource, /handleCopyLink/);
  assert.match(teacherLiveSource, /Copier le lien d'accès|Lien copié/);

  // Quick subject presets
  assert.match(teacherLiveSource, /QUICK_SUBJECT_PRESETS/);
  assert.match(teacherLiveSource, /Séance d'exercices & QCM/);
  assert.match(teacherLiveSource, /Correction approfondie TD/);
  assert.match(teacherLiveSource, /Révision concours & Annales/);

  // Live timer & duration
  assert.match(teacherLiveSource, /liveElapsedSeconds/);
  assert.match(teacherLiveSource, /formatLiveDuration/);

  // Capabilities badges
  assert.match(teacherLiveSource, /LiveKit WebRTC HD/);
  assert.match(teacherLiveSource, /Tableau blanc collaboratif/);
  assert.match(teacherLiveSource, /Sondages QCM en direct/);
});

test("Pilier 4: Live Participants Panel moderation & hand raise management", () => {
  const panelSource = fs.readFileSync("src/components/live/LiveParticipantsPanel.tsx", "utf8");

  // Mute all quick action
  assert.match(panelSource, /Muet pour tous/);
  assert.match(panelSource, /onModerateParticipant\("MUTE_AUDIO",\s*p\)/);

  // Grant speech action for raised hands
  assert.match(panelSource, /Donner la parole/);
  assert.match(panelSource, /onModerateParticipant\("GRANT_SPEECH",\s*participant\)/);
});

test("Pilier 4: LaTeX Math rendering in Live Chat and Polls", () => {
  const chatRowSource = fs.readFileSync("src/components/live/LiveChatMessageRow.tsx", "utf8");
  const pollPanelSource = fs.readFileSync("src/components/live/LivePollPanel.tsx", "utf8");

  // Chat message math rendering
  assert.match(chatRowSource, /import LatexText from "\.\.\/LazyLatexText"/);
  assert.match(chatRowSource, /<LatexText value=\{message\.text\}/);

  // Poll question and options math rendering
  assert.match(pollPanelSource, /import LatexText from "\.\.\/LazyLatexText"/);
  assert.match(pollPanelSource, /<LatexText value=\{pollQuestion\}/);
  assert.match(pollPanelSource, /<LatexText value=\{option\}/);
});

test("Pilier 4: Live Whiteboard palette and privacy integrity", () => {
  const whiteboardSource = fs.readFileSync("src/components/live/LiveWhiteboardPanel.tsx", "utf8");

  // Whiteboard color & width controls
  assert.match(whiteboardSource, /AVAILABLE_COLORS/);
  assert.match(whiteboardSource, /AVAILABLE_WIDTHS/);
  assert.match(whiteboardSource, /selectedColor/);
  assert.match(whiteboardSource, /selectedWidth/);

  // Privacy invariant preservation
  assert.doesNotMatch(whiteboardSource, /Géométrie|Dessin libre|ZoomIn/);
});
