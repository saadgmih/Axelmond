import type { ReactNode } from "react";

interface TeacherWorkspaceProps {
  children: ReactNode;

  immersive?: boolean;
}

export default function TeacherWorkspace({ children, immersive }: TeacherWorkspaceProps) {
  if (immersive) {
    return <div className="w-full p-4 sm:p-6 md:p-8 pb-8 animate-in fade-in duration-200">{children}</div>;
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[160rem] mx-auto w-full space-y-6 md:space-y-8 animate-in fade-in duration-200">
      {children}
    </div>
  );
}
