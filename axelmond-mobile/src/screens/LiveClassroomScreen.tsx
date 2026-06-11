import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Button from "../components/Button";
import ScreenContainer from "../components/ScreenContainer";
import { api } from "../services/api";
import type { LiveKitSession, LiveMessage } from "../types";
import { colors, spacing } from "../theme/colors";
import type { StudentStackParamList } from "../navigation/types";
import type { TeacherStackParamList } from "../navigation/types";

type Props =
  | NativeStackScreenProps<StudentStackParamList, "LiveClassroom">
  | NativeStackScreenProps<TeacherStackParamList, "LiveClassroom">;

export default function LiveClassroomScreen({ route }: Props) {
  const { courseId, courseTitle } = route.params;
  const [session, setSession] = useState<LiveKitSession | null>(null);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [tokenPayload, liveMessages] = await Promise.all([
          api.getLiveKitToken(courseId),
          api.getLiveMessages(courseId),
        ]);
        if (!active) return;
        setSession(tokenPayload);
        setMessages(liveMessages);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Impossible de rejoindre la classe live");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
      api.leaveLiveAttendance(courseId).catch(() => undefined);
    };
  }, [courseId]);

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    try {
      const message = { id: String(Date.now()), text };
      await api.saveLiveMessage(courseId, message);
      const refreshed = await api.getLiveMessages(courseId);
      setMessages(refreshed);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible");
    } finally {
      setSending(false);
    }
  };

  return (
    <ScreenContainer
      title={courseTitle || "Classe live"}
      subtitle={session ? `Salle ${session.roomName}` : "Connexion à LiveKit"}
      loading={loading}
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {session ? (
        <View style={styles.sessionCard}>
          <Text style={styles.sessionLabel}>Session LiveKit connectée</Text>
          <Text style={styles.sessionMeta}>Participant : {session.participantName}</Text>
          <Text style={styles.sessionMeta}>Démarrée : {new Date(session.startedAt).toLocaleString("fr-FR")}</Text>
          <Text style={styles.sessionHint}>
            L'audio/vidéo native nécessite un build de développement avec @livekit/react-native. Le chat live et le token API sont opérationnels.
          </Text>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Chat live</Text>
      <FlatList
        data={messages}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={[styles.message, item.isMe && styles.messageMe]}>
            <Text style={styles.messageSender}>{item.sender} · {item.time}</Text>
            <Text style={styles.messageText}>{item.text}</Text>
          </View>
        )}
        style={styles.list}
        contentContainerStyle={{ paddingBottom: spacing.md }}
      />

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          placeholder="Écrire un message..."
          placeholderTextColor={colors.textMuted}
          value={draft}
          onChangeText={setDraft}
        />
        <Button label="Envoyer" loading={sending} onPress={sendMessage} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sessionCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sessionLabel: { color: colors.success, fontWeight: "800" },
  sessionMeta: { color: colors.textSoft, marginTop: 4 },
  sessionHint: { color: colors.textMuted, marginTop: spacing.sm, lineHeight: 18, fontSize: 12 },
  sectionTitle: { color: colors.text, fontWeight: "800", marginBottom: spacing.sm },
  list: { flex: 1 },
  message: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  messageMe: {
    backgroundColor: "#312e81",
  },
  messageSender: { color: colors.textMuted, fontSize: 11 },
  messageText: { color: colors.text, marginTop: 4 },
  composer: { gap: spacing.sm, paddingBottom: spacing.md },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.text,
  },
  error: { color: colors.danger, marginBottom: spacing.md },
});
