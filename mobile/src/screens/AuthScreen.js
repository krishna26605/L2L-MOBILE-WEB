// C:\Users\Krishna\OneDrive\Desktop\L2L-Mobile-app\mobile\src\screens\AuthScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function AuthScreen({ navigation }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Clear form when screen comes into focus (after logout)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setError('');
      setEmail('');
      setPassword('');
      setSubmitting(false);
    });

    return unsubscribe;
  }, [navigation]);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const data = await signIn(email.trim(), password);
      const destination = data?.user?.role === 'ngo' ? 'NGODashboard' : 'DonorDashboard';
      navigation.reset({ index: 0, routes: [{ name: destination }] });
    } catch (e) {
      setError(e?.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 24, fontWeight: '700', marginBottom: 12, textAlign: 'center' }}>ZeroWaste DineMap</Text>
      <Text style={{ fontSize: 16, color: '#555', marginBottom: 24, textAlign: 'center' }}>Sign in to continue</Text>

      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={{ 
          borderWidth: 1, 
          borderColor: error ? '#ef4444' : '#ddd', 
          padding: 12, 
          borderRadius: 8, 
          marginBottom: 12,
          backgroundColor: '#fafafa'
        }}
        editable={!submitting}
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{ 
          borderWidth: 1, 
          borderColor: error ? '#ef4444' : '#ddd', 
          padding: 12, 
          borderRadius: 8, 
          marginBottom: 16,
          backgroundColor: '#fafafa'
        }}
        editable={!submitting}
      />

      {error ? (
        <View style={{ backgroundColor: '#fef2f2', padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: '#fecaca' }}>
          <Text style={{ color: '#dc2626', textAlign: 'center', fontSize: 14 }}>{error}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        onPress={handleLogin}
        disabled={submitting}
        style={{ 
          backgroundColor: submitting ? '#9ca3af' : '#16a34a', 
          padding: 14, 
          borderRadius: 10, 
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3
        }}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Sign In</Text>
        )}
      </TouchableOpacity>

      {/* Help text */}
      <Text style={{ 
        textAlign: 'center', 
        color: '#6b7280', 
        fontSize: 12, 
        marginTop: 24,
        lineHeight: 16 
      }}>
        Enter your email and password to access your dashboard
      </Text>
    </View>
  );
}