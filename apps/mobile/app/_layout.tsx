import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { I18nManager } from 'react-native';
import { colors } from '../src/theme';

if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.accent,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="capillary" options={{ title: 'تحلیل مویرگی' }} />
        <Stack.Screen name="markets" options={{ title: 'تابلوی قیمت‌ها' }} />
        <Stack.Screen name="calculator" options={{ title: 'ماشین‌حساب' }} />
        <Stack.Screen name="history" options={{ title: 'تاریخچه تحلیل' }} />
        <Stack.Screen name="account" options={{ title: 'حساب من' }} />
      </Stack>
    </>
  );
}
