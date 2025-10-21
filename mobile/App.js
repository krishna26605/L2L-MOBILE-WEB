import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import AuthScreen from './src/screens/AuthScreen';
import DonorDashboardScreen from './src/screens/DonorDashboardScreen';
import NGODashboardScreen from './src/screens/NGODashboardScreen';

const Stack = createNativeStackNavigator();


export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <Stack.Navigator initialRouteName="Auth" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Auth" component={AuthScreen} />
            <Stack.Screen name="DonorDashboard" component={DonorDashboardScreen} />
            <Stack.Screen name="NGODashboard" component={NGODashboardScreen} />
          </Stack.Navigator>
        </SafeAreaView>
      </NavigationContainer>
    </AuthProvider>
  );
}
