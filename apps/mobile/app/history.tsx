import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../src/theme';

export default function HistoryScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>تاریخچه تحلیل</Text>
      <Text style={styles.body}>بعد از ورود، هر سشن تحلیل مویرگی اینجا می‌ماند تا بتوانی به همان گزارش برگردی.</Text>
      <View style={styles.card}>
        <Text style={styles.name}>هنوز تحلیلی ذخیره نشده</Text>
        <Text style={styles.note}>فاز ۱: ذخیره سروری پس از OTP/Google و شروع trial ادمین.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'right' },
  body: { color: colors.muted, fontSize: 13, lineHeight: 22, textAlign: 'right', marginTop: 8 },
  card: { marginTop: 16, padding: 16, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  name: { color: colors.text, fontWeight: '700', textAlign: 'right' },
  note: { color: colors.muted, marginTop: 8, textAlign: 'right', fontSize: 12 },
});
