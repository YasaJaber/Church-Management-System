import React, { createContext, useContext, useReducer, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authAPI } from "../services/api";

// Initial state
const initialState = {
  isLoading: true,
  isAuthenticated: false,
  user: null,
  token: null,
  error: null,
};

// Actions
const AuthActions = {
  LOADING: "LOADING",
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGIN_FAILURE: "LOGIN_FAILURE",
  LOGOUT: "LOGOUT",
  RESTORE_TOKEN: "RESTORE_TOKEN",
  CLEAR_ERROR: "CLEAR_ERROR",
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AuthActions.LOADING:
      return {
        ...state,
        isLoading: true,
        error: null,
      };

    case AuthActions.LOGIN_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        error: null,
      };

    case AuthActions.LOGIN_FAILURE:
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        token: null,
        error: action.payload.error,
      };

    case AuthActions.LOGOUT:
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        token: null,
        error: null,
      };

    case AuthActions.RESTORE_TOKEN:
      return {
        ...state,
        isLoading: false,
        isAuthenticated: action.payload.token !== null,
        user: action.payload.user,
        token: action.payload.token,
      };

    case AuthActions.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Restore token on app start
  useEffect(() => {
    restoreToken();
  }, []);

  const restoreToken = async () => {
    try {
      console.log("🔄 AuthContext: Restoring token...");
      const token = await AsyncStorage.getItem("userToken");
      const userData = await AsyncStorage.getItem("userData");

      console.log("🔑 Stored token:", token ? "EXISTS" : "NOT_FOUND");
      console.log("👤 Stored userData:", userData ? "EXISTS" : "NOT_FOUND");

      if (token && userData) {
        const user = JSON.parse(userData);
        console.log("✅ Restoring user session:", user);
        dispatch({
          type: AuthActions.RESTORE_TOKEN,
          payload: { token, user },
        });
      } else {
        console.log("❌ No stored session found");
        dispatch({
          type: AuthActions.RESTORE_TOKEN,
          payload: { token: null, user: null },
        });
      }
    } catch (error) {
      console.error("❌ Error restoring token:", error);
      dispatch({
        type: AuthActions.RESTORE_TOKEN,
        payload: { token: null, user: null },
      });
    }
  };

  const login = async (username, password, rememberMe = false) => {
    try {
      console.log("🔐 AuthContext: Starting login process");
      console.log("👤 Username:", username);
      console.log("💾 Remember me:", rememberMe);

      dispatch({ type: AuthActions.LOADING });

      const response = await authAPI.login(username, password);
      console.log("🔐 AuthContext: API response:", response);

      if (!response.success) {
        throw new Error(response.error || "حدث خطأ في تسجيل الدخول");
      }

      const { user, token } = response.data;
      console.log("👤 User data:", user);
      console.log("🔑 Token received:", token ? "EXISTS" : "MISSING");

      if (rememberMe) {
        console.log("💾 Storing with remember me");
        await AsyncStorage.setItem("userToken", token);
        await AsyncStorage.setItem("userData", JSON.stringify(user));
        await AsyncStorage.setItem("rememberMe", "true");
      } else {
        console.log("💾 Storing temporarily");
        // Only store token temporarily
        await AsyncStorage.setItem("userToken", token);
        await AsyncStorage.setItem("userData", JSON.stringify(user));
        await AsyncStorage.removeItem("rememberMe");
      }

      console.log("✅ AuthContext: Login successful, dispatching success");
      dispatch({
        type: AuthActions.LOGIN_SUCCESS,
        payload: {
          user: user,
          token: token,
        },
      });

      return { success: true };
    } catch (error) {
      console.error("❌ AuthContext: Login error:", error);

      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "حدث خطأ في تسجيل الدخول";

      console.log("📢 Error message:", errorMessage);

      dispatch({
        type: AuthActions.LOGIN_FAILURE,
        payload: { error: errorMessage },
      });

      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem("userToken");
      await AsyncStorage.removeItem("userData");
      await AsyncStorage.removeItem("rememberMe");

      dispatch({ type: AuthActions.LOGOUT });
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  const clearError = () => {
    dispatch({ type: AuthActions.CLEAR_ERROR });
  };

  const verifyToken = async () => {
    try {
      const response = await authAPI.verify();
      return { success: true, user: response.user };
    } catch (error) {
      // Token is invalid, logout user
      await logout();
      return { success: false };
    }
  };

  const value = {
    ...state,
    login,
    logout,
    clearError,
    verifyToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
