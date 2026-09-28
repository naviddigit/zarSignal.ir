import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export type RadialItem = {
  id: string;
  label: string;
  onPress: () => void;
};

const layout = [
  { id: 'capillary', top: 0, left: 108 },
  { id: 'markets', top: 52, left: 188 },
  { id: 'calculator', top: 52, left: 28 },
  { id: 'history', top: 118, left: 168 },
  { id: 'account', top: 118, left: 48 },
] as const;

export function RadialMenu({ items }: { items: RadialItem[] }) {
  return (
    <View style={styles.wrap} accessibilityRole="menu" accessibilityLabel="منوی گرد زرسیگنال">
      <View style={styles.ring} />
      <View style={styles.core}>
        <Text style={styles.coreTitle}>حباب</Text>
        <Text style={styles.coreSub}>شفافیت</Text>
      </View>
      {layout.map(slot => {
        const item = items.find(entry => entry.id === slot.id);
        if (!item) return null;
        return (
          <Pressable
            key={slot.id}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            onPress={item.onPress}
            style={[styles.item, { top: slot.top, left: slot.left }]}
          >
            <Text style={styles.itemText}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 280, height: 200, alignSelf: 'center', marginTop: 8 },
  ring: {
    position: 'absolute',
    top: 28,
    left: 55,
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1,
    borderColor: colors.accentSoft,
  },
  core: {
    position: 'absolute',
    top: 68,
    left: 95,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coreTitle: { color: colors.accent, fontWeight: '800', fontSize: 15 },
  coreSub: { color: colors.muted, fontSize: 11, marginTop: 2 },
  item: {
    position: 'absolute',
    minWidth: 72,
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: { color: colors.text, fontSize: 11, fontWeight: '700' },
});
