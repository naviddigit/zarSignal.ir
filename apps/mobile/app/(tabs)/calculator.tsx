import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppShell } from '../../src/components/AppShell';
import {
  fetchMarkets,
  postProfessionalCalculator,
  postSimpleCalculator,
  type CalculatorOperation,
  type CalculatorResult,
} from '../../src/api';
import {
  convertPurityPrice,
  convertWeight,
  purityOptions,
  weightUnits,
  type Purity,
  type WeightUnit,
} from '../../src/conversions';
import { colors } from '../../src/theme';

type ToolId = 'menu' | 'weight' | 'purity' | CalculatorOperation | 'locked';

const tools: { id: ToolId; title: string; note: string; locked?: boolean }[] = [
  { id: 'weight', title: 'تبدیل وزن', note: 'رایگان · آماده' },
  { id: 'purity', title: 'تبدیل عیار قیمت', note: 'رایگان · آماده' },
  { id: 'mazanehTo18k', title: 'مظنه → گرم ۱۸', note: 'رایگان · API زنده' },
  { id: 'market18kToMazaneh', title: 'گرم ۱۸ → مظنه', note: 'رایگان · API زنده' },
  { id: 'goldBubble', title: 'حباب طلا', note: 'پایه · شاهد شفاف' },
  { id: 'usdGap', title: 'فاصله دلار ضمنی', note: 'پایه · شاهد شفاف' },
  { id: 'locked', title: 'سکه و ابزارهای بیشتر', note: 'نیازمند Spec / اشتراک', locked: true },
];

function formatFa(value: number, digits = 2) {
  return new Intl.NumberFormat('fa-IR', { maximumFractionDigits: digits }).format(value);
}

function parseNumber(raw: string) {
  const normalized = raw.replace(/[^\d.]/g, '');
  const value = Number(normalized);
  return Number.isFinite(value) ? value : NaN;
}

export default function CalculatorScreen() {
  const [tool, setTool] = useState<ToolId>('menu');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');
  const [result, setResult] = useState<CalculatorResult | null>(null);
  const [simpleOut, setSimpleOut] = useState<string>('');

  const [weightValue, setWeightValue] = useState('1');
  const [fromUnit, setFromUnit] = useState<WeightUnit>('mesghal');
  const [toUnit, setToUnit] = useState<WeightUnit>('gram');

  const [priceValue, setPriceValue] = useState('1000000');
  const [fromPurity, setFromPurity] = useState<Purity>('18k');
  const [toPurity, setToPurity] = useState<Purity>('24k');

  const [manualValue, setManualValue] = useState('');
  const [useLive, setUseLive] = useState(true);

  const weightOut = useMemo(() => {
    const value = parseNumber(weightValue);
    if (!Number.isFinite(value)) return '';
    try {
      return formatFa(convertWeight(value, fromUnit, toUnit), 4);
    } catch {
      return '';
    }
  }, [fromUnit, toUnit, weightValue]);

  const purityOut = useMemo(() => {
    const value = parseNumber(priceValue);
    if (!Number.isFinite(value)) return '';
    try {
      return formatFa(convertPurityPrice(value, fromPurity, toPurity), 0);
    } catch {
      return '';
    }
  }, [fromPurity, priceValue, toPurity]);

  async function liveMid(symbol: string) {
    const snapshot = await fetchMarkets();
    const quote = snapshot.quotes.find(item => item.symbol === symbol);
    if (!quote) throw new Error(`نماد ${symbol} در تابلو نیست`);
    const mid = (Number(quote.buy) + Number(quote.sell)) / 2;
    if (!Number.isFinite(mid) || mid <= 0) throw new Error('قیمت تابلو معتبر نیست');
    return { mid, observedAt: quote.observedAt, status: snapshot.status };
  }

  async function runApi(operation: CalculatorOperation) {
    setBusy(true);
    setError('');
    setHint('');
    setResult(null);
    setSimpleOut('');
    try {
      if (operation === 'mazanehTo18k' || operation === 'market18kToMazaneh') {
        let value = parseNumber(manualValue);
        if (useLive) {
          const symbol = operation === 'mazanehTo18k' ? 'GOLD_MELTED' : 'GOLD_18K';
          const live = await liveMid(symbol);
          value = live.mid;
          if (live.status === 'stale') setHint('داده تابلو ممکن است قدیمی باشد.');
        }
        if (!Number.isFinite(value) || value <= 0) throw new Error('مقدار معتبر نیست');
        const next = await postSimpleCalculator(operation, value);
        setSimpleOut(`${formatFa(next.value, 0)}${next.version ? ` · نسخه ${next.version}` : ''}`);
      } else {
        let melted: number;
        let xau: number;
        let usd: number;
        if (useLive) {
          const [m, x, u] = await Promise.all([liveMid('GOLD_MELTED'), liveMid('XAU_USD'), liveMid('USD')]);
          melted = m.mid;
          xau = x.mid;
          usd = u.mid;
          if ([m, x, u].some(item => item.status === 'stale')) {
            setHint('داده تابلو ممکن است قدیمی باشد؛ شاهد است نه سیگنال.');
          }
        } else {
          melted = parseNumber(manualValue.split(',')[0] || '');
          xau = parseNumber(manualValue.split(',')[1] || '');
          usd = parseNumber(manualValue.split(',')[2] || '');
          if (![melted, xau, usd].every(n => Number.isFinite(n) && n > 0)) {
            throw new Error('برای حالت دستی سه عدد وارد کن: مظنه,اونس,دلار');
          }
        }
        setResult(await postProfessionalCalculator(operation, {
          melted: { provenance: 'MANUAL', value: melted },
          xau: { provenance: 'MANUAL', value: xau },
          usd: { provenance: 'MANUAL', value: usd },
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'محاسبه ممکن نشد');
    } finally {
      setBusy(false);
    }
  }

  if (tool === 'menu') {
    return (
      <AppShell>
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
          <Text style={styles.title}>ماشین‌حساب</Text>
          <Text style={styles.body}>ابزارهای تأییدشده کار می‌کنند. قفل‌ها صادقانه‌اند. خروجی پیشنهاد خرید/فروش نیست.</Text>
          {tools.map(item => (
            <Pressable
              key={item.id}
              style={[styles.card, item.locked && styles.locked]}
              disabled={item.locked}
              onPress={() => {
                setTool(item.id);
                setError('');
                setResult(null);
                setSimpleOut('');
              }}
            >
              <Text style={styles.name}>{item.title}</Text>
              <Text style={styles.note}>{item.note}</Text>
              {item.locked ? <Text style={styles.lock}>برای باز شدن به اشتراک یا تأیید Spec نیاز است</Text> : null}
            </Pressable>
          ))}
        </ScrollView>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => setTool('menu')} style={styles.back}>
          <Text style={styles.backText}>← بازگشت به فهرست</Text>
        </Pressable>

        {tool === 'weight' ? (
          <>
            <Text style={styles.title}>تبدیل وزن</Text>
            <Text style={styles.label}>مقدار</Text>
            <TextInput value={weightValue} onChangeText={setWeightValue} keyboardType="decimal-pad" style={styles.input} />
            <Text style={styles.label}>از</Text>
            <ChipRow
              options={(Object.keys(weightUnits) as WeightUnit[]).map(key => ({ id: key, label: weightUnits[key].label }))}
              value={fromUnit}
              onChange={setFromUnit}
            />
            <Text style={styles.label}>به</Text>
            <ChipRow
              options={(Object.keys(weightUnits) as WeightUnit[]).map(key => ({ id: key, label: weightUnits[key].label }))}
              value={toUnit}
              onChange={setToUnit}
            />
            <View style={styles.outCard}>
              <Text style={styles.outLabel}>نتیجه</Text>
              <Text style={styles.outValue}>{weightOut || '—'}</Text>
              <Text style={styles.note}>{weightUnits[toUnit].label}</Text>
            </View>
          </>
        ) : null}

        {tool === 'purity' ? (
          <>
            <Text style={styles.title}>تبدیل عیار قیمت</Text>
            <Text style={styles.label}>قیمت</Text>
            <TextInput value={priceValue} onChangeText={setPriceValue} keyboardType="decimal-pad" style={styles.input} />
            <Text style={styles.label}>از عیار</Text>
            <ChipRow
              options={(Object.keys(purityOptions) as Purity[]).map(key => ({ id: key, label: purityOptions[key].label }))}
              value={fromPurity}
              onChange={setFromPurity}
            />
            <Text style={styles.label}>به عیار</Text>
            <ChipRow
              options={(Object.keys(purityOptions) as Purity[]).map(key => ({ id: key, label: purityOptions[key].label }))}
              value={toPurity}
              onChange={setToPurity}
            />
            <View style={styles.outCard}>
              <Text style={styles.outLabel}>نتیجه</Text>
              <Text style={styles.outValue}>{purityOut || '—'}</Text>
              <Text style={styles.note}>تومان / گرم معادل</Text>
            </View>
          </>
        ) : null}

        {tool === 'mazanehTo18k' || tool === 'market18kToMazaneh' || tool === 'goldBubble' || tool === 'usdGap' ? (
          <>
            <Text style={styles.title}>{tools.find(item => item.id === tool)?.title}</Text>
            <Text style={styles.body}>شاهد محاسباتی است؛ سیگنال معامله نیست.</Text>
            <View style={styles.toggle}>
              <Pressable style={[styles.tab, useLive && styles.tabOn]} onPress={() => setUseLive(true)}>
                <Text style={[styles.tabText, useLive && styles.tabTextOn]}>داده زنده</Text>
              </Pressable>
              <Pressable style={[styles.tab, !useLive && styles.tabOn]} onPress={() => setUseLive(false)}>
                <Text style={[styles.tabText, !useLive && styles.tabTextOn]}>دستی</Text>
              </Pressable>
            </View>
            {!useLive ? (
              <>
                <Text style={styles.label}>
                  {tool === 'goldBubble' || tool === 'usdGap'
                    ? 'مظنه,اونس دلار,دلار تومان (با ویرگول)'
                    : tool === 'mazanehTo18k'
                      ? 'مظنه آب‌شده (تومان/مثقال)'
                      : 'گرم ۱۸ عیار (تومان)'}
                </Text>
                <TextInput
                  value={manualValue}
                  onChangeText={setManualValue}
                  keyboardType="numbers-and-punctuation"
                  style={styles.input}
                  placeholder={tool === 'goldBubble' || tool === 'usdGap' ? 'مثلاً 12000000,2650,920000' : 'عدد'}
                  placeholderTextColor={colors.muted}
                />
              </>
            ) : (
              <Text style={styles.note}>از API عمومی زرسیگنال با provenance=LIVE خوانده می‌شود.</Text>
            )}
            <Pressable style={styles.cta} disabled={busy} onPress={() => void runApi(tool)}>
              {busy ? <ActivityIndicator color="#1a1408" /> : <Text style={styles.ctaText}>محاسبه</Text>}
            </Pressable>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {hint ? <Text style={styles.hint}>{hint}</Text> : null}
            {simpleOut ? (
              <View style={styles.outCard}>
                <Text style={styles.outLabel}>نتیجه</Text>
                <Text style={styles.outValue}>{simpleOut}</Text>
              </View>
            ) : null}
            {result ? (
              <View style={styles.outCard}>
                <Text style={styles.outLabel}>{result.formulaId} · v{result.version}</Text>
                {result.outputs.map(item => (
                  <View key={item.label} style={{ marginTop: 10 }}>
                    <Text style={styles.note}>{item.label}</Text>
                    <Text style={styles.outValue}>{formatFa(item.value, 4)} {item.unit}</Text>
                  </View>
                ))}
                <Text style={styles.note}>
                  {new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Tehran' }).format(new Date(result.calculatedAt))}
                </Text>
                {result.inputs.map(item => (
                  <Text key={item.key} style={styles.meta}>
                    {item.label}: {formatFa(item.value, 2)} · {item.provenance}
                    {item.observedAt
                      ? ` · ${new Intl.DateTimeFormat('fa-IR', { timeStyle: 'short', timeZone: 'Asia/Tehran' }).format(new Date(item.observedAt))}`
                      : ''}
                  </Text>
                ))}
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </AppShell>
  );
}

function ChipRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <View style={styles.chips}>
      {options.map(option => (
        <Pressable
          key={option.id}
          style={[styles.chip, value === option.id && styles.chipOn]}
          onPress={() => onChange(option.id)}
        >
          <Text style={[styles.chipText, value === option.id && styles.chipTextOn]}>{option.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 28 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'right' },
  body: { color: colors.muted, fontSize: 13, lineHeight: 22, textAlign: 'right', marginTop: 8 },
  card: { marginTop: 12, padding: 16, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  locked: { opacity: 0.72 },
  name: { color: colors.text, fontWeight: '700', textAlign: 'right' },
  note: { color: colors.accent, marginTop: 6, textAlign: 'right', fontSize: 12 },
  lock: { color: colors.warning, marginTop: 8, textAlign: 'right', fontSize: 12 },
  back: { marginBottom: 8, alignSelf: 'flex-start' },
  backText: { color: colors.accent, fontWeight: '700' },
  label: { color: colors.muted, textAlign: 'right', marginTop: 14, marginBottom: 8, fontWeight: '700' },
  input: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    color: colors.text,
    paddingHorizontal: 14,
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  chipText: { color: colors.muted, fontWeight: '700', fontSize: 12 },
  chipTextOn: { color: colors.accent },
  outCard: { marginTop: 16, padding: 16, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  outLabel: { color: colors.muted, textAlign: 'right', fontSize: 12 },
  outValue: { color: colors.text, fontSize: 24, fontWeight: '800', textAlign: 'right', marginTop: 6 },
  toggle: { flexDirection: 'row-reverse', gap: 8, marginTop: 14 },
  tab: { flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  tabText: { color: colors.muted, fontWeight: '700' },
  tabTextOn: { color: colors.accent },
  cta: { marginTop: 16, minHeight: 48, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#1a1408', fontWeight: '800' },
  error: { color: colors.danger, textAlign: 'right', marginTop: 10, fontWeight: '700' },
  hint: { color: colors.warning, textAlign: 'right', marginTop: 10, fontSize: 12 },
  meta: { color: colors.muted, fontSize: 11, textAlign: 'right', marginTop: 6, lineHeight: 18 },
});
