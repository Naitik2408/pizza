import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { COLORS, SIZES, FONT_WEIGHTS, SHADOWS } from '../../../constants';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: SIZES.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      ...SHADOWS.sm,
    };

    // Size styles
    switch (size) {
      case 'small':
        baseStyle.paddingVertical = SIZES.padding.sm;
        baseStyle.paddingHorizontal = SIZES.padding.md;
        break;
      case 'large':
        baseStyle.paddingVertical = SIZES.padding.lg;
        baseStyle.paddingHorizontal = SIZES.padding.xl;
        break;
      default: // medium
        baseStyle.paddingVertical = SIZES.padding.md;
        baseStyle.paddingHorizontal = SIZES.padding.lg;
    }

    // Variant styles
    switch (variant) {
      case 'secondary':
        baseStyle.backgroundColor = COLORS.gray[100];
        break;
      case 'outline':
        baseStyle.backgroundColor = 'transparent';
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = COLORS.primary;
        break;
      case 'ghost':
        baseStyle.backgroundColor = 'transparent';
        baseStyle.shadowOpacity = 0;
        baseStyle.elevation = 0;
        break;
      default: // primary
        baseStyle.backgroundColor = COLORS.primary;
    }

    // Disabled state
    if (disabled || loading) {
      baseStyle.opacity = 0.6;
    }

    // Full width
    if (fullWidth) {
      baseStyle.width = '100%';
    }

    return baseStyle;
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontWeight: FONT_WEIGHTS.medium,
    };

    // Size styles
    switch (size) {
      case 'small':
        baseStyle.fontSize = SIZES.fontSize.sm;
        break;
      case 'large':
        baseStyle.fontSize = SIZES.fontSize.lg;
        break;
      default: // medium
        baseStyle.fontSize = SIZES.fontSize.md;
    }

    // Variant styles
    switch (variant) {
      case 'secondary':
        baseStyle.color = COLORS.text.primary;
        break;
      case 'outline':
        baseStyle.color = COLORS.primary;
        break;
      case 'ghost':
        baseStyle.color = COLORS.primary;
        break;
      default: // primary
        baseStyle.color = COLORS.white;
    }

    return baseStyle;
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? COLORS.white : COLORS.primary}
        />
      ) : (
        <Text style={[getTextStyle(), textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};
