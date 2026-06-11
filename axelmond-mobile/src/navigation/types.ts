import type { NavigatorScreenParams } from "@react-navigation/native";

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type StudentTabParamList = {
  StudentDashboard: undefined;
  CourseCatalog: undefined;
  StudentProfile: undefined;
};

export type TeacherTabParamList = {
  TeacherDashboard: undefined;
  CourseCatalog: undefined;
  TeacherProfile: undefined;
};

export type StudentStackParamList = {
  StudentTabs: NavigatorScreenParams<StudentTabParamList>;
  CourseDetails: { courseId: number };
};

export type TeacherStackParamList = {
  TeacherTabs: NavigatorScreenParams<TeacherTabParamList>;
  CourseDetails: { courseId: number };
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  StudentApp: NavigatorScreenParams<StudentStackParamList>;
  TeacherApp: NavigatorScreenParams<TeacherStackParamList>;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
