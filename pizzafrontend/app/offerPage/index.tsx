import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { OfferManagement } from '@/components/features/admin';
import { Stack } from 'expo-router';

const OffersPage = () => {
  return (
    <GestureHandlerRootView style={styles.container}>
      <Stack.Screen 
        options={{
          headerShown: false,
        }}
      />
      <OfferManagement />
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
});

export default OffersPage;