import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { getClientErrorMessage } from "../client-errors";

export interface CharityCampaign {
  id: string;
  title: string;
  description: string;
  isActive: boolean;
}

export interface CharityEvent {
  id: string;
  title: string;
  description: string;
  eventDateTime: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  location: string;
}

export interface CharityDonation {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  campaignTitle?: string | null;
}

export function formatDonationStatus(status: string): string {
  switch (status) {
    case "PENDING":
      return "En attente";
    case "COMPLETED":
      return "Payé";
    case "CANCELLED":
      return "Annulé";
    case "REFUNDED":
      return "Remboursé";
    default:
      return status;
  }
}

export function useCharity() {
  const [accessStatus, setAccessStatus] = useState({
    pageEnabled: false,
    hasAccess: false,
    needsCode: false,
  });
  const [campaigns, setCampaigns] = useState<CharityCampaign[]>([]);
  const [events, setEvents] = useState<CharityEvent[]>([]);
  const [donations, setDonations] = useState<CharityDonation[]>([]);
  const [paymentEnabled, setPaymentEnabled] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);

  const refreshAccessStatus = useCallback(async () => {
    try {
      const status = await api.getCharityAccessStatus();
      setAccessStatus(status);
      return status;
    } catch (err) {
      setStatusMsg(getClientErrorMessage(err, "Statut d'accès indisponible"));
      return null;
    }
  }, []);

  const refreshContent = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getCharityContent();
      setCampaigns(data.campaigns || []);
      setEvents(data.events || []);
      setDonations(data.donations || []);
      setPaymentEnabled(Boolean(data.paymentEnabled));
      setPaymentNotice(data.paymentNotice || "");
      setStatusMsg("");
    } catch (err) {
      setStatusMsg(getClientErrorMessage(err, "Contenu indisponible"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let disposed = false;
    void (async () => {
      const status = await refreshAccessStatus();
      if (disposed || !status?.hasAccess) {
        if (!disposed) setIsLoading(false);
        return;
      }
      await refreshContent();
    })();
    return () => {
      disposed = true;
    };
  }, [refreshAccessStatus, refreshContent]);

  const verifyCode = async (code: string) => {
    setIsVerifying(true);
    setStatusMsg("");
    try {
      await api.verifyCharityCode(code);
      const status = await refreshAccessStatus();
      if (status?.hasAccess) {
        await refreshContent();
        setStatusMsg("Accès accordé. Merci.");
      }
    } catch (err) {
      setStatusMsg(getClientErrorMessage(err, "Code invalide"));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDonationPaid = async () => {
    setStatusMsg("Don enregistré et payé avec succès. Merci pour votre générosité.");
    await refreshContent();
  };

  return {
    accessStatus,
    campaigns,
    events,
    donations,
    paymentEnabled,
    paymentNotice,
    statusMsg,
    isLoading,
    isVerifying,
    verifyCode,
    refreshContent,
    handleDonationPaid,
    formatDonationStatus,
  };
}
