export function charityAccessCodeSnapshot(code: {
  id: string;
  codeSuffix: string;
  isActive: boolean;
  createdAt: Date | string;
  disabledAt?: Date | string | null;
  createdByAdminId?: string | null;
  _count?: { usages: number };
}) {
  return {
    id: code.id,
    codeSuffix: code.codeSuffix,
    isActive: code.isActive,
    usageCount: code._count?.usages ?? 0,
    createdAt: code.createdAt instanceof Date ? code.createdAt.toISOString() : code.createdAt,
    disabledAt:
      code.disabledAt instanceof Date
        ? code.disabledAt.toISOString()
        : code.disabledAt || null,
    createdByAdminId: code.createdByAdminId || null,
  };
}

export function charityCodeUsageSnapshot(usage: {
  id: string;
  usedAt: Date | string;
  user?: { id: string; fullName: string; email: string } | null;
}) {
  return {
    id: usage.id,
    usedAt: usage.usedAt instanceof Date ? usage.usedAt.toISOString() : usage.usedAt,
    userId: usage.user?.id || null,
    userName: usage.user?.fullName || null,
    userEmail: usage.user?.email || null,
  };
}

export function charityEventSnapshot(event: {
  id: string;
  title: string;
  description: string;
  eventDateTime: Date | string;
  location: string;
  isActive: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}) {
  const dt = event.eventDateTime instanceof Date ? event.eventDateTime : new Date(event.eventDateTime);
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    eventDateTime: dt.toISOString(),
    year: dt.getFullYear(),
    month: dt.getMonth() + 1,
    day: dt.getDate(),
    hour: dt.getHours(),
    minute: dt.getMinutes(),
    location: event.location,
    isActive: event.isActive,
    createdAt:
      event.createdAt instanceof Date ? event.createdAt.toISOString() : event.createdAt || null,
    updatedAt:
      event.updatedAt instanceof Date ? event.updatedAt.toISOString() : event.updatedAt || null,
  };
}

export function donationCampaignSnapshot(campaign: {
  id: string;
  title: string;
  description: string;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  _count?: { donations: number };
}) {
  return {
    id: campaign.id,
    title: campaign.title,
    description: campaign.description,
    isActive: campaign.isActive,
    donationCount: campaign._count?.donations ?? 0,
    createdAt: campaign.createdAt instanceof Date ? campaign.createdAt.toISOString() : campaign.createdAt,
    updatedAt: campaign.updatedAt instanceof Date ? campaign.updatedAt.toISOString() : campaign.updatedAt,
  };
}

export function donationSnapshot(donation: {
  id: string;
  amount: number;
  status: string;
  paymentReference?: string | null;
  createdAt: Date | string;
  user?: { id: string; fullName: string; email: string } | null;
  campaign?: { id: string; title: string } | null;
}) {
  return {
    id: donation.id,
    amount: donation.amount,
    status: donation.status,
    paymentReference: donation.paymentReference || null,
    createdAt: donation.createdAt instanceof Date ? donation.createdAt.toISOString() : donation.createdAt,
    userId: donation.user?.id || null,
    userName: donation.user?.fullName || null,
    userEmail: donation.user?.email || null,
    campaignId: donation.campaign?.id || null,
    campaignTitle: donation.campaign?.title || null,
  };
}

export function buildCharityEventDateTime(parts: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}): Date {
  return new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0, 0);
}
