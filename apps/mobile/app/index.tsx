import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { OrbitalHero } from '../src/components/OrbitalHero';
import { RadialMenu } from '../src/components/RadialMenu';
import { fetchBubbles, fetchMarkets, type LiveBubbleCard, type Snapshot } from '../src/api';
import { colors, copy } from '../src/theme';

function formatPercent(value: number) {
  return `${new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2, signDisplay: 'exceptZero' }).format(value)}٪`;
}

export default function HomeScreen() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [bubbles, setBubbles] = useState<LiveBubbleCard[]>([]);
  const [error, setError] = useState('');

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const [markets, nextBubbles] = await Promise.all([fetchMarkets(signal), fetchBubbles(signal)]);
      if (signal?.aborted) return;
      setSnapshot(markets);
      setBubbles(nextBubbles);
      setError('');
    } catch {
      if (!signal?.aborted) setError('دریافت داده ممکن نشد. اتصال و آدرس API را بررسی کنید.');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  const gold = useMemo(() => bubbles.find(item => item.key === 'GOLD_BUBBLE'), [bubbles]);
  const statusLabel =
    gold?.status === 'ok' ? 'محاسبه حباب آماده است'
      : gold?.status === 'stale' ? 'داده قدیمی · شفافیت حفظ شد'
        : gold?.status === 'blocked' ? 'در انتظار تأیید مدل'
          : snapshot?.status === 'ok' ? 'قیمت زنده · تحلیل در مسیر'
            : 'در انتظار داده معتبر';
  const percentLabel =
    gold && (gold.status === 'ok' || gold.status === 'stale') && gold.percent != null
      ? formatPercent(gold.percent)
      : undefined;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.brand}>{copy.brand}</Text>
        <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
        <Text style={styles.title}>
          {copy.heroTitleLine1}{'\n'}
          <Text style={styles.titleAccent}>{copy.heroTitleLine2}</Text>
        </Text>
        <Text style={styles.body}>{copy.heroBody}</Text>

        <OrbitalHero focusLabel="حباب طلا" statusLabel={statusLabel} percentLabel={percentLabel} />

        <RadialMenu
          items={[
            { id: 'capillary', label: 'تحلیل مویرگی', onPress: () => router.push('/capillary') },
            { id: 'markets', label: 'قیمت‌ها', onPress: () => router.push('/markets') },
            { id: 'calculator', label: 'ماشین‌حساب', onPress: () => router.push('/calculator') },
            { id: 'history', label: 'تاریخچه', onPress: () => router.push('/history') },
            { id: 'account', label: 'حساب من', onPress: () => router.push('/account') },
          ]}
        />

        <Pressable style={styles.cta} accessibilityRole="button" onPress={() => router.push('/capillary')}>
          <Text style={styles.ctaText}>{copy.ctaCapillary}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="link"
          onPress={() => Linking.openURL('https://zarsignal.ir/methodology').catch(() => setError('بازکردن مرورگر ممکن نشد.'))}
        >
          <Text style={styles.link}>{copy.ctaTransparency} ←</Text>
        </Pressable>
        <Text style={styles.hint}>{copy.bubbleHint}</Text>
        <Text style={styles.note}>{copy.noProfit}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {snapshot ? (
          <Text style={styles.note}>
            {snapshot.mode === 'demo' ? 'حالت پیش‌نمایش · قیمت‌ها نمونه هستند' : 'قیمت زنده با زمان مشاهده مشخص'}
            {` · ${snapshot.quotes.length} نماد`}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 12 },
  brand: { color: colors.accent, fontSize: 22, fontWeight: '800', textAlign: 'right' },
  eyebrow: { color: colors.muted, fontSize: 12, textAlign: 'right', marginTop: 6 },
  title: { color: colors.text, fontSize: 30, fontWeight: '800', textAlign: 'right', marginTop: 14, lineHeight: 40 },
  titleAccent: { color: colors.accent },
  body: { color: colors.muted, fontSize: 14, lineHeight: 24, textAlign: 'right', marginTop: 10 },
  cta: {
    marginTop: 18,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { color: '#1a1408', fontWeight: '800', fontSize: 16 },
  link: { color: colors.accent, textAlign: 'right', marginTop: 14, fontWeight: '700' },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 20, textAlign: 'right', marginTop: 14 },
  note: { color: colors.muted, fontSize: 11, textAlign: 'right', marginTop: 8 },
  error: { color: colors.danger, textAlign: 'right', marginTop: 10 },
});
