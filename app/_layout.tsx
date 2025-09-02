import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import CommissionService from './services/commissionService';

export default function UserAppLayout() {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        CommissionService.refreshAllEngineerSummaries().catch(console.error);
      }
    });

    const interval = setInterval(() => {
      CommissionService.refreshAllEngineerSummaries().catch(console.error);
    }, 5 * 60 * 1000);

    CommissionService.refreshAllEngineerSummaries().catch(console.error);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, []);
  
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}