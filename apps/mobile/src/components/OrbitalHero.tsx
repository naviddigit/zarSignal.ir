import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

type Props = {
  focusLabel: string;
  statusLabel: string;
  percentLabel?: string;
};

export function OrbitalHero({ focusLabel, statusLabel, percentLabel }: Props) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 18000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.wrap} accessibilityLabel={`رادار ${focusLabel}`}>
      <View style={styles.glow} />
      <View style={styles.orbitA} />
      <View style={styles.orbitB} />
      <Animated.View style={[styles.sweep, { transform: [{ rotate }] }]} />
      <View style={styles.center}>
        <Text style={styles.eyebrow}>{focusLabel}</Text>
        <Text style={styles.status}>{statusLabel}</Text>
        {percentLabel ? <Text style={styles.percent}>{percentLabel}</Text> : null}
        <Text style={styles.hint}>شاهد حباب · نه سیگنال معامله</Text>
      </View>
      <View style={[styles.token, styles.tokenGold]}><Text style={styles.tokenText}>Au</Text></View>
      <View style={[styles.token, styles.tokenUsd]}><Text style={styles.tokenText}>$</Text></View>
      <View style={[styles.token, styles.tokenAg]}><Text style={styles.tokenText}>Ag</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 280,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(231,196,121,0.08)',
  },
  orbitA: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 1,
    borderColor: 'rgba(231,196,121,0.22)',
  },
  orbitB: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: 'rgba(231,196,121,0.12)',
  },
  sweep: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    borderTopWidth: 2,
    borderColor: colors.accent,
    opacity: 0.55,
  },
  center: {
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  eyebrow: { color: colors.muted, fontSize: 11, marginBottom: 4 },
  status: { color: colors.text, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  percent: { color: colors.accent, fontSize: 22, fontWeight: '800', marginTop: 6 },
  hint: { color: colors.muted, fontSize: 10, marginTop: 8, textAlign: 'center' },
  token: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenGold: { top: 18, right: 36 },
  tokenUsd: { bottom: 28, left: 40 },
  tokenAg: { top: 40, left: 28, opacity: 0.45 },
  tokenText: { color: colors.accent, fontWeight: '800', fontSize: 12 },
});
