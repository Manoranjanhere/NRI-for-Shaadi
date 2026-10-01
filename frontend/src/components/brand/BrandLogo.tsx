import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Colors } from '../../theme';

const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: undefined });

interface RingsProps {
  size: number;
}

/** Two interlocked gold wedding rings with a diamond — the NRI Shaadi mark. */
export function BrandRings({ size }: RingsProps) {
  const ring = size * 0.62;
  const stroke = Math.max(2, Math.round(size * 0.075));
  const diamond = size * 0.16;
  return (
    <View style={{ width: size, height: size * 0.8 }}>
      <View
        style={[
          styles.ring,
          { width: ring, height: ring, borderRadius: ring / 2, borderWidth: stroke, left: 0, top: size * 0.16, borderColor: Colors.secondaryLight },
        ]}
      />
      <View
        style={[
          styles.ring,
          { width: ring, height: ring, borderRadius: ring / 2, borderWidth: stroke, right: 0, top: size * 0.16, borderColor: Colors.secondary },
        ]}
      />
      <View
        style={[
          styles.diamond,
          { width: diamond, height: diamond, right: ring / 2 - diamond / 2, top: size * 0.16 - diamond * 0.55, borderWidth: Math.max(1, stroke / 2.5) },
        ]}
      />
    </View>
  );
}

interface Props {
  /** `stacked` for splash/welcome, `inline` for headers. */
  variant?: 'stacked' | 'inline';
  size?: number;
  tagline?: string;
}

export default function BrandLogo({ variant = 'inline', size, tagline }: Props) {
  if (variant === 'stacked') {
    const s = size ?? 96;
    return (
      <View style={styles.stacked}>
        <BrandRings size={s} />
        <Text style={[styles.nri, { fontSize: s * 0.5 }]}>
          NRI <Text style={styles.shaadi}>Shaadi</Text>
        </Text>
        {tagline ? <Text style={styles.tagline}>{tagline}</Text> : null}
      </View>
    );
  }
  const s = size ?? 34;
  return (
    <View style={styles.inline}>
      <BrandRings size={s} />
      <Text style={[styles.nri, { fontSize: s * 0.62, marginTop: 0 }]}>
        NRI <Text style={styles.shaadi}>Shaadi</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { position: 'absolute' },
  diamond: {
    position: 'absolute',
    backgroundColor: '#EAF5FF',
    borderColor: Colors.secondary,
    transform: [{ rotate: '45deg' }],
  },
  stacked: { alignItems: 'center' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nri: {
    color: Colors.textPrimary,
    fontFamily: SERIF,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 12,
  },
  shaadi: { color: Colors.secondary, fontStyle: 'italic' },
  tagline: {
    color: Colors.secondaryLight,
    fontFamily: SERIF,
    fontSize: 15,
    marginTop: 6,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
