import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { CHARITY_PAGE_DISABLED_MSG, CHARITY_PAGE_ENABLED_MSG } from "../charity-labels";
import { getClientErrorMessage } from "../client-errors";

export interface CharityAccessCodeRow {
  id: string;
  codeSuffix: string;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  disabledAt?: string | null;
}

export interface CharityEventRow {
  id: string;
  title: string;
  description: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  location: string;
  isActive: boolean;
}

export interface CharityCampaignRow {
  id: string;
  title: string;
  description: string;
  isActive: boolean;
  donationCount: number;
}

export function useCharityAdmin(enabled: boolean) {
  const [pageEnabled, setPageEnabled] = useState(false);
  const [stats, setStats] = useState({
    activeCodes: 0,
    totalUsages: 0,
    activeCampaigns: 0,
    upcomingEvents: 0,
    pendingDonations: 0,
  });
  const [accessCodes, setAccessCodes] = useState<CharityAccessCodeRow[]>([]);
  const [events, setEvents] = useState<CharityEventRow[]>([]);
  const [campaigns, setCampaigns] = useState<CharityCampaignRow[]>([]);
  const [donations, setDonations] = useState<any[]>([]);
  const [codeUsages, setCodeUsages] = useState<any[]>([]);
  const [selectedCodeId, setSelectedCodeId] = useState<string | null>(null);
  const [lastCreatedCode, setLastCreatedCode] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const refreshAll = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    try {
      const [settings, codes, eventRows, campaignRows, donationRows] = await Promise.all([
        api.getAdminCharitySettings(),
        api.getAdminCharityAccessCodes(),
        api.getAdminCharityEvents(),
        api.getAdminCharityCampaigns(),
        api.getAdminCharityDonations(),
      ]);
      setPageEnabled(settings.pageEnabled);
      setStats(settings.stats);
      setAccessCodes(codes);
      setEvents(eventRows);
      setCampaigns(campaignRows);
      setDonations(donationRows);
      setStatusMsg("");
    } catch (err) {
      setStatusMsg(getClientErrorMessage(err, "Données bienfaisance indisponibles"));
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const togglePage = async (next: boolean) => {
    setIsSaving(true);
    try {
      const result = await api.updateAdminCharitySettings(next);
      setPageEnabled(result.pageEnabled);
      setStatusMsg(next ? CHARITY_PAGE_ENABLED_MSG : CHARITY_PAGE_DISABLED_MSG);
      await refreshAll();
    } catch (err) {
      setStatusMsg(getClientErrorMessage(err, "Modification impossible"));
    } finally {
      setIsSaving(false);
    }
  };

  const createAccessCode = async (deactivateOthers = false) => {
    setIsSaving(true);
    try {
      const created = await api.createAdminCharityAccessCode({ deactivateOthers });
      setLastCreatedCode(created.code || "");
      setStatusMsg(
        deactivateOthers
          ? "Nouveau code créé. Les anciens codes ont été désactivés."
          : "Nouveau code créé. Copiez-le maintenant : il ne sera plus affiché.",
      );
      await refreshAll();
    } catch (err) {
      setStatusMsg(getClientErrorMessage(err, "Création du code impossible"));
    } finally {
      setIsSaving(false);
    }
  };

  const deactivateCode = async (id: string) => {
    setIsSaving(true);
    try {
      await api.deactivateAdminCharityAccessCode(id);
      setStatusMsg("Code désactivé.");
      await refreshAll();
    } catch (err) {
      setStatusMsg(getClientErrorMessage(err, "Désactivation impossible"));
    } finally {
      setIsSaving(false);
    }
  };

  const loadCodeUsages = async (id: string) => {
    setSelectedCodeId(id);
    try {
      const usages = await api.getAdminCharityCodeUsages(id);
      setCodeUsages(usages);
    } catch (err) {
      setStatusMsg(getClientErrorMessage(err, "Historique d'utilisation indisponible"));
    }
  };

  const saveEvent = async (data: Record<string, unknown>, id?: string) => {
    setIsSaving(true);
    try {
      if (id) await api.updateAdminCharityEvent(id, data);
      else await api.createAdminCharityEvent(data);
      setStatusMsg(id ? "Événement mis à jour." : "Événement créé.");
      await refreshAll();
    } catch (err) {
      setStatusMsg(getClientErrorMessage(err, "Enregistrement de l'événement impossible"));
    } finally {
      setIsSaving(false);
    }
  };

  const removeEvent = async (id: string) => {
    setIsSaving(true);
    try {
      await api.deleteAdminCharityEvent(id);
      setStatusMsg("Événement supprimé.");
      await refreshAll();
    } catch (err) {
      setStatusMsg(getClientErrorMessage(err, "Suppression impossible"));
    } finally {
      setIsSaving(false);
    }
  };

  const saveCampaign = async (data: { title: string; description: string; isActive?: boolean }, id?: string) => {
    setIsSaving(true);
    try {
      if (id) await api.updateAdminCharityCampaign(id, data);
      else await api.createAdminCharityCampaign(data);
      setStatusMsg(id ? "Campagne mise à jour." : "Campagne créée.");
      await refreshAll();
    } catch (err) {
      setStatusMsg(getClientErrorMessage(err, "Enregistrement de la campagne impossible"));
    } finally {
      setIsSaving(false);
    }
  };

  const removeCampaign = async (id: string) => {
    setIsSaving(true);
    try {
      await api.deleteAdminCharityCampaign(id);
      setStatusMsg("Campagne supprimée.");
      await refreshAll();
    } catch (err) {
      setStatusMsg(getClientErrorMessage(err, "Suppression impossible"));
    } finally {
      setIsSaving(false);
    }
  };

  return {
    pageEnabled,
    stats,
    accessCodes,
    events,
    campaigns,
    donations,
    codeUsages,
    selectedCodeId,
    lastCreatedCode,
    statusMsg,
    isLoading,
    isSaving,
    refreshAll,
    togglePage,
    createAccessCode,
    deactivateCode,
    loadCodeUsages,
    saveEvent,
    removeEvent,
    saveCampaign,
    removeCampaign,
    setLastCreatedCode,
  };
}
