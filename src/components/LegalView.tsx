import React from "react";
import { useInView } from "../hooks/useInView";
import {
  Building2,
  User,
  Server,
  Copyright,
  AlertTriangle,
  Shield,
  Mail,
  Info,
  Globe,
  CheckCircle,
  ExternalLink,
  Scale,
  Lock,
  BookOpen,
  Cpu,
  PhoneCall,
  MapPin,
} from "lucide-react";
import {
  InstitutionalPageRoot,
  InstitutionalHero,
  InstitutionalFade,
  InstitutionalCard,
  InstitutionalSectionHeader,
  InstitutionalInfoRow,
  InstitutionalCheckList,
} from "./legal/InstitutionalPageShell";
import {
  PERFORMANCE_ACADEMIQUE_ADDRESS,
  PERFORMANCE_ACADEMIQUE_COORDINATES,
  PERFORMANCE_ACADEMIQUE_LOCATION,
} from "../utils/institution-location";

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LegalView() {
  const heroRef = useInView(0.1);
  const s1 = useInView();
  const s2 = useInView();
  const s3 = useInView();
  const s4 = useInView();
  const s5 = useInView();
  const s6 = useInView();
  const s7 = useInView();
  const s8 = useInView();

  return (
    <InstitutionalPageRoot>
      <InstitutionalHero
        heroRef={heroRef}
        gradientClass="via-slate-900/50"
        topBlobClass="top-0 right-0 w-[480px] h-[480px] bg-indigo-600/5 rounded-full translate-x-60 -translate-y-60"
        bottomBlobClass="bottom-0 left-0 w-80 h-80 bg-violet-600/5 rounded-full -translate-x-40 translate-y-40"
      >
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
          {/* Left */}
          <div className="space-y-5 max-w-2xl">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 bg-slate-700/40 border border-slate-700/60 px-3 py-1 rounded-full inline-flex items-center gap-1.5">
              <Scale className="w-3 h-3" />
              Document juridique officiel
            </span>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
              Mentions{" "}
              <span className="bg-gradient-to-r from-slate-300 via-slate-100 to-slate-200 bg-clip-text text-transparent">
                légales
              </span>
            </h1>
            <p className="text-slate-400 text-sm md:text-base leading-relaxed">
              Les présentes mentions légales régissent les conditions générales d'édition et de publication de la
              plateforme <strong className="text-white">Performance Académique</strong>, conformément aux dispositions
              légales en vigueur au Maroc.
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { label: "Droit marocain", color: "text-slate-300 border-slate-600 bg-slate-700/30" },
                { label: "Loi 09-08", color: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10" },
                { label: "CNDP", color: "text-sky-300 border-sky-500/30 bg-sky-500/10" },
              ].map(({ label, color }) => (
                <span
                  key={label}
                  className={`text-[10px] font-black uppercase tracking-widest border px-2.5 py-1 rounded-full ${color}`}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Right meta */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3 flex-shrink-0 min-w-0 sm:min-w-[220px]">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Dernière mise à jour</div>
              <div className="text-white font-black text-base mt-0.5">Juin 2026</div>
            </div>
            <div className="w-full h-px bg-slate-800" />
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Version</div>
              <div className="text-slate-300 font-black text-sm mt-0.5">v1.2.0</div>
            </div>
            <div className="w-full h-px bg-slate-800" />
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Tous droits réservés</div>
              <div className="text-white text-sm font-bold mt-0.5">© 2026 Performance Académique</div>
            </div>
          </div>
        </div>

        {/* Legal notice banner */}
        <div className="mt-8 bg-slate-900/60 border border-slate-700/50 rounded-2xl px-5 py-4 flex items-start gap-3">
          <Scale className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-slate-400 leading-relaxed">
            En application de la <strong className="text-white">loi n° 09-08</strong> relative à la protection des
            personnes physiques à l'égard du traitement des données à caractère personnel, les informations ci-dessous
            permettent à tout utilisateur d'identifier l'éditeur responsable de la plateforme Performance Académique.
          </p>
        </div>
      </InstitutionalHero>

      <div className="max-w-5xl mx-auto px-6 md:px-10 py-10 space-y-8">
        {/* ── 1. Éditeur ───────────────────────────────────────────────────── */}
        <div ref={s1.ref}>
          <InstitutionalFade inView={s1.inView}>
            <InstitutionalCard className="p-7 md:p-9">
              <InstitutionalSectionHeader
                number="01"
                emoji="🏢"
                icon={<Building2 className="w-5 h-5" />}
                title="Éditeur de la plateforme"
                accentClass="bg-indigo-500/15 border border-indigo-500/20"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InstitutionalInfoRow
                  label="Nom officiel"
                  value="Performance Académique"
                  icon={<Building2 className="w-3.5 h-3.5" />}
                />
                <InstitutionalInfoRow
                  label="Type"
                  value="Plateforme académique de formation, accompagnement et réussite"
                  icon={<BookOpen className="w-3.5 h-3.5" />}
                />
                <InstitutionalInfoRow
                  label="Site web"
                  value="axelmond.com"
                  icon={<Globe className="w-3.5 h-3.5" />}
                  mono
                />
                <InstitutionalInfoRow
                  label="Contact général"
                  value="contact@axelmond.com"
                  icon={<Mail className="w-3.5 h-3.5" />}
                  mono
                />
                <InstitutionalInfoRow
                  label="Adresse officielle"
                  value={PERFORMANCE_ACADEMIQUE_ADDRESS}
                  icon={<MapPin className="w-3.5 h-3.5" />}
                />
                <InstitutionalInfoRow
                  label="Coordonnées GPS"
                  value={PERFORMANCE_ACADEMIQUE_COORDINATES}
                  icon={<MapPin className="w-3.5 h-3.5" />}
                  mono
                />
              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { icon: "🎓", label: "Formation", desc: "Modules structurés multi-niveaux et disciplines" },
                  { icon: "📈", label: "Progression", desc: "Suivi pédagogique clair et mesurable" },
                  { icon: "🏅", label: "Réussite", desc: "Accompagnement académique orienté résultats" },
                ].map(({ icon, label, desc }) => (
                  <div
                    key={label}
                    className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 space-y-1.5 text-center hover:border-slate-700 transition-colors duration-200"
                  >
                    <div className="text-2xl">{icon}</div>
                    <div className="text-white text-sm font-bold">{label}</div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </InstitutionalCard>
          </InstitutionalFade>
        </div>

        {/* ── 2. Responsable de publication ────────────────────────────────── */}
        <div ref={s2.ref}>
          <InstitutionalFade inView={s2.inView}>
            <InstitutionalCard className="p-7 md:p-9">
              <InstitutionalSectionHeader
                number="02"
                emoji="👤"
                icon={<User className="w-5 h-5" />}
                title="Responsable de publication"
                accentClass="bg-violet-500/15 border border-violet-500/20"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-4">
                  <p className="text-[13px] text-slate-300 leading-relaxed">
                    La responsabilité éditoriale et la supervision de la publication des contenus sur la plateforme
                    Performance Académique sont assurées par{" "}
                    <strong className="text-white">l'administration de la plateforme</strong>, sous la direction de
                    l'équipe de direction de Performance Académique.
                  </p>
                  <p className="text-[13px] text-slate-300 leading-relaxed">
                    Le responsable de publication veille à la conformité des contenus publiés avec les réglementations
                    en vigueur, les règles académiques et les standards de qualité de la plateforme.
                  </p>
                  <InstitutionalCheckList
                    color="text-violet-400"
                    items={[
                      "Supervision de la qualité des contenus pédagogiques publiés",
                      "Conformité des publications avec les règles académiques et légales",
                      "Gestion des droits d'accès aux ressources de la plateforme",
                      "Coordination avec les professeurs contributeurs",
                    ]}
                  />
                </div>
                <div className="space-y-3">
                  <InstitutionalInfoRow
                    label="Entité responsable"
                    value="Administration Performance Académique"
                    icon={<User className="w-3.5 h-3.5" />}
                  />
                  <InstitutionalInfoRow
                    label="Rôle"
                    value="Direction éditoriale et supervision des contenus académiques"
                    icon={<BookOpen className="w-3.5 h-3.5" />}
                  />
                  <InstitutionalInfoRow
                    label="Contact éditorial"
                    value="contact@axelmond.com"
                    icon={<Mail className="w-3.5 h-3.5" />}
                    mono
                  />
                  <div className="bg-violet-950/20 border border-violet-800/30 rounded-xl px-4 py-3 flex items-start gap-2.5">
                    <Info className="w-3.5 h-3.5 text-violet-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-slate-400">
                      Toute demande de rectification ou de suppression de contenu peut être adressée directement au
                      responsable de publication via l'adresse de contact officielle.
                    </p>
                  </div>
                </div>
              </div>
            </InstitutionalCard>
          </InstitutionalFade>
        </div>

        {/* ── 3. Hébergement ───────────────────────────────────────────────── */}
        <div ref={s3.ref}>
          <InstitutionalFade inView={s3.inView}>
            <InstitutionalCard className="p-7 md:p-9">
              <InstitutionalSectionHeader
                number="03"
                emoji="🌐"
                icon={<Server className="w-5 h-5" />}
                title="Hébergement"
                accentClass="bg-sky-500/15 border border-sky-500/20"
              />
              <p className="text-[13px] text-slate-400 leading-relaxed mb-5">
                La plateforme Performance Académique est hébergée sur une{" "}
                <strong className="text-white">infrastructure sécurisée de niveau production</strong>, garantissant la
                disponibilité continue, la protection intégrité et la confidentialité de l'ensemble des données de la
                plateforme.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                {[
                  {
                    icon: <Cpu className="w-4 h-4 text-sky-400" />,
                    label: "Infrastructure",
                    value: "Serveurs cloud sécurisés",
                    border: "border-sky-800/30 bg-sky-950/15",
                  },
                  {
                    icon: <Shield className="w-4 h-4 text-emerald-400" />,
                    label: "Sécurité",
                    value: "HTTPS/TLS · Pare-feu actif",
                    border: "border-emerald-800/30 bg-emerald-950/15",
                  },
                  {
                    icon: <Globe className="w-4 h-4 text-violet-400" />,
                    label: "Disponibilité",
                    value: "99,9 % uptime SLA",
                    border: "border-violet-800/30 bg-violet-950/15",
                  },
                  {
                    icon: <Lock className="w-4 h-4 text-amber-400" />,
                    label: "Confidentialité",
                    value: "Données chiffrées en transit",
                    border: "border-amber-800/30 bg-amber-950/15",
                  },
                ].map(({ icon, label, value, border }) => (
                  <div key={label} className={`rounded-2xl border p-4 space-y-2 ${border}`}>
                    <div className="w-8 h-8 rounded-xl bg-slate-900/60 flex items-center justify-center">{icon}</div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label}</div>
                    <div className="text-white text-xs font-bold leading-snug">{value}</div>
                  </div>
                ))}
              </div>
              <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 flex items-start gap-3">
                <Info className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-slate-400 leading-relaxed">
                  L'infrastructure d'hébergement est soumise aux mêmes exigences de conformité prévues par la loi n°
                  09-08 que la plateforme elle-même. Les données des utilisateurs sont traitées conformément aux
                  obligations réglementaires marocaines applicables. Pour toute question relative à l'hébergement,
                  contactez <strong className="text-white">support@axelmond.com</strong>.
                </p>
              </div>
            </InstitutionalCard>
          </InstitutionalFade>
        </div>

        {/* ── 4. Propriété intellectuelle ──────────────────────────────────── */}
        <div ref={s4.ref}>
          <InstitutionalFade inView={s4.inView}>
            <InstitutionalCard className="p-7 md:p-9">
              <InstitutionalSectionHeader
                number="04"
                emoji="©️"
                icon={<Copyright className="w-5 h-5" />}
                title="Propriété intellectuelle"
                accentClass="bg-amber-500/15 border border-amber-500/20"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-4">
                  <p className="text-[13px] text-slate-300 leading-relaxed">
                    L'ensemble des éléments composant la plateforme Performance Académique — contenus pédagogiques,
                    modules, publications, documents, logos, marques, chartes graphiques, interfaces et code source —
                    est protégé par le <strong className="text-white">droit de la propriété intellectuelle</strong>{" "}
                    applicable.
                  </p>
                  <InstitutionalCheckList
                    color="text-amber-400"
                    items={[
                      "Les modules et supports pédagogiques sont protégés par le droit d'auteur",
                      "Le nom « Performance Académique » et son logo sont des marques protégées",
                      "Les ressources pédagogiques restent la propriété de leurs auteurs déclarés",
                      "L'interface utilisateur et le code source sont la propriété exclusive de Performance Académique",
                      "Respect des licences Creative Commons pour les ressources tierces intégrées",
                    ]}
                  />
                </div>
                <div className="space-y-3">
                  <div className="bg-red-950/20 border border-red-800/30 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span className="text-red-300 text-xs font-black uppercase tracking-wide">
                        Reproductions interdites
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {[
                        "Reproduction des contenus pédagogiques sans autorisation écrite",
                        "Diffusion ou redistribution des modules sur d'autres supports",
                        "Exploitation commerciale des ressources de la plateforme",
                        "Utilisation du logo ou de la marque Performance Académique sans accord préalable",
                        "Extraction automatisée des contenus (scraping)",
                      ].map((item) => (
                        <li key={item} className="flex items-start gap-2 text-[12px] text-slate-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600 flex-shrink-0 mt-1.5" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-emerald-950/15 border border-emerald-800/25 rounded-xl px-4 py-3 flex items-start gap-2.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-slate-400">
                      Les droits d'exploitation des contenus académiques sont gérés individuellement avec chaque
                      auteur-contributeur via une convention signée au moment de la publication.
                    </p>
                  </div>
                </div>
              </div>
            </InstitutionalCard>
          </InstitutionalFade>
        </div>

        {/* ── 5. Limitation de responsabilité ─────────────────────────────── */}
        <div ref={s5.ref}>
          <InstitutionalFade inView={s5.inView}>
            <InstitutionalCard className="p-7 md:p-9">
              <InstitutionalSectionHeader
                number="05"
                emoji="⚖️"
                icon={<Scale className="w-5 h-5" />}
                title="Limitation de responsabilité"
                accentClass="bg-slate-600/20 border border-slate-600/30"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div className="space-y-4">
                  <p className="text-[13px] text-slate-300 leading-relaxed">
                    Performance Académique s'engage à mettre tout en œuvre pour garantir l'exactitude, la fiabilité et
                    la mise à jour régulière des informations publiées sur la plateforme. Néanmoins, des erreurs
                    ponctuelles ne peuvent être totalement exclues.
                  </p>
                  <InstitutionalCheckList
                    color="text-slate-400"
                    items={[
                      "Contrôle éditorial régulier de l'exactitude des contenus académiques",
                      "Mise à jour continue des informations réglementaires et légales",
                      "Signalement encouragé de toute erreur via support@axelmond.com",
                      "Correction des inexactitudes dans un délai raisonnable après signalement",
                    ]}
                  />
                </div>
                <div className="space-y-3">
                  {[
                    {
                      title: "Interruptions techniques",
                      desc: "Performance Académique ne peut être tenu responsable des interruptions temporaires de service liées à des maintenances, défaillances techniques ou attaques informatiques indépendantes de sa volonté.",
                      border: "border-slate-700 bg-slate-800/30",
                    },
                    {
                      title: "Erreurs de contenu",
                      desc: "Performance Académique décline toute responsabilité pour les erreurs éventuelles dans les contenus fournis par les professeurs et administrateurs contributeurs indépendants.",
                      border: "border-slate-700 bg-slate-800/30",
                    },
                    {
                      title: "Usage inapproprié",
                      desc: "Performance Académique ne peut être tenu responsable de l'utilisation contraire aux conditions d'utilisation faite par des tiers de la plateforme ou de ses ressources.",
                      border: "border-slate-700 bg-slate-800/30",
                    },
                  ].map(({ title, desc, border }) => (
                    <div key={title} className={`rounded-xl border p-4 ${border}`}>
                      <div className="text-white text-xs font-bold mb-1">{title}</div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-amber-950/15 border border-amber-800/25 rounded-2xl px-5 py-4 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-slate-400 leading-relaxed">
                  <strong className="text-amber-300">Liens externes :</strong> La plateforme peut contenir des liens
                  vers des sites ou services tiers (paiement, visioconférence, authentification, etc.). Performance
                  Académique n'est pas responsable du contenu, de la politique de confidentialité ou des pratiques de
                  ces sites externes. Consultez leurs mentions légales respectives avant tout usage.
                </p>
              </div>
            </InstitutionalCard>
          </InstitutionalFade>
        </div>

        {/* ── 6. Protection des données personnelles ───────────────────────── */}
        <div ref={s6.ref}>
          <InstitutionalFade inView={s6.inView}>
            <div className="relative overflow-hidden bg-slate-900 border border-emerald-900/40 rounded-3xl p-7 md:p-9">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/4 rounded-full translate-x-32 -translate-y-32 blur-2xl pointer-events-none" />
              <div className="relative">
                <InstitutionalSectionHeader
                  number="06"
                  emoji="🔒"
                  icon={<Shield className="w-5 h-5" />}
                  title="Protection des données personnelles"
                  accentClass="bg-emerald-500/15 border border-emerald-500/20"
                />
                <p className="text-[13px] text-slate-400 leading-relaxed mb-6">
                  Conformément à la <strong className="text-white">loi n° 09-08</strong> et aux textes applicables en
                  matière de protection des données personnelles au Maroc, Performance Académique s'engage à protéger
                  vos données personnelles et à vous informer de vos droits. Consultez les documents ci-dessous pour
                  plus d'informations.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                  {[
                    {
                      emoji: "🔏",
                      title: "Politique de confidentialité",
                      desc: "Données collectées, finalités, durées de conservation, droits des utilisateurs et contact DPO.",
                      color: "border-indigo-800/40 bg-indigo-950/20",
                      chip: "text-indigo-300 border-indigo-500/30 bg-indigo-500/10",
                      label: "→ Lire la politique",
                    },
                    {
                      emoji: "🍪",
                      title: "Politique des cookies",
                      desc: "Types de cookies, finalités, durées de conservation et gestion de vos préférences.",
                      color: "border-amber-800/40 bg-amber-950/20",
                      chip: "text-amber-300 border-amber-500/30 bg-amber-500/10",
                      label: "→ Gérer les cookies",
                    },
                    {
                      emoji: "📋",
                      title: "Conditions d'utilisation",
                      desc: "Règles d'usage, responsabilités, sanctions et droits des utilisateurs de la plateforme.",
                      color: "border-violet-800/40 bg-violet-950/20",
                      chip: "text-violet-300 border-violet-500/30 bg-violet-500/10",
                      label: "→ Lire les conditions",
                    },
                  ].map(({ emoji, title, desc, color, chip, label }) => (
                    <div
                      key={title}
                      className={`rounded-2xl border p-5 space-y-3 ${color} hover:-translate-y-0.5 transition-transform duration-200`}
                    >
                      <div className="text-2xl">{emoji}</div>
                      <div className="text-white text-sm font-bold">{title}</div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{desc}</p>
                      <span
                        className={`text-[10px] font-black uppercase tracking-widest border px-2.5 py-1 rounded-full inline-block cursor-pointer ${chip}`}
                      >
                        {label}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InstitutionalInfoRow
                    label="Autorité de contrôle"
                    value="CNDP — cndp.ma"
                    icon={<Scale className="w-3.5 h-3.5" />}
                  />
                  <InstitutionalInfoRow
                    label="Contact DPO / Confidentialité"
                    value="privacy@axelmond.com"
                    icon={<Mail className="w-3.5 h-3.5" />}
                    mono
                  />
                </div>
              </div>
            </div>
          </InstitutionalFade>
        </div>

        {/* ── 7. Contact légal ─────────────────────────────────────────────── */}
        <div ref={s7.ref}>
          <InstitutionalFade inView={s7.inView}>
            <InstitutionalCard className="p-7 md:p-9">
              <InstitutionalSectionHeader
                number="07"
                emoji="📧"
                icon={<Mail className="w-5 h-5" />}
                title="Contact légal"
                accentClass="bg-rose-500/15 border border-rose-500/20"
              />
              <p className="text-[13px] text-slate-400 leading-relaxed mb-6">
                Pour toute demande juridique, administrative ou réglementaire concernant la plateforme Performance
                Académique, utilisez les coordonnées officielles ci-dessous. Adresse officielle :{" "}
                <strong className="text-white">{PERFORMANCE_ACADEMIQUE_ADDRESS}</strong>.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                {[
                  {
                    icon: <Mail className="w-5 h-5 text-rose-400" />,
                    title: "Demandes juridiques",
                    contact: "legal@axelmond.com",
                    objet: "Demande juridique — Mentions légales",
                    delay: "10 jours ouvrables",
                    color: "border-rose-800/30 bg-rose-950/15",
                  },
                  {
                    icon: <Shield className="w-5 h-5 text-emerald-400" />,
                    title: "Demandes données personnelles",
                    contact: "privacy@axelmond.com",
                    objet: "Exercice de droits — loi 09-08",
                    delay: "30 jours calendaires (loi 09-08)",
                    color: "border-emerald-800/30 bg-emerald-950/15",
                  },
                  {
                    icon: <Copyright className="w-5 h-5 text-amber-400" />,
                    title: "Droits d'auteur & PI",
                    contact: "legal@axelmond.com",
                    objet: "Demande PI — Propriété intellectuelle",
                    delay: "15 jours ouvrables",
                    color: "border-amber-800/30 bg-amber-950/15",
                  },
                  {
                    icon: <PhoneCall className="w-5 h-5 text-sky-400" />,
                    title: "Demandes administratives",
                    contact: "contact@axelmond.com",
                    objet: "Demande administrative — Performance Académique",
                    delay: "10 jours ouvrables",
                    color: "border-sky-800/30 bg-sky-950/15",
                  },
                ].map(({ icon, title, contact, objet, delay, color }) => (
                  <div key={title} className={`rounded-2xl border p-5 space-y-3 ${color}`}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-slate-900/60 flex items-center justify-center">{icon}</div>
                      <span className="text-white text-sm font-bold">{title}</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold w-14 flex-shrink-0">
                          Email
                        </span>
                        <code className="text-indigo-300 text-[11px] font-mono">{contact}</code>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold w-14 flex-shrink-0">
                          Objet
                        </span>
                        <span className="text-slate-400 text-[11px] italic">«&nbsp;{objet}&nbsp;»</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold w-14 flex-shrink-0">
                          Délai
                        </span>
                        <span className="text-slate-400 text-[11px]">{delay}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 flex items-start gap-3">
                <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-2 text-[12px] text-slate-400 leading-relaxed">
                  <p>
                    <strong className="text-white">Résolution amiable :</strong> En cas de litige relatif à
                    l'interprétation ou à l'exécution des présentes mentions légales, les parties s'engagent à
                    rechercher en priorité une solution amiable dans un délai de 30 jours avant tout recours judiciaire.
                    Les tribunaux marocains sont seuls compétents en cas de litige persistant.
                  </p>
                  <a
                    href={PERFORMANCE_ACADEMIQUE_LOCATION.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-bold text-indigo-300 transition-colors hover:text-indigo-200"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Ouvrir l'adresse officielle dans Google Maps
                  </a>
                </div>
              </div>
            </InstitutionalCard>
          </InstitutionalFade>
        </div>

        {/* ── 8. Informations complémentaires ─────────────────────────────── */}
        <div ref={s8.ref}>
          <InstitutionalFade inView={s8.inView}>
            <div className="relative overflow-hidden bg-slate-900 border border-slate-800 rounded-3xl p-7 md:p-9">
              <InstitutionalSectionHeader
                number="08"
                emoji="ℹ️"
                icon={<Info className="w-5 h-5" />}
                title="Informations complémentaires"
                accentClass="bg-slate-700/30 border border-slate-600/30"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {[
                  { label: "Dernière mise à jour", value: "Juin 2026 — Version v1.2.0" },
                  { label: "Droit applicable", value: "Droit marocain · Loi n° 09-08 · Code du commerce" },
                  { label: "Juridiction compétente", value: "Tribunaux compétents du ressort de Casablanca (Maroc)" },
                  { label: "Langue officielle", value: "Français — Version faisant foi en cas de litige" },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3">
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-0.5">{label}</div>
                    <div className="text-slate-200 text-[12px] font-semibold">{value}</div>
                  </div>
                ))}
              </div>

              {/* Related legal pages */}
              <div className="mb-6">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-3">
                  Documents légaux associés
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    {
                      label: "Politique de confidentialité",
                      color: "text-indigo-300 border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20",
                    },
                    {
                      label: "Conditions d'utilisation",
                      color: "text-violet-300 border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20",
                    },
                    {
                      label: "Politique des cookies",
                      color: "text-amber-300 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20",
                    },
                    {
                      label: "Centre d'aide",
                      color: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20",
                    },
                    { label: "Contact", color: "text-sky-300 border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20" },
                  ].map(({ label, color }) => (
                    <span
                      key={label}
                      className={`inline-flex items-center gap-1.5 text-xs font-bold border px-3 py-1.5 rounded-full cursor-pointer transition-colors ${color}`}
                    >
                      <ExternalLink className="w-3 h-3" />
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Footer copyright */}
              <div className="border-t border-slate-800 pt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-white text-sm font-black">© 2026 Performance Académique</div>
                  <div className="text-slate-500 text-[11px]">
                    Tous droits réservés · Performance Académique · axelmond.com
                  </div>
                  <div className="text-slate-600 text-[10px]">
                    Apprendre · Progresser · Réussir — Plateforme académique de nouvelle génération
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest border px-2.5 py-1 rounded-full text-slate-300 border-slate-600 bg-slate-700/30">
                    v1.2.0
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest border px-2.5 py-1 rounded-full text-emerald-300 border-emerald-500/30 bg-emerald-500/10">
                    Loi 09-08
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest border px-2.5 py-1 rounded-full text-sky-300 border-sky-500/30 bg-sky-500/10">
                    CNDP
                  </span>
                </div>
              </div>
            </div>
          </InstitutionalFade>
        </div>
      </div>
    </InstitutionalPageRoot>
  );
}
