import type { ReactNode } from "react";

interface TeacherWorkspaceProps {
  children: ReactNode;
}

export default function TeacherWorkspace({ children }: TeacherWorkspaceProps) {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {children}
    </div>
  );
}
