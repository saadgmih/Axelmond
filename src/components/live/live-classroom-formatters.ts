import { ClipboardList, MessageSquare, PenTool, PieChart, Users } from "lucide-react";

export const liveSidebarTabs = [
  { id: "participants", label: "Participants", icon: Users },
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "whiteboard", label: "Tableau blanc", icon: PenTool },
  { id: "tools", label: "Outils", icon: PieChart },
  { id: "attendance", label: "Présence", icon: ClipboardList },
];

export function formatLiveDuration(seconds: number) {
  const safe = Math.max(0, seconds || 0);
  const minutes = Math.floor(safe / 60);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours > 0) return `${hours}h ${String(rest).padStart(2, "0")}m`;
  return `${rest}m ${String(safe % 60).padStart(2, "0")}s`;
}

export function formatLiveStat(count: number, singular: string, plural: string) {
  return `${count} ${count <= 1 ? singular : plural}`;
}

export function liveRoleLabel(role?: string) {
  if (role === "ADMIN") return "Administrateur";
  if (role === "RESEARCHER") return "Professeur";
  if (role === "PROFESSOR") return "Professeur";
  return "Étudiant";
}

export function liveQualityLabel(value?: string) {
  const normalized = String(value || "").toLowerCase();
  if (normalized.includes("excellent")) return "Excellente";
  if (normalized.includes("good")) return "Bonne";
  if (normalized.includes("poor")) return "Faible";
  if (normalized.includes("lost")) return "Perdue";
  return "Stable";
}
