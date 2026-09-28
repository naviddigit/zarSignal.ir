import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppShell } from '../../src/components/AppShell';
import { fetchMarkets, symbolLabels, type Quote, type Snapshot } from '../../src/api';
import { colors } from '../../src/theme';

const filters = [
  { id: 'all', label: 'همه' },
  { id: 'gold', label: 'طلا' },
  { id: 'usd', label: 'دلار' },
  { id: 'coin', label: 'سکه' },
  { id: 'silver', label: 'نقره' },
] as const;

function matchesFilter(symbol: string, filter: (typeof filters)[number]['id']) {
  if (filter === 'all') return true;
  if (filter === 'gold') return symbol.includes('GOLD') || symbol.includes('XAU');
  if (filter === 'usd') return symbol === 'USD' || symbol === 'AED';
  if (filter === 'coin') return symbol.includes('SEKE');
  if (filter === 'silver') return symbol.includes('SILVER') || symbol.includes('XAG');
  return true;
}

function formatPrice(quote: Quote) {
  return new Intl.NumberFormat('fa-IR', { maximumFractionDigits: quote.currency === 'USD' ? 2 : 0 }).format(Number(quote.sell));
}

export default function MarketsScreen() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<(typeof filters)[number]['id']>('all');

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      setSnapshot(await fetchMarkets(signal));
      setError('');
    } catch {
      if (!signal?.aborted) setError('دریافت تابلوی قیمت ممکن نشد.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  const quotes = useMemo(
    () => (snapshot?.quotes ?? []).filter(item => matchesFilter(item.symbol, filter)),
    [filter, snapshot],
  );

  return (
    <AppShell>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} tintColor={colors.accent} />}
      >
        <Text style={styles.title}>تابلوی قیمت‌ها</Text>
        <Text style={styles.body}>قیمت با زمان مشاهده. چارت و دیده‌بان در فاز بعد.</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {filters.map(item => (
            <Pressable
              key={item.id}
              style={[styles.chip, filter === item.id && styles.chipOn]}
              onPress={() => setFilter(item.id)}
            >
              <Text style={[styles.chipText, filter === item.id && styles.chipTextOn]}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {error ? (
          <View style={styles.card}>
            <Text style={styles.body}>{error}</Text>
            <Pressable onPress={() => void refresh()}><Text style={styles.link}>تلاش دوباره</Text></Pressable>
          </View>
        ) : null}

        {loading && !snapshot ? <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} /> : null}

        {quotes.map(quote => (
          <View key={quote.symbol} style={styles.row}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{quote.symbol.slice(0, 2)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{symbolLabels[quote.symbol] ?? quote.symbol}</Text>
              <Text style={styles.note}>
                {snapshot?.mode === 'demo'
                  ? 'داده نمونه'
                  : new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Tehran' }).format(new Date(quote.observedAt))}
              </Text>
            </View>
            <View>
              <Text style={styles.price}>{formatPrice(quote)}</Text>
              <Text style={styles.unit}>{quote.currency === 'TMN' ? 'تومان' : 'دلار'}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 28 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'right' },
  body: { color: colors.muted, fontSize: 13, lineHeight: 22, textAlign: 'right', marginTop: 6 },
  chips: { flexDirection: 'row-reverse', gap: 8, paddingVertical: 14 },
  chip: {
    paddingHorizontal: 14,
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
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginBottom: 10,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.accent, fontWeight: '800', fontSize: 11 },
  name: { color: colors.text, fontWeight: '700', textAlign: 'right' },
  note: { color: colors.muted, fontSize: 11, textAlign: 'right', marginTop: 4 },
  price: { color: colors.text, fontSize: 16, fontWeight: '800', textAlign: 'left' },
  unit: { color: colors.muted, fontSize: 11, textAlign: 'left', marginTop: 2 },
  card: { marginTop: 12, padding: 16, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  link: { color: colors.accent, textAlign: 'right', marginTop: 10, fontWeight: '700' },
});
