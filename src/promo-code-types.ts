export type PromoDiscountType = "PERCENTAGE" | "FIXED";
export type PromoStatus = "DRAFT" | "SCHEDULED" | "ACTIVE" | "PAUSED" | "EXPIRED" | "DISABLED" | "ARCHIVED";
export type PromoEligibilityScope =
  | "ALL_STUDENTS"
  | "NEW_STUDENTS"
  | "EXISTING_STUDENTS"
  | "SELECTED_USERS"
  | "SELECTED_FILIERES";

export type PromoCalendarDuration = {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export type PromoCodeView = {
  id: string;
  code: string;
  internalName: string;
  publicDescription: string | null;
  internalDescription: string | null;
  discountType: PromoDiscountType;
  discountValue: number;
  maximumDiscountAmount: number | null;
  minimumPurchaseAmount: number | null;
  currency: string;
  startsAt: string;
  endsAt: string;
  relativeDuration: PromoCalendarDuration | null;
  administrativeStatus: PromoStatus;
  effectiveStatus: PromoStatus;
  remainingDuration: string;
  appliesToAllModules: boolean;
  eligibilityScope: PromoEligibilityScope;
  firstPurchaseOnly: boolean;
  maxTotalUses: number | null;
  maxUsesPerUser: number | null;
  totalReservedUses: number;
  totalConfirmedUses: number;
  stackable: boolean;
  priority: number;
  version: number;
  modules: Array<{ id: number; title: string; price: number }>;
  eligibleUsers: Array<{ id: string; fullName: string; email: string; filiere: string | null }>;
  eligibleFilieres: string[];
  createdBy: { id: string; fullName: string; email: string };
  createdAt: string;
  updatedAt: string;
  disabledAt: string | null;
  archivedAt: string | null;
};

export type PromoCodeDetails = PromoCodeView & {
  statistics: {
    confirmedUses: number;
    activeReservations: number;
    cancelledOrReleased: number;
    cancelledUses: number;
    releasedUses: number;
    refundedUses: number;
    totalOriginalAmount: number;
    totalDiscountAmount: number;
    totalPaidAmount: number;
    paypalUses: number;
    centerUses: number;
    freeUses: number;
    topModules: Array<{ id: number; title: string; uses: number }>;
  };
  auditLog: Array<{
    id: string;
    action: string;
    reason: string | null;
    previousValues: unknown;
    newValues: unknown;
    actor: { id: string; fullName: string; email: string } | null;
    createdAt: string;
  }>;
  usages: Array<{
    id: string;
    status: string;
    provider: "PAYPAL" | "CENTER" | "FREE";
    user: { id: string; fullName: string; email: string };
    module: { id: number; title: string };
    originalAmount: number;
    discountAmount: number;
    finalAmount: number;
    currency: string;
    reservedAt: string;
    confirmedAt: string | null;
    releasedAt: string | null;
    expiresAt: string | null;
  }>;
};

export type PromoQuote = {
  promoCodeId: string;
  code: string;
  description: string | null;
  discountType: PromoDiscountType;
  discountValue: number;
  maximumDiscountAmount: number | null;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  currency: string;
  validUntil: string;
  provisional: true;
};

export type PromoCodeInput = {
  code: string;
  internalName: string;
  publicDescription?: string;
  internalDescription?: string;
  discountType: PromoDiscountType;
  discountValue: number;
  maximumDiscountAmount?: number | null;
  minimumPurchaseAmount?: number | null;
  startsAt: string;
  endsAt?: string;
  duration?: PromoCalendarDuration | null;
  administrativeStatus: PromoStatus;
  appliesToAllModules: boolean;
  courseIds: number[];
  eligibilityScope: PromoEligibilityScope;
  eligibleUserIds?: string[];
  eligibleFilieres?: string[];
  firstPurchaseOnly: boolean;
  maxTotalUses?: number | null;
  maxUsesPerUser?: number | null;
  priority?: number;
  version?: number;
  reason?: string;
};
