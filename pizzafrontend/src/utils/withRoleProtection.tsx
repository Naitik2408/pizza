import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

const withRoleProtection = (WrappedComponent: React.ComponentType, allowedRoles: string[]) => {
  return (props: any) => {
    const router = useRouter();
    const { role } = useSelector((state: RootState) => state.auth);

    useEffect(() => {
      if (role && !allowedRoles.includes(role)) {
        router.replace('/unauthorized'); // Navigate to unauthorized page
      }
    }, [role, allowedRoles, router]);

    if (!role) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#FF6B00" />
        </View>
      );
    }

    if (!allowedRoles.includes(role)) {
      // Render nothing while navigating to unauthorized
      return null;
    }

    return <WrappedComponent {...props} />;
  };
};

export default withRoleProtection;