import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../src/theme';

export default function CapillaryScreen() {
  const [view, setView] = useState<'simple' | 'professional'>('simple');
  const rise = useRef(new Animated.Value(40)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(rise, { toValue: 0, duration: 420, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 420, useNativeDriver: true }),
    ]).start();
  }, [fade, rise]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Animated.View style={{ opacity: fade, transform: [{ translateY: rise }] }}>
        <Text style={styles.kicker}>تحلیل مویرگی · شفافیت اول</Text>
        <Text style={styles.title}>حباب را ببین؛ نه به‌جای تصمیم، کنار دلیل.</Text>
        <Text style={styles.body}>
          در این لایه فاصله قیمت با ارزش محاسباتی، تازگی داده و محدودیت‌ها را می‌خوانی. موتور تصمیم معاملاتی کامل هنوز فعال نیست؛ تا آن زمان نتیجه ساختگی نمایش داده نمی‌شود.
        </Text>

        <View style={styles.toggle} accessibilityRole="tablist">
          <Pressable style={[styles.tab, view === 'simple' && styles.tabOn]} onPress={() => setView('simple')}>
            <Text style={[styles.tabText, view === 'simple' && styles.tabTextOn]}>نمای ساده</Text>
          </Pressable>
          <Pressable style={[styles.tab, view === 'professional' && styles.tabOn]} onPress={() => setView('professional')}>
            <Text style={[styles.tabText, view === 'professional' && styles.tabTextOn]}>نمای حرفه‌ای</Text>
          </Pressable>
        </View>
        <Text style={styles.note}>انتخاب نما فقط عمق نمایش است؛ اشتراک نمی‌سازد.</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>شاهد حباب طلا</Text>
          <Text style={styles.cardTitle}>وضعیت از داده زنده وب خوانده می‌شود</Text>
          <Text style={styles.body}>حباب مثبت/منفی به‌تنهایی وقت خرید نیست. شفافیت یعنی زمان و واحد را همزمان ببینی.</Text>
          {view === 'professional' ? (
            <Text style={styles.note}>جزئیات حرفه‌ای: ورودی مظنه/اونس/دلار، نسخه فرمول و هزینه نامشخص — در فاز بعد از API تحلیل متصل می‌شود.</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>چه چیزی بررسی می‌شود؟</Text>
          <Text style={styles.row}>۱ · ارزش نسبی (حباب)</Text>
          <Text style={styles.row}>۲ · روند و قدرت حرکت (هنوز ارائه نشده)</Text>
          <Text style={styles.row}>۳ · هزینه و ریسک (تا داده هزینه، جهت تئوریک است)</Text>
        </View>

        <View style={styles.paywall}>
          <Text style={styles.cardTitle}>اعتبار رایگان از ادمین وب</Text>
          <Text style={styles.body}>پس از ورود، مدت trial همان تنظیم «ساعت آزمایشی تحلیل» در پنل پلن‌هاست. ورود و مصرف اعتبار در فاز ۱ وصل می‌شود.</Text>
          <Text style={styles.note}>بدون تضمین سود · پرداخت آماده‌نشده به‌عنوان خدمت فعال نشان داده نمی‌شود.</Text>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
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
});
