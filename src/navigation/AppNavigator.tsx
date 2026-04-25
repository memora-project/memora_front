import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import HomeScreen from '../screens/HomeScreen';
import MidDiaryScreen from '../screens/MidDiaryScreen';
import DetailScreen from '../screens/DetailScreen';

export type DiaryEntry = {
  id: string;
  date: string;
  mood?: { emoji: string; label: string };
  photoUri?: string;
  content: string;
};

export type RootStackParamList = {
  Home: undefined;
  MidDiary: undefined;
  Detail: { entry: DiaryEntry };
};

export type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;
export type MidDiaryScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'MidDiary'
>;
export type DetailScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'Detail'
>;

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#FAF8F5' },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen
          name="MidDiary"
          component={MidDiaryScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="Detail" component={DetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
