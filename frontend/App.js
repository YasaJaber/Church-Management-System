import React from "react";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/context/AuthContext";
import AppNavigator from "./src/components/AppNavigator";
import { View, Text, Alert } from "react-native";

// Enhanced Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    console.error('ErrorBoundary caught error:', error);
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error Details:', {
      message: error?.message || 'Unknown error',
      stack: error?.stack || 'No stack trace',
      componentStack: errorInfo?.componentStack || 'No component stack'
    });
    
    this.setState({ errorInfo: error?.message || 'Unknown error' });
    
    // Show alert in development
    if (__DEV__) {
      Alert.alert(
        'خطأ في التطبيق', 
        error?.message || 'Unknown error',
        [{ text: 'موافق' }]
      );
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center', 
          padding: 20,
          backgroundColor: '#ffffff'
        }}>
          <Text style={{ 
            fontSize: 18, 
            fontWeight: 'bold', 
            marginBottom: 10,
            textAlign: 'center',
            color: '#d32f2f'
          }}>
            حدث خطأ في التطبيق
          </Text>
          <Text style={{ 
            textAlign: 'center', 
            marginBottom: 20,
            fontSize: 16
          }}>
            يرجى إعادة تشغيل التطبيق
          </Text>
          {this.state.errorInfo && (
            <Text style={{ 
              textAlign: 'center', 
              fontSize: 12,
              color: '#666',
              marginTop: 10
            }}>
              {this.state.errorInfo}
            </Text>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <StatusBar style="auto" />
        <AppNavigator />
      </AuthProvider>
    </ErrorBoundary>
  );
}
