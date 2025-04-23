import React from 'react';
import { View, StyleSheet } from 'react-native';
import TodaysOffers from '../component/customer/profile/todaysOffers';

export default function TodaysOffersScreen() {
  return (
    <View style={styles.container}>
      <TodaysOffers />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});