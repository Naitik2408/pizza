import React from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { COLORS, SIZES, FONT_WEIGHTS } from '../../constants';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  containerStyle?: ViewStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  containerStyle,
  leftIcon,
  rightIcon,
  style,
  ...props
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View style={[styles.inputContainer, error && styles.inputError]}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        
        <TextInput
          style={[
            styles.input,
            leftIcon ? styles.inputWithLeftIcon : null,
            rightIcon ? styles.inputWithRightIcon : null,
            style,
          ]}
          placeholderTextColor={COLORS.text.disabled}
          {...props}
        />
        
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>
      
      {(error || helperText) && (
        <Text style={[styles.helperText, error && styles.errorText]}>
          {error || helperText}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SIZES.margin.md,
  },
  label: {
    fontSize: SIZES.fontSize.md,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text.primary,
    marginBottom: SIZES.margin.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.borderRadius.lg,
    backgroundColor: COLORS.white,
    minHeight: 48,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  input: {
    flex: 1,
    fontSize: SIZES.fontSize.md,
    color: COLORS.text.primary,
    paddingHorizontal: SIZES.padding.lg,
    paddingVertical: SIZES.padding.md,
  },
  inputWithLeftIcon: {
    paddingLeft: SIZES.padding.sm,
  },
  inputWithRightIcon: {
    paddingRight: SIZES.padding.sm,
  },
  leftIcon: {
    paddingLeft: SIZES.padding.lg,
  },
  rightIcon: {
    paddingRight: SIZES.padding.lg,
  },
  helperText: {
    fontSize: SIZES.fontSize.sm,
    color: COLORS.text.secondary,
    marginTop: SIZES.margin.xs,
    marginLeft: SIZES.margin.xs,
  },
  errorText: {
    color: COLORS.error,
  },
});
