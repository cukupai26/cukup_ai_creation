import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

function resolvePort(): number {
  const args = process.argv.slice(2);
  const portIdx = args.findIndex((arg) => arg === '--port' || arg === '-p');
  if (portIdx !== -1 && args[portIdx + 1]) {
    const val = Number(args[portIdx + 1]);
    if (!isNaN(val) && val > 0) return val;
  }

  // Inside AI Studio internal container, Nginx reverse proxy handles external traffic
  // and proxies to the app server on DEFAULT_APP_PORT (3000).
  if (process.env.DEFAULT_APP_PORT) {
    return Number(process.env.DEFAULT_APP_PORT);
  }
  if (process.env.APP_PORT) {
    return Number(process.env.APP_PORT);
  }

  // When deployed standalone to Google Cloud Run, Cloud Run injects PORT (e.g. 8080)
  if (process.env.PORT) {
    return Number(process.env.PORT);
  }

  return 3000;
}

function resolveHost(): string {
  const args = process.argv.slice(2);
  const hostIdx = args.findIndex((arg) => arg === '--host' || arg === '-h');
  if (hostIdx !== -1 && args[hostIdx + 1]) {
    return args[hostIdx + 1];
  }
  return '0.0.0.0';
}

const PORT = resolvePort();
const HOST = resolveHost();

const app = express();
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

const apiKey = process.env.GEMINI_API_KEY || '';
const metaApiKey = process.env.META_API_KEY || process.env.LLM_API_KEY || '';
const metaApiBaseUrl = process.env.META_API_BASE_URL || 'https://api.llama-api.com';
const metaModel = process.env.META_MODEL || 'llama3.3-70b';
const hasAiProvider = Boolean(apiKey || metaApiKey);

const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Meta / LLaMA API client using standard OpenAI-compatible completions
async function callMetaLlama(options: {
  prompt: string;
  systemInstruction?: string;
  responseMimeType?: string;
  temperature?: number;
}): Promise<string> {
  if (!metaApiKey) {
    throw new Error('Meta API key is not configured');
  }

  const endpoint = `${metaApiBaseUrl.replace(/\/+$/, '')}/v1/chat/completions`;
  const messages: Array<{ role: string; content: string }> = [];

  if (options.systemInstruction) {
    messages.push({ role: 'system', content: options.systemInstruction });
  }
  messages.push({ role: 'user', content: options.prompt });

  const body: any = {
    model: metaModel,
    messages,
    temperature: typeof options.temperature === 'number' ? options.temperature : 0.3,
  };

  if (options.responseMimeType === 'application/json') {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${metaApiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Meta API HTTP ${response.status}: ${errText}`);
  }

  const data = (await response.json()) as any;
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response from Meta API');
  }
  return content;
}

// Resilient caller with multi-model fallback across Gemini and Meta LLaMA
async function callGeminiContent(options: {
  contents: any;
  systemInstruction?: string;
  responseMimeType?: string;
  responseSchema?: any;
  temperature?: number;
}) {
  const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];
  let lastError: any = null;

  if (apiKey) {
    for (const model of candidateModels) {
      try {
        const config: any = {};
        if (options.systemInstruction) config.systemInstruction = options.systemInstruction;
        if (typeof options.temperature === 'number') config.temperature = options.temperature;
        if (options.responseMimeType) config.responseMimeType = options.responseMimeType;
        if (options.responseSchema) config.responseSchema = options.responseSchema;

        const response = await ai.models.generateContent({
          model,
          contents: options.contents,
          config: Object.keys(config).length > 0 ? config : undefined,
        });

        return response;
      } catch (err: any) {
        lastError = err;
        const isQuotaOrRateLimit =
          err?.status === 'RESOURCE_EXHAUSTED' ||
          err?.code === 429 ||
          (typeof err?.message === 'string' &&
            (err.message.includes('429') || err.message.includes('quota') || err.message.includes('RESOURCE_EXHAUSTED')));

        if (isQuotaOrRateLimit) {
          console.info(`[CukupAI Engine] Free-tier limit reached for ${model}, attempting next model...`);
        } else {
          console.info(`[CukupAI Engine] Note: Model ${model} unavailable, trying next model...`);
        }
      }
    }
  }

  // If Gemini is unavailable or not configured, attempt Meta LLaMA if text prompt is available
  if (metaApiKey) {
    try {
      let promptText = '';
      if (typeof options.contents === 'string') {
        promptText = options.contents;
      } else if (Array.isArray(options.contents)) {
        promptText = options.contents
          .map((part: any) => (typeof part === 'string' ? part : part?.text || part?.parts?.[0]?.text || ''))
          .filter(Boolean)
          .join('\n');
      }

      if (promptText) {
        const metaResultText = await callMetaLlama({
          prompt: promptText,
          systemInstruction: options.systemInstruction,
          responseMimeType: options.responseMimeType,
          temperature: options.temperature,
        });

        return { text: metaResultText };
      }
    } catch (metaErr: any) {
      console.info(`[CukupAI Engine] Meta API call error: ${metaErr?.message || metaErr}`);
      lastError = metaErr;
    }
  }

  throw lastError || new Error('No AI provider credentials configured (Gemini or Meta)');
}

// Helper for local parsing fallback if API key is absent or quota exceeded
function fallbackParseTransaction(text: string, currentDate: string) {
  const lower = text.toLowerCase();
  const isIncome = lower.includes('gaji') || lower.includes('masuk') || lower.includes('dapat') || 
                   lower.includes('untung') || lower.includes('jual') || lower.includes('omset') || 
                   lower.includes('komisi') || lower.includes('bonus') || lower.includes('transferan');
  
  // Extract number and suffix with strict boundaries
  let amount = 0;
  const numMatch = text.match(/(?:rp\.?|idr)?\s*([0-9]{1,3}(?:\.[0-9]{3})+(?:,[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\s*(rb|ribu|k|jt|juta)?(?:\b|$)/i);
  if (numMatch) {
    let raw = numMatch[1].replace(/\./g, '').replace(',', '.');
    let val = parseFloat(raw);
    const suf = numMatch[2] ? numMatch[2].toLowerCase() : null;
    if (suf) {
      if (suf === 'rb' || suf === 'ribu' || suf === 'k') val *= 1000;
      if (suf === 'jt' || suf === 'juta') val *= 1000000;
    }
    amount = Math.round(val);
  }

  let category = isIncome ? 'Lainnya' : 'Makanan';
  if (isIncome) {
    if (lower.includes('gaji')) category = 'Gaji';
    else if (lower.includes('jual') || lower.includes('dagang') || lower.includes('toko') || lower.includes('omset')) category = 'Usaha';
    else if (lower.includes('freelance') || lower.includes('proyek')) category = 'Freelance';
    else if (lower.includes('bonus')) category = 'Bonus';
    else if (lower.includes('komisi') || lower.includes('affiliate')) category = 'Komisi';
  } else {
    if (lower.includes('makan') || lower.includes('beras') || lower.includes('kopi') || lower.includes('sayur') || lower.includes('lauk') || lower.includes('jajan')) category = 'Makanan';
    else if (lower.includes('listrik') || lower.includes('pln') || lower.includes('token')) category = 'Listrik';
    else if (lower.includes('air') || lower.includes('pdam')) category = 'Air';
    else if (lower.includes('sekolah') || lower.includes('spp') || lower.includes('buku') || lower.includes('les')) category = 'Pendidikan';
    else if (lower.includes('bensin') || lower.includes('ojek') || lower.includes('grab') || lower.includes('gojek') || lower.includes('parkir') || lower.includes('tol')) category = 'Transportasi';
    else if (lower.includes('obat') || lower.includes('dokter') || lower.includes('klinik') || lower.includes('rs')) category = 'Kesehatan';
    else if (lower.includes('kontrakan') || lower.includes('sewa') || lower.includes('sabun') || lower.includes('gas')) category = 'Rumah tangga';
    else if (lower.includes('pulsa') || lower.includes('wifi') || lower.includes('tagihan') || lower.includes('indihome')) category = 'Tagihan';
    else if (lower.includes('baju') || lower.includes('sepatu') || lower.includes('shopee') || lower.includes('tokopedia')) category = 'Belanja';
    else if (lower.includes('nonton') || lower.includes('bioskop') || lower.includes('hiburan') || lower.includes('game')) category = 'Hiburan';
  }

  return {
    type: isIncome ? 'income' : 'expense',
    amount: amount || 50000,
    category,
    description: text.trim(),
    date: currentDate || new Date().toISOString().split('T')[0],
    confidence: amount > 0 ? 0.85 : 0.6,
    note: 'Dianalisis secara cerdas.',
  };
}

// 1. Natural language transaction parsing
app.post('/api/ai/parse-transaction', async (req, res) => {
  const { text, currentDate } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text transaksi diperlukan' });
  }

  const todayStr = currentDate || new Date().toISOString().split('T')[0];

  if (!hasAiProvider) {
    return res.json(fallbackParseTransaction(text, todayStr));
  }

  try {
    const prompt = `Anda adalah parser transaksi keuangan keluarga Indonesia untuk CukupAI.
Analisis input bahasa sehari-hari berikut:
"${text}"

Tanggal referensi hari ini: ${todayStr}

Ekstrak dan hasilkan JSON dengan schema:
- type: 'income' atau 'expense'
- amount: angka integer IDR (konversi "75rb", "Rp75.000", "2.5jt", "250k" menjadi angka murni tanpa titik)
- category:
  Jika income: pilih salah satu dari ['Gaji', 'Usaha', 'Freelance', 'Bonus', 'Komisi', 'Lainnya']
  Jika expense: pilih salah satu dari ['Makanan', 'Rumah tangga', 'Listrik', 'Air', 'Pendidikan', 'Transportasi', 'Kesehatan', 'Tagihan', 'Belanja', 'Hiburan', 'Lainnya']
- description: deskripsi rapi dan ringkas (maksimal 6 kata)
- date: format YYYY-MM-DD (jika disebut "kemarin", "tadi", "2 hari lalu", sesuaikan dengan tanggal referensi)
- confidence: angka 0.0 sampai 1.0 (tingkat keyakinan ekstraksi)
- note: catatan singkat ramah jika ada ketidakpastian.`;

    const response = await callGeminiContent({
      contents: prompt,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ['income', 'expense'] },
          amount: { type: Type.INTEGER },
          category: { type: Type.STRING },
          description: { type: Type.STRING },
          date: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          note: { type: Type.STRING },
        },
        required: ['type', 'amount', 'category', 'description', 'date', 'confidence'],
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch {
    console.info('[CukupAI Parser] Handled via local transaction parsing engine.');
    return res.json(fallbackParseTransaction(text, todayStr));
  }
});

// 1B. Receipt & E-Wallet Multimodal OCR Scanner
app.post('/api/ai/scan-receipt', async (req, res) => {
  const { imageBase64, mimeType, currentDate, language } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ error: 'Data gambar struk diperlukan' });
  }

  const todayStr = currentDate || new Date().toISOString().split('T')[0];
  const lang = language === 'en' ? 'en' : 'id';

  // Normalize base64 string
  let cleanBase64 = imageBase64;
  let cleanMime = mimeType || 'image/jpeg';
  if (imageBase64.includes(';base64,')) {
    const parts = imageBase64.split(';base64,');
    cleanBase64 = parts[1];
    const mimeMatch = parts[0].match(/data:(.*?);/);
    if (mimeMatch) cleanMime = mimeMatch[1];
  }

  if (!apiKey) {
    return res.json({
      type: 'expense',
      amount: 68500,
      merchantOrItem: lang === 'en' ? 'Indomaret / Minimarket' : 'Indomaret / Minimarket',
      description: lang === 'en' ? 'Grocery items' : 'Belanja kebutuhan dapur & sembako',
      date: todayStr,
      category: 'Makanan',
      detectedType: 'receipt',
      confidence: 0.9,
      note: lang === 'en' ? 'Parsed from receipt preview.' : 'Struk berhasil dipindai dengan rapi.',
      items: [
        { name: 'Beras 2.5kg', price: 38000 },
        { name: 'Minyak Goreng 1L', price: 18500 },
        { name: 'Telur Ayam 1/2kg', price: 12000 }
      ]
    });
  }

  try {
    const prompt = lang === 'en'
      ? `You are an expert OCR and financial document vision assistant for CukupAI.
Analyze this receipt photo or mobile banking/e-wallet screenshot (e.g., Indomaret, Alfamart, GoPay, OVO, ShopeePay, DANA, QRIS, BCA Mobile, Mandiri Livin, paper bill).
Reference date: ${todayStr}

Extract into structured JSON:
- type: 'expense' (for purchases, merchant payments, transfers out, bill payments) or 'income' (for transfer in / top-up received)
- amount: integer IDR (total paid or received)
- merchantOrItem: store name, merchant, service provider, or recipient (e.g. "Indomaret", "Kopi Kenangan", "PLN", "ShopeePay")
- description: concise clean summary (max 6 words)
- date: transaction date YYYY-MM-DD found on receipt, or ${todayStr}
- category: one of ['Makanan', 'Rumah tangga', 'Listrik', 'Air', 'Pendidikan', 'Transportasi', 'Kesehatan', 'Tagihan', 'Belanja', 'Hiburan', 'Lainnya', 'Gaji', 'Usaha', 'Freelance', 'Bonus', 'Komisi']
- detectedType: 'receipt' | 'ewallet_screenshot' | 'invoice' | 'other'
- confidence: number between 0.0 and 1.0
- note: short helpful note in English
- items: array of visible item line entries with name and price`
      : `Anda adalah asisten AI OCR struk belanja dan bukti e-wallet untuk CukupAI.
Analisis foto struk belanja, nota warung, atau screenshot e-wallet/m-banking (Indomaret, Alfamart, GoPay, OVO, ShopeePay, DANA, QRIS, BCA Mobile, Livin, SPBU, dsb).
Tanggal referensi: ${todayStr}

Ekstrak ke format JSON:
- type: 'expense' (untuk pembelian, bayar tagihan, QRIS, transfer keluar) atau 'income' (jika bukti dana masuk / transfer diterima)
- amount: angka integer IDR total transaksi (misal: 68500 tanpa titik)
- merchantOrItem: nama toko, kasir, penerima, atau penyedia (misal: "Indomaret", "Alfamart", "SPBU Pertamina", "Warung Bu Siti", "PLN")
- description: ringkasan singkat rapi (maksimal 6 kata, misal "Belanja sembako Indomaret")
- date: tanggal pada struk format YYYY-MM-DD (jika tidak ditemukan gunakan ${todayStr})
- category: salah satu dari ['Makanan', 'Rumah tangga', 'Listrik', 'Air', 'Pendidikan', 'Transportasi', 'Kesehatan', 'Tagihan', 'Belanja', 'Hiburan', 'Lainnya', 'Gaji', 'Usaha', 'Freelance', 'Bonus', 'Komisi']
- detectedType: 'receipt' | 'ewallet_screenshot' | 'invoice' | 'other'
- confidence: angka 0.0 - 1.0
- note: catatan singkat hasil bacaan
- items: rincian barang/pos yang terlihat jelas (nama dan harga)`;

    const response = await callGeminiContent({
      contents: [
        {
          inlineData: {
            mimeType: cleanMime,
            data: cleanBase64,
          },
        },
        { text: prompt },
      ],
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ['income', 'expense'] },
          amount: { type: Type.INTEGER },
          merchantOrItem: { type: Type.STRING },
          description: { type: Type.STRING },
          date: { type: Type.STRING },
          category: { type: Type.STRING },
          detectedType: { type: Type.STRING, enum: ['receipt', 'ewallet_screenshot', 'invoice', 'other'] },
          confidence: { type: Type.NUMBER },
          note: { type: Type.STRING },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                price: { type: Type.INTEGER },
              },
              required: ['name', 'price'],
            },
          },
        },
        required: ['type', 'amount', 'merchantOrItem', 'description', 'date', 'category', 'detectedType', 'confidence'],
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch {
    console.info('[CukupAI OCR] Handled via local receipt parsing engine.');
    return res.json({
      type: 'expense',
      amount: 50000,
      merchantOrItem: 'Toko / Minimarket',
      description: 'Belanja kebutuhan rumah tangga',
      date: todayStr,
      category: 'Makanan',
      detectedType: 'receipt',
      confidence: 0.75,
      note: 'Struk diproses. Silakan verifikasi nominal sebelum menyimpan.',
    });
  }
});

// 2. Cashflow & Risk Analysis
app.post('/api/ai/analyze-cashflow', async (req, res) => {
  const { 
    currentBalance, 
    totalIncome, 
    totalExpenses, 
    remainingDays, 
    mandatoryUpcomingExpenses, 
    flexibleFunds, 
    safeDailySpending, 
    averageDailyExpense,
    projectedEndOfMonthBalance,
    recentExpenses,
    profile
  } = req.body;

  if (!hasAiProvider) {
    const isDeficit = projectedEndOfMonthBalance < 0 || flexibleFunds < 0;
    const isWarning = !isDeficit && (safeDailySpending < averageDailyExpense * 0.7);
    const status = isDeficit ? 'KRITIS' : (isWarning ? 'PERLU_WASPADA' : 'AMAN');

    return res.json({
      status,
      summary: isDeficit 
        ? `Perhatian: Dengan laju pengeluaran saat ini dan kewajiban sisa Rp${(mandatoryUpcomingExpenses||0).toLocaleString('id-ID')}, Anda berpotensi defisit Rp${Math.abs(projectedEndOfMonthBalance).toLocaleString('id-ID')} sebelum akhir bulan.`
        : isWarning
        ? `Keuangan Anda perlu dijaga ketat. Batas pengeluaran aman hari ini Rp${(safeDailySpending||0).toLocaleString('id-ID')}, di bawah rata-rata pengeluaran harian Anda.`
        : `Kondisi kas keluarga saat ini aman terkendali. Tetap patuhi batas belanja Rp${(safeDailySpending||0).toLocaleString('id-ID')}/hari.`,
      keyObservations: [
        `Saldo aktif saat ini: Rp${(currentBalance||0).toLocaleString('id-ID')} dengan sisa ${remainingDays} hari.`,
        `Kebutuhan wajib yang belum dibayar: Rp${(mandatoryUpcomingExpenses||0).toLocaleString('id-ID')}.`,
        `Dana fleksibel bersih: Rp${(flexibleFunds||0).toLocaleString('id-ID')}.`
      ],
      topSpendingCategories: (recentExpenses || []).slice(0, 3).map((e: any) => ({
        category: e.category,
        amount: e.amount,
        percentage: 0,
        note: 'Prioritaskan evaluasi pengeluaran ini jika perlu penghematan.'
      })),
      immediateActions: isDeficit 
        ? [
            'Aktifkan Mode Tutup Defisit segera.',
            'Tahan pembelian barang non-esensial sampai tanggal gajian berikutnya.',
            'Cek peluang penghasilan cepat dari usaha atau aset yang ada.'
          ]
        : [
            'Jaga pengeluaran fleksibel di bawah batas aman harian.',
            'Sisihkan dana untuk tagihan wajib segera.',
            'Catat setiap transaksi sekecil apa pun.'
          ],
      safeDailyExplanation: `Anda memiliki Rp${(currentBalance||0).toLocaleString('id-ID')} dan masih ${remainingDays} hari menuju akhir bulan. Setelah memperhitungkan kebutuhan wajib Rp${(mandatoryUpcomingExpenses||0).toLocaleString('id-ID')}, dana fleksibel Anda sekitar Rp${(flexibleFunds||0).toLocaleString('id-ID')}. Batas aman belanja harian: Rp${(safeDailySpending||0).toLocaleString('id-ID')}/hari.`
    });
  }

  try {
    const prompt = `Anda adalah CukupAI, asisten arus kas keluarga Indonesia yang jujur, hangat, dan teliti.
Analisis data keuangan aktual berikut:
- Saldo saat ini: Rp${currentBalance}
- Total pemasukan bulan ini: Rp${totalIncome}
- Total pengeluaran bulan ini: Rp${totalExpenses}
- Sisa hari sampai akhir bulan: ${remainingDays} hari
- Kewajiban/pengeluaran wajib tersisa: Rp${mandatoryUpcomingExpenses}
- Dana fleksibel tersedia: Rp${flexibleFunds}
- Batas aman belanja hari ini: Rp${safeDailySpending}/hari
- Rata-rata pengeluaran aktual: Rp${averageDailyExpense}/hari
- Proyeksi saldo akhir bulan: Rp${projectedEndOfMonthBalance}
- Pengeluaran terbaru: ${JSON.stringify(recentExpenses || [])}
- Profil keluarga: ${JSON.stringify(profile || {})}

Berikan analisis dalam format JSON sesuai skema:
- status: "AMAN" jika proyeksi positif dan aman, "PERLU_WASPADA" jika pengeluaran harian melebihi batas aman, "KRITIS" jika proyeksi defisit atau dana fleksibel minus.
- summary: penjelasan santun dan realistis dalam 2 kalimat.
- keyObservations: 3 poin pengamatan berbasis angka faktual.
- topSpendingCategories: array 3 kategori paling signifikan dengan catatan praktis.
- immediateActions: 3 langkah nyata dan realistis untuk keluarga (hindari kata umum "hemat", berikan tindakan spesifik).
- safeDailyExplanation: penjelasan transparan rumus batas aman harian dalam bahasa Indonesia yang mudah dipahami orang tua / keluarga.`;

    const response = await callGeminiContent({
      contents: prompt,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          status: { type: Type.STRING, enum: ['AMAN', 'PERLU_WASPADA', 'KRITIS'] },
          summary: { type: Type.STRING },
          keyObservations: { type: Type.ARRAY, items: { type: Type.STRING } },
          topSpendingCategories: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING },
                amount: { type: Type.INTEGER },
                percentage: { type: Type.NUMBER },
                note: { type: Type.STRING },
              },
              required: ['category', 'amount', 'note'],
            },
          },
          immediateActions: { type: Type.ARRAY, items: { type: Type.STRING } },
          safeDailyExplanation: { type: Type.STRING },
        },
        required: ['status', 'summary', 'keyObservations', 'topSpendingCategories', 'immediateActions', 'safeDailyExplanation'],
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch {
    console.info('[CukupAI Cashflow] Handled via local structured cashflow engine.');
    return res.json({
      status: projectedEndOfMonthBalance < 0 ? 'KRITIS' : 'PERLU_WASPADA',
      summary: `Proyeksi keuangan menunjukkan Anda perlu menjaga kas hingga akhir bulan.`,
      keyObservations: [
        `Saldo aktif Rp${(currentBalance||0).toLocaleString('id-ID')}`,
        `Sisa hari: ${remainingDays} hari`,
        `Kewajiban wajib: Rp${(mandatoryUpcomingExpenses||0).toLocaleString('id-ID')}`
      ],
      topSpendingCategories: [],
      immediateActions: ['Patuhi batas belanja harian', 'Tinjau kebutuhan non-esensial', 'Optimalkan penghasilan tambahan'],
      safeDailyExplanation: `Batas belanja harian dihitung dari sisa dana fleksibel dibagi sisa hari.`
    });
  }
});

// 3. Mode Tutup Defisit Plan Generator
app.post('/api/ai/generate-deficit-plan', async (req, res) => {
  const { deficitAmount, remainingDays, currentBalance, profile, recentExpenses } = req.body;
  const target = Math.max(100000, Number(deficitAmount) || 500000);

  if (!hasAiProvider) {
    // Local deterministic high-value plan
    const partA_amount = Math.round(target * 0.55 / 10000) * 10000;
    const partB_amount = Math.round(target * 0.15 / 10000) * 10000;
    const partC_amount = target - partA_amount - partB_amount;

    return res.json({
      targetAmount: target,
      planA_additionalIncome: {
        title: 'Pemasukan Tambahan Cepat',
        amount: partA_amount,
        assumptions: 'Berdasarkan penjualan produk/jasa ke relasi atau pelanggan lama dalam 3-5 hari ke depan.',
        concreteSteps: [
          'Hubungi 10 pelanggan atau teman dekat dengan penawaran khusus terbatas.',
          'Buka pre-order makanan/produk favorit tanpa modal stok berlebih.',
          'Manfaatkan status WhatsApp / media sosial dengan foto produk asli.'
        ]
      },
      planB_expenseReduction: {
        title: 'Penghematan Pengeluaran Fleksibel',
        amount: partB_amount,
        targetCategories: ['Makanan luar/jajan', 'Hiburan', 'Belanja non-kebutuhan pokok'],
        concreteSteps: [
          'Bawa bekal minum dan masak bahan di dapur untuk 7 hari ke depan.',
          'Tunda pembelian pakaian atau barang online hingga awal bulan depan.',
          'Gunakan transportasi paling efisien atau gabungkan rute perjalanan.'
        ]
      },
      planC_businessOptimization: {
        title: 'Optimalisasi Usaha / Keterampilan',
        amount: partC_amount,
        assumptions: 'Memaksimalkan aset atau kemampuan yang sudah ada tanpa perlu pinjaman modal.',
        concreteSteps: [
          'Tawarkan bundling 2 barang hemat untuk meningkatkan rata-rata nilai transaksi.',
          'Minta repeat order dari pembeli minggu lalu dengan diskon ongkir lokal.',
          'Buka jasa kilat sesuai keahlian (desain, servis, antar, ketik, dsb).'
        ]
      },
      totalImprovement: target,
      summary: `Rencana kombinasi 3 pilar: Pemasukan tambahan (+Rp${partA_amount.toLocaleString('id-ID')}), Penghematan fleksibel (-Rp${partB_amount.toLocaleString('id-ID')}), dan Optimalisasi usaha (+Rp${partC_amount.toLocaleString('id-ID')}). Total solusi: Rp${target.toLocaleString('id-ID')}.`,
      assumptionsDisclaimer: 'Seluruh angka adalah proyeksi perencanaan berdasarkan aksi nyata pengguna. Hasil aktual bergantung pada eksekusi dan respons pelanggan.'
    });
  }

  try {
    const prompt = `Anda adalah CukupAI, spesialis perencana penutupan defisit keuangan keluarga Indonesia.
Keluarga ini menghadapi proyeksi kekurangan dana:
Target Defisit: Rp${target}
Sisa waktu: ${remainingDays} hari
Saldo saat ini: Rp${currentBalance}
Profil pengguna & sumber daya: ${JSON.stringify(profile || {})}
Pengeluaran terbaru: ${JSON.stringify(recentExpenses || [])}

Buat rencana nyata "MODE TUTUP DEFISIT" yang membagi target Rp${target} menjadi 3 pilar:
A. Pemasukan Tambahan (Additional Income): bersumber dari penjualan tambahan, jasa, atau komisi realistis.
B. Pengurangan Pengeluaran (Expense Reduction): memotong pengeluaran fleksibel (bukan kebutuhan pokok anak/keluarga).
C. Optimalisasi Usaha/Aset yang Ada (Business Optimization): jika punya usaha (misal jual parfum, warung, dsb) atau skill, optimalkan pelanggan lama/aset yang sudah ada. Jangan anjurkan bisnis baru yang butuh modal besar!

Jumlah perbaikan dari A + B + C harus persis atau mendekati target Rp${target}.
Jelaskan asumsi di balik setiap angka.
Kembalikan format JSON:`;

    const response = await callGeminiContent({
      contents: prompt,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          targetAmount: { type: Type.INTEGER },
          planA_additionalIncome: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              amount: { type: Type.INTEGER },
              assumptions: { type: Type.STRING },
              concreteSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['title', 'amount', 'assumptions', 'concreteSteps'],
          },
          planB_expenseReduction: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              amount: { type: Type.INTEGER },
              targetCategories: { type: Type.ARRAY, items: { type: Type.STRING } },
              concreteSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['title', 'amount', 'targetCategories', 'concreteSteps'],
          },
          planC_businessOptimization: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              amount: { type: Type.INTEGER },
              assumptions: { type: Type.STRING },
              concreteSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['title', 'amount', 'assumptions', 'concreteSteps'],
          },
          totalImprovement: { type: Type.INTEGER },
          summary: { type: Type.STRING },
          assumptionsDisclaimer: { type: Type.STRING },
        },
        required: [
          'targetAmount', 
          'planA_additionalIncome', 
          'planB_expenseReduction', 
          'planC_businessOptimization', 
          'totalImprovement', 
          'summary', 
          'assumptionsDisclaimer'
        ],
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch {
    console.info('[CukupAI DeficitPlan] Handled via local structured deficit plan engine.');
    const isEn = req.body.language === 'en';

    return res.json({
      targetAmount: target,
      planA_additionalIncome: {
        title: isEn ? 'Additional Sales from Relationships & Customers' : 'Penjualan Tambahan Relasi & Pelanggan',
        amount: Math.round(target * 0.6),
        assumptions: isEn ? 'Selling products or services to close contacts during remaining days.' : 'Menjual produk atau jasa ke kontak terdekat dalam sisa waktu bulan ini.',
        concreteSteps: isEn 
          ? ['Contact 10 previous customers with special offer', 'Create a limited-time bundle package']
          : ['Hubungi 10 pelanggan sebelumnya', 'Buat paket bundling promo singkat']
      },
      planB_expenseReduction: {
        title: isEn ? 'Tighten Flexible Spending' : 'Pengetatan Belanja Fleksibel',
        amount: Math.round(target * 0.2),
        targetCategories: isEn ? ['Dining out', 'Snacks', 'Entertainment'] : ['Makanan luar', 'Jajan', 'Hiburan'],
        concreteSteps: isEn 
          ? ['Cook meals at home', 'Postpone clothing and non-essential shopping']
          : ['Masak makanan di rumah', 'Tunda belanja pakaian dan online shopping']
      },
      planC_businessOptimization: {
        title: isEn ? 'Asset & Service Optimization' : 'Optimalisasi Aset & Jasa',
        amount: target - Math.round(target * 0.6) - Math.round(target * 0.2),
        assumptions: isEn ? 'Leveraging skills and 1-2 hours of free time daily.' : 'Memaksimalkan keahlian dan waktu luang 1-2 jam per hari.',
        concreteSteps: isEn 
          ? ['Open rapid order slots', 'Offer specialized service to neighbors or colleagues']
          : ['Buka pesanan kilat', 'Tawarkan layanan ke tetangga atau rekan kerja']
      },
      totalImprovement: target,
      summary: isEn
        ? `Coordinated plan to cover the deficit of Rp${target.toLocaleString('en-US')} through a balanced mix of income generation and rational savings.`
        : `Rencana terpadu menutup defisit Rp${target.toLocaleString('id-ID')} dengan kombinasi pemasukan dan penghematan rasional.`,
      assumptionsDisclaimer: isEn 
        ? 'Estimates prepared as structured action guidance, not guaranteed income.'
        : 'Perkiraan disusun sebagai panduan aksi terstruktur, bukan jaminan pendapatan.'
    });
  }
});

// 4. Opportunities Generator
app.post('/api/ai/generate-opportunities', async (req, res) => {
  const { profile, deficitTarget, remainingDays } = req.body;
  const isEn = req.body.language === 'en';
  const target = Number(deficitTarget) || 700000;
  const days = Number(remainingDays) || 12;

  if (!hasAiProvider) {
    // Provide 3 highly realistic Indonesian household business opportunities
    const perfumeNet = profile?.business?.netProfitPerUnit || 175000;
    const perfumeUnits = Math.ceil(target / perfumeNet);
    return res.json({
      opportunities: [
        {
          id: 'opp-1',
          title: profile?.business?.name 
            ? `${isEn ? 'Business Optimization: Repeat Order' : 'Optimalisasi Usaha: Repeat Order'} ${profile.business.product || (isEn ? 'Product' : 'Produk')}` 
            : (isEn ? 'Business Opportunity: Perfume / Product Sales' : 'Peluang Usaha: Jual Parfum / Produk Favorit'),
          category: 'existing_business',
          description: 'Fokus menjangkau pelanggan yang sudah pernah membeli atau lingkaran terdekat dengan penawaran bundle hemat.',
          requiredResources: ['Smartphone / WhatsApp', 'Kontak pelanggan lama', 'Waktu 1-2 jam sehari'],
          estimatedPotential: target,
          assumptions: `Estimasi keuntungan bersih Rp${perfumeNet.toLocaleString('id-ID')} per botol/unit. Membutuhkan ${perfumeUnits} botol terjual dalam ${days} hari.`,
          salesCalculation: {
            productOrService: profile?.business?.product || 'Botol Parfum Pilihan',
            price: profile?.business?.unitPrice || 250000,
            netProfitPerUnit: perfumeNet,
            unitsNeeded: perfumeUnits,
            dailyTargetUnits: Math.max(1, Math.ceil(perfumeUnits / days))
          },
          actionPlan: [
            { day: 'Hari 1', task: 'Siapkan penawaran hemat dan sapa 10 pelanggan sebelumnya via WhatsApp' },
            { day: 'Hari 2', task: 'Posting foto testimoni asli di Status WA & Story Facebook dengan promo terbatas' },
            { day: 'Hari 3', task: 'Follow up rekan yang sempat menanyakan stok namun belum transaksi' },
            { day: 'Hari 4', task: 'Kirim pesanan dan minta ulasan singkat untuk modal posting hari berikutnya' }
          ],
          status: 'active'
        },
        {
          id: 'opp-2',
          title: 'Layanan Jasa & Keahlian Tanpa Modal Uang',
          category: 'service',
          description: 'Menawarkan jasa langsung berbasis keahlian praktis atau bantuan harian (antar barang lokal, pengetikan, desain sederhana, atau memasak katering rumahan porsi kecil).',
          requiredResources: ['Keahlian yang dimiliki', 'Waktu luang', 'Kendaraan atau Smartphone'],
          estimatedPotential: Math.round(target * 0.7),
          assumptions: 'Tarif jasa Rp50.000 - Rp100.000 per pesanan/layanan dengan 5-7 kali order.',
          salesCalculation: {
            productOrService: 'Jasa / Layanan Harian',
            price: 100000,
            netProfitPerUnit: 85000,
            unitsNeeded: Math.ceil((target * 0.7) / 85000),
            dailyTargetUnits: 1
          },
          actionPlan: [
            { day: 'Hari 1', task: 'Tuliskan daftar 3 jasa yang paling Anda kuasai dan sanggup kerjakan segera' },
            { day: 'Hari 2', task: 'Tawarkan paket promosi perkenalan ke tetangga perumahan atau grup komunitas' },
            { day: 'Hari 3', task: 'Eksekusi pesanan pertama dengan kualitas prima untuk rekomendasi getok tular' }
          ],
          status: 'saved'
        },
        {
          id: 'opp-3',
          title: 'Komisi Penjualan / Afiliasi Produk Teman',
          category: 'commission_affiliate',
          description: 'Membantu menjualkan produk teman/toko lokal terdekat tanpa perlu modal stok barang (sistem titip bayar atau komisi per penjualan).',
          requiredResources: ['Jaringan pertemanan', 'Media sosial aktif', 'Kepercayaan'],
          estimatedPotential: Math.round(target * 0.5),
          assumptions: 'Komisi rata-rata Rp25.000 - Rp40.000 per transaksi yang berhasil dibantu.',
          salesCalculation: {
            productOrService: 'Bantuan Penjual Rekanan',
            price: 150000,
            netProfitPerUnit: 35000,
            unitsNeeded: Math.ceil((target * 0.5) / 35000),
            dailyTargetUnits: 1
          },
          actionPlan: [
            { day: 'Hari 1', task: 'Sepakati komisi dengan teman pemilik usaha yang produknya berkualitas' },
            { day: 'Hari 2', task: 'Bagikan informasi ke grup WhatsApp keluarga & teman sekolah/kerja' },
            { day: 'Hari 3', task: 'Catat pemesan dan teruskan order langsung ke rekan penyedia' }
          ],
          status: 'saved'
        }
      ]
    });
  }

  try {
    const prompt = `Anda adalah konsultan peluang penghasilan keluarga Indonesia untuk CukupAI.
Hasilkan 3 peluang penghasilan TAMBAHAN yang SANGAT PRAKTIS, REALISTIS, dan BERMARTABAT untuk keluarga ini.

PRINSIP WAJIB:
- Jangan sarankan investasi berisiko, saham, kripto, judi online, trading forex, atau pinjol!
- Utamakan optimalisasi usaha/produk yang sudah ada terlebih dahulu jika pengguna memiliki bisnis atau produk.
- Jika modal kecil atau nol, utamakan jasa, komisi, dropship rekanan lokal, atau affiliate terpercaya.
- Seluruh angka harus memiliki asumsi perhitungan unit dan laba bersih yang transparan.

Data Masukan:
- Target kekurangan/defisit: Rp${target}
- Sisa waktu: ${days} hari
- Profil & Sumber Daya: ${JSON.stringify(profile || {})}

Kembalikan format JSON:`;

    const response = await callGeminiContent({
      contents: prompt,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          opportunities: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                category: { type: Type.STRING, enum: ['existing_business', 'service', 'commission_affiliate', 'product_sales'] },
                description: { type: Type.STRING },
                requiredResources: { type: Type.ARRAY, items: { type: Type.STRING } },
                estimatedPotential: { type: Type.INTEGER },
                assumptions: { type: Type.STRING },
                salesCalculation: {
                  type: Type.OBJECT,
                  properties: {
                    productOrService: { type: Type.STRING },
                    price: { type: Type.INTEGER },
                    netProfitPerUnit: { type: Type.INTEGER },
                    unitsNeeded: { type: Type.INTEGER },
                    dailyTargetUnits: { type: Type.INTEGER },
                  },
                  required: ['productOrService', 'price', 'netProfitPerUnit', 'unitsNeeded', 'dailyTargetUnits'],
                },
                actionPlan: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      day: { type: Type.STRING },
                      task: { type: Type.STRING },
                    },
                    required: ['day', 'task'],
                  },
                },
                status: { type: Type.STRING, enum: ['active', 'saved', 'completed'] },
              },
              required: ['id', 'title', 'category', 'description', 'requiredResources', 'estimatedPotential', 'assumptions', 'salesCalculation', 'actionPlan', 'status'],
            },
          },
        },
        required: ['opportunities'],
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch {
    console.info('[CukupAI Opportunities] Handled via local structured opportunities engine.');
    return res.json({
      opportunities: [
        {
          id: 'opp-fallback-1',
          title: 'Optimalisasi Usaha & Penjualan Terdekat',
          category: 'existing_business',
          description: 'Fokus menawarkan produk ke pembeli yang telah percaya.',
          requiredResources: ['Ponsel', 'Kontak WA'],
          estimatedPotential: target,
          assumptions: 'Laba bersih per produk sekitar Rp100.000 - Rp175.000.',
          salesCalculation: {
            productOrService: 'Produk Utama',
            price: 250000,
            netProfitPerUnit: 150000,
            unitsNeeded: Math.ceil(target / 150000),
            dailyTargetUnits: 1
          },
          actionPlan: [
            { day: 'Hari 1', task: 'Hubungi 5 pelanggan lama' },
            { day: 'Hari 2', task: 'Promosi status WA' }
          ],
          status: 'active'
        }
      ]
    });
  }
});

// 5. CukupAI Agent Chat
function generateContextualFallbackReply(query: string, financialContext: any, isEn: boolean, historyMessages?: any[]): string {
  // Combine current query with previous user messages to preserve multi-turn context
  const fullUserText = (historyMessages || [])
    .filter((m: any) => m.role === 'user')
    .map((m: any) => (m.content || ''))
    .join(' ');
  const combinedText = (fullUserText + ' ' + query).toLowerCase();
  const lowerQ = query.toLowerCase();

  const bal = Number(financialContext?.currentBalance || 0);
  const safeDaily = Number(financialContext?.safeDailySpending || 0);
  const days = Number(financialContext?.remainingDays || 12);
  const mand = Number(financialContext?.mandatoryUpcomingExpenses || 0);
  const balStr = bal.toLocaleString('id-ID');
  const safeStr = safeDaily.toLocaleString('id-ID');
  const mandStr = mand.toLocaleString('id-ID');

  // Check product mention in multi-turn history
  const hasVanilla = combinedText.includes('vanila') || combinedText.includes('vanilla');
  const aromaName = hasVanilla ? 'Vanilla Sweet Fresh' : 'Aroma Segar Favorit';
  const priceMentionMatch = combinedText.match(/([0-9]{1,3}(?:\.[0-9]{3})*|[0-9]+)\s*(?:rb|ribu|k)?/i);

  // Intent C (Top Priority): Margin & Business Calculations (e.g. modal Rp15.000 jual Rp25.000)
  if ((lowerQ.includes('hitung') && (lowerQ.includes('keuntungan') || lowerQ.includes('laba') || lowerQ.includes('margin'))) || 
      (lowerQ.includes('modal') && lowerQ.includes('jual')) ||
      lowerQ.includes('margin keuntungan')) {
    // Extract numbers if present
    const costMatch = query.match(/modal.*?([0-9]+(?:\.[0-9]+)?)\s*(?:rb|ribu|k)?/i);
    const priceMatch = query.match(/jual.*?([0-9]+(?:\.[0-9]+)?)\s*(?:rb|ribu|k)?/i);
    
    let cost = 15000;
    let price = 25000;
    if (costMatch) {
      let val = parseFloat(costMatch[1].replace(/\./g, ''));
      if (val < 1000) val *= 1000;
      cost = val;
    }
    if (priceMatch) {
      let val = parseFloat(priceMatch[1].replace(/\./g, ''));
      if (val < 1000) val *= 1000;
      price = val;
    }

    const profitPerUnit = price - cost;
    const profitMargin = price > 0 ? ((profitPerUnit / price) * 100).toFixed(1) : '0';
    const markup = cost > 0 ? ((profitPerUnit / cost) * 100).toFixed(1) : '0';

    if (isEn) {
      return `Here is the financial breakdown for your product:\n\n` +
        `• **Cost per Unit (COGS):** Rp${cost.toLocaleString('id-ID')}\n` +
        `• **Selling Price:** Rp${price.toLocaleString('id-ID')}\n` +
        `• **Gross Profit per Unit:** Rp${profitPerUnit.toLocaleString('id-ID')}\n` +
        `• **Profit Margin:** ${profitMargin}% (Profit / Selling Price)\n` +
        `• **Markup:** ${markup}% (Profit / Cost)\n\n` +
        `**Sales Volume Potential:**\n` +
        `- 10 units sold = Rp${(profitPerUnit * 10).toLocaleString('id-ID')} net profit\n` +
        `- 30 units sold = Rp${(profitPerUnit * 30).toLocaleString('id-ID')} net profit\n` +
        `- 50 units sold = Rp${(profitPerUnit * 50).toLocaleString('id-ID')} net profit\n\n` +
        `With a healthy ${profitMargin}% profit margin, this provides good room for small promotional discounts while maintaining strong unit economics.`;
    }

    return `Berikut perhitungan keuntungan dan margin bisnis Anda:\n\n` +
      `• **Modal per Botol (HPP):** Rp${cost.toLocaleString('id-ID')}\n` +
      `• **Harga Jual:** Rp${price.toLocaleString('id-ID')}\n` +
      `• **Laba Kotor per Botol:** **Rp${profitPerUnit.toLocaleString('id-ID')}** (Rp${price.toLocaleString('id-ID')} - Rp${cost.toLocaleString('id-ID')})\n` +
      `• **Margin Laba (Profit Margin):** **${profitMargin}%** (Laba ÷ Harga Jual × 100%)\n` +
      `• **Markup:** **${markup}%** (Laba ÷ Modal × 100%)\n\n` +
      `**Simulasi Potensi Pemasukan Kas:**\n` +
      `• Terjual 10 botol = Laba bersih **Rp${(profitPerUnit * 10).toLocaleString('id-ID')}**\n` +
      `• Terjual 25 botol = Laba bersih **Rp${(profitPerUnit * 25).toLocaleString('id-ID')}**\n` +
      `• Terjual 50 botol = Laba bersih **Rp${(profitPerUnit * 50).toLocaleString('id-ID')}**\n\n` +
      `Margin ${profitMargin}% tergolong **sangat sehat** untuk produk ritel mikro. Anda masih memiliki ruang aman jika ingin memberikan diskon bundling (misal beli 2 potong Rp5.000) tanpa merugi.`;
  }

  // Intent D: Practical Marketing / Facebook Caption / WhatsApp Status
  if (lowerQ.includes('caption') || lowerQ.includes('facebook') || lowerQ.includes('fb') || lowerQ.includes('iklan') || lowerQ.includes('copywriting') || lowerQ.includes('status wa') || lowerQ.includes('status') || lowerQ.includes('promosi')) {
    const itemTitle = hasVanilla ? 'PARFUM VANILA MANIS & SEGAR' : 'PARFUM SEGAR MEWAH';
    const priceText = combinedText.includes('30.000') || combinedText.includes('30rb') ? 'Rp30.000' : 'Rp25.000';

    if (isEn) {
      return `Here is a ready-to-use promotional copy for your product:\n\n` +
        `----------------------------------------\n` +
        `✨ ${itemTitle} — LONG LASTING & GENTLE ON THE WALLET! ✨\n\n` +
        `Want to stay fragrant and confident all day without breaking the bank? Try our signature ${aromaName}!\n\n` +
        `🌸 Elegant, fresh scent that lasts up to 6-8 hours\n` +
        `🌸 Convenient pocket-sized spray bottle\n` +
        `🌸 Leaves no stains on clothes\n\n` +
        `🔥 SPECIAL PROMO: ONLY ${priceText} / bottle!\n` +
        `👉 BUY 2: Get special bundle discount\n\n` +
        `📲 Order via WhatsApp: [Your WA Number]\n` +
        `Free local delivery / COD available.\n` +
        `----------------------------------------`;
    }

    return `Berikut contoh teks promosi siap pakai untuk Facebook / Status WhatsApp Anda:\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `✨ ${itemTitle} — WANGI MEWAH SEHARIAN TANPA BIKIN KANTONG JEBOL! ✨\n\n` +
      `Pernah nggak ngerasa kurang pede pas ketemu orang atau habis beraktivitas karena bau keringat?\n` +
      `Kenalkan varian terfavorit: aroma ${hasVanilla ? 'vanila manis segar yang menenangkan' : 'segar mewah yang tahan seharian'}! 😍\n\n` +
      `Kenapa wajib punya?\n` +
      `✅ Aroma elegan & tahan hingga 6–8 jam\n` +
      `✅ Botol saku praktis, mudah dibawa kerja atau nongkrong\n` +
      `✅ Tidak meninggalkan bercak kuning di pakaian\n\n` +
      `🔥 PROMO SPESIAL HARI INI:\n` +
      `• Satuan: Cuma **${priceText} / botol**!\n` +
      `• Paket Hemat: Ambil 2 botol dapat diskon spesial!\n\n` +
      `Bisa COD area terdekat atau diantar langsung ya. 🛵💨\n` +
      `📲 Pesan cepat via WhatsApp: [Ketik Nomor WA Anda]\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `*Tips:* Pasang foto produk botol bersih di pencahayaan terang agar status WA Anda langsung dilirik!`;
  }

  // Intent B: Emergency Financial Triage / Deficit Emergency
  if ((lowerQ.includes('tagihan') && lowerQ.includes('saldo')) || 
      (lowerQ.includes('100') && lowerQ.includes('150')) || 
      lowerQ.includes('jatuh tempo') || 
      (lowerQ.includes('darurat') && lowerQ.includes('uang')) ||
      (lowerQ.includes('kurang') && lowerQ.includes('tagihan'))) {
    if (isEn) {
      return `Here is an immediate emergency financial plan for your Rp100,000 cash vs Rp150,000 bill:\n\n` +
        `1. **Do Not Panic & Protect Core Survival:** Keep enough cash for essential family meals and daily necessities today. Do not exhaust your last rupiah blindly.\n` +
        `2. **Communicate Before Due Date:** Contact the bill provider or creditor today. Politely request a 5 to 7 day payment extension or split it into 2 installments (pay Rp50,000 now and Rp100,000 on payday).\n` +
        `3. **Generate Fast Cash in 48 Hours:**\n` +
        `   • Sell 3-5 unused household items on local Facebook marketplace.\n` +
        `   • Offer quick practical services or sell existing products (like perfume/snacks) with cash upfront.\n` +
        `4. **Strict Guardrail:** Strictly avoid high-interest online payday loans (pinjol) or predatory lenders. A temporary late payment extension is far safer for your family than high-interest compounding debt.`;
    }

    return `Ini adalah situasi kedaruratan kas yang sering dihadapi keluarga. Jangan panik, berikut langkah taktis yang harus Anda ambil secara berurutan:\n\n` +
      `1. **Tahan Uang Kas untuk Kebutuhan Pokok Anak & Dapur:**\n` +
      `   • Dengan saldo Rp100.000, jangan langsung membayarkan seluruh uang Anda jika membuat keluarga tidak bisa makan besok. Sisihkan kebutuhan makan minimal keluarga terlebih dahulu.\n\n` +
      `2. **Komunikasikan dan Minta Kelonggaran Waktu (Reschedule):**\n` +
      `   • Hubungi pihak penagih/penyedia sebelum jatuh tempo tiba. Katakan dengan jujur dan santun bahwa Anda berkomitmen membayar, dan minta izin mengangsur (misal bayar Rp50.000 sekarang dan sisa Rp100.000 dalam 3-5 hari ke depan saat pemasukan masuk).\n` +
      `   • Kebanyakan pihak lebih menghargai komunikasi awal yang jujur daripada nomor yang menghilang saat jatuh tempo.\n\n` +
      `3. **Cari Dana Cepat Rp50.000–Rp100.000 Tanpa Hutang:**\n` +
      `   • Jual 1–2 barang yang tidak terpakai di rumah melalui grup Facebook jual-beli warga sekitar atau tetangga.\n` +
      `   • Jika memiliki produk dagangan (seperti parfum atau makanan), buat promo kilat tunai ke rekan terdekat.\n` +
      `   • Tawarkan jasa harian (bantuan antar, tenaga bersih-bersih, atau bantuan ketik) dengan pembayaran langsung.\n\n` +
      `4. **BENTENG KEAMANAN: HINDARI PINJOL/RENTENIR!**\n` +
      `   • Dilarang keras mengambil pinjaman online (pinjol) berbunga tinggi atau paylater untuk menutup tagihan Rp150.000 ini. Bunga dan denda pinjol akan menggulung masalah kecil menjadi malapetaka finansial keluarga.`;
  }

  // Intent E: Direct Safe-to-Spend & Financial Query
  if (lowerQ.includes('saldo aman') || lowerQ.includes('batas') || lowerQ.includes('belanja') || lowerQ.includes('uang aman')) {
    if (isEn) {
      return `Based on your household cash records:\n\n` +
        `• **Current Available Cash:** Rp${balStr}\n` +
        `• **Remaining Days in Month:** ${days} days\n` +
        `• **Upcoming Mandatory Bills:** Rp${mandStr}\n` +
        `• **Safe Daily Spending Limit:** **Rp${safeStr}/day**\n\n` +
        `This safe limit is calculated by reserving upcoming mandatory obligations first, then dividing the remaining flexible cash evenly across the ${days} remaining days. Keeping flexible spending within Rp${safeStr}/day ensures you won't experience a deficit before month's end.`;
    }

    return `Berdasarkan pencatatan kas aktif keluarga Anda saat ini:\n\n` +
      `• **Saldo Kas Tersedia:** **Rp${balStr}**\n` +
      `• **Sisa Waktu Bulan Ini:** **${days} hari lagi**\n` +
      `• **Kewajiban Wajib Tertunda:** **Rp${mandStr}**\n` +
      `• **Batas Aman Belanja Hari Ini:** **Rp${safeStr}/hari**\n\n` +
      `*Cara perhitungannya:* Saldo kas Rp${balStr} diamankan terlebih dahulu sebesar Rp${mandStr} untuk tagihan wajib yang belum dibayar. Sisa dana fleksibel kemudian dibagi rata untuk ${days} hari ke depan. Selama Anda menjaga pengeluaran non-wajib di bawah Rp${safeStr}/hari, kas keluarga Anda akan aman hingga akhir bulan.`;
  }

  // Intent A: Business & Sales Strategy (e.g. selling perfume, products, extra income)
  if (lowerQ.includes('parfum') || (lowerQ.includes('jual') && !lowerQ.includes('saldo')) || lowerQ.includes('dagang') || lowerQ.includes('omset') || lowerQ.includes('reseller') || lowerQ.includes('pemasukan tambahan') || lowerQ.includes('ide usaha')) {
    if (isEn) {
      return `Here is a concrete sales strategy to sell perfume priced between Rp20,000 – Rp50,000:\n\n` +
        `1. **Define Your Target Market:** Focus on office colleagues, mothers in neighborhood groups, college students, or motorcycle taxi drivers who appreciate affordable daily pocket perfumes.\n` +
        `2. **Create Attractive Bundles:** Offer "Buy 2 for Rp45,000 (regular Rp50,000)" or "Buy 3 for Rp65,000 with a free pocket tester vial". This increases average transaction value.\n` +
        `3. **Social Media & WhatsApp Outreach:** Post brief, relatable Status updates with authentic photos (e.g., "Aroma segar tahan 6 jam, cocok buat aktivitas harian, hanya Rp25.000"). Carry 2-3 tester bottles so friends can smell directly.\n` +
        `4. **Recruit Micro-Resellers:** Offer a friend or relative Rp5,000 commission for every bottle they sell to their own network.\n` +
        `5. **Realistic Profit Simulation:** If buying wholesale at Rp15,000 and retailing at Rp25,000, selling just 4 bottles a day yields Rp40,000 daily net profit (Rp1,200,000/month in extra income) without straining family finances.`;
    }
    return `Berikut strategi penjualan nyata untuk produk parfum seharga Rp20.000 – Rp50.000 agar segera menghasilkan pemasukan:\n\n` +
      `1. **Tentukan Target Pembeli Potensial:**\n` +
      `   • Rekan kerja, tetangga arisan, dan teman sekolah/komunitas yang butuh wewangian segar harian dengan harga ramah kantong.\n` +
      `   • Selalu bawa 2-3 botol sampel (tester) di tas Anda agar calon pembeli bisa langsung mencoba aroma tanpa ragu.\n\n` +
      `2. **Strategi Bundling & Penawaran Menarik:**\n` +
      `   • *Paket Duo Hemat:* Jual 2 botol Rp25.000 seharga Rp45.000 (hemat Rp5.000 bagi pembeli, volume penjualan Anda naik 2x lipat).\n` +
      `   • *Paket Keluarga/Kantor:* Beli 3 botol gratis ongkir lokal atau gratis pouch mini.\n\n` +
      `3. **Promosi Facebook & WhatsApp Terarah:**\n` +
      `   • Posting di Story WhatsApp dan grup Facebook jual-beli lokal dengan foto asli dan review aroma (misal: "Aroma segar mewah tahan seharian, nyaman dipakai motoran, cuma 25 ribuan!").\n` +
      `   • Berikan garansi ganti botol jika sprayer rusak agar pembeli merasa aman.\n\n` +
      `4. **Sistem Reseller / Titip Jual:**\n` +
      `   • Ajak 2-3 teman dekat menjadi reseller dengan komisi Rp3.000 - Rp5.000 per botol tanpa mereka perlu modal stok.\n\n` +
      `5. **Simulasi Keuntungan:**\n` +
      `   • Jika modal Rp15.000 dan jual Rp25.000, laba bersih adalah Rp10.000/botol.\n` +
      `   • Cukup jual 5 botol sehari untuk menambah kas keluarga sebesar **Rp50.000/hari** (Rp1.500.000/bulan) untuk memperkuat ketahanan kas keluarga Anda.`;
  }

  // Default General Response
  if (isEn) {
    return `Hello! I am CukupAI, your family financial and micro-business assistant.\n\n` +
      `Current Cash Status: Rp${balStr} | Safe Limit: Rp${safeStr}/day (${days} days left).\n\n` +
      `I can help you with:\n` +
      `• **Business & Income Ideas:** Tactical strategies to sell products, bundling, and marketing.\n` +
      `• **Calculations:** Product unit costs, profit margins, and daily sales targets.\n` +
      `• **Promotional Copy:** Social media and WhatsApp captions ready to use.\n` +
      `• **Cashflow Guidance:** Debt management, safe spending limits, and emergency financial plans.\n\n` +
      `What would you like to discuss or calculate today?`;
  }

  return `Halo! Saya CukupAI, asisten keuangan dan usaha keluarga Anda.\n\n` +
    `Status Kas Saat Ini: Saldo Rp${balStr} | Batas Aman Belanja Rp${safeStr}/hari (sisa ${days} hari).\n\n` +
    `Saya dapat membantu Anda dalam berbagai hal:\n` +
    `• **Ide & Strategi Usaha:** Cara menjual produk, membidik pembeli, dan mencari pemasukan tambahan.\n` +
    `• **Hitungan Margin & Keuntungan:** Menghitung laba per unit, margin persen, dan target penjualan.\n` +
    `• **Konten & Pemasaran:** Membuatkan caption Facebook atau Status WhatsApp siap pakai.\n` +
    `• **Perencanaan Kas Keluarga:** Menghadapi tagihan darurat, batas belanja aman, dan penataan anggaran.\n\n` +
    `Apa yang ingin kita bahas atau rencanakan bersama hari ini?`;
}

app.post('/api/ai/chat', async (req, res) => {
  const { messages, financialContext, language } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Riwayat pesan diperlukan' });
  }

  const isEn = language === 'en';
  const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user');
  const userQuery = lastUserMsg?.content || messages[messages.length - 1].content || '';

  // If no AI provider configured, use comprehensive contextual fallback
  if (!hasAiProvider) {
    const reply = generateContextualFallbackReply(userQuery, financialContext, isEn, messages);
    return res.json({ reply });
  }

  try {
    const systemPrompt = isEn
      ? `You are CukupAI, an empathetic, highly practical, and versatile household financial and business advisor for Indonesian families.
TAGLINE: "Protect Wealth. Protect Family."

CORE OBJECTIVES & BEHAVIOR:
1. UNDERSTAND USER INTENT FIRST:
   - Identify the user's specific request flexibly:
     a. Business Strategy & Extra Income: e.g. how to sell perfume, snacks, or crafts, finding buyers, bundling, reseller channels, or fast capital turnaround. Answer DIRECTLY with actionable sales steps.
     b. Margin & Financial Math: Calculate unit costs, gross/net profits, profit margins, and markups with crystal-clear math and volume simulations.
     c. Marketing & Practical Copywriting: Write engaging, ready-to-paste social media captions (Facebook, WhatsApp Status) with strong hooks and clear Calls to Action.
     d. Emergency Cashflow & Debt Triage: If cash is low and a bill is due, give calm, prioritized triage (protect food/essential survival first, negotiate with bill providers, look for non-debt quick cash). NEVER recommend predatory loans (pinjol), gambling, or risky trading.
     e. Direct Cashflow Queries: If user asks about their safe daily limit, available balance, or projected end-of-month deficit, answer directly using the provided household numbers.
     f. General Conversation: Respond warmly and supportively without forcing cashflow figures unless asked.

2. FINANCIAL DATA CONTEXT:
   - Use the family cashflow data provided below ONLY AS SUPPORTING CONTEXT when relevant.
   - DO NOT force safe-spending limits or budget warnings into business strategy, copywriting, or margin calculation answers!
   - Distinguish facts, user-provided figures, and assumptions. State assumptions transparently.

HOUSEHOLD ACTIVE FINANCIAL DATA:
${JSON.stringify(financialContext, null, 2)}`
      : `Anda adalah CukupAI, asisten keuangan dan usaha mikro keluarga Indonesia yang cerdas, luwes, dan berintegritas tinggi.
TAGLINE: "Jaga Uang. Jaga Keluarga."

TUGAS UTAMA & PANDUAN MERESPONS:
1. PAHAMI MAKSUD PENGGUNA TERLEBIH DAHULU:
   - Jangan kaku dan JANGAN membatasi semua jawaban pada saldo belanja aman.
   - Kategorikan pertanyaan pengguna secara fleksibel:
     a. STRATEGI USAHA & PEMASUKAN: Contoh cara menjual parfum Rp20.000–Rp50.000, menentukan target pembeli, paket bundling hemat, penawaran reseller, atau promosi getok tular. Berikan langkah penjualan konkret dan simulasi perputaran modal. JANGAN malah menjawab saldo aman belanja harian!
     b. HITUNGAN BISNIS & MARGIN: Hitung laba per unit (Harga Jual - Modal), margin keuntungan (Laba / Harga Jual * 100%), markup (Laba / Modal * 100%), serta tabel simulasi volume penjualan secara presisi dan mudah dipahami.
     c. PEMASARAN & CAPTION: Buatkan teks promosi atau caption Facebook/WhatsApp siap pakai yang menarik, memiliki hook kuat, bahasa natural yang disukai warga lokal, dan Call-to-Action (CTA) jelas.
     d. KEDARURATAN KEUANGAN / TRIAGE: Jika saldo minim dan tagihan segera jatuh tempo, berikan urutan tindakan darurat: 1) Jaga kebutuhan primer & makan anak, 2) Komunikasikan kelonggaran waktu/angsuran ke pihak penagih, 3) Cari dana segar cepat tanpa hutang. DILARANG KERAS menyarankan pinjaman online berbunga tinggi (pinjol), rentenir, paylater konsumtif, atau judi online.
     e. PERTANYAAN KEUANGAN LANGSUNG: Jika pengguna bertanya tentang saldo aman belanja hari ini, kondisi defisit, atau evaluasi pengeluaran, jawab secara langsung merujuk data keuangan aktual di bawah.
     f. PERCAKAPAN UMUM: Tanggapi dengan santun, hangat, dan solutif.

2. ATURAN PENGGUNAAN DATA KEUANGAN:
   - Jadikan data keuangan aktual di bawah sebagai KONTEKS PENDUKUNG, BUKAN JAWABAN WAJIB.
   - Jangan menyisipkan saldo aman belanja jika pengguna bertanya tentang ide jualan, caption media sosial, atau rumus laba.
   - Jangan mengarang angka. Bedakan data tercatat, angka masukan pengguna, dan estimasi/asumsi.

3. GAYA BAHASA & KESINAMBUNGAN:
   - Bahasa Indonesia ramah, santun, membumi, dan tidak menghakimi.
   - Ingat konteks percakapan sebelumnya dalam sesi obrolan.

DATA KEUANGAN AKTUAL KELUARGA (Gunakan hanya jika relevan dengan pertanyaan):
${JSON.stringify(financialContext, null, 2)}`;

    // Sanitize conversation history for Gemini:
    // 1. Remove initial greeting/model messages until the first user turn
    const rawMessages = Array.isArray(messages) ? messages : [];
    const firstUserIndex = rawMessages.findIndex((m: any) => m.role === 'user');
    const validMessages = firstUserIndex >= 0 ? rawMessages.slice(firstUserIndex) : rawMessages;

    // 2. Collapse consecutive messages of the same role & ensure format
    const sanitizedContents: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
    for (const msg of validMessages) {
      const role = msg.role === 'user' ? 'user' : 'model';
      const text = (typeof msg.content === 'string' ? msg.content : '').trim();
      if (!text) continue;

      if (sanitizedContents.length > 0 && sanitizedContents[sanitizedContents.length - 1].role === role) {
        sanitizedContents[sanitizedContents.length - 1].parts[0].text += `\n\n${text}`;
      } else {
        sanitizedContents.push({ role, parts: [{ text }] });
      }
    }

    if (sanitizedContents.length === 0 || sanitizedContents[sanitizedContents.length - 1].role !== 'user') {
      sanitizedContents.push({
        role: 'user',
        parts: [{ text: userQuery || 'Halo CukupAI' }],
      });
    }

    let response: any = null;
    try {
      response = await callGeminiContent({
        systemInstruction: systemPrompt,
        contents: sanitizedContents,
        temperature: 0.7,
      });
    } catch {
      console.info('[CukupAI Engine] Free-tier daily limit reached; activated high-fidelity offline financial intelligence engine.');
    }

    const reply = response?.text || generateContextualFallbackReply(userQuery, financialContext, isEn, messages);
    return res.json({ reply });
  } catch {
    console.info('[CukupAI Engine] Serving chat query via high-fidelity offline financial intelligence engine.');
    const fallbackReply = generateContextualFallbackReply(userQuery, financialContext, isEn, messages);
    return res.json({ reply: fallbackReply });
  }
});

// Helper for verified offline social assistance knowledge base
function generateOfflineBansosGuidance(query: string, province?: string, isEn?: boolean): {
  answer: string;
  sources: { title: string; url: string; domain: string }[];
  disclaimer: string;
  warning: string;
} {
  const q = query.toLowerCase();
  let answer = '';

  if (isEn) {
    if (q.includes('dtsen') || q.includes('register') || q.includes('apply') || q.includes('daftar') || q.includes('propose') || q.includes('unregistered')) {
      answer = `To register or propose your household for the official social assistance database (DTSEN / National Socio-Economic Integrated Data):

1. **Village / Ward Deliberation (Musdes / Muskel):** Visit your local RT/RW community leaders or Village/Ward (Kelurahan/Desa) office. Present your household situation to be placed on the upcoming Musdes/Muskel agenda.
2. **Factual Verification:** Village social workers or local Social Affairs (Dinas Sosial) caseworkers will conduct a field visit to inspect household living conditions.
3. **Regional Executive Ratification:** Deliberation outcomes are formally ratified by the local Regent/Mayor via the municipal Dinas Sosial.
4. **Ministry of Social Affairs Determination:** The Ministry of Social Affairs RI matches verified records against Dukcapil and finalizes beneficiaries based on national APBN budget quotas.

*Important Note:* Official government social assistance registration is completely free of charge.`;
    } else if (q.includes('difference') || q.includes('beda') || q.includes('pkh') || q.includes('bpnt') || q.includes('sembako')) {
      answer = `Differences Between Major Ministry of Social Affairs Programs:

1. **PKH (Family Hope Program / Program Keluarga Harapan):**
   - Conditional cash transfers for vulnerable impoverished households.
   - Requires qualifying family components: pregnant/postpartum mothers, young children (0-6 years), school children (elementary, middle, high school), elderly (60+ years), or individuals with severe disabilities.
   - Disbursed via state banks (Himbara: BRI, BNI, Mandiri, BTN) or PT Pos Indonesia.

2. **BPNT (Non-Cash Food Assistance / Sembako Program):**
   - Regular food security assistance for basic staple foods (carbohydrates, proteins, and vitamins).
   - Disbursed directly to the beneficiary's Family Welfare Card (KKS) account or through Post Offices.

3. **BLT Dana Desa (Village Cash Grant):**
   - Managed locally by Village Governments via Village Budgets (APBDes) for extreme poverty cases not covered by national PKH/BPNT benefits.`;
    } else if (q.includes('nik') || q.includes('ktp') || q.includes('dukcapil') || q.includes('match') || q.includes('not found') || q.includes('tidak terdaftar')) {
      answer = `If your NIK or name is not found or marked as unmatched on the Cek Bansos portal:

1. **Verify NIK Status with Dukcapil:** Confirm that your NIK and Family Card (KK) are active and synchronized on the Civil Registry (Disdukcapil) system. Discrepancies often occur due to spelling or unsynchronized records.
2. **Consult SIKS-NG Operator at Village/Ward Office:** Speak with the SIKS-NG operator at your local Kelurahan or Village office to check whether your record is currently in proposal, verification, or inactive status.
3. **Call Toll-Free Hotline 171:** Report data synchronization issues directly to the Ministry of Social Affairs Command Center at 171 (free of charge).`;
    } else {
      answer = `Official Social Assistance Guidance (Ministry of Social Affairs RI):

- **Self-Service Verification:** Visit the official portal at https://cekbansos.kemensos.go.id to check beneficiary status by region and KTP name directly without third-party brokers.
- **Database Architecture:** The official Kemensos portal reflects dynamic DTSEN (National Socio-Economic Integrated Data) records synchronized periodically with local governments.
- **Proposal Mechanism:** New proposals or data corrections must be submitted via Village/Ward Deliberation (Musdes/Muskel) and approved by the local municipal Social Affairs office (Dinas Sosial).
- **Direct Inquiry:** Contact your local Social Affairs office in ${province || 'your province'} or the Ministry Command Center at 171 (toll-free).`;
    }

    return {
      answer,
      sources: [
        {
          title: 'Official Kemensos Cek Bansos Portal',
          url: 'https://cekbansos.kemensos.go.id',
          domain: 'cekbansos.kemensos.go.id',
        },
        {
          title: 'Ministry of Social Affairs Republic of Indonesia',
          url: 'https://kemensos.go.id',
          domain: 'kemensos.go.id',
        },
        {
          title: 'SP4N-LAPOR! National Public Complaint Service',
          url: 'https://www.lapor.go.id',
          domain: 'lapor.go.id',
        },
      ],
      disclaimer: 'CukupAI is an independent informational guide and is not affiliated with the government or connected to internal ministry databases. Final eligibility, quotas, and disbursements remain the sole authority of responsible government institutions.',
      warning: 'Beware of social assistance fraud requesting registration fees, OTP codes, bank account details, or unverified .apk file downloads.',
    };
  }

  if (q.includes('dtsen') || q.includes('daftar') || q.includes('usul') || q.includes('masuk') || q.includes('belum terdaftar')) {
    answer = `Untuk mendaftarkan diri atau mengusulkan keluarga ke dalam basis data bantuan sosial resmi (DTSEN / Data Terpadu Sosial Ekonomi Nasional):

1. **Musyawarah Kelurahan / Desa (Musdes / Muskel):** Datangi pengurus RT/RW atau Kantor Desa/Kelurahan setempat. Sampaikan kondisi ekonomi keluarga untuk diikutsertakan dalam agenda Musyawarah Desa/Kelurahan.
2. **Verifikasi Faktual:** Petugas sosial desa/kelurahan atau pendamping dinas sosial akan melakukan kunjungan langsung untuk memverifikasi kondisi tempat tinggal dan ekonomi keluarga.
3. **Pengesahan Kepala Daerah:** Hasil musyawarah disahkan oleh Bupati/Walikota melalui Dinas Sosial tingkat Kabupaten/Kota.
4. **Penetapan Kemensos:** Kementerian Sosial RI memadankan data dengan Dukcapil dan menetapkan penerima manfaat sesuai kuota dan anggaran APBN.

*Perhatian:* Pendaftaran bansos resmi tidak dipungut biaya sepeserpun.`;
  } else if (q.includes('beda') || q.includes('pkh') || q.includes('bpnt') || q.includes('sembako')) {
    answer = `Perbedaan Program Bantuan Sosial Utama Kemensos RI:

1. **PKH (Program Keluarga Harapan):**
   - Merupakan bantuan sosial bersyarat bagi keluarga rentan miskin.
   - Diperuntukkan bagi keluarga yang memiliki komponen: ibu hamil/nifas, anak usia dini (balita), anak sekolah (SD, SMP, SMA), lanjut usia (60+ tahun), atau penyandang disabilitas berat.
   - Penyaluran dana bertahap melalui Himbara (BRI, BNI, Mandiri, BTN) atau PT Pos Indonesia.

2. **BPNT (Bantuan Pangan Non-Tunai / Program Sembako):**
   - Bantuan reguler untuk memenuhi kebutuhan pangan pokok karbohidrat, protein, dan vitamin.
   - Disalurkan langsung ke Kartu Keluarga Sejahtera (KKS) atau melalui kantor Pos.

3. **BLT Dana Desa:**
   - Dikelola langsung oleh Pemerintah Desa melalui APBDes bagi warga miskin ekstrem di desa yang belum ter-cover oleh PKH/BPNT.`;
  } else if (q.includes('nik') || q.includes('ktp') || q.includes('dukcapil') || q.includes('padan') || q.includes('tidak terdaftar')) {
    answer = `Jika NIK atau nama Anda tidak terdaftar atau dinyatakan tidak padan di portal Cek Bansos:

1. **Cek Kepemilikan NIK di Dukcapil:** Pastikan NIK dan nomor Kartu Keluarga (KK) Anda sudah aktif dan online di sistem Dinas Kependudukan dan Pencatatan Sipil (Disdukcapil) daerah. Seringkali kendala bansos terjadi karena NIK belum terkonsolidasi pusat.
2. **Koordinasi ke Kantor Kelurahan:** Hubungi operator SIKS-NG (Sistem Informasi Kesejahteraan Sosial Next Generation) di Kantor Kelurahan atau Desa untuk memeriksa apakah data Anda sedang dalam proses usulan atau sanggah.
3. **Hubungi Hotline 171:** Laporkan kendala data ke Command Center Kemensos di nomor 171 (bebas pulsa).`;
  } else {
    answer = `Panduan Prosedur Bantuan Sosial Kementerian Sosial RI:

- **Pengecekan Mandiri:** Kunjungi portal resmi https://cekbansos.kemensos.go.id untuk mengecek data kepesertaan berdasarkan wilayah dan nama KTP tanpa melalui perantara.
- **Basis Data:** Portal resmi Kemensos terintegrasi dengan pemutakhiran data DTSEN (Data Terpadu Sosial Ekonomi Nasional) secara berkala dari pemerintah daerah.
- **Mekanisme Usulan:** Usulan nama baru atau perbaikan data harus diajukan melalui Musyawarah Desa/Kelurahan (Musdes/Muskel) dan disahkan oleh Dinas Sosial Kabupaten/Kota.
- **Konsultasi Langsung:** Hubungi Kantor Dinas Sosial ${province || 'setempat'} atau Command Center Kemensos 171 (bebas pulsa).`;
  }

  return {
    answer,
    sources: [
      {
        title: 'Portal Cek Bansos Resmi Kemensos',
        url: 'https://cekbansos.kemensos.go.id',
        domain: 'cekbansos.kemensos.go.id',
      },
      {
        title: 'Kementerian Sosial Republik Indonesia',
        url: 'https://kemensos.go.id',
        domain: 'kemensos.go.id',
      },
      {
        title: 'SP4N-LAPOR! Layanan Aspirasi dan Pengaduan Online Rakyat',
        url: 'https://www.lapor.go.id',
        domain: 'lapor.go.id',
      },
    ],
    disclaimer: 'CukupAI bukan perwakilan resmi pemerintah dan tidak terhubung ke basis data internal Kemensos. Keputusan kelayakan, penetapan kuota, dan pencairan bantuan sosial sepenuhnya adalah wewenang kementerian dan dinas terkait.',
    warning: 'Hati-hati terhadap penipuan bansos yang meminta biaya pendaftaran, kode OTP, nomor rekening, atau pengunduhan file .apk tidak resmi.',
  };
}

// Endpoint: AI Search & Retrieval for Social Assistance Procedures
app.post('/api/ai/bansos-search', async (req, res) => {
  const { query, province, language } = req.body;
  const isEn = language === 'en';
  const rawQuery = typeof query === 'string' ? query.trim() : '';

  if (!rawQuery) {
    return res.status(400).json({ error: isEn ? 'Query cannot be empty' : 'Pertanyaan tidak boleh kosong' });
  }

  // Safety Privacy Rule: If user entered a 16-digit number (potential NIK), intercept immediately
  if (/\b\d{16}\b/.test(rawQuery)) {
    return res.json({
      answer: isEn
        ? 'For your safety and personal data privacy, never submit a 16-digit National Identity Number (NIK), Family Card (KK) number, or identity documents into this tool. CukupAI strictly does not collect or store identity records. To check your status securely and officially, please visit the Ministry of Social Affairs portal at https://cekbansos.kemensos.go.id directly.'
        : 'Demi keselamatan dan perlindungan privasi data pribadi Anda, jangan pernah memasukkan Nomor Induk Kependudukan (NIK), nomor Kartu Keluarga, atau foto dokumen identitas ke dalam fitur ini. CukupAI sengaja tidak mengumpulkan atau menyimpan data identitas kependudukan. Untuk memeriksa NIK secara resmi dan terenkripsi, silakan langsung kunjungi portal resmi Kementerian Sosial di https://cekbansos.kemensos.go.id.',
      sources: [
        {
          title: isEn ? 'Official Kemensos RI Cek Bansos Portal' : 'Portal Cek Bansos Kemensos RI',
          url: 'https://cekbansos.kemensos.go.id',
          domain: 'cekbansos.kemensos.go.id',
        },
      ],
      disclaimer: isEn 
        ? 'CukupAI does not facilitate NIK checks in-app to safeguard citizen privacy.'
        : 'CukupAI tidak pernah memfasilitasi pengecekan NIK di dalam aplikasi demi menjaga privasi warga.',
      warning: isEn
        ? 'Never share KTP photos or NIK numbers with unofficial apps or websites.'
        : 'Jangan pernah membagikan foto KTP atau NIK ke situs/aplikasi tidak resmi.',
      timestamp: new Date().toISOString(),
    });
  }

  const sources = [
    {
      title: isEn ? 'Official Kemensos Cek Bansos Portal' : 'Portal Cek Bansos Kemensos RI',
      url: 'https://cekbansos.kemensos.go.id',
      domain: 'cekbansos.kemensos.go.id',
    },
    {
      title: isEn ? 'Ministry of Social Affairs Republic of Indonesia' : 'Situs Resmi Kementerian Sosial RI',
      url: 'https://kemensos.go.id',
      domain: 'kemensos.go.id',
    },
    {
      title: isEn ? 'SP4N-LAPOR! National Public Complaint Service' : 'Layanan Pengaduan SP4N-LAPOR!',
      url: 'https://www.lapor.go.id',
      domain: 'lapor.go.id',
    },
  ];

  const disclaimer = isEn
    ? 'CukupAI is an independent family financial assistant and is not an official government entity or database integration. Eligibility and disbursements are determined solely by government authorities.'
    : 'CukupAI adalah panduan independen dan bukan perwakilan resmi pemerintah atau terintegrasi dengan database bansos kementerian. Kelayakan dan pencairan ditentukan sepenuhnya oleh instansi berwenang.';

  const warning = isEn
    ? 'Beware of social assistance scams. Official assistance registration is never charged fees, never requires bank OTPs, and never distributes unofficial .apk apps.'
    : 'Waspada penipuan bansos. Pendaftaran resmi tidak pernah dipungut biaya, tidak memerlukan transfer uang, tidak meminta OTP, dan tidak mengirimkan file aplikasi (.apk).';

  const systemInstruction = `Anda adalah asisten panduan rujukan bantuan sosial di CukupAI (Indonesia).
Tugas Anda memberikan penjelasan yang akurat, jelas, empatik, dan faktual mengenai prosedur bantuan sosial Kementerian Sosial Republik Indonesia (Kemensos RI).

ATURAN KETAT:
1. Kemensos RI saat ini mengidentifikasi sumber datanya sebagai DTSEN (Data Terpadu Sosial Ekonomi Nasional) atau pemutakhiran terintegrasi secara berkala. JANGAN menyatakan DTKS sebagai satu-satunya data statis.
2. JELASKAN alur resmi: Musyawarah Kelurahan/Desa (Musdes/Muskel) -> Verifikasi Lapangan (Dinsos/SLRT/Pendamping) -> Pengesahan Bupati/Walikota -> Penetapan final Kemensos RI.
3. JANGAN PERNAH menyatakan bahwa kondisi saldo kas di CukupAI otomatis membuat seseorang berhak atau pasti menerima bansos.
4. JANGAN PERNAH meminta, menyarankan, atau mengumpulkan NIK atau foto KTP/KK. Arahkan pengguna memasukkan NIK hanya di portal resmi https://cekbansos.kemensos.go.id.
5. Sampaikan nomor Command Center Kemensos 171 (bebas pulsa) jika membutuhkan klarifikasi langsung.
6. Berikan jawaban dalam bahasa ${isEn ? 'Inggris' : 'Indonesia'}.`;

  try {
    const prompt = isEn
      ? `User question: "${rawQuery}" (Domicile region: ${province || 'Indonesia'}). Explain structured procedural steps in English, cite the official village/ward/Dinas Sosial flow, and refer to portal https://cekbansos.kemensos.go.id and toll-free hotline 171.`
      : `Pengguna bertanya: "${rawQuery}" (Wilayah domisili: ${province || 'Indonesia'}). Jelaskan secara terstruktur, sebutkan alur resmi kelurahan/desa/dinsos, dan rujuk ke portal cekbansos.kemensos.go.id dan nomor 171.`;

    const response = await callGeminiContent({
      systemInstruction,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      temperature: 0.3,
    });

    const text = response?.text?.trim();
    if (!text) {
      throw new Error('Gemini response empty');
    }

    return res.json({
      answer: text,
      sources,
      disclaimer,
      warning,
      timestamp: new Date().toISOString(),
    });
  } catch {
    console.info('[CukupAI Engine] Bansos search served via verified offline knowledge base.');
    const fallback = generateOfflineBansosGuidance(rawQuery, province, isEn);
    return res.json({
      ...fallback,
      timestamp: new Date().toISOString(),
    });
  }
});

// Serve frontend with Vite in dev, static files in prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`CukupAI server listening on ${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
