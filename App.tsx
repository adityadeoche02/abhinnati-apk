import React, { useEffect } from 'react';
import { StatusBar, StyleSheet, LogBox } from 'react-native';
LogBox.ignoreAllLogs();
import './src/i18n';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';

import RootNavigator from './src/navigation/RootNavigator';
import { theme } from './src/constants/theme';
import { useNetworkStore } from './src/store/useNetworkStore';
import { retryFailedRequests } from './src/api/client';
import { OfflineScreen } from './src/features/feed/OfflineScreen';

// Initialize TanStack Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  const { isOnline, setOnline } = useNetworkStore();

  useEffect(() => {
    // Use NetInfo for accurate device network state (not backend ping)
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = !!(state.isConnected && state.isInternetReachable !== false);
      const previousOnline = useNetworkStore.getState().isOnline;
      if (connected !== previousOnline) {
        setOnline(connected);
        if (connected) {
          retryFailedRequests();
        }
      }
    });

    // Fetch initial state immediately
    NetInfo.fetch().then((state) => {
      const connected = !!(state.isConnected && state.isInternetReachable !== false);
      setOnline(connected);
    });

    return () => unsubscribe();
  }, [setOnline]);

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <NavigationContainer>
            <StatusBar barStyle="dark-content" backgroundColor={theme.colors.cream} translucent={false} />
            <RootNavigator />
            {!isOnline && <OfflineScreen />}
          </NavigationContainer>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
