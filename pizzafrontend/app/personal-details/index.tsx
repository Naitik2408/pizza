import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PersonalDetails } from '@/components/common';

export default function PersonalDetailsScreen() {
  return (
    <View style={styles.container}>
      <PersonalDetails />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});