import { View, Pressable, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, layout } from '../theme';

const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home-outline',
  markets: 'storefront-outline',
  calculator: 'calculator-outline',
  capillary: 'analytics-outline',
  more: 'grid-outline',
};

const iconsActive: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home',
  markets: 'storefront',
  calculator: 'calculator',
  capillary: 'analytics',
  more: 'grid',
};

export function SiteTabBar(props: {
  state: { index: number; routes: Array<{ key: string; name: string; params?: object }> };
  descriptors: Record<string, { options: { title?: string } }>;
  navigation: { emit: (event: never) => { defaultPrevented: boolean }; navigate: (name: string, params?: object) => void };
}) {
  const { state, descriptors, navigation } = props;
  return (
    <View style={[styles.wrap, { pointerEvents: 'box-none' }]}>
      <View style={styles.inner}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = typeof options.title === 'string' ? options.title : route.name;
          const focused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            } as never);
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          };
          const icon = focused ? iconsActive[route.name] ?? 'ellipse' : icons[route.name] ?? 'ellipse-outline';
          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              onPress={onPress}
              style={[styles.item, focused && styles.itemActive]}
            >
              <Ionicons name={icon} size={20} color={focused ? colors.accent : colors.muted} />
              <Text style={[styles.label, focused && styles.labelActive]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: Platform.OS === 'ios' ? 18 : 8,
    zIndex: 40,
  },
  inner: {
    width: '100%',
    maxWidth: layout.phoneMax,
    minHeight: 62,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 6,
    borderRadius: 22,
    backgroundColor: 'rgba(18,24,32,0.94)',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  item: {
    flex: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: 16,
    paddingVertical: 6,
  },
  itemActive: {
    backgroundColor: colors.accentSoft,
  },
  label: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  labelActive: {
    color: colors.accent,
  },
});
