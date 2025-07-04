import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Cart } from '@/components/features/cart'; // Import the Cart component

const CartScreen = () => {
  return (
    <View style={styles.container}>
      <Cart />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default CartScreen;