import React from 'react';
import { View, StyleSheet } from 'react-native';
import Cart from '../component/customer/cart/Cart'; // Import the Cart component

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