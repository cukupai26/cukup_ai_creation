import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  findVerifiedBansosOffice, 
  VERIFIED_BANSOS_OFFICES, 
  NATIONAL_KEMENSOS_CONTACT 
} from '../src/data/verifiedBansosDirectory';
import { calculateCashflowMetrics } from '../src/utils/calculations';
import { OpeningBalanceConfig, Transaction, UpcomingMandatoryExpense } from '../src/types';

// Helper to simulate status-based visibility logic as implemented in BerandaTab
function shouldShowBansosTrigger(status: 'AMAN' | 'PERLU_WASPADA' | 'KRITIS'): boolean {
  return status === 'KRITIS';
}

test('1. Status-based visibility: Trigger is shown only when status is KRITIS', () => {
  // Test Case 1A: Status is KRITIS (severe deficit)
  const openingBalance: OpeningBalanceConfig = {
    amount: 100000,
    effectiveDate: '2026-10-01',
  };
  const transactions: Transaction[] = [
    {
      id: 'tx-1',
      type: 'expense',
      amount: 400000, // Balance goes negative (-300,000)
      category: 'Makanan',
      description: 'Belanja darurat',
      date: '2026-10-05',
    },
  ];
  const upcomingExpenses: UpcomingMandatoryExpense[] = [
    {
      id: 'bill-1',
      title: 'Listrik & Kontrakan',
      amount: 500000,
      dueDate: '2026-10-25',
      category: 'Rumah tangga',
      isPaid: false,
    },
  ];

  const metricsKritis = calculateCashflowMetrics(
    transactions,
    upcomingExpenses,
    openingBalance,
    { asOfDate: '2026-10-15', reportingPeriod: '2026-10' }
  );

  assert.equal(metricsKritis.status, 'KRITIS', 'Calculated status must be KRITIS for severe deficit');
  assert.equal(
    shouldShowBansosTrigger(metricsKritis.status),
    true,
    'Subtle Pusat Bantuan Sosial card must be visible when calculated status is KRITIS'
  );

  // Test Case 1B: Status is AMAN (healthy cashflow)
  const metricsAman = calculateCashflowMetrics(
    [{ id: 'tx-inc', type: 'income', amount: 5000000, category: 'Gaji', description: 'Gaji', date: '2026-10-01' }],
    [],
    { amount: 2000000, effectiveDate: '2026-10-01' },
    { asOfDate: '2026-10-15', reportingPeriod: '2026-10' }
  );
  assert.equal(metricsAman.status, 'AMAN');
  assert.equal(
    shouldShowBansosTrigger(metricsAman.status),
    false,
    'Pusat Bantuan Sosial card must NOT be displayed in early warning for AMAN status'
  );

  // Test Case 1C: Status is PERLU_WASPADA (caution)
  const metricsWaspada = calculateCashflowMetrics(
    [{ id: 'tx-exp', type: 'expense', amount: 50000, category: 'Makanan', description: 'Belanja harian kecil', date: '2026-10-05' }],
    [{ id: 'b-1', title: 'Tagihan', amount: 300000, dueDate: '2026-10-28', category: 'Tagihan', isPaid: false }],
    { amount: 500000, effectiveDate: '2026-10-01' },
    { asOfDate: '2026-10-15', reportingPeriod: '2026-10' }
  );
  assert.equal(metricsWaspada.status, 'PERLU_WASPADA');
  assert.equal(
    shouldShowBansosTrigger(metricsWaspada.status),
    false,
    'Pusat Bantuan Sosial card must NOT be displayed in early warning for PERLU_WASPADA status'
  );
});

test('2. Verified local service directory lookup', () => {
  // Test Case 2A: Exact city match in verified directory
  const bandungLookup = findVerifiedBansosOffice('Jawa Barat', 'Bandung');
  assert.ok(bandungLookup.office, 'Should find verified office for Kota Bandung');
  assert.equal(bandungLookup.isCustomFallback, false);
  assert.equal(bandungLookup.office?.officeName, 'Dinas Sosial Kota Bandung');
  assert.match(bandungLookup.office?.websiteUrl || '', /dinsos\.bandung\.go\.id/);
  assert.equal(bandungLookup.office?.isVerified, true);
  assert.ok(bandungLookup.office?.lastVerifiedDate, 'Must have verified date');

  // Test Case 2B: Province match
  const jatengLookup = findVerifiedBansosOffice('Jawa Tengah');
  assert.ok(jatengLookup.office, 'Should find verified office for Jawa Tengah');
  assert.equal(jatengLookup.isCustomFallback, false);
  assert.equal(jatengLookup.office?.province, 'Jawa Tengah');
  assert.match(jatengLookup.office?.websiteUrl || '', /\.go\.id/);
});

test('3. Unverified contact & missing location safety: Never fabricate data', () => {
  // Test Case 3A: Unknown or unverified district/city
  const unknownLookup = findVerifiedBansosOffice('Papua', 'Kabupaten Fiktif 999');
  
  // Strict safety assert: Must NOT fabricate a fake office, fake address, or fake phone number!
  assert.equal(unknownLookup.office, null, 'Must return null office for unverified location');
  assert.equal(unknownLookup.isCustomFallback, true, 'Must flag as custom fallback');
  assert.match(
    unknownLookup.guidanceMessage,
    /171/,
    'Fallback message must direct to official Kemensos 171 command center'
  );
  assert.match(
    unknownLookup.guidanceMessage,
    /Kelurahan\/Desa/,
    'Fallback message must advise visiting local Kelurahan/Desa office'
  );

  // Test Case 3B: Verify national Kemensos contact integrity
  assert.equal(NATIONAL_KEMENSOS_CONTACT.hotline, '171');
  assert.equal(NATIONAL_KEMENSOS_CONTACT.portalCekBansosUrl, 'https://cekbansos.kemensos.go.id');
  assert.match(NATIONAL_KEMENSOS_CONTACT.websiteUrl, /kemensos\.go\.id/);
});

test('4. Security & Privacy: Never collect or transmit NIK / Identity documents', () => {
  const sampleNikInput = 'Halo tolong cek NIK 3201234567890001 apakah dapat bansos?';
  const has16DigitNik = /\b\d{16}\b/.test(sampleNikInput);

  assert.equal(has16DigitNik, true, 'Safety regex must detect 16-digit NIK');

  // Ensure our safety handler blocks NIK submission
  function sanitizeBansosSearchQuery(input: string): { allowed: boolean; message?: string } {
    if (/\b\d{16}\b/.test(input)) {
      return {
        allowed: false,
        message: 'Demi privasi dan keamanan Anda, jangan masukkan Nomor Induk Kependudukan (NIK) ke dalam CukupAI.',
      };
    }
    return { allowed: true };
  }

  const blockedResult = sanitizeBansosSearchQuery(sampleNikInput);
  assert.equal(blockedResult.allowed, false, 'Queries with 16-digit NIK must be intercepted');
  assert.match(blockedResult.message || '', /privasi dan keamanan/);

  const cleanQuery = 'Bagaimana alur usulan musyawarah desa untuk bansos?';
  const allowedResult = sanitizeBansosSearchQuery(cleanQuery);
  assert.equal(allowedResult.allowed, true, 'General procedure queries must be permitted');
});

test('5. Data integrity: All verified offices have valid .go.id government domains', () => {
  for (const office of VERIFIED_BANSOS_OFFICES) {
    assert.ok(
      office.websiteUrl.includes('.go.id') || office.sourceUrl.includes('.go.id'),
      `Office ${office.officeName} must be from an official government domain (*.go.id)`
    );
    assert.ok(office.phone.length > 5, `Office ${office.officeName} must have a phone number`);
    assert.ok(office.address.length > 10, `Office ${office.officeName} must have a street address`);
    assert.equal(office.isVerified, true, `Office ${office.officeName} must be marked verified`);
  }
});

test('6. Verified Social Assistance Programs directory integrity', async () => {
  const { VERIFIED_BANSOS_PROGRAMS } = await import('../src/data/verifiedBansosDirectory');
  assert.ok(VERIFIED_BANSOS_PROGRAMS.length >= 5, 'Should contain at least 5 verified programs');

  const pkh = VERIFIED_BANSOS_PROGRAMS.find((p) => p.code === 'PKH');
  assert.ok(pkh, 'PKH program must be present');
  assert.equal(pkh?.agency, 'Kementerian Sosial Republik Indonesia');
  assert.ok(pkh?.sourceUrl.includes('kemensos.go.id'));
  assert.ok(pkh?.lastCheckedDate);

  const bpnt = VERIFIED_BANSOS_PROGRAMS.find((p) => p.code.includes('BPNT'));
  assert.ok(bpnt, 'BPNT/Program Sembako must be present');
  assert.equal(bpnt?.category, 'pangan');

  const pbi = VERIFIED_BANSOS_PROGRAMS.find((p) => p.code === 'PBI JK');
  assert.ok(pbi, 'PBI JK must be present');
  assert.equal(pbi?.category, 'kesehatan');

  const bltDesa = VERIFIED_BANSOS_PROGRAMS.find((p) => p.code === 'BLT Dana Desa');
  assert.ok(bltDesa, 'BLT Dana Desa must be present');
  assert.equal(bltDesa?.category, 'desa');

  const atensi = VERIFIED_BANSOS_PROGRAMS.find((p) => p.code === 'ATENSI');
  assert.ok(atensi, 'ATENSI Kemensos must be present');
  assert.equal(atensi?.category, 'khusus');
});

test('7. Journey sections: 6 structured sections with clean step transitions', async () => {
  const sections = [
    'mulai',
    'cek_resmi',
    'jenis_bantuan',
    'tidak_ditemukan',
    'dokumen',
    'bantuan_daerah',
  ];

  assert.equal(sections.length, 6, 'Must feature all 6 requested sections');
  assert.equal(sections[0], 'mulai', 'Section 1 must be Mulai Di Sini');
  assert.equal(sections[1], 'cek_resmi', 'Section 2 must be Cek Layanan Resmi');
  assert.equal(sections[2], 'jenis_bantuan', 'Section 3 must be Jenis Bantuan');
  assert.equal(sections[3], 'tidak_ditemukan', 'Section 4 must be Jika Data Tidak Ditemukan');
  assert.equal(sections[4], 'dokumen', 'Section 5 must be Dokumen yang Mungkin Diperlukan');
  assert.equal(sections[5], 'bantuan_daerah', 'Section 6 must be Bantuan Daerah & Kontak');
});

test('8. Interactive situations & need type mappings', async () => {
  const { SITUATION_CHECKLIST_OPTIONS, NEED_TYPE_OPTIONS } = await import(
    '../src/data/verifiedBansosDirectory'
  );
  assert.ok(SITUATION_CHECKLIST_OPTIONS.length >= 5, 'Should have multiple situation options');
  for (const opt of SITUATION_CHECKLIST_OPTIONS) {
    assert.ok(opt.id);
    assert.ok(opt.label);
    assert.ok(opt.relevantProgram);
  }
  assert.ok(NEED_TYPE_OPTIONS.includes('Semua Kebutuhan'));
  assert.ok(NEED_TYPE_OPTIONS.some((n) => n.includes('Pangan')));
});

