import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppShell } from '../../src/components/AppShell';
import { colors } from '../../src/theme';
import { demoLogout, getDemoUser, getTrial, trialRemainingLabel, type DemoUser, type TrialState } from '../../src/session';

const links = [
  { label: 'حساب من', href: '/account', icon: 'person-outline' as const },
  { label: 'تاریخچه تحلیل', href: '/history', icon: 'time-outline' as const },
  { label: 'تحلیل مویرگی', href: '/(tabs)/capillary', icon: 'analytics-outline' as const },
  { label: 'تابلوی قیمت‌ها', href: '/(tabs)/markets', icon: 'storefront-outline' as const },
  { label: 'ماشین‌حساب', href: '/(tabs)/calculator', icon: 'calculator-outline' as const },
] as const;

export default function MoreScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<DemoUser | null>(null);
  const [trial, setTrial] = useState<TrialState | null>(null);

  useEffect(() => {
    void Promise.all([getDemoUser(), getTrial()]).then(([nextUser, nextTrial]) => {
      setUser(nextUser);
      setTrial(nextTrial);
    });
  }, [pathname]);

  return (
    <AppShell>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.title}>بیشتر</Text>
        <Text style={styles.body}>حساب، تاریخچه، اشتراک و لینک‌های شفافیت — مثل منوی سایت.</Text>

        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={22} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user ? user.name : 'مهمان زرسیگنال'}</Text>
            <Text style={styles.note}>{user ? `موبایل دمو: ${user.phone}` : 'هنوز وارد نشده‌اید'}</Text>
            <Text style={styles.note}>{trialRemainingLabel(trial)}</Text>
          </View>
        </View>

        {links.map(item => (
          <Pressable key={item.label} style={styles.row} onPress={() => router.push(item.href as never)}>
            <Ionicons name="chevron-back" size={16} color={colors.muted} />
            <Text style={styles.rowLabel}>{item.label}</Text>
            <Ionicons name={item.icon} size={18} color={colors.accent} />
          </Pressable>
        ))}

        <Pressable style={styles.row} onPress={() => Linking.openURL('https://zarsignal.ir/methodology')}>
          <Ionicons name="chevron-back" size={16} color={colors.muted} />
          <Text style={styles.rowLabel}>شفافیت داده و روش تحلیل</Text>
          <Ionicons name="book-outline" size={18} color={colors.accent} />
        </Pressable>

        <Pressable style={styles.row} onPress={() => Linking.openURL('https://zarsignal.ir/pricing')}>
          <Ionicons name="chevron-back" size={16} color={colors.muted} />
          <Text style={styles.rowLabel}>اشتراک و قیمت‌گذاری</Text>
          <Ionicons name="diamond-outline" size={18} color={colors.accent} />
        </Pressable>

        {user ? (
          <Pressable
            style={styles.logout}
            onPress={() => {
              void demoLogout().then(() => {
                setUser(null);
                setTrial(null);
              });
            }}
          >
            <Text style={styles.logoutText}>خروج از دمو</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.cta} onPress={() => router.push('/(tabs)/capillary')}>
            <Text style={styles.ctaText}>ورود آزمایشی از تحلیل مویرگی</Text>
          </Pressable>
        )}
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 28 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'right' },
  body: { color: colors.muted, fontSize: 13, lineHeight: 22, textAlign: 'right', marginTop: 6, marginBottom: 14 },
  profile: {
    flexDirection: 'row-reverse',
    gap: 12,
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { color: colors.text, fontWeight: '800', textAlign: 'right' },
  note: { color: colors.muted, marginTop: 4, textAlign: 'right', fontSize: 12 },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowLabel: { flex: 1, color: colors.text, fontWeight: '700', textAlign: 'right' },
  cta: {
    marginTop: 12,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { color: '#1a1408', fontWeight: '800' },
  logout: {
    marginTop: 12,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: { color: colors.danger, fontWeight: '800' },
});
