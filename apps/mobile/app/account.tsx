import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../src/theme';

export default function AccountScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>حساب من</Text>
      <Text style={styles.body}>ورود، اعتبار trial، اشتراک، هشدار حباب و تنظیمات پیش‌فرض موبایل.</Text>
      <View style={styles.card}>
        <Text style={styles.name}>ورود</Text>
        <Text style={styles.note}>OTP کاوه‌نگار و Google در فاز ۱ وصل می‌شوند.</Text>
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
  content: { padding: 20, paddingBottom: 40 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'right' },
  body: { color: colors.muted, fontSize: 13, lineHeight: 22, textAlign: 'right', marginTop: 8 },
  card: { marginTop: 12, padding: 16, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  name: { color: colors.text, fontWeight: '700', textAlign: 'right' },
  note: { color: colors.muted, marginTop: 8, textAlign: 'right', fontSize: 12, lineHeight: 20 },
  link: { color: colors.accent, textAlign: 'right', marginTop: 18, fontWeight: '700' },
});
