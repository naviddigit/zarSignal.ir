import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppShell } from '../../src/components/AppShell';
import { fetchBubbles, fetchMarkets, symbolLabels, type LiveBubbleCard, type Quote, type Snapshot } from '../../src/api';
import { colors, copy } from '../../src/theme';

function formatPrice(quote: Quote) {
  return new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 }).format(Number(quote.sell));
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2, signDisplay: 'exceptZero' }).format(value)}٪`;
}

const tickerSymbols = ['GOLD_18K', 'SEKE_CASH', 'USD', 'SILVER_999'] as const;

export default function HomeScreen() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [bubbles, setBubbles] = useState<LiveBubbleCard[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const [markets, nextBubbles] = await Promise.all([fetchMarkets(signal), fetchBubbles(signal)]);
      if (signal?.aborted) return;
      setSnapshot(markets);
      setBubbles(nextBubbles);
      setError('');
    } catch {
      if (!signal?.aborted) setError('اتصال API برقرار نشد. سرور وب را روشن کنید.');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  const gold = useMemo(() => bubbles.find(item => item.key === 'GOLD_BUBBLE'), [bubbles]);
  const tickers = useMemo(() => {
    const quotes = snapshot?.quotes ?? [];
    return tickerSymbols
      .map(symbol => quotes.find(item => item.symbol === symbol))
      .filter((item): item is Quote => Boolean(item));
  }, [snapshot]);

  return (
    <AppShell>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable style={styles.iconBtn} onPress={() => router.push('/(tabs)/more')} accessibilityLabel="منو">
            <Ionicons name="menu" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.logo}>{copy.brand}</Text>
          <Pressable style={styles.iconBtn} onPress={() => router.push('/account')} accessibilityLabel="اعلان‌ها">
            <Ionicons name="notifications-outline" size={20} color={colors.text} />
          </Pressable>
        </View>

        <Text style={styles.hello}>{copy.greeting}</Text>
        <Text style={styles.helloSub}>{copy.greetingSub}</Text>

        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={copy.searchPlaceholder}
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            onSubmitEditing={() => router.push('/(tabs)/markets')}
          />
        </View>

        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <Text style={styles.heroKicker}>دیده‌بان بازار</Text>
          <Text style={styles.heroTitle}>{copy.heroTitle}</Text>
          <Text style={styles.heroBody}>{copy.heroBody}</Text>
          {gold?.percent != null && (gold.status === 'ok' || gold.status === 'stale') ? (
            <Text style={styles.heroMetric}>حباب طلا · {formatPercent(gold.percent)}</Text>
          ) : (
            <Text style={styles.heroMetric}>حباب طلا · در انتظار داده معتبر</Text>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tickerRow}>
          {tickers.map(quote => (
            <Pressable key={quote.symbol} style={styles.tickerCard} onPress={() => router.push('/(tabs)/markets')}>
              <Text style={styles.tickerName}>{symbolLabels[quote.symbol] ?? quote.symbol}</Text>
              <Text style={styles.tickerPrice}>{formatPrice(quote)}</Text>
              <Text style={styles.tickerUnit}>{quote.currency === 'TMN' ? 'تومان' : 'دلار'}</Text>
            </Pressable>
          ))}
          {!tickers.length ? (
            <View style={styles.tickerCard}>
              <Text style={styles.tickerName}>قیمت‌ها</Text>
              <Text style={styles.tickerUnit}>{error || 'در حال بارگذاری…'}</Text>
            </View>
          ) : null}
        </ScrollView>

        <Pressable style={styles.bannerGold} onPress={() => router.push('/(tabs)/capillary')}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerGoldTitle}>{copy.dailyAnalysis}</Text>
            <Text style={styles.bannerGoldSub}>{copy.dailyAnalysisSub}</Text>
          </View>
          <Ionicons name="arrow-back-circle" size={28} color="#1a1408" />
        </Pressable>

        <Pressable style={styles.bannerPro} onPress={() => router.push('/(tabs)/more')}>
          <Ionicons name="diamond-outline" size={20} color={colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerProTitle}>{copy.proBanner}</Text>
            <Text style={styles.bannerProSub}>{copy.proBannerSub}</Text>
          </View>
        </Pressable>

        <Text style={styles.section}>ابزارهای سریع</Text>
        <View style={styles.tools}>
          {[
            { label: 'تحلیل بازار', icon: 'analytics-outline' as const, href: '/(tabs)/capillary' },
            { label: 'ماشین‌حساب', icon: 'calculator-outline' as const, href: '/(tabs)/calculator' },
            { label: 'تابلوی قیمت', icon: 'list-outline' as const, href: '/(tabs)/markets' },
            { label: 'تاریخچه', icon: 'time-outline' as const, href: '/history' },
          ].map(tool => (
            <Pressable key={tool.label} style={styles.tool} onPress={() => router.push(tool.href as never)}>
              <View style={styles.toolIcon}>
                <Ionicons name={tool.icon} size={20} color={colors.accent} />
              </View>
              <Text style={styles.toolLabel}>{tool.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.hint}>{copy.bubbleHint}</Text>
        <Text style={styles.note}>{copy.noProfit}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {snapshot ? (
          <Text style={styles.note}>
            {snapshot.mode === 'demo' ? 'حالت پیش‌نمایش' : 'قیمت زنده با زمان مشاهده'} · {snapshot.quotes.length} نماد
          </Text>
        ) : null}
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 28 },
  topBar: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  logo: { color: colors.accent, fontSize: 20, fontWeight: '800' },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hello: { color: colors.text, fontSize: 18, fontWeight: '800', textAlign: 'right' },
  helloSub: { color: colors.muted, fontSize: 12, textAlign: 'right', marginTop: 4, marginBottom: 14 },
  search: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, color: colors.text, textAlign: 'right', paddingVertical: 10 },
  hero: {
    marginTop: 16,
    borderRadius: 22,
    padding: 18,
    minHeight: 150,
    backgroundColor: '#16110a',
    borderWidth: 1,
    borderColor: 'rgba(231,196,121,0.35)',
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: -40,
    left: -20,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(231,196,121,0.18)',
  },
  heroKicker: { color: colors.accent, fontWeight: '700', textAlign: 'right', fontSize: 12 },
  heroTitle: { color: colors.text, fontSize: 24, fontWeight: '800', textAlign: 'right', marginTop: 8 },
  heroBody: { color: colors.muted, fontSize: 13, lineHeight: 22, textAlign: 'right', marginTop: 8 },
  heroMetric: { color: colors.accent, fontWeight: '800', textAlign: 'right', marginTop: 14, fontSize: 15 },
  tickerRow: { gap: 10, paddingVertical: 16, flexDirection: 'row-reverse' },
  tickerCard: {
    width: 128,
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tickerName: { color: colors.muted, fontSize: 11, textAlign: 'right' },
  tickerPrice: { color: colors.text, fontSize: 16, fontWeight: '800', textAlign: 'right', marginTop: 8 },
  tickerUnit: { color: colors.success, fontSize: 11, textAlign: 'right', marginTop: 4 },
  bannerGold: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.accent,
  },
  bannerGoldTitle: { color: '#1a1408', fontWeight: '800', fontSize: 15, textAlign: 'right' },
  bannerGoldSub: { color: '#3a2f18', fontSize: 12, textAlign: 'right', marginTop: 4 },
  bannerPro: {
    marginTop: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bannerProTitle: { color: colors.text, fontWeight: '800', textAlign: 'right' },
  bannerProSub: { color: colors.muted, fontSize: 12, textAlign: 'right', marginTop: 2 },
  section: { color: colors.text, fontWeight: '800', textAlign: 'right', marginTop: 20, marginBottom: 10 },
  tools: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
  tool: {
    width: '47%',
    minHeight: 88,
    borderRadius: 16,
    padding: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toolIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  toolLabel: { color: colors.text, fontWeight: '700', textAlign: 'right', marginTop: 10, fontSize: 13 },
  hint: { color: colors.muted, fontSize: 11, lineHeight: 18, textAlign: 'right', marginTop: 18 },
  note: { color: colors.muted, fontSize: 11, textAlign: 'right', marginTop: 6 },
  error: { color: colors.danger, textAlign: 'right', marginTop: 8, fontSize: 12 },
});
