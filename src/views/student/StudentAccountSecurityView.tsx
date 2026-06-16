import AccountSecurityView from "../shared/AccountSecurityView";
import type { AppUser } from "../../components/AuthScreen";

interface StudentAccountSecurityViewProps {
  currentUser: AppUser | null;
}

export default function StudentAccountSecurityView({ currentUser }: StudentAccountSecurityViewProps) {
  return <AccountSecurityView currentUser={currentUser} audienceLabel="Compte étudiant" />;
}
