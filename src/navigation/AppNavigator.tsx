import React, { useState } from 'react';
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

// 일기 흐름 화면들
import HomeScreen from '../screens/HomeScreen';
import MidDiaryScreen from '../screens/MidDiaryScreen';
import DetailScreen from '../screens/DetailScreen';

// 탭 화면들
import DiaryListScreen from '../screens/DiaryListScreen';
import ReportScreen from '../screens/ReportScreen';
import SettingsScreen from '../screens/SettingsScreen';

// 인증 화면들 (신규)
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';

/**
 * ─────────────────────────────────────────────
 *  1) 인증(로그인/회원가입) Stack
 * ─────────────────────────────────────────────
 */
export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
};

export type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, 'Login'>;
export type SignUpScreenProps = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

const AuthStack = createNativeStackNavigator<AuthStackParamList>();

type AuthStackNavigatorProps = {
  onLoginSuccess: () => void;
};

const AuthStackNavigator: React.FC<AuthStackNavigatorProps> = ({ onLoginSuccess }) => {
  return (
    <AuthStack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FAF8F5' },
      }}
    >
      <AuthStack.Screen name="Login">
        {props => <LoginScreen {...props} onLoginSuccess={onLoginSuccess} />}
      </AuthStack.Screen>
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
    </AuthStack.Navigator>
  );
};

/**
 * ─────────────────────────────────────────────
 *  2) 일기 흐름 Stack (홈 탭 안에 들어감)
 *     Home → MidDiary 모달 → Detail
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
 *  3) 메인 하단 탭 (4개) — 로그인 후 진입
 * ─────────────────────────────────────────────
 */
export type RootTabParamList = {
  Home: undefined;
  DiaryList: undefined;
  Report: undefined;
  Settings: undefined;
};

export type DiaryListScreenProps = BottomTabScreenProps<RootTabParamList, 'DiaryList'>;
export type ReportScreenProps = BottomTabScreenProps<RootTabParamList, 'Report'>;
export type SettingsScreenProps = BottomTabScreenProps<RootTabParamList, 'Settings'>;

const Tab = createBottomTabNavigator<RootTabParamList>();

const MainTabNavigator = () => {
  return (
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
  );
};

/**
 * ─────────────────────────────────────────────
 *  4) 진입점: 로그인 여부에 따라 분기
 * ─────────────────────────────────────────────
 */
const AppNavigator = () => {
  // ⚠️ 임시 가짜 상태 (UI 작업용). 나중에 AsyncStorage/Context로 교체 예정.
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLoginSuccess = () => setIsLoggedIn(true);

  return (
    <NavigationContainer>
      {isLoggedIn ? (
        <MainTabNavigator />
      ) : (
        <AuthStackNavigator onLoginSuccess={handleLoginSuccess} />
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;