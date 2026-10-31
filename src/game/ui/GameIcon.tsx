import React from 'react';
import { Image, Platform, StyleSheet, Text, View, type ImageStyle, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { ICON_SOURCES, type IconName } from './iconRegistry';

type Props = {
  name: IconName;
  size?: number;
  style?: StyleProp<ImageStyle>;
};

/** Ícone pixel-art do jogo (substitui todos os emojis). Sempre quadrado. */
export function GameIcon({ name, size = 16, style }: Props) {
  return (
    <Image
      source={ICON_SOURCES[name]}
      style={[{ width: size, height: size }, Platform.OS === 'web' ? (WEB_PIXELATED as ImageStyle) : null, style]}
      resizeMode="contain"
      fadeDuration={0}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}

const WEB_PIXELATED = StyleSheet.create({ p: { imageRendering: 'pixelated' } as unknown as ImageStyle }).p;

type LabelProps = {
  icon: IconName;
  size?: number;
  gap?: number;
  /** estilo do texto */
  textStyle?: StyleProp<TextStyle>;
  /** estilo do contêiner (linha) */
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  numberOfLines?: number;
};

/** Ícone + texto lado a lado. */
export function IconLabel({ icon, size = 14, gap = 5, textStyle, style, children, numberOfLines }: LabelProps) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>
      <GameIcon name={icon} size={size} />
      {children !== undefined && children !== null && children !== '' ? (
        <Text style={textStyle} numberOfLines={numberOfLines}>
          {children}
        </Text>
      ) : null}
    </View>
  );
}
