export type UniOfficeTab = "lecture" | "annotation" | "confort" | "securite";

export type UniOfficeTheme = "normal" | "dark" | "sepia" | "emerald";

export type UniOfficeTool = "select" | "highlighter" | "pen" | "eraser";

export interface AnnotationPoint {
  x: number; // Normalized (0.0 to 1.0)
  y: number; // Normalized (0.0 to 1.0)
}

export interface AnnotationStroke {
  id: string;
  tool: "highlighter" | "pen";
  color: string;
  width: number;
  points: AnnotationPoint[];
}

export interface UniOfficeWatermarkInfo {
  studentName?: string;
  studentEmail?: string;
  studentId?: string;
  courseTitle?: string;
  documentTitle?: string;
  sessionTimestamp?: string;
}
