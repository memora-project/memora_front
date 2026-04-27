import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import {
  createBottomTabNavigator,
  BottomTabScreenProps,
} from '@react-navigation/bottom-tabs';

// 기존 화면들
import HomeScreen from '../screens/HomeScreen';
import MidDiaryScreen from '../screens/MidDiaryScreen';
import DetailScreen from '../screens/DetailScreen';

// 신규 빈 깡통 화면들
import DashboardScreen from '../screens/DashboardScreen';
import DiaryListScreen from '../screens/DiaryListScreen';
import ReportScreen from '../screens/ReportScreen';
import SettingsScreen from '../screens/SettingsScreen';

/**
 * ─────────────────────────────────────────────
 *  1) 일기 목록 탭 안의 Stack 정의
 *     (Home → MidDiary 모달 → Detail 흐름)
 * ─────────────────────────────────────────────
 */
export type DiaryStackParamList = {
  Home: undefined;
  MidDiary: undefined;
  Detail: { entryId: string };
};

export type HomeScreenProps = NativeStackScreenProps<DiaryStackParamList, 'Home'>;
export type MidDiaryScreenProps = NativeStackScreenProps<DiaryStackParamList, 'MidDiary'>;
export type DetailScreenProps = NativeStackScreenProps<DiaryStackParamList, 'Detail'>;

const DiaryStack = createNativeStackNavigator<DiaryStackParamList>();

const DiaryStackNavigator = () => {
  return (
    <DiaryStack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FAF8F5' },
      }}
    >
      <DiaryStack.Screen name="Home" component={HomeScreen} />
      <DiaryStack.Screen
        name="MidDiary"
        component={MidDiaryScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <DiaryStack.Screen name="Detail" component={DetailScreen} />
    </DiaryStack.Navigator>
  );
};

/**
 * ─────────────────────────────────────────────
 *  2) 하단 탭 정의 — 4개
 * ─────────────────────────────────────────────
 */
export type RootTabParamList = {
  Home: undefined;
  DiaryList: undefined;
  Report: undefined;
  Settings: undefined;
};

export type DashboardScreenProps = BottomTabScreenProps<RootTabParamList, 'Dashboard'>;
export type ReportScreenProps = BottomTabScreenProps<RootTabParamList, 'Report'>;
export type SettingsScreenProps = BottomTabScreenProps<RootTabParamList, 'Settings'>;

const Tab = createBottomTabNavigator<RootTabParamList>();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#2C2A28',
          tabBarInactiveTintColor: '#A09B95',
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopColor: '#EFEAE3',
            height: 64,
            paddingTop: 6,
            paddingBottom: 8,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
        }}
      >
        <Tab.Screen
          name="Home"
          component={DiaryStackNavigator}
          options={{
            tabBarLabel: '홈',
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 22, color }}>🏠</Text>
            ),
          }}
        />
        <Tab.Screen
          name="DiaryList"
          component={DiaryListScreen}
          options={{
            tabBarLabel: '일기 목록',
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 22, color }}>📖</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Report"
          component={ReportScreen}
          options={{
            tabBarLabel: '분석 리포트',
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 22, color }}>📊</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarLabel: '설정',
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 22, color }}>👤</Text>
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;