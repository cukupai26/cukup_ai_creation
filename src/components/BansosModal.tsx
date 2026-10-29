import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  ExternalLink,
  Building2,
  CheckSquare,
  Search,
  PhoneCall,
  AlertTriangle,
  Info,
  CheckCircle2,
  FileText,
  MapPin,
  Globe,
  Loader2,
  Sparkles,
  Lock,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  HelpCircle,
  Users,
  Compass,
  AlertCircle
} from 'lucide-react';
import { Language, BansosSearchResponse } from '../types';
import {
  NATIONAL_KEMENSOS_CONTACT,
  PROVINCE_OPTIONS,
  SAMPLE_REGENCIES_BY_PROVINCE,
  VERIFIED_BANSOS_PROGRAMS,
  SITUATION_CHECKLIST_OPTIONS,
  NEED_TYPE_OPTIONS,
  findVerifiedBansosOffice,
} from '../data/verifiedBansosDirectory';

interface BansosModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export type BansosSectionId =
  | 'mulai'
  | 'cek_resmi'
  | 'jenis_bantuan'
  | 'tidak_ditemukan'
  | 'dokumen'
  | 'bantuan_daerah';

import { getTranslation } from '../utils/i18n';

const getSections = (isEn: boolean) => [
  { id: 'mulai' as BansosSectionId, label: isEn ? '1. Start Here' : '1. Mulai Di Sini', shortLabel: isEn ? 'Start' : 'Mulai', icon: Compass },
  { id: 'cek_resmi' as BansosSectionId, label: isEn ? '2. Official Portal Check' : '2. Cek Layanan Resmi', shortLabel: isEn ? 'Official Check' : 'Cek Resmi', icon: Globe },
  { id: 'jenis_bantuan' as BansosSectionId, label: isEn ? '3. Assistance Types' : '3. Jenis Bantuan', shortLabel: isEn ? 'Programs' : 'Program', icon: FileText },
  { id: 'tidak_ditemukan' as BansosSectionId, label: isEn ? '4. Data Not Found' : '4. Data Tidak Ditemukan', shortLabel: isEn ? 'Missing Data' : 'Kendala Data', icon: AlertCircle },
  { id: 'dokumen' as BansosSectionId, label: isEn ? '5. Required Documents' : '5. Dokumen Persiapan', shortLabel: isEn ? 'Documents' : 'Dokumen', icon: CheckSquare },
  { id: 'bantuan_daerah' as BansosSectionId, label: isEn ? '6. Local Services & Contact' : '6. Bantuan Daerah & Kontak', shortLabel: isEn ? 'Local Offices' : 'Kontak Dinsos', icon: MapPin },
];

const SITUATION_LABELS_EN: Record<string, { label: string; relevantProgram: string }> = {
  balita_ibu_hamil: { label: 'Pregnant mother or toddlers (0-6 years) at home', relevantProgram: 'PKH (Health Component)' },
  anak_sekolah: { label: 'School-age children (elementary, middle, or high school)', relevantProgram: 'PKH (Education Component) & PIP' },
  lansia_disabilitas: { label: 'Elderly (60+ years) or persons with disabilities', relevantProgram: 'PKH (Social Welfare) & ATENSI' },
  pangan_mendesak: { label: 'Difficulty purchasing rice & daily staple food', relevantProgram: 'BPNT / Sembako Food Assistance' },
  biaya_berobat: { label: 'Need free medical care at public health clinics/hospitals', relevantProgram: 'PBI JK (Free BPJS Health APBN)' },
  tidak_punya_kerja: { label: 'Unemployed / living in village without national APBN assistance', relevantProgram: 'BLT Dana Desa (Village Cash Grant)' },
};

export const BansosModal: React.FC<BansosModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  const isEn = lang === 'en';
  const t = getTranslation(lang);
  const sections = getSections(isEn);
  const [activeSection, setActiveSection] = useState<BansosSectionId>('mulai');

  // Guided situation state
  const [selectedSituations, setSelectedSituations] = useState<string[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<string>('DKI Jakarta');
  const [selectedRegency, setSelectedRegency] = useState<string>('Jakarta Pusat');
  const [selectedNeedType, setSelectedNeedType] = useState<string>('Semua Kebutuhan');
  const [customCitySearch, setCustomCitySearch] = useState<string>('');

  // Interactive document preparation checklist
  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>({
    ktp: false,
    kk: false,
    sktm: false,
    fotoRumah: false,
    suratKeterangan: false,
  });

  // Copy feedback state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // AI Bansos Question Preparer / Search state
  const [aiPromptQuery, setAiPromptQuery] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<BansosSearchResponse | null>(null);

  if (!isOpen) return null;

  const currentSectionIndex = sections.findIndex((s) => s.id === activeSection);
  const prevSection = currentSectionIndex > 0 ? sections[currentSectionIndex - 1] : null;
  const nextSection = currentSectionIndex < sections.length - 1 ? sections[currentSectionIndex + 1] : null;

  // Resolve directory office safely
  const effectiveCity = customCitySearch.trim() || selectedRegency;
  const directoryLookup = findVerifiedBansosOffice(selectedProvince, effectiveCity);

  const toggleSituation = (id: string) => {
    setSelectedSituations((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleDoc = (key: string) => {
    setCheckedDocs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const copyToClipboard = (text: string, key: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const handleAskAi = async (queryText?: string) => {
    const q = (queryText || aiPromptQuery).trim();
    if (!q) return;

    // Safety guard against NIK
    if (/\b\d{16}\b/.test(q)) {
      setAiError(
        isEn
          ? 'For your safety and privacy, never enter your 16-digit National Identity Number (NIK) or personal documents into CukupAI. Use the official Ministry portal to check your status.'
          : 'Demi keselamatan privasi Anda, jangan masukkan Nomor Induk Kependudukan (NIK) atau dokumen pribadi ke dalam CukupAI. Gunakan portal resmi Kemensos untuk pengecekan data diri.'
      );
      return;
    }

    setIsAiLoading(true);
    setAiError(null);

    try {
      const res = await fetch('/api/ai/bansos-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          province: selectedProvince,
          language: lang,
        }),
      });

      if (!res.ok) {
        throw new Error(isEn ? 'Guidance service unavailable' : 'Layanan panduan sedang tidak tersedia');
      }

      const data = await res.json();
      setAiResult(data);
    } catch {
      setAiError(
        isEn
          ? 'Search is currently offline or limited. You can call the official Ministry toll-free hotline 171 directly or visit cekbansos.kemensos.go.id.'
          : 'Pencarian sedang offline atau kuota terbatas. Anda dapat langsung menggunakan hotline resmi Kemensos 171 atau membuka portal cekbansos.kemensos.go.id.'
      );
    } finally {
      setIsAiLoading(false);
    }
  };

  // Helper to generate questions to bring to the village office
  const handleGenerateOfficeQuestions = () => {
    const contextList = selectedSituations
      .map((s) => {
        if (isEn && SITUATION_LABELS_EN[s]) return SITUATION_LABELS_EN[s].label;
        return SITUATION_CHECKLIST_OPTIONS.find((opt) => opt.id === s)?.label;
      })
      .filter(Boolean)
      .join(', ');

    const prompt = isEn
      ? (contextList 
          ? `Please formulate polite, structured questions in English that I can bring to the Indonesian local Village/Ward Office (Desa/Kelurahan) or Social Affairs Office (Dinas Sosial) regarding social assistance registration, given my household condition: ${contextList}.`
          : `Please formulate polite, structured questions in English that I can ask officers at the local Village/Ward Office (Desa/Kelurahan) regarding social assistance registration and household verification.`)
      : (contextList
          ? `Bantu buatkan poin pertanyaan resmi yang sopan dan ringkas untuk saya bawa saat berkonsultasi ke Kantor Desa/Kelurahan atau Dinas Sosial mengenai pendaftaran bansos, dengan kondisi keluarga saya: ${contextList}.`
          : `Bantu buatkan poin pertanyaan resmi yang sopan dan jelas untuk saya tanyakan ke petugas Kantor Desa/Kelurahan mengenai pendaftaran bansos atau pengecekan data keluarga.`);

    setAiPromptQuery(prompt);
    handleAskAi(prompt);
  };

  // Filter programs based on need type
  const filteredPrograms = VERIFIED_BANSOS_PROGRAMS.filter((p) => {
    if (selectedNeedType === 'Semua Kebutuhan' || selectedNeedType === 'All Needs') return true;
    if ((selectedNeedType.includes('Pangan') || selectedNeedType.includes('Food')) && p.category === 'pangan') return true;
    if ((selectedNeedType.includes('Pendidikan') || selectedNeedType.includes('Education')) && p.category === 'keluarga') return true;
    if ((selectedNeedType.includes('Kesehatan') || selectedNeedType.includes('Healthcare')) && p.category === 'kesehatan') return true;
    if ((selectedNeedType.includes('Desa') || selectedNeedType.includes('Village')) && p.category === 'desa') return true;
    if ((selectedNeedType.includes('Darurat') || selectedNeedType.includes('Emergency')) && p.category === 'khusus') return true;
    return true;
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bansos-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      {/* Primary Modal Container */}
      <div className="bg-[#FAF9F5] w-full max-w-2xl h-full sm:h-auto sm:max-h-[88vh] rounded-none sm:rounded-3xl shadow-2xl border border-[#DCD5C4] flex flex-col overflow-hidden text-[#192A24]">
        
        {/* 1. COMPACT HEADER WITH TITLE & SINGLE CLOSE BUTTON (NO DUPLICATES) */}
        <header className="p-3.5 sm:p-4 bg-gradient-to-r from-[#0F382A] to-[#174B38] text-[#F7F5EE] border-b border-[#1E5740] shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#C59B27]/20 border border-[#C59B27]/40 flex items-center justify-center text-[#F9F3DC] shrink-0">
                <Building2 className="w-5 h-5 text-[#C59B27]" />
              </div>
              <div className="min-w-0">
                <h2
                  id="bansos-modal-title"
                  className="text-base sm:text-lg font-bold text-[#F9F3DC] tracking-tight truncate flex items-center gap-2"
                >
                  {t.bansosModalTitle}
                </h2>
                <p className="text-[11px] text-[#A9C1B5] font-medium leading-tight truncate">
                  {t.bansosModalSub}
                </p>
              </div>
            </div>

            {/* SINGLE AUTHORITATIVE CLOSE BUTTON */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-[#F9F3DC] flex items-center justify-center transition-colors shrink-0 focus:outline-hidden focus:ring-2 focus:ring-[#C59B27]"
              title={t.closeBtn}
              aria-label={t.closeBtn}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* 2. CONCISE ANTI-FRAUD & INDEPENDENCE BANNER (NON-CLUTTERED) */}
        <div className="px-3.5 py-2 bg-[#FFF8EB] border-b border-[#F2DCA5] text-amber-950 text-xs shrink-0 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
            <span className="text-[11px] leading-tight truncate">
              <strong>{isEn ? 'Anti-Fraud Notice:' : 'Waspada Penipuan:'}</strong>{' '}
              {isEn 
                ? 'Official social assistance registration is completely free of charge and requires no OTP codes. CukupAI is not a government portal and never requests your NIK.'
                : 'Pendaftaran bansos resmi bebas biaya & tanpa OTP. CukupAI bukan situs pemerintah & tidak meminta NIK.'}
            </span>
          </div>
          <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded bg-amber-200/60 text-amber-900 font-semibold shrink-0">
            {t.bansosIndependentBadge}
          </span>
        </div>

        {/* 3. HORIZONTAL SECTION NAVIGATION TABS */}
        <nav
          aria-label={isEn ? 'Social Assistance Navigation' : 'Navigasi Panduan Bantuan Sosial'}
          className="flex border-b border-[#E5E0D3] bg-white overflow-x-auto scrollbar-none px-2 text-xs shrink-0"
        >
          {sections.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`py-2.5 px-3 font-semibold whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5 focus:outline-hidden ${
                  isActive
                    ? 'border-[#0F382A] text-[#0F382A] bg-[#F4F9F6]'
                    : 'border-transparent text-[#6B7D74] hover:text-[#192A24]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#0F382A]' : 'text-[#8E9F97]'}`} />
                <span className="hidden md:inline">{sec.label}</span>
                <span className="md:hidden">{sec.shortLabel}</span>
              </button>
            );
          })}
        </nav>

        {/* 4. SINGLE PRIMARY SCROLL AREA (PREVENTS OVERLAPPING & NESTED SCROLLING) */}
        <main className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">

          {/* ================= SECTION A: MULAI DI SINI ================= */}
          {activeSection === 'mulai' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Introduction Card */}
              <div className="p-4 rounded-2xl bg-white border border-[#DDD6C5] shadow-2xs space-y-2">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#0F382A] text-white flex items-center justify-center shrink-0">
                    <Compass className="w-5 h-5 text-[#C59B27]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0F382A]">
                      {isEn ? 'Who Should Check Social Assistance Programs?' : 'Siapa yang Perlu Memeriksa Program Bantuan Sosial?'}
                    </h3>
                    <p className="text-xs text-[#52655C] mt-1 leading-relaxed">
                      {isEn
                        ? 'Government social assistance programs in Indonesia are designed as a social safety net for vulnerable families, low-income households, or those experiencing severe economic hardship.'
                        : 'Program bantuan sosial (bansos) dari Pemerintah Republik Indonesia dirancang sebagai jaring pengaman bagi keluarga rentan, masyarakat berpenghasilan rendah, atau mereka yang mengalami guncangan ekonomi berat.'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-[11px] text-[#2F4439]">
                  <div className="p-2.5 rounded-xl bg-[#F0F7F3] border border-[#D5E8DD]">
                    <strong>{isEn ? 'Protection Targets:' : 'Target Perlindungan:'}</strong>
                    <ul className="list-disc list-inside mt-1 space-y-0.5 text-[#556960]">
                      <li>{isEn ? 'Families with pregnant mothers or toddlers' : 'Keluarga dengan ibu hamil atau anak balita'}</li>
                      <li>{isEn ? 'Families with school-age children (SD-SMA)' : 'Keluarga dengan anak bersekolah (SD-SMA)'}</li>
                      <li>{isEn ? 'Single elderly (60+ years) with no income' : 'Lansia tunggal (60+ thn) tanpa penghasilan'}</li>
                    </ul>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FAF6EA] border border-[#EADBBD]">
                    <strong>{isEn ? 'Emergency Conditions:' : 'Kondisi Kedaruratan:'}</strong>
                    <ul className="list-disc list-inside mt-1 space-y-0.5 text-[#6D5D28]">
                      <li>{isEn ? 'Individuals with severe disabilities' : 'Penyandang disabilitas berat'}</li>
                      <li>{isEn ? 'Sudden job loss / extreme poverty' : 'Kehilangan pekerjaan mendadak / kemiskinan ekstrem'}</li>
                      <li>{isEn ? 'Rural residents without national assistance (BLT Desa)' : 'Warga desa tanpa bansos APBN (BLT Desa)'}</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Interactive Situation Checklist */}
              <div className="p-4 rounded-2xl bg-white border border-[#DDD6C5] shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#0F382A] uppercase tracking-wider flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-[#C59B27]" />
                    <span>{isEn ? 'Select Your Family Conditions (Guided Checklist)' : 'Pilih Kondisi Keluarga Anda (Checklist Panduan)'}</span>
                  </h4>
                  <span className="text-[10px] text-[#71847A]">{isEn ? 'Optional & Private' : 'Opsional & Privat'}</span>
                </div>
                <p className="text-[11px] text-[#556960] leading-relaxed">
                  {isEn
                    ? 'Select your household conditions below to view an overview of relevant social assistance programs for your family:'
                    : 'Pilih kondisi yang sesuai di bawah ini untuk melihat gambaran program bantuan sosial yang relevan bagi keluarga Anda:'}
                </p>

                <div className="space-y-1.5">
                  {SITUATION_CHECKLIST_OPTIONS.map((item) => {
                    const isChecked = selectedSituations.includes(item.id);
                    const labelText = isEn && SITUATION_LABELS_EN[item.id] ? SITUATION_LABELS_EN[item.id].label : item.label;
                    const programText = isEn && SITUATION_LABELS_EN[item.id] ? SITUATION_LABELS_EN[item.id].relevantProgram : item.relevantProgram;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleSituation(item.id)}
                        className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-start justify-between gap-2.5 ${
                          isChecked
                            ? 'bg-[#EBF5EE] border-[#1C5E43] text-[#0F382A]'
                            : 'bg-[#FAF9F5] border-[#E5E0D3] text-[#2F4439] hover:bg-[#F2EFE8]'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border ${
                              isChecked
                                ? 'bg-[#0F382A] border-[#0F382A] text-white'
                                : 'border-[#A3B8AD] bg-white'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div>
                            <span className="font-semibold block">{labelText}</span>
                            <span className="text-[10px] text-[#597568] block mt-0.5">
                              {isEn ? 'Referral:' : 'Rujukan:'} <strong>{programText}</strong>
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selectedSituations.length > 0 && (
                  <div className="p-3 rounded-xl bg-[#F0F7F3] border border-[#C5DEC9] flex items-center justify-between gap-2">
                    <div className="text-xs text-[#0F382A]">
                      <span>{selectedSituations.length} {isEn ? 'conditions selected.' : 'kondisi dipilih.'}</span>
                    </div>
                    <button
                      onClick={() => setActiveSection('jenis_bantuan')}
                      className="py-1 px-3 rounded-lg bg-[#0F382A] text-[#F9F3DC] text-[11px] font-bold flex items-center gap-1 hover:bg-[#1C5E43] transition-colors"
                    >
                      <span>{isEn ? 'View Program Details' : 'Lihat Rincian Program'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Area & Need Selector for localized guidance */}
              <div className="p-4 rounded-2xl bg-white border border-[#DDD6C5] shadow-2xs space-y-3">
                <h4 className="text-xs font-bold text-[#0F382A] uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#C59B27]" />
                  <span>{isEn ? 'Set Region & Primary Need' : 'Atur Wilayah & Kebutuhan Umum'}</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-[#2A3F35] mb-1">
                      {isEn ? 'Domicile Province:' : 'Provinsi Domisili:'}
                    </label>
                    <select
                      value={selectedProvince}
                      onChange={(e) => {
                        const prov = e.target.value;
                        setSelectedProvince(prov);
                        const regencies = SAMPLE_REGENCIES_BY_PROVINCE[prov];
                        setSelectedRegency(regencies ? regencies[0] : '');
                        setCustomCitySearch('');
                      }}
                      className="w-full p-2.5 rounded-xl border border-[#D5CEBD] bg-[#FAF9F5] focus:ring-2 focus:ring-[#0F382A]"
                    >
                      {PROVINCE_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#2A3F35] mb-1">
                      {isEn ? 'Primary Need Type:' : 'Jenis Kebutuhan Utama:'}
                    </label>
                    <select
                      value={selectedNeedType}
                      onChange={(e) => setSelectedNeedType(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-[#D5CEBD] bg-[#FAF9F5] focus:ring-2 focus:ring-[#0F382A]"
                    >
                      {NEED_TYPE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#E5E0D3] text-[11px] text-[#63766D] flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-[#0F382A] shrink-0" />
                  <span>
                    {isEn 
                      ? 'You can explore this entire social assistance directory anonymously without submitting your NIK or sensitive personal identity data.'
                      : 'Anda dapat menjelajahi seluruh panduan bantuan sosial ini secara anonim tanpa perlu memasukkan NIK atau data pribadi sensitif.'}
                  </span>
                </div>
              </div>

              {/* Action Button to Next Step */}
              <button
                onClick={() => setActiveSection('cek_resmi')}
                className="w-full py-3 px-4 rounded-xl bg-[#0F382A] hover:bg-[#184F3B] text-[#F9F3DC] font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98"
              >
                <span>{isEn ? 'Step 2: Check Status on Official Portal' : 'Langkah 2: Cek Status di Layanan Resmi'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ================= SECTION B: CEK LAYANAN RESMI ================= */}
          {activeSection === 'cek_resmi' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Official Link Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#F0F7F3] to-[#E3F0E8] border border-[#C5DEC9] shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0F382A] text-white flex items-center justify-center shrink-0">
                    <Globe className="w-5 h-5 text-[#C59B27]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0F382A] text-[#F9F3DC] uppercase tracking-wider inline-block mb-1">
                      {isEn ? 'Official Government Portal' : 'Portal Resmi Negara'}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-[#0F382A]">
                      {isEn ? 'Self-Verification at cekbansos.kemensos.go.id' : 'Pengecekan Mandiri di cekbansos.kemensos.go.id'}
                    </h3>
                    <p className="text-xs text-[#2A4D3E] mt-1 leading-relaxed">
                      {isEn
                        ? 'The official website of the Ministry of Social Affairs RI is the sole verified public web channel to check your household social assistance beneficiary status.'
                        : 'Situs resmi Kementerian Sosial RI merupakan satu-satunya kanal web publik terverifikasi untuk melihat status kepesertaan bansos Anda.'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#C5DEC9]">
                  <a
                    href="https://cekbansos.kemensos.go.id"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 rounded-xl bg-[#0F382A] hover:bg-[#1B5E43] text-[#F9F3DC] font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
                  >
                    <span>{isEn ? 'Open Official Portal: cekbansos.kemensos.go.id' : 'Buka Portal Resmi: cekbansos.kemensos.go.id'}</span>
                    <ExternalLink className="w-4 h-4 text-[#C59B27]" />
                  </a>
                  <p className="text-[10px] text-[#557567] text-center mt-2">
                    {isEn 
                      ? 'Link opens securely in a new browser tab without closing CukupAI.'
                      : 'Tautan akan membuka tab baru secara aman di browser Anda tanpa menutup panduan CukupAI.'}
                  </p>
                </div>
              </div>

              {/* Data Source Guidance: DTSEN vs DTKS */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#DDD6C5] shadow-2xs space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-[#0F382A]">
                  <Info className="w-4 h-4 text-[#C59B27]" />
                  <span>{isEn ? 'DTSEN Data Source (Not Just Outdated DTKS)' : 'Basis Data DTSEN (Bukan Hanya DTKS Lampau)'}</span>
                </div>
                <p className="text-[11px] text-[#556960] leading-relaxed">
                  {isEn
                    ? 'Kemensos RI currently identifies its data matching source as DTSEN (National Socio-Economic Integrated Data). Beneficiary records are dynamic and updated periodically from village/ward level through the SIKS-NG system.'
                    : 'Kemensos RI saat ini mengidentifikasi sistem pemadanan datanya sebagai DTSEN (Data Terpadu Sosial Ekonomi Nasional). Data penerima bansos bersifat dinamis dan diperbarui berkala secara berjenjang dari kelurahan/desa melalui sistem SIKS-NG. Jangan mengasumsikan data bansos statis selamanya.'}
                </p>
              </div>

              {/* Step-by-Step Instructions */}
              <div className="p-4 rounded-2xl bg-white border border-[#DDD6C5] shadow-2xs space-y-3">
                <h4 className="text-xs font-bold text-[#0F382A] uppercase tracking-wider">
                  {isEn ? 'Official Portal Checking Steps:' : 'Tahapan Pengecekan di Portal Kemensos:'}
                </h4>

                <ol className="space-y-2.5 text-xs text-[#33463E]">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#0F382A] text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      <strong className="block text-[#192A24]">{isEn ? 'Select Domicile Region' : 'Pilih Wilayah Domisili'}</strong>
                      <span className="text-[11px] text-[#63766D]">{isEn ? 'Select Province, Regency/City, District, and Village matching your KTP.' : 'Pilih Provinsi, Kab/Kota, Kecamatan, dan Desa/Kelurahan sesuai KTP Anda.'}</span>
                    </div>
                  </li>

                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#0F382A] text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      <strong className="block text-[#192A24]">{isEn ? 'Enter Beneficiary Name (PM)' : 'Masukkan Nama Penerima Manfaat (PM)'}</strong>
                      <span className="text-[11px] text-[#63766D]">{isEn ? 'Type the full name exactly as written on your National Identity Card (KTP).' : 'Ketik nama lengkap persis seperti yang tertulis di Kartu Tanda Penduduk.'}</span>
                    </div>
                  </li>

                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#0F382A] text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      <strong className="block text-[#192A24]">{isEn ? 'Type 4-Letter Captcha Code' : 'Ketik 4 Huruf Kode Captcha'}</strong>
                      <span className="text-[11px] text-[#63766D]">{isEn ? 'Enter the security code shown on the official Kemensos screen.' : 'Masukkan kode huruf verifikasi yang tertera di layar portal Kemensos.'}</span>
                    </div>
                  </li>

                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#0F382A] text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      4
                    </span>
                    <div>
                      <strong className="block text-[#192A24]">{isEn ? "Click 'CARI DATA' Button" : "Klik Tombol 'CARI DATA'"}</strong>
                      <span className="text-[11px] text-[#63766D]">{isEn ? 'The portal will display your assistance status (PKH, BPNT, etc.) and distribution periods.' : 'Portal akan menampilkan status penerimaan (PKH, BPNT, dll.) dan periode penyalurannya.'}</span>
                    </div>
                  </li>
                </ol>
              </div>

              {/* Crucial Independence Disclaimer */}
              <div className="p-3 rounded-xl bg-[#FAF6EA] border border-[#E5DECA] text-[11px] text-[#6B5A24] space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 text-[#A88219] shrink-0" />
                  <span>{isEn ? 'Service Separation & Boundaries' : 'Pemisahan Batasan Layanan'}</span>
                </div>
                <p className="leading-relaxed">
                  {isEn
                    ? 'CukupAI is not connected to government internal database servers and has no authority to approve beneficiaries. Final eligibility and disbursement decisions remain strictly with responsible government agencies.'
                    : 'CukupAI tidak terhubung ke server database pemerintah dan tidak berwenang memutuskan kelayakan penerima. Semua ketetapan dan pencairan bansos adalah hak mutlak instansi pemerintah berwenang.'}
                </p>
              </div>
            </div>
          )}

          {/* ================= SECTION C: JENIS BANTUAN ================= */}
          {activeSection === 'jenis_bantuan' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 rounded-2xl bg-white border border-[#DDD6C5] shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-bold text-[#0F382A] uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#C59B27]" />
                    <span>{isEn ? 'Official Social Assistance Directory' : 'Direktori Program Bantuan Sosial Resmi'}</span>
                  </h3>
                  <span className="text-[10px] text-[#71847A]">{isEn ? 'Verified 2025' : 'Terverifikasi 2025'}</span>
                </div>
                <p className="text-xs text-[#52655C] leading-relaxed">
                  {isEn
                    ? 'Understand the purpose, eligibility criteria, and official channels for verified Indonesian social assistance programs:'
                    : 'Ketahui tujuan, kriteria penerima, dan kanal resmi masing-masing program bantuan sosial di Indonesia:'}
                </p>
              </div>

              {/* Programs List */}
              <div className="space-y-3">
                {filteredPrograms.map((program) => (
                  <div
                    key={program.id}
                    className="p-4 rounded-2xl bg-white border border-[#DDD6C5] shadow-2xs space-y-2.5 transition-all hover:border-[#1C5E43]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EBF5EE] text-[#0F382A] font-bold border border-[#C5DEC9]">
                            {program.code}
                          </span>
                          <span className="text-[10px] text-[#71847A]">
                            {isEn ? 'Managing Agency:' : 'Pengelola:'} {program.agency}
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-[#0F382A]">
                          {program.name}
                        </h4>
                      </div>
                    </div>

                    <p className="text-xs text-[#33463E] leading-relaxed">
                      {program.purpose}
                    </p>

                    <div className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#EAE5D8] space-y-1.5 text-[11px]">
                      <div>
                        <span className="font-bold text-[#192A24]">{isEn ? 'Target Beneficiaries: ' : 'Sasaran Penerima: '}</span>
                        <span className="text-[#556960]">{program.targetGroup}</span>
                      </div>
                      <div>
                        <span className="font-bold text-[#192A24]">{isEn ? 'Official Procedure: ' : 'Prosedur Pengusulan: '}</span>
                        <span className="text-[#556960]">{program.officialProcedure}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#F0EDE4] flex items-center justify-between text-[10px] text-[#71847A]">
                      <span>{isEn ? 'Verified:' : 'Diverifikasi:'} {program.lastCheckedDate}</span>
                      <a
                        href={program.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-[#0F382A] hover:underline flex items-center gap-1"
                      >
                        <span>{isEn ? 'Official Site' : 'Situs Resmi'} ({program.sourceUrl.replace('https://', '')})</span>
                        <ExternalLink className="w-3 h-3 text-[#1C5E43]" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#DDD6C5] text-[10px] text-[#71847A] italic leading-tight">
                {isEn 
                  ? '*Policy Notice: Assistance amounts and allocation quotas may change per APBN/APBD regulations and official Ministry directives. CukupAI does not claim definitive benefit amounts.'
                  : '*Catatan Kebijakan: Besaran bantuan dan kuota alokasi dapat berubah sewaktu-waktu sesuai ketentuan APBN/APBD dan arahan resmi Kementerian terkait. CukupAI tidak mengklaim kepastian nominal bantuan.'}
              </div>
            </div>
          )}

          {/* ================= SECTION D: JIKA DATA TIDAK DITEMUKAN ================= */}
          {activeSection === 'tidak_ditemukan' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-white border border-[#DDD6C5] shadow-2xs space-y-2">
                <div className="flex items-center gap-2 text-rose-800 font-bold text-xs sm:text-sm">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{isEn ? 'Name Not Found on Cek Bansos Portal?' : 'Nama Tidak Ditemukan di Portal Cek Bansos?'}</span>
                </div>
                <p className="text-xs text-[#52655C] leading-relaxed">
                  {isEn
                    ? 'If your name or a family member does not appear when checked, do not panic. This commonly occurs due to administrative reasons and does not necessarily mean you have permanently lost eligibility.'
                    : 'Jika nama Anda atau anggota keluarga tidak muncul saat dicek, jangan panik. Hal ini sering terjadi karena beberapa alasan administratif dan tidak serta merta berarti Anda kehilangan hak secara permanen.'}
                </p>
              </div>

              {/* Concrete Next Steps */}
              <div className="space-y-2.5">
                <div className="p-3.5 rounded-2xl bg-white border border-[#DDD6C5] shadow-2xs space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#0F382A]">
                    <span className="w-5 h-5 rounded-full bg-[#0F382A] text-white flex items-center justify-center text-[10px]">1</span>
                    <span>{isEn ? 'Verify Data Synchronization with Disdukcapil' : 'Periksa Sinkronisasi Data di Disdukcapil'}</span>
                  </div>
                  <p className="text-[11px] text-[#556960] pl-7 leading-relaxed">
                    {isEn
                      ? 'Ensure your NIK and Family Card (KK) are active and synchronized on the local Civil Registry (Disdukcapil) system. Discrepancies often occur due to name spelling, spacing, or unsynchronized central records.'
                      : 'Pastikan NIK dan nomor Kartu Keluarga (KK) sudah padan dan aktif di sistem Dinas Kependudukan dan Pencatatan Sipil (Disdukcapil) daerah. Seringkali nama tidak ditemukan karena ada perbedaan ejaan huruf, spasi, atau NIK belum terkonsolidasi pusat.'}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-[#DDD6C5] shadow-2xs space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#0F382A]">
                    <span className="w-5 h-5 rounded-full bg-[#0F382A] text-white flex items-center justify-center text-[10px]">2</span>
                    <span>{isEn ? 'Consult the SIKS-NG Operator at Village/Ward Office' : 'Konsultasi ke Operator SIKS-NG di Kantor Kelurahan / Desa'}</span>
                  </div>
                  <p className="text-[11px] text-[#556960] pl-7 leading-relaxed">
                    {isEn
                      ? 'Every village/ward office has a designated SIKS-NG operator. Visit the office and request the caseworker check whether your household is in proposal, inactive, or correction queue.'
                      : 'Setiap kelurahan/desa memiliki operator SIKS-NG (Sistem Informasi Kesejahteraan Sosial Next Generation). Datangi kantor kelurahan/desa dan mintalah petugas memeriksa apakah nama Anda terdaftar dalam antrean usulan atau data non-aktif.'}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-[#DDD6C5] shadow-2xs space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#0F382A]">
                    <span className="w-5 h-5 rounded-full bg-[#0F382A] text-white flex items-center justify-center text-[10px]">3</span>
                    <span>{isEn ? 'Propose via Village/Ward Deliberation (Musdes/Muskel)' : 'Ajukan Diri Lewat Musyawarah Desa / Kelurahan (Musdes/Muskel)'}</span>
                  </div>
                  <p className="text-[11px] text-[#556960] pl-7 leading-relaxed">
                    {isEn
                      ? 'If never previously registered, request a referral letter from your RT/RW community leaders to include your family in the next formal Musdes/Muskel meeting to be submitted to Social Affairs.'
                      : 'Jika belum pernah terdaftar sama sekali, mintalah pengantar dari Ketua RT/RW setempat agar nama keluarga Anda dimasukkan dalam agenda Musdes/Muskel berikutnya untuk diusulkan ke Dinas Sosial.'}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-[#DDD6C5] shadow-2xs space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#0F382A]">
                    <span className="w-5 h-5 rounded-full bg-[#0F382A] text-white flex items-center justify-center text-[10px]">4</span>
                    <span>{isEn ? 'Use the Official Kemensos "Usul & Sanggah" Mobile App' : "Manfaatkan Fitur 'Usul & Sanggah' di Aplikasi Resmi Kemensos"}</span>
                  </div>
                  <p className="text-[11px] text-[#556960] pl-7 leading-relaxed">
                    {isEn
                      ? 'Kemensos RI provides a self-service proposal and objection feature in the official "Aplikasi Cek Bansos" mobile app (published by Kementerian Sosial RI on Google Play Store).'
                      : 'Kemensos RI menyediakan fitur mandiri Usul dan Sanggah pada aplikasi mobile resmi "Aplikasi Cek Bansos" (penerbit resmi: Kementerian Sosial RI di Google Play Store). Di sana masyarakat bisa mengusulkan diri atau menyanggah penerima yang dinilai tidak tepat sasaran.'}
                  </p>
                </div>
              </div>

              {/* Hubungi 171 Advice */}
              <div className="p-3.5 rounded-2xl bg-[#F0F7F3] border border-[#C5DEC9] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#1C5E43] font-bold uppercase tracking-wider block">
                    {isEn ? 'National Central Complaints Hotline' : 'Saluran Pengaduan Resmi Pusat'}
                  </span>
                  <span className="text-xs font-bold text-[#0F382A]">
                    Command Center Kemensos: 171 ({isEn ? 'Toll-Free' : 'Bebas Pulsa'})
                  </span>
                </div>
                <a
                  href="tel:171"
                  className="py-1.5 px-3 rounded-lg bg-[#0F382A] hover:bg-[#184F3B] text-white font-bold text-xs flex items-center gap-1"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>171</span>
                </a>
              </div>
            </div>
          )}

          {/* ================= SECTION E: DOKUMEN YANG MUNGKIN DIPERLUKAN ================= */}
          {activeSection === 'dokumen' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 rounded-2xl bg-white border border-[#DDD6C5] shadow-2xs">
                <h3 className="text-xs font-bold text-[#0F382A] mb-1 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-[#C59B27]" />
                  <span>{isEn ? 'Commonly Prepared Document Checklist' : 'Checklist Dokumen yang Umum Dipersiapkan'}</span>
                </h3>
                <p className="text-xs text-[#52655C] leading-relaxed">
                  {isEn
                    ? 'Check the documents you have ready at home before consulting your Village, Ward, or Social Affairs office:'
                    : 'Centang dokumen yang sudah Anda siapkan di rumah sebelum berkonsultasi ke kantor Desa, Kelurahan, atau Dinas Sosial:'}
                </p>
              </div>

              {/* Interactive Checklist */}
              <div className="space-y-2 bg-white rounded-2xl border border-[#DDD6C5] p-3 shadow-2xs">
                <label className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-[#FAF9F5] cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={checkedDocs.ktp}
                    onChange={() => toggleDoc('ktp')}
                    className="mt-1 w-4 h-4 rounded text-[#0F382A] focus:ring-[#0F382A]"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#192A24] block">
                      {isEn ? 'Electronic ID Card (e-KTP) Original & Photocopy' : 'KTP Elektronik (e-KTP) Asli & Fotokopi'}
                    </span>
                    <span className="text-[11px] text-[#63766D]">
                      {isEn ? 'Ensure your e-KTP is active and registered with local Civil Registry (Disdukcapil).' : 'Pastikan e-KTP sudah aktif dan terdaftar di Dukcapil domisili saat ini.'}
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-[#FAF9F5] cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={checkedDocs.kk}
                    onChange={() => toggleDoc('kk')}
                    className="mt-1 w-4 h-4 rounded text-[#0F382A] focus:ring-[#0F382A]"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#192A24] block">
                      {isEn ? 'Current Family Card (KK)' : 'Kartu Keluarga (KK) Terkini'}
                    </span>
                    <span className="text-[11px] text-[#63766D]">
                      {isEn ? 'Ensure Family Card number is synchronized across all recorded family members.' : 'Pastikan nomor Kartu Keluarga telah sinkron dengan seluruh anggota keluarga tercatat.'}
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-[#FAF9F5] cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={checkedDocs.sktm}
                    onChange={() => toggleDoc('sktm')}
                    className="mt-1 w-4 h-4 rounded text-[#0F382A] focus:ring-[#0F382A]"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#192A24] block">
                      {isEn ? 'Certificate of Financial Inability (SKTM)' : 'Surat Keterangan Tidak Mampu (SKTM)'}
                    </span>
                    <span className="text-[11px] text-[#63766D]">
                      {isEn ? 'Issued through RT/RW neighborhood letter and legalized by Kelurahan/Desa office if requested.' : 'Dibuat melalui pengantar RT/RW dan dilegalisasi Kantor Kelurahan/Desa jika dipersyaratkan.'}
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-[#FAF9F5] cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={checkedDocs.fotoRumah}
                    onChange={() => toggleDoc('fotoRumah')}
                    className="mt-1 w-4 h-4 rounded text-[#0F382A] focus:ring-[#0F382A]"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#192A24] block">
                      {isEn ? 'Photographs of Living Conditions / Residence' : 'Foto Tempat Tinggal / Kondisi Rumah'}
                    </span>
                    <span className="text-[11px] text-[#63766D]">
                      {isEn ? 'Front view and interior photos for physical verification during field caseworker visits.' : 'Foto tampak depan rumah dan ruang dalam untuk verifikasi kelayakan fisik bila ada kunjungan lapangan.'}
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-[#FAF9F5] cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={checkedDocs.suratKeterangan}
                    onChange={() => toggleDoc('suratKeterangan')}
                    className="mt-1 w-4 h-4 rounded text-[#0F382A] focus:ring-[#0F382A]"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#192A24] block">
                      {isEn ? 'Proof of Special Medical / Employment Condition' : 'Keterangan Kondisi Khusus / Penghasilan'}
                    </span>
                    <span className="text-[11px] text-[#63766D]">
                      {isEn ? 'Chronic illness diagnosis, disability certificate, or lay-off letter from RT/RW if applicable.' : 'Surat diagnosa sakit menahun, keterangan disabilitas, atau keterangan PHK dari RT/RW jika ada.'}
                    </span>
                  </div>
                </label>
              </div>

              {/* Strict Privacy & No-Upload Policy */}
              <div className="p-3.5 rounded-2xl bg-[#FAF6EA] border border-[#EADBBD] text-xs text-[#6B5A24] space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-[#574619]">
                  <Lock className="w-4 h-4 text-[#A88219] shrink-0" />
                  <span>{isEn ? 'Privacy Guarantee & No-Document-Upload Policy on CukupAI' : 'Jaminan Privasi & Larangan Unggah Dokumen di CukupAI'}</span>
                </div>
                <p className="text-[11px] leading-relaxed text-[#6D5D28]">
                  {isEn
                    ? 'CukupAI does NOT support uploading photos of KTP, KK, or private documents, and will never ask for bank account PINs or OTP codes. Present physical documents only to authorized caseworkers in official government offices.'
                    : 'CukupAI tidak menyediakan fitur pengunggahan foto KTP/KK/dokumen dan tidak pernah meminta nomor rekening, PIN, atau kode OTP Anda. Tunjukkan dokumen fisik asli hanya langsung kepada petugas resmi di Kantor Desa/Kelurahan atau Dinas Sosial.'}
                </p>
              </div>
            </div>
          )}

          {/* ================= SECTION F: BANTUAN DAERAH & KONTAK ================= */}
          {activeSection === 'bantuan_daerah' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 rounded-2xl bg-white border border-[#DDD6C5] shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-bold text-[#0F382A] uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#C59B27]" />
                    <span>{isEn ? 'Social Affairs Office & Local Services Directory' : 'Direktori Dinas Sosial & Layanan Daerah'}</span>
                  </h3>
                  <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {isEn ? 'Official .go.id Domain' : 'Domain Resmi .go.id'}
                  </span>
                </div>
                <p className="text-xs text-[#52655C] leading-relaxed">
                  {isEn
                    ? 'Select your domicile area to find official contact details for regional social affairs institutions directly sourced from verified government domains.'
                    : 'Pilih wilayah domisili untuk menemukan informasi kontak resmi instansi sosial daerah yang bersumber langsung dari domain pemerintah resmi.'}
                </p>
              </div>

              {/* Province & City Selection */}
              <div className="bg-white rounded-2xl border border-[#DDD6C5] p-3.5 space-y-3 shadow-2xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-[#2A3F35] mb-1">
                      {isEn ? 'Select Province:' : 'Pilih Provinsi:'}
                    </label>
                    <select
                      value={selectedProvince}
                      onChange={(e) => {
                        const prov = e.target.value;
                        setSelectedProvince(prov);
                        const regencies = SAMPLE_REGENCIES_BY_PROVINCE[prov];
                        setSelectedRegency(regencies ? regencies[0] : '');
                        setCustomCitySearch('');
                      }}
                      className="w-full text-xs p-2.5 rounded-xl border border-[#D5CEBD] bg-[#FAF9F5] focus:ring-2 focus:ring-[#0F382A]"
                    >
                      {PROVINCE_OPTIONS.map((prov) => (
                        <option key={prov} value={prov}>
                          {prov}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#2A3F35] mb-1">
                      {isEn ? 'Regency / City:' : 'Kabupaten / Kota:'}
                    </label>
                    {SAMPLE_REGENCIES_BY_PROVINCE[selectedProvince] ? (
                      <select
                        value={selectedRegency}
                        onChange={(e) => {
                          setSelectedRegency(e.target.value);
                          setCustomCitySearch('');
                        }}
                        className="w-full text-xs p-2.5 rounded-xl border border-[#D5CEBD] bg-[#FAF9F5] focus:ring-2 focus:ring-[#0F382A]"
                      >
                        {SAMPLE_REGENCIES_BY_PROVINCE[selectedProvince].map((reg) => (
                          <option key={reg} value={reg}>
                            {reg}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={customCitySearch}
                        onChange={(e) => setCustomCitySearch(e.target.value)}
                        placeholder={isEn ? 'Type regency or city name...' : 'Ketik nama Kab / Kota...'}
                        className="w-full text-xs p-2.5 rounded-xl border border-[#D5CEBD] bg-[#FAF9F5] focus:ring-2 focus:ring-[#0F382A]"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Office Details Card */}
              {directoryLookup.office ? (
                <div className="p-4 rounded-2xl bg-white border border-[#C5DEC9] shadow-xs space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {isEn ? 'Officially Verified' : 'Terverifikasi Resmi'}
                        </span>
                        <span className="text-[10px] text-[#6B7D74]">
                          {isEn ? 'Verified:' : 'Diverifikasi:'} {directoryLookup.office.lastVerifiedDate}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-[#0F382A]">
                        {directoryLookup.office.officeName}
                      </h4>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-[#2A3F35]">
                    <div className="flex items-start justify-between gap-2 p-2 rounded-xl bg-[#FAF9F5] border border-[#EBE6DB]">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-[#C59B27] shrink-0 mt-0.5" />
                        <span className="text-[11px] leading-relaxed">{directoryLookup.office.address}</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(directoryLookup.office?.address || '', 'address')}
                        className="p-1 text-[#65786D] hover:text-[#0F382A] shrink-0"
                        title={isEn ? 'Copy Address' : 'Salin Alamat'}
                      >
                        {copiedKey === 'address' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-[#FAF9F5] border border-[#EBE6DB]">
                      <div className="flex items-center gap-2">
                        <PhoneCall className="w-4 h-4 text-[#1C5E43] shrink-0" />
                        <span className="font-semibold text-xs">{directoryLookup.office.phone}</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(directoryLookup.office?.phone || '', 'phone')}
                        className="p-1 text-[#65786D] hover:text-[#0F382A] shrink-0"
                        title={isEn ? 'Copy Phone' : 'Salin Telepon'}
                      >
                        {copiedKey === 'phone' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#F0EDE4] flex items-center justify-between text-[11px]">
                    <a
                      href={directoryLookup.office.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0F382A] font-bold underline flex items-center gap-1"
                    >
                      {isEn ? 'Visit Official Website' : 'Kunjungi Situs Resmi'} ({directoryLookup.office.websiteUrl.replace('https://', '')})
                      <ExternalLink className="w-3 h-3 text-[#1C5E43]" />
                    </a>
                  </div>
                </div>
              ) : (
                /* Safe unverified fallback - Never fabricate phone numbers or addresses */
                <div className="p-4 rounded-2xl bg-[#FFF8EB] border border-[#F2DCA5] text-amber-950 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <h4 className="text-xs font-bold">
                      {isEn ? 'Specific Contact Not Yet Verified in Directory' : 'Kontak Spesifik Belum Terverifikasi'}
                    </h4>
                  </div>
                  <p className="text-xs leading-relaxed text-[#59441D]">
                    {isEn 
                      ? `Local Social Affairs office details for region "${selectedProvince}${selectedRegency ? ' - ' + selectedRegency : ''}" are not yet verified in CukupAI's directory. For verified local guidance, please visit your local Village/Ward Office or call the official toll-free Kemensos hotline at 171.`
                      : directoryLookup.guidanceMessage}
                  </p>
                  <div className="p-3 rounded-xl bg-white border border-[#E9D8B4] text-xs space-y-1.5">
                    <div className="font-bold text-[#0F382A] flex items-center gap-1.5">
                      <PhoneCall className="w-4 h-4 text-[#1C5E43]" />
                      <span>{NATIONAL_KEMENSOS_CONTACT.hotlineLabel}</span>
                    </div>
                    <p className="text-[11px] text-[#556960]">
                      {isEn 
                        ? 'For official social assistance inquiries across Indonesia, call the toll-free number above.'
                        : 'Untuk pertanyaan atau klarifikasi resmi seluruh Indonesia, hubungi nomor bebas pulsa di atas.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Gemini Interactive Question Preparation Helper */}
              <div className="p-4 rounded-2xl bg-white border border-[#DDD6C5] shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#0F382A] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#C59B27]" />
                    <span>{isEn ? 'Question Preparation Assistant (AI Grounded)' : 'Asisten Siapkan Pertanyaan (AI Grounded)'}</span>
                  </h4>
                  <span className="text-[10px] text-[#71847A]">{isEn ? 'Practical Guidance' : 'Bantuan Praktis'}</span>
                </div>
                <p className="text-xs text-[#52655C] leading-relaxed">
                  {isEn
                    ? 'Unsure what to ask caseworkers at the Village/Ward or Social Affairs office? Click below to generate structured, polite question points:'
                    : 'Bingung apa yang harus ditanyakan ke petugas saat ke Kantor Kelurahan atau Dinas Sosial? Klik tombol di bawah untuk menyusun poin pertanyaan yang sopan dan terarah:'}
                </p>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleGenerateOfficeQuestions}
                    disabled={isAiLoading}
                    className="py-2 px-3 rounded-xl bg-[#0F382A] hover:bg-[#1C5E43] text-[#F9F3DC] font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    {isAiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-[#C59B27]" />}
                    <span>{isEn ? 'Generate Question Points for Village Office / Social Affairs' : 'Buatkan Poin Pertanyaan untuk Kantor Desa/Dinsos'}</span>
                  </button>
                </div>

                {/* AI Error */}
                {aiError && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs">
                    {aiError}
                  </div>
                )}

                {/* AI Output */}
                {aiResult && !isAiLoading && (
                  <div className="p-3.5 rounded-xl bg-[#FAF9F5] border border-[#DDD6C5] space-y-2 text-xs">
                    <span className="font-bold text-[#0F382A] block">
                      {isEn ? 'Sample Questions for Caseworkers:' : 'Contoh Poin Pertanyaan untuk Petugas:'}
                    </span>
                    <div className="text-[#2F4439] leading-relaxed whitespace-pre-line text-[11px]">
                      {aiResult.answer}
                    </div>
                    {aiResult.sources && (
                      <div className="pt-2 border-t border-[#E5E0D3] text-[10px] text-[#71847A]">
                        <span>{isEn ? 'Reference: Ministry of Social Affairs RI (171) & Official DTSEN Regulations' : 'Rujukan: Kemensos RI (171) & Regulasi DTSEN Resmi'}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

        </main>

        {/* 5. RESPONSIVE FOOTER WITH RELEVANT CONTACT & INTUITIVE NAVIGATION (NO DUPLICATE CLOSE BUTTON) */}
        <footer className="shrink-0 p-3 sm:p-3.5 bg-white border-t border-[#E5E0D3] flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-[#556960] min-w-0">
            <PhoneCall className="w-3.5 h-3.5 text-[#1C5E43] shrink-0" />
            <span className="text-[11px] truncate">
              {isEn ? 'Kemensos 24-Hour Hotline: ' : 'Hotline 24 Jam Kemensos: '}
              <strong className="text-[#0F382A]">171</strong> ({isEn ? 'Toll-Free' : 'Bebas Pulsa'})
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {prevSection && (
              <button
                onClick={() => setActiveSection(prevSection.id)}
                className="py-1.5 px-3 rounded-xl border border-[#DDD6C5] text-[#2F4439] hover:bg-[#FAF9F5] font-semibold text-xs flex items-center gap-1 transition-colors"
                title={`${isEn ? 'Back to' : 'Kembali ke'} ${prevSection.label}`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isEn ? 'Previous' : 'Sebelumnya'}</span>
              </button>
            )}

            {nextSection ? (
              <button
                onClick={() => setActiveSection(nextSection.id)}
                className="py-1.5 px-3 rounded-xl bg-[#0F382A] hover:bg-[#184F3B] text-[#F9F3DC] font-bold text-xs flex items-center gap-1 transition-colors shadow-2xs"
                title={`${isEn ? 'Proceed to' : 'Lanjut ke'} ${nextSection.label}`}
              >
                <span>{isEn ? 'Next' : 'Lanjut'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => setActiveSection('mulai')}
                className="py-1.5 px-3 rounded-xl bg-[#0F382A] hover:bg-[#184F3B] text-[#F9F3DC] font-bold text-xs flex items-center gap-1 transition-colors shadow-2xs"
              >
                <span>{isEn ? 'Back to Start' : 'Kembali ke Awal'}</span>
              </button>
            )}
          </div>
        </footer>

      </div>
    </div>
  );
};
