import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { fetchMarkets, symbolLabels, type Snapshot } from '../src/api';
import { colors } from '../src/theme';

export default function MarketsScreen() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} tintColor={colors.accent} />}
    >
      <Text style={styles.title}>تابلوی قیمت‌ها</Text>
      <Text style={styles.body}>خلاصه قوی با شفافیت زمان. چارت فشرده و واچ‌لیست در فاز ۲ اضافه می‌شوند.</Text>
      {error ? (
        <View style={styles.card}>
          <Text style={styles.body}>{error}</Text>
          <Pressable onPress={() => void refresh()}><Text style={styles.link}>تلاش دوباره</Text></Pressable>
        </View>
      ) : null}
      {loading && !snapshot ? <ActivityIndicator color={colors.accent} /> : null}
      {snapshot?.quotes.map(quote => (
        <View key={quote.symbol} style={styles.card}>
          <Text style={styles.name}>{symbolLabels[quote.symbol] ?? quote.symbol}</Text>
          <Text style={styles.price}>
            {new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2 }).format(Number(quote.sell))}{' '}
            {quote.currency === 'TMN' ? 'تومان' : 'دلار'}
          </Text>
          <Text style={styles.note}>
            هر {quote.unit} ·{' '}
            {snapshot.mode === 'demo'
              ? 'داده نمونه'
              : new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Tehran' }).format(new Date(quote.observedAt))}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'right' },
  body: { color: colors.muted, fontSize: 13, lineHeight: 22, textAlign: 'right', marginTop: 8 },
  card: { marginTop: 12, padding: 16, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  name: { color: colors.text, fontWeight: '700', textAlign: 'right' },
  price: { color: colors.accent, fontSize: 22, fontWeight: '800', textAlign: 'right', marginTop: 8 },
  note: { color: colors.muted, fontSize: 12, textAlign: 'right', marginTop: 6 },
  link: { color: colors.accent, textAlign: 'right', marginTop: 10, fontWeight: '700' },
});
