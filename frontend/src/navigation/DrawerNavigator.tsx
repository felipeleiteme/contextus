import React from 'react';
import { createDrawerNavigator, DrawerContentComponentProps } from '@react-navigation/drawer';
import { ChatScreen } from '../screens/ChatScreen';
import { ConversationHistoryDrawerContent } from '../components/ConversationHistoryDrawerContent';

export type MainDrawerParamList = {
  Chat: undefined;
};

const Drawer = createDrawerNavigator<MainDrawerParamList>();

export const DrawerNavigator: React.FC = () => {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        overlayColor: 'rgba(0,0,0,0.2)',
      }}
      drawerContent={(props: DrawerContentComponentProps) => (
        <ConversationHistoryDrawerContent {...props} />
      )}
    >
      <Drawer.Screen name="Chat" component={ChatScreen} />
    </Drawer.Navigator>
  );
};
