import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// أبسط تطبيق ممكن للاختبار
export default function SimpleApp() {
  console.log('SimpleApp component rendered!');
  
  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.title}>🏛️ كنيسة مار جرجس</Text>
      <Text style={styles.subtitle}>نظام إدارة الكنيسة</Text>
      <Text style={styles.version}>إصدار تجريبي - v1.0.0</Text>
      <Text style={styles.status}>✅ التطبيق يعمل بنجاح!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  version: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  status: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
});
