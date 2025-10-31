import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { VoiceScreen } from '../screens/VoiceScreen';
import { KBFSetupScreen } from '../screens/KBFSetupScreen';
import { ActivityIndicator, View } from 'react-native';

const STORAGE_KEY_HAS_CONFIGURED = '@contextus:has_configured';

const Stack = createNativeStackNavigator();

export const AppNavigator: React.FC = () => {
  const { session, loading: authLoading } = useAuth();
  const [hasConfigured, setHasConfigured] = useState<boolean | null>(null);
  const [isCheckingConfig, setIsCheckingConfig] = useState(true);

  // Check if user has completed first-run setup
  useEffect(() => {
    const checkFirstRunStatus = async () => {
      try {
        if (session) {
          // Usuário está autenticado - verifica configuração
          const configured = await AsyncStorage.getItem(STORAGE_KEY_HAS_CONFIGURED);
          const isConfigured = configured === 'true';
          console.log('AppNavigator: Checking configuration...', {
            hasConfigured: isConfigured,
            userId: session.user.id
          });
          setHasConfigured(isConfigured);
        } else {
          // Usuário não está autenticado - reseta estado
          console.log('AppNavigator: User logged out, resetting state');
          setHasConfigured(null);
        }
      } catch (error) {
        console.error('Error checking first-run status:', error);
        setHasConfigured(false);
      } finally {
        setIsCheckingConfig(false);
      }
    };

    // Reset checking state when session changes
    setIsCheckingConfig(true);

    // Only check after auth is loaded
    if (!authLoading) {
      checkFirstRunStatus();
    }
  }, [authLoading, session]);

  // Show loading while checking auth or configuration
  if (authLoading || isCheckingConfig) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {session ? (
          // User is authenticated
          <>
            {hasConfigured === false ? (
              // First time user - show setup screen first
              <>
                <Stack.Screen name="KBFSetup" component={KBFSetupScreen} />
                <Stack.Screen name="Voice" component={VoiceScreen} />
              </>
            ) : (
              // Returning user - show main screen first
              <>
                <Stack.Screen name="Voice" component={VoiceScreen} />
                <Stack.Screen name="KBFSetup" component={KBFSetupScreen} />
              </>
            )}
          </>
        ) : (
          // User is not authenticated: Show auth screens
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
