import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../src/theme';
import { demoLogout, getDemoUser, getTrial, trialRemainingLabel, type DemoUser, type TrialState } from '../src/session';

export default function AccountScreen() {
  const [user, setUser] = useState<DemoUser | null>(null);
  const [trial, setTrial] = useState<TrialState | null>(null);

  useFocusEffect(
    useCallback(() => {
      void Promise.all([getDemoUser(), getTrial()]).then(([nextUser, nextTrial]) => {
        setUser(nextUser);
        setTrial(nextTrial);
      });
    }, []),
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>حساب من</Text>
      <Text style={styles.body}>ورود، اعتبار، اشتراک، هشدار حباب و تنظیمات موبایل.</Text>

      <View style={styles.card}>
        <Text style={styles.name}>{user ? user.name : 'مهمان'}</Text>
        <Text style={styles.note}>{user ? `موبایل دمو: ${user.phone}` : 'هنوز وارد نشده‌اید'}</Text>
        <Text style={styles.note}>{trialRemainingLabel(trial)}</Text>
        {user ? (
          <Pressable
            style={styles.btn}
            onPress={() => {
              void demoLogout().then(() => {
                setUser(null);
                setTrial(null);
              });
            }}
          >
            <Text style={styles.btnText}>خروج از دمو</Text>
          </Pressable>
        ) : (
          <Text style={styles.note}>از مسیر «تحلیل مویرگی» وارد شو.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.name}>هشدارهای من</Text>
        <Text style={styles.note}>آستانه حباب ±٪ · Push پایه · SMS فقط پلن پولی — فاز ۳.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.name}>اشتراک و خرید</Text>
        <Text style={styles.note}>اندروید: Google Play یا گیفت‌کد · گزارش فروش در ادمین وب — فاز ۴.</Text>
      </View>
      <Pressable onPress={() => Linking.openURL('https://zarsignal.ir/methodology')}>
        <Text style={styles.link}>شفافیت داده و روش تحلیل ←</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40, maxWidth: 720, width: '100%', alignSelf: 'center' },
  title: { color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'right' },
  body: { color: colors.muted, fontSize: 13, lineHeight: 22, textAlign: 'right', marginTop: 8 },
  card: { marginTop: 12, padding: 16, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  name: { color: colors.text, fontWeight: '700', textAlign: 'right' },
  note: { color: colors.muted, marginTop: 8, textAlign: 'right', fontSize: 12, lineHeight: 20 },
  btn: { marginTop: 12, minHeight: 44, borderRadius: 10, borderColor: colors.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: colors.accent, fontWeight: '700' },
  link: { color: colors.accent, textAlign: 'right', marginTop: 18, fontWeight: '700' },
});
