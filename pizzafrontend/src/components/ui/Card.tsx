import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { COLORS, SIZES, FONT_WEIGHTS, SHADOWS } from '../../constants';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  shadow?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  shadow = true,
}) => {
  const Component = onPress ? TouchableOpacity : View;
  
  return (
    <Component
      style={[
        styles.card,
        shadow && styles.shadow,
        style,
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
    >
      {children}
    </Component>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.borderRadius.xl,
    padding: SIZES.padding.md,
  },
  shadow: {
    ...SHADOWS.md,
  },
});
