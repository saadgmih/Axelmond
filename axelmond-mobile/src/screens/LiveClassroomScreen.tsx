import { useCallback, useEffect, useState } from "react";
import { FlatList, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  AudioSession,
  LiveKitRoom,
  VideoTrack,
  isTrackReference,
  useConnectionState,
  useLocalParticipant,
  useParticipants,
  useTracks,
} from "@livekit/react-native";
import { ConnectionState, Track } from "livekit-client";
import Button from "../components/Button";
import ScreenContainer from "../components/ScreenContainer";
import { useLiveKitRoom } from "../hooks/useLiveKitRoom";
import { useLivePermissions } from "../hooks/useLivePermissions";
import { useTheme } from "../hooks/useTheme";
import type { StudentStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<StudentStackParamList, "LiveClassroom">;

function connectionLabel(state: ConnectionState | LiveConnectionUiState): string {
  switch (state) {
    case ConnectionState.Connecting:
    case "connecting":
    case "fetching":
      return "Connexion à la salle…";
    case ConnectionState.Connected:
    case "connected":
      return "Connecté";
    case ConnectionState.Disconnected:
    case "disconnected":
      return "Déconnecté";
    case ConnectionState.Reconnecting:
      return "Reconnexion…";
    case "error":
      return "Erreur de connexion";
    default:
      return "Préparation…";
  }
}

type LiveConnectionUiState = "idle" | "fetching" | "connecting" | "connected" | "disconnected" | "error";

type LiveRoomBodyProps = {
  courseTitle: string;
  uiState: LiveConnectionUiState;
  onLeave: () => void;
};

function LiveRoomBody({ courseTitle, uiState, onLeave }: LiveRoomBodyProps) {
  const { theme } = useTheme();
  const roomState = useConnectionState();
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const cameraTracks = useTracks([Track.Source.Camera]);
  const [micEnabled, setMicEnabled] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await AudioSession.startAudioSession();
      } catch {
        if (active) setMediaError("Session audio indisponible sur cet appareil.");
      }
    })();
    return () => {
      active = false;
      AudioSession.stopAudioSession();
    };
  }, []);

  const toggleMic = async () => {
    try {
      const next = !micEnabled;
      await localParticipant.setMicrophoneEnabled(next);
      setMicEnabled(next);
      setMediaError(null);
    } catch {
      setMediaError("Microphone inaccessible. Vérifiez les permissions.");
    }
  };

  const toggleCamera = async () => {
    try {
      const next = !cameraEnabled;
      await localParticipant.setCameraEnabled(next);
      setCameraEnabled(next);
      setMediaError(null);
    } catch {
      setMediaError("Caméra inaccessible. Vérifiez les permissions.");
    }
  };

  const status = roomState === ConnectionState.Connected ? uiState : roomState;

  return (
    <View style={styles.roomRoot}>
      <View style={[styles.statusBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text style={[styles.statusText, { color: theme.colors.textSoft }]}>
          {courseTitle} · {connectionLabel(status)}
        </Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 4 }}>
          {participants.length} participant(s)
        </Text>
      </View>

      {mediaError ? (
        <Text style={{ color: theme.colors.warning, marginBottom: 8 }}>{mediaError}</Text>
      ) : null}

      <FlatList
        data={cameraTracks.filter(isTrackReference)}
        keyExtractor={(item) => item.publication.trackSid}
        numColumns={2}
        columnWrapperStyle={styles.videoRow}
        contentContainerStyle={styles.videoList}
        ListEmptyComponent={
          <View style={[styles.emptyVideo, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
            <Text style={{ color: theme.colors.textMuted, textAlign: "center" }}>
              Aucune vidéo active. Activez votre caméra ou attendez les autres participants.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.videoTile, { borderColor: theme.colors.border, backgroundColor: theme.colors.backgroundDeep }]}>
            <VideoTrack trackRef={item} style={styles.video} />
            <Text style={[styles.participantName, { color: theme.colors.text }]}>
              {item.participant.name || item.participant.identity}
              {item.participant.isLocal ? " (vous)" : ""}
            </Text>
          </View>
        )}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.participantStrip}>
        {participants.map((participant) => (
          <View
            key={participant.identity}
            style={[styles.participantChip, { backgroundColor: theme.colors.cardGlow, borderColor: theme.colors.border }]}
          >
            <Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: "600" }}>
              {participant.name || participant.identity}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.controls}>
        <Button
          label={micEnabled ? "Couper le micro" : "Activer le micro"}
          variant={micEnabled ? "primary" : "secondary"}
          onPress={toggleMic}
          style={styles.controlBtn}
        />
        <Button
          label={cameraEnabled ? "Couper la caméra" : "Activer la caméra"}
          variant={cameraEnabled ? "primary" : "secondary"}
          onPress={toggleCamera}
          style={styles.controlBtn}
        />
        <Button label="Quitter" variant="danger" onPress={onLeave} style={styles.controlBtn} />
      </View>
    </View>
  );
}

export default function LiveClassroomScreen({ route, navigation }: Props) {
  const { courseId, courseTitle } = route.params;
  const { theme } = useTheme();
  const permissions = useLivePermissions();
  const {
    session,
    shouldConnect,
    connectionState,
    error,
    joinRoom,
    leaveRoom,
    handleConnected,
    handleDisconnected,
    handleError,
  } = useLiveKitRoom(courseId);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  const beginJoin = useCallback(async () => {
    setPermissionError(null);
    const granted = await permissions.ensurePermissions();
    if (!granted) {
      setPermissionError(
        permissions.blocked
          ? "Caméra ou microphone bloqués. Autorisez l'accès dans les paramètres du téléphone."
          : "Autorisez la caméra et le microphone pour rejoindre le live.",
      );
      return;
    }
    setStarted(true);
    await joinRoom();
  }, [joinRoom, permissions]);

  useEffect(() => {
    beginJoin();
  }, [courseId, beginJoin]);

  const handleLeave = () => {
    leaveRoom();
    navigation.goBack();
  };

  if (Platform.OS === "web") {
    return (
      <ScreenContainer title="Cours en direct" subtitle={courseTitle}>
        <Text style={{ color: theme.colors.textSoft, lineHeight: 22 }}>
          La salle LiveKit nécessite un dev build Android ou iPhone (Expo Dev Client). Elle n'est pas disponible via Expo Web.
        </Text>
        <Button label="Retour" variant="secondary" onPress={() => navigation.goBack()} style={{ marginTop: 16 }} />
      </ScreenContainer>
    );
  }

  const showPermissionGate = permissionError && !session;
  const showLoading = !showPermissionGate && !session && connectionState !== "error";
  const showError = connectionState === "error" || Boolean(error);

  return (
    <ScreenContainer title="Cours en direct" subtitle={courseTitle}>
      {showPermissionGate ? (
        <View style={styles.centerBox}>
          <Text style={{ color: theme.colors.warning, lineHeight: 22, marginBottom: 16 }}>{permissionError}</Text>
          <Button label="Réessayer" onPress={beginJoin} style={{ marginBottom: 8 }} />
          {permissions.blocked ? (
            <Button label="Ouvrir les paramètres" variant="secondary" onPress={permissions.openSettings} />
          ) : null}
          <Button label="Retour" variant="ghost" onPress={handleLeave} style={{ marginTop: 8 }} />
        </View>
      ) : null}

      {showLoading && started ? (
        <View style={styles.centerBox}>
          <Text style={{ color: theme.colors.textSoft }}>{connectionLabel(connectionState)}</Text>
        </View>
      ) : null}

      {showError ? (
        <View style={styles.centerBox}>
          <Text style={{ color: theme.colors.danger, marginBottom: 16 }}>{error || "Connexion impossible"}</Text>
          <Button label="Réessayer" onPress={beginJoin} style={{ marginBottom: 8 }} />
          <Button label="Retour" variant="secondary" onPress={handleLeave} />
        </View>
      ) : null}

      {session && shouldConnect ? (
        <LiveKitRoom
          serverUrl={session.url}
          token={session.token}
          connect={shouldConnect}
          audio={false}
          video={false}
          options={{ adaptiveStream: true, dynacast: true }}
          onConnected={handleConnected}
          onDisconnected={handleDisconnected}
          onError={handleError}
        >
          <LiveRoomBody courseTitle={courseTitle} uiState={connectionState} onLeave={handleLeave} />
        </LiveKitRoom>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  roomRoot: { flex: 1 },
  statusBar: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  statusText: { fontWeight: "700", fontSize: 14 },
  videoList: { paddingBottom: 8 },
  videoRow: { gap: 8, marginBottom: 8 },
  videoTile: { flex: 1, borderRadius: 12, borderWidth: 1, overflow: "hidden", minHeight: 180 },
  video: { width: "100%", height: 160, backgroundColor: "#000" },
  participantName: { padding: 8, fontSize: 12, fontWeight: "600" },
  emptyVideo: { borderWidth: 1, borderRadius: 12, padding: 24, marginBottom: 12 },
  participantStrip: { maxHeight: 44, marginBottom: 12 },
  participantChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 },
  controls: { gap: 8, marginTop: "auto", paddingTop: 8 },
  controlBtn: { width: "100%" },
  centerBox: { flex: 1, justifyContent: "center", paddingVertical: 24 },
});
