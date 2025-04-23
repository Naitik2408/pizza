import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Unauthorized = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Unauthorized</Text>
      <Text>You do not have permission to access this page.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
});

export default Unauthorized;