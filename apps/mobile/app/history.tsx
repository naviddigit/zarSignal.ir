import { useEffect, useState } from 'react';
import { usePathname } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../src/theme';
import { getHistory, type HistoryItem } from '../src/session';

export default function HistoryScreen() {
  const pathname = usePathname();
  const [items, setItems] = useState<HistoryItem[]>([]);

  useEffect(() => {
    void getHistory().then(setItems);
  }, [pathname]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>تاریخچه تحلیل</Text>
      <Text style={styles.body}>سشن‌های تحلیل مویرگی بعد از ورود اینجا می‌مانند.</Text>
      {items.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.name}>هنوز تحلیلی ذخیره نشده</Text>
          <Text style={styles.note}>از «تحلیل مویرگی» وارد شو و یک گزارش ذخیره کن.</Text>
        </View>
      ) : (
        items.map(item => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.name}>{item.title}</Text>
            <Text style={styles.note}>{item.summary}</Text>
            <Text style={styles.meta}>
              {new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Tehran' }).format(new Date(item.createdAt))}
            </Text>
          </View>
        ))
      )}
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
  meta: { color: colors.accent, marginTop: 10, textAlign: 'right', fontSize: 11 },
});
