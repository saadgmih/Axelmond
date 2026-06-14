import {
  Code,
  Database,
  Terminal,
  Cpu,
  Brain,
  GraduationCap,
  Calculator,
  Atom,
  FlaskConical,
  Dna,
  HeartPulse,
  BrainCircuit,
  Building2,
  BriefcaseBusiness,
  CircuitBoard,
  Lightbulb,
} from "lucide-react";

export function getCourseIcon(iconName: string, colorClass = "w-6 h-6") {
  switch (iconName) {
    case "Code":
      return <Code className={colorClass} />;
    case "Database":
      return <Database className={colorClass} />;
    case "Terminal":
      return <Terminal className={colorClass} />;
    case "Brain":
      return <Brain className={colorClass} />;
    default:
      return <Cpu className={colorClass} />;
  }
}

export function getDomainIcon(iconName: string, colorClass = "w-6 h-6") {
  switch (iconName) {
    case "Calculator":
      return <Calculator className={colorClass} />;
    case "Atom":
      return <Atom className={colorClass} />;
    case "FlaskConical":
      return <FlaskConical className={colorClass} />;
    case "Dna":
      return <Dna className={colorClass} />;
    case "HeartPulse":
      return <HeartPulse className={colorClass} />;
    case "BrainCircuit":
      return <BrainCircuit className={colorClass} />;
    case "Building2":
      return <Building2 className={colorClass} />;
    case "BriefcaseBusiness":
      return <BriefcaseBusiness className={colorClass} />;
    case "CircuitBoard":
      return <CircuitBoard className={colorClass} />;
    case "Lightbulb":
      return <Lightbulb className={colorClass} />;
    default:
      return <GraduationCap className={colorClass} />;
  }
}

export function getInitials(name: string) {
  if (!name) return "UN";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}
