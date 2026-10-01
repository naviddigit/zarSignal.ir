import { Tabs } from 'expo-router';
import { SiteTabBar } from '../../src/components/SiteTabBar';
import { colors } from '../../src/theme';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <SiteTabBar {...(props as object as Parameters<typeof SiteTabBar>[0])} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'خانه' }} />
      <Tabs.Screen name="markets" options={{ title: 'قیمت‌ها' }} />
      <Tabs.Screen name="calculator" options={{ title: 'ماشین حساب' }} />
      <Tabs.Screen name="capillary" options={{ title: 'تحلیل' }} />
      <Tabs.Screen name="more" options={{ title: 'اشتراک' }} />
    </Tabs>
  );
}
