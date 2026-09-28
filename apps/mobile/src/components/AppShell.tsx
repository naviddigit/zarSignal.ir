import type { ReactNode } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { colors, layout } from '../theme';

export function AppShell({ children, noTabPad = false }: { children: ReactNode; noTabPad?: boolean }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.phone, !noTabPad && styles.tabPad]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#07090d',
  },
  phone: {
    flex: 1,
    width: '100%',
    maxWidth: layout.phoneMax,
    alignSelf: 'center',
    backgroundColor: colors.bg,
  },
  tabPad: {
    paddingBottom: layout.tabBarHeight,
  },
});
