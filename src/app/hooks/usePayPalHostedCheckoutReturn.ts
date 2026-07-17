import { useEffect, type Dispatch, type SetStateAction } from "react";
import { isStudentRole } from "../../rbac";
import type { AppUser } from "../../shared/app-user";
import type { Course } from "../../types";
import { clearPayPalReturnQuery, readPendingPayPalCheckout } from "../../utils/paypal-hosted-checkout";

export function usePayPalHostedCheckoutReturn(
  isAuthReady: boolean,
  currentUser: AppUser | null,
  courses: Course[],
  setCourseToPurchase: Dispatch<SetStateAction<Course | null>>,
) {
  useEffect(() => {
    if (!isAuthReady || !currentUser || !isStudentRole(currentUser.role)) return;

    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get("payment");
    if (paymentStatus !== "success" && paymentStatus !== "cancel") return;

    const pending = readPendingPayPalCheckout();
    if (!pending) {
      clearPayPalReturnQuery();
      return;
    }

    const checkoutCourse = courses.find((course) => course.id === pending.courseId);
    if (checkoutCourse) setCourseToPurchase(checkoutCourse);
  }, [courses, currentUser?.id, currentUser?.role, isAuthReady, setCourseToPurchase]);
}
