import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import UserManagement from '../component/admin/userManagement';
import { Stack } from 'expo-router';

const UsersPage = () => {
  return (
    <GestureHandlerRootView style={styles.container}>
      <Stack.Screen 
        options={{
          // Hide the Stack header
          headerShown: false,
        }}
      />
      {/* Keep the component's internal header */}
      <UserManagement />
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
});

export default UsersPage;