import test from 'node:test';
import assert from 'node:assert/strict';

// Mock sample financial context
const mockFinancialContext = {
  currentBalance: 450000,
  totalIncome: 3500000,
  totalExpenses: 2800000,
  remainingDays: 12,
  mandatoryUpcomingExpenses: 150000,
  flexibleFunds: 300000,
  safeDailySpending: 25000,
  averageDailySpending: 32000,
  projectedEndOfMonthBalance: 300000,
  status: 'AMAN',
  deficitTarget: 0,
  profile: {
    name: 'Budi',
    householdSize: 4,
    business: {
      name: 'Toko Berkah',
      product: 'Parfum',
      unitPrice: 25000,
      netProfitPerUnit: 10000
    }
  }
};

const serverUrl = 'http://127.0.0.1:3000/api/ai/chat';

test.describe('AI Agent Verification Suite', { concurrency: 1 }, () => {
  test('AI Agent - Scenario A: Ide & Strategi Bisnis', { timeout: 60000 }, async () => {
    const query = 'Saya memiliki beberapa parfum seharga Rp20–50 ribu, bagaimana menjualnya agar mendapat pemasukan?';
    const res = await fetch(serverUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: query }],
        financialContext: mockFinancialContext,
        language: 'id',
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.reply, 'Reply must exist');

    const lower = data.reply.toLowerCase();
    const hasSalesStrategy = lower.includes('pembeli') || lower.includes('target') || lower.includes('rekan');
    const hasBundlingOrPromo = lower.includes('paket') || lower.includes('bundl') || lower.includes('hemat') || lower.includes('tester');
    const hasPromotion = lower.includes('whatsapp') || lower.includes('facebook') || lower.includes('promosi') || lower.includes('story');
    
    assert.ok(hasSalesStrategy, 'Must provide target buyer / sales strategy');
    assert.ok(hasBundlingOrPromo, 'Must provide bundling or promo advice');
    assert.ok(hasPromotion, 'Must provide marketing/outreach advice');
    assert.ok(!data.reply.startsWith('Berdasarkan data keuangan Anda, saldo aktif saat ini Rp450.000 dengan batas belanja aman'), 'Must not reduce answer to generic safe spending limit');
    console.log('\n[TEST A PASSED] Query: ' + query);
    console.log('Sample output snippet:', data.reply.slice(0, 180) + '...\n');
  });

  test('AI Agent - Scenario B: Masalah Keuangan Nyata (Defisit Triage)', { timeout: 60000 }, async () => {
    const query = 'Saldo saya tinggal Rp100.000 dan ada tagihan Rp150.000 tiga hari lagi. Apa yang sebaiknya saya lakukan?';
    const res = await fetch(serverUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: query }],
        financialContext: { ...mockFinancialContext, currentBalance: 100000, safeDailySpending: 0 },
        language: 'id',
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.reply, 'Reply must exist');

    const lower = data.reply.toLowerCase();
    const hasTriage = lower.includes('makan') || lower.includes('pokok') || lower.includes('primer') || lower.includes('kebutuhan');
    const hasReschedule = lower.includes('komunikasi') || lower.includes('kelonggaran') || lower.includes('tempo') || lower.includes('angsur');
    const hasAntiPinjol = lower.includes('pinjol') || lower.includes('rentenir') || lower.includes('hutang') || lower.includes('pinjaman');

    assert.ok(hasTriage, 'Must advise preserving essential survival/food');
    assert.ok(hasReschedule, 'Must advise communicating/negotiating bill due date');
    assert.ok(hasAntiPinjol, 'Must warn against predatory loans/pinjol');
    console.log('[TEST B PASSED] Query: ' + query);
    console.log('Sample output snippet:', data.reply.slice(0, 180) + '...\n');
  });

  test('AI Agent - Scenario C: Perhitungan Bisnis / Margin', { timeout: 60000 }, async () => {
    const query = 'Bantu hitung keuntungan jika modal parfum Rp15.000 dan saya menjualnya Rp25.000.';
    const res = await fetch(serverUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: query }],
        financialContext: mockFinancialContext,
        language: 'id',
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.reply, 'Reply must exist');

    const lower = data.reply.toLowerCase();
    const hasTenThousand = lower.includes('10.000') || lower.includes('10000') || lower.includes('10 ribu');
    const hasMarginOrPercent = lower.includes('margin') || lower.includes('40%') || lower.includes('laba');

    assert.ok(hasTenThousand, 'Must compute profit of Rp10.000 per unit');
    assert.ok(hasMarginOrPercent, 'Must compute margin percentage or profit breakdown');
    console.log('[TEST C PASSED] Query: ' + query);
    console.log('Sample output snippet:', data.reply.slice(0, 180) + '...\n');
  });

  test('AI Agent - Scenario D: Pemasaran / Konten Praktis (Facebook Caption)', { timeout: 60000 }, async () => {
    const query = 'Buatkan caption Facebook untuk promosi parfum murah.';
    const res = await fetch(serverUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: query }],
        financialContext: mockFinancialContext,
        language: 'id',
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.reply, 'Reply must exist');

    const lower = data.reply.toLowerCase();
    const hasCopy = lower.includes('promo') || lower.includes('wangi') || lower.includes('parfum') || lower.includes('aroma');
    const hasCta = lower.includes('wa') || lower.includes('whatsapp') || lower.includes('pesan') || lower.includes('hubungi') || lower.includes('dm');

    assert.ok(hasCopy, 'Must provide promotional copywriting');
    assert.ok(hasCta, 'Must include Call To Action');
    console.log('[TEST D PASSED] Query: ' + query);
    console.log('Sample output snippet:', data.reply.slice(0, 180) + '...\n');
  });

  test('AI Agent - Scenario E: Pertanyaan Keuangan Langsung (Saldo Aman)', { timeout: 60000 }, async () => {
    const query = 'Berapa saldo aman saya untuk belanja hari ini?';
    const res = await fetch(serverUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: query }],
        financialContext: mockFinancialContext,
        language: 'id',
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.reply, 'Reply must exist');

    const lower = data.reply.toLowerCase();
    const hasSafeNumber = lower.includes('25.000') || lower.includes('25000');
    const hasBalanceNumber = lower.includes('450.000') || lower.includes('450000');

    assert.ok(hasSafeNumber || hasBalanceNumber, 'Must accurately reference actual safe daily spending or current balance');
    console.log('[TEST E PASSED] Query: ' + query);
    console.log('Sample output snippet:', data.reply.slice(0, 180) + '...\n');
  });

  test('AI Agent - Multi-Turn Conversation Memory', { timeout: 60000 }, async () => {
    const conversation = [
      { role: 'user', content: 'Saya punya usaha parfum kecil.' },
      { role: 'model', content: 'Bagus sekali! Parfum apa yang Anda jual dan berapa kisaran harganya?' },
      { role: 'user', content: 'Aroma vanila seharga Rp30.000. Buatkan status WA pendek.' },
    ];

    const res = await fetch(serverUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: conversation,
        financialContext: mockFinancialContext,
        language: 'id',
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.reply, 'Reply must exist');

    const lower = data.reply.toLowerCase();
    const retainedContext = lower.includes('vanila') || lower.includes('30.000') || lower.includes('wangi') || lower.includes('parfum');
    assert.ok(retainedContext, 'Must retain context of vanilla perfume from previous message');
    console.log('[MULTI-TURN TEST PASSED] Conversation context preserved properly.\n');
  });
});
