import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import {
  createBottomTabNavigator,
  BottomTabScreenProps,
} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';

// 일기 흐름 화면들
import HomeScreen from '../screens/HomeScreen';
import MidDiaryScreen from '../screens/MidDiaryScreen';
import FinalDiaryScreen from '../screens/FinalDiaryScreen';
import DetailScreen from '../screens/DetailScreen';

// 탭 화면들
import DiaryListScreen from '../screens/DiaryListScreen';
import DateDetailScreen from '../screens/DateDetailScreen';
import ReportScreen from '../screens/ReportScreen';
import SettingsScreen from '../screens/SettingsScreen';

// 인증 화면들
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';

// 인증 컨텍스트
import { useAuth } from '../contexts/AuthContext';

import ProfileEditScreen from '../screens/ProfileEditScreen';

import FontSizeScreen from '../screens/FontSizeScreen';

import GrandchildPhotoScreen from '../screens/GrandchildPhotoScreen';

/**
 * ─────────────────────────────────────────────
 *  1) 인증 Stack
 * ─────────────────────────────────────────────
 */
export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
};

export type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, 'Login'>;
export type SignUpScreenProps = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

const AuthStack = createNativeStackNavigator<AuthStackParamList>();

const AuthStackNavigator: React.FC = () => {
  return (
    <AuthStack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FAF8F5' },
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
    </AuthStack.Navigator>
  );
};

/**
 * ─────────────────────────────────────────────
 *  2) 일기 흐름 Stack
 * ─────────────────────────────────────────────
 */
export type DiaryStackParamList = {
  Home: undefined;
  MidDiary: undefined;
  FinalDiary: undefined;
  Detail: { entryId: string };
};

export type HomeScreenProps = NativeStackScreenProps<DiaryStackParamList, 'Home'>;
export type MidDiaryScreenProps = NativeStackScreenProps<DiaryStackParamList, 'MidDiary'>;
export type FinalDiaryScreenProps = NativeStackScreenProps<DiaryStackParamList, 'FinalDiary'>;
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
      <DiaryStack.Screen
        name="FinalDiary"
        component={FinalDiaryScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <DiaryStack.Screen name="Detail" component={DetailScreen} />
    </DiaryStack.Navigator>
  );
};

/**
 * ─────────────────────────────────────────────
 *  2-1) 일기 목록 탭 안의 Stack (캘린더 → 날짜별 상세)
 * ─────────────────────────────────────────────
 */
export type DiaryListStackParamList = {
  DiaryListMain: undefined;
  DateDetail: { date: string };
};

export type DiaryListMainScreenProps = NativeStackScreenProps<DiaryListStackParamList, 'DiaryListMain'>;
export type DateDetailScreenProps = NativeStackScreenProps<DiaryListStackParamList, 'DateDetail'>;

const DiaryListStack = createNativeStackNavigator<DiaryListStackParamList>();

const DiaryListStackNavigator = () => {
  return (
    <DiaryListStack.Navigator
      initialRouteName="DiaryListMain"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FAF8F5' },
      }}
    >
      <DiaryListStack.Screen name="DiaryListMain" component={DiaryListScreen} />
      <DiaryListStack.Screen name="DateDetail" component={DateDetailScreen} />
    </DiaryListStack.Navigator>
  );
};

/**
 * ─────────────────────────────────────────────
 *  2-2) 설정 탭 안의 Stack (Settings → ProfileEdit)
 * ─────────────────────────────────────────────
 */
export type SettingsStackParamList = {
  SettingsMain: undefined;
  ProfileEdit: undefined;
  FontSize: undefined;
  GrandchildPhoto: undefined;
};

export type ProfileEditScreenProps = NativeStackScreenProps<SettingsStackParamList, 'ProfileEdit'>;
export type FontSizeScreenProps = NativeStackScreenProps<SettingsStackParamList, 'FontSize'>;
export type GrandchildPhotoScreenProps = NativeStackScreenProps<SettingsStackParamList, 'GrandchildPhoto'>;

const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

const SettingsStackNavigator = () => {
  return (
    <SettingsStack.Navigator
      initialRouteName="SettingsMain"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FAF8F5' },
      }}
    >
      <SettingsStack.Screen name="SettingsMain" component={SettingsScreen} />
      <SettingsStack.Screen name="ProfileEdit" component={ProfileEditScreen} />
      <SettingsStack.Screen name="FontSize" component={FontSizeScreen} />
      <SettingsStack.Screen name="GrandchildPhoto" component={GrandchildPhotoScreen} />
    </SettingsStack.Navigator>
  );
};

/**
 * ─────────────────────────────────────────────
 *  3) 메인 하단 탭 (4개)
 * ─────────────────────────────────────────────
 */
export type RootTabParamList = {
  Home: undefined;
  DiaryList: undefined;
  Report: undefined;
  Settings: undefined;
};

export type ReportScreenProps = BottomTabScreenProps<RootTabParamList, 'Report'>;
export type SettingsScreenProps = BottomTabScreenProps<RootTabParamList, 'Settings'>;

const Tab = createBottomTabNavigator<RootTabParamList>();

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#2C2A28',
        tabBarInactiveTintColor: '#A09B95',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#EFEAE3',
          height: 90,
          paddingTop: 18,
          paddingBottom: 22,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={DiaryStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="home-outline" size={28} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="DiaryList"
        component={DiaryListStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="book-outline" size={28} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Report"
        component={ReportScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="stats-chart-outline" size={28} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

/**
 * ─────────────────────────────────────────────
 *  4) 진입점
 * ─────────────────────────────────────────────
 */
const AppNavigator = () => {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FAF8F5',
        }}
      >
        <ActivityIndicator size="large" color="#2C2A28" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isLoggedIn ? <MainTabNavigator /> : <AuthStackNavigator />}
    </NavigationContainer>
  );
};

export default AppNavigator;