import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../src/theme';
import {
  demoLogin,
  getDemoUser,
  getTrial,
  getViewMode,
  pushHistory,
  setViewMode,
  startLocalTrial,
  trialRemainingLabel,
  type DemoUser,
  type TrialState,
} from '../src/session';

export default function CapillaryScreen() {
  const [view, setView] = useState<'simple' | 'professional'>('simple');
  const [user, setUser] = useState<DemoUser | null>(null);
  const [trial, setTrial] = useState<TrialState | null>(null);
  const [phone, setPhone] = useState('09121234567');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const rise = useRef(new Animated.Value(48)).current;
  const fade = useRef(new Animated.Value(0)).current;

  const hydrate = useCallback(async () => {
    setUser(await getDemoUser());
    setTrial(await getTrial());
    setView(await getViewMode());
  }, []);

  useEffect(() => {
    void hydrate();
    Animated.parallel([
      Animated.timing(rise, { toValue: 0, duration: 480, useNativeDriver: false }),
      Animated.timing(fade, { toValue: 1, duration: 480, useNativeDriver: false }),
    ]).start();
  }, [fade, hydrate, rise]);

  async function chooseView(next: 'simple' | 'professional') {
    setView(next);
    await setViewMode(next);
  }

  async function loginAndOpen() {
    setBusy(true);
    try {
      const nextUser = await demoLogin(phone);
      setUser(nextUser);
      const nextTrial = trial ?? (await startLocalTrial(24));
      setTrial(nextTrial);
      await pushHistory({
        asset: 'GOLD_BUBBLE',
        title: 'تحلیل مویرگی · حباب طلا',
        summary: 'حباب به‌عنوان شاهد فاصله قیمت ثبت شد. شفافیت زمان داده حفظ شد. بدون سیگنال خرید/فروش.',
      });
      setMessage('وارد شدید · اعتبار رایگان محلی شروع شد · در تاریخچه ذخیره شد');
    } finally {
      setBusy(false);
    }
  }

  async function continueTrial() {
    setBusy(true);
    try {
      if (!user) return;
      const nextTrial = trial ?? (await startLocalTrial(24));
      setTrial(nextTrial);
      await pushHistory({
        asset: 'GOLD_BUBBLE',
        title: 'بازخوانی تحلیل مویرگی',
        summary: trialRemainingLabel(nextTrial),
      });
      setMessage('گزارش تازه در تاریخچه ثبت شد');
    } finally {
      setBusy(false);
    }
  }

  const expired = trial ? Date.parse(trial.expiresAt) <= Date.now() : false;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Animated.View style={{ opacity: fade, transform: [{ translateY: rise }] }}>
        <Text style={styles.kicker}>تحلیل مویرگی · شفافیت اول</Text>
        <Text style={styles.title}>حباب را ببین؛ نه به‌جای تصمیم، کنار دلیل.</Text>
        <Text style={styles.body}>
          فاصله قیمت با ارزش محاسباتی، تازگی داده و محدودیت‌ها را می‌خوانی. موتور تصمیم کامل هنوز فعال نیست؛ نتیجه ساختگی نشان داده نمی‌شود.
        </Text>

        <View style={styles.toggle}>
          <Pressable style={[styles.tab, view === 'simple' && styles.tabOn]} onPress={() => void chooseView('simple')}>
            <Text style={[styles.tabText, view === 'simple' && styles.tabTextOn]}>نمای ساده</Text>
          </Pressable>
          <Pressable style={[styles.tab, view === 'professional' && styles.tabOn]} onPress={() => void chooseView('professional')}>
            <Text style={[styles.tabText, view === 'professional' && styles.tabTextOn]}>نمای حرفه‌ای</Text>
          </Pressable>
        </View>
        <Text style={styles.note}>انتخاب نما فقط عمق نمایش است؛ اشتراک نمی‌سازد.</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>شاهد حباب طلا</Text>
          <Text style={styles.cardTitle}>حباب = فاصله قیمت با ارزش محاسباتی</Text>
          <Text style={styles.body}>مثبت یا منفی بودن حباب به‌تنهایی وقت خرید نیست. شفافیت یعنی زمان و واحد را همزمان ببینی.</Text>
          {view === 'professional' ? (
            <Text style={styles.note}>
              جزئیات حرفه‌ای: ورودی مظنه/اونس/دلار، نسخه فرمول، هزینه نامشخص. اتصال کامل API تحلیل در فاز بعد.
            </Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>چه چیزی بررسی می‌شود؟</Text>
          <Text style={styles.row}>۱ · ارزش نسبی (حباب) — آماده</Text>
          <Text style={styles.row}>۲ · روند و قدرت حرکت — هنوز ارائه نشده</Text>
          <Text style={styles.row}>۳ · هزینه و ریسک — تا داده هزینه، جهت تئوریک است</Text>
        </View>

        <View style={styles.paywall}>
          <Text style={styles.cardTitle}>اعتبار رایگان (دمو محلی)</Text>
          <Text style={styles.body}>{trialRemainingLabel(trial)}</Text>
          {!user ? (
            <>
              <Text style={styles.note}>برای دمو، شماره را وارد کن (OTP واقعی بعداً با کاوه‌نگار).</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="0912…"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
              <Pressable style={styles.cta} disabled={busy} onPress={() => void loginAndOpen()}>
                <Text style={styles.ctaText}>{busy ? '…' : 'ورود آزمایشی و شروع تحلیل'}</Text>
              </Pressable>
            </>
          ) : expired ? (
            <Text style={styles.warning}>اعتبار تمام شده. اشتراک Play/گیفت در فاز فروش فعال می‌شود.</Text>
          ) : (
            <Pressable style={styles.cta} disabled={busy} onPress={() => void continueTrial()}>
              <Text style={styles.ctaText}>{busy ? '…' : 'ذخیره در تاریخچه'}</Text>
            </Pressable>
          )}
          {message ? <Text style={styles.ok}>{message}</Text> : null}
          <Text style={styles.note}>بدون تضمین سود · مدت trial واقعی از ادمین وب خوانده خواهد شد.</Text>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 48, maxWidth: 720, width: '100%', alignSelf: 'center' },
  kicker: { color: colors.accent, fontWeight: '700', textAlign: 'right' },
  title: { color: colors.text, fontSize: 24, fontWeight: '800', textAlign: 'right', marginTop: 10, lineHeight: 34 },
  body: { color: colors.muted, fontSize: 14, lineHeight: 24, textAlign: 'right', marginTop: 10 },
  toggle: { flexDirection: 'row-reverse', gap: 8, marginTop: 18 },
  tab: { flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  tabText: { color: colors.muted, fontWeight: '700' },
  tabTextOn: { color: colors.accent },
  note: { color: colors.muted, fontSize: 12, textAlign: 'right', marginTop: 8 },
  card: { marginTop: 16, padding: 16, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  cardLabel: { color: colors.accent, fontSize: 12, fontWeight: '700', textAlign: 'right' },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '700', textAlign: 'right', marginTop: 6 },
  row: { color: colors.text, textAlign: 'right', marginTop: 8, fontSize: 13 },
  paywall: { marginTop: 16, padding: 16, borderRadius: 16, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accent },
  input: {
    marginTop: 12,
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
  cta: { marginTop: 14, minHeight: 48, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#1a1408', fontWeight: '800' },
  warning: { color: colors.warning, textAlign: 'right', marginTop: 12, fontWeight: '700' },
  ok: { color: colors.success, textAlign: 'right', marginTop: 10, fontWeight: '700' },
});
