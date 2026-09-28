import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../src/theme';

const tools = [
  { title: 'تبدیل وزن', state: 'رایگان · آماده', locked: false },
  { title: 'مظنه ↔ گرم ۱۸', state: 'رایگان · آماده', locked: false },
  { title: 'حباب طلا', state: 'پایه · شاهد شفاف', locked: false },
  { title: 'فاصله دلار ضمنی', state: 'پایه · شاهد شفاف', locked: false },
  { title: 'سکه و ابزارهای بیشتر', state: 'پولی / نیازمند Spec', locked: true },
];

export default function CalculatorScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>ماشین‌حساب</Text>
      <Text style={styles.body}>ابزارهای تأییدشده بازند؛ قفل‌ها صادقانه‌اند. با اشتراک می‌پرسی: «چه چیزی بیشتر می‌بینم؟»</Text>
      {tools.map(tool => (
        <View key={tool.title} style={[styles.card, tool.locked && styles.locked]}>
          <Text style={styles.name}>{tool.title}</Text>
          <Text style={styles.note}>{tool.state}</Text>
          {tool.locked ? <Text style={styles.lock}>برای باز شدن به اشتراک یا تأیید Spec نیاز است</Text> : null}
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
  locked: { opacity: 0.72 },
  name: { color: colors.text, fontWeight: '700', textAlign: 'right' },
  note: { color: colors.accent, marginTop: 6, textAlign: 'right', fontSize: 12 },
  lock: { color: colors.warning, marginTop: 8, textAlign: 'right', fontSize: 12 },
});
