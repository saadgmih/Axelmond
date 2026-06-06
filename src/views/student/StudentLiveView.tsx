import VirtualClassroom, { type VirtualClassroomProps } from "../../components/VirtualClassroom";

type StudentLiveViewProps = Omit<VirtualClassroomProps, "mode">;

export default function StudentLiveView(props: StudentLiveViewProps) {
  return <VirtualClassroom {...props} mode="student" />;
}
