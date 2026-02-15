# RecipeStash Web Client - Authentication Integration Guide

## Overview

This guide shows how to integrate authentication (Login and Registration) with your RecipeStash backend API.

**Base URL:**
- Development: `http://localhost:3000/api` or `http://localhost:3001/api`
- Production: `https://recipestash-backend-production.up.railway.app/api`

---

## Table of Contents

1. [API Endpoints](#api-endpoints)
2. [Setup Instructions](#setup-instructions)
3. [API Service Implementation](#api-service-implementation)
4. [Authentication Service](#authentication-service)
5. [React Components](#react-components)
6. [Testing](#testing)
7. [Error Handling](#error-handling)

---

## API Endpoints

### 1. Register (Sign Up)

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Validation Rules:**
- `name`: 2-50 characters, required
- `email`: Valid email format, required, unique
- `password`: 6-100 characters, required

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "name": "John Doe",
      "email": "john@example.com",
      "lastLoginAt": null,
      "bio": null,
      "avatarUrl": null,
      "notificationsEnabled": true,
      "dietaryRestrictions": [],
      "measurementUnit": "metric",
      "privacyProfilePublic": true,
      "_id": "507f191e810c19729de860ea",
      "createdAt": "2026-02-10T07:00:00.000Z",
      "updatedAt": "2026-02-10T07:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Response (Error - Email Already Exists):**
```json
{
  "success": false,
  "message": "Email already exists"
}
```

---

### 2. Login

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "name": "John Doe",
      "email": "john@example.com",
      "lastLoginAt": "2026-02-10T07:00:00.000Z",
      "bio": "Food enthusiast",
      "avatarUrl": "https://...",
      "notificationsEnabled": true,
      "dietaryRestrictions": ["vegetarian"],
      "measurementUnit": "metric",
      "privacyProfilePublic": true,
      "_id": "507f191e810c19729de860ea",
      "createdAt": "2026-02-10T06:00:00.000Z",
      "updatedAt": "2026-02-10T07:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Response (Error - Invalid Credentials):**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

---

### 3. Validate Token

**Endpoint:** `POST /api/auth/validate`

**Request Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (Valid Token):**
```json
{
  "success": true,
  "valid": true,
  "data": {
    "user": {
      "name": "John Doe",
      "email": "john@example.com",
      "_id": "507f191e810c19729de860ea"
    }
  }
}
```

**Response (Invalid Token):**
```json
{
  "success": false,
  "valid": false,
  "data": {
    "user": null
  }
}
```

---

### 4. Get Current User (Protected)

**Endpoint:** `GET /api/auth/me`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "507f191e810c19729de860ea",
    "email": "john@example.com",
    "name": "John Doe"
  }
}
```

---

## Setup Instructions

### Step 1: Install Dependencies

```bash
# Using npm
npm install axios

# Using yarn
yarn add axios

# Using pnpm
pnpm add axios
```

### Step 2: Create Environment Configuration

**File:** `src/config/api.ts`

```typescript
export const API_CONFIG = {
  // Change this based on environment
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  
  // Timeout settings
  TIMEOUT: 10000, // 10 seconds
  
  // Endpoints
  ENDPOINTS: {
    AUTH: {
      REGISTER: '/auth/register',
      LOGIN: '/auth/login',
      VALIDATE: '/auth/validate',
      ME: '/auth/me',
      PROFILE: '/auth/profile',
    },
  },
};
```

### Step 3: Create `.env` File

**File:** `.env.local` (in your web client root)

```env
# Development
REACT_APP_API_URL=http://localhost:3001/api

# Production (uncomment when deploying)
# REACT_APP_API_URL=https://recipestash-backend-production.up.railway.app/api
```

---

## API Service Implementation

### File: `src/services/api.service.ts`

```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';
import { API_CONFIG } from '../config/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - Add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - Handle errors
    this.api.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          this.clearToken();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Token management
  private getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  setToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  clearToken(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  }

  // HTTP methods
  async get<T>(url: string, config = {}): Promise<T> {
    const response = await this.api.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config = {}): Promise<T> {
    const response = await this.api.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config = {}): Promise<T> {
    const response = await this.api.put<T>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config = {}): Promise<T> {
    const response = await this.api.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config = {}): Promise<T> {
    const response = await this.api.delete<T>(url, config);
    return response.data;
  }
}

export const apiService = new ApiService();
```

---

## Authentication Service

### File: `src/services/auth.service.ts`

```typescript
import { apiService } from './api.service';
import { API_CONFIG } from '../config/api';

// Types
export interface User {
  _id: string;
  name: string;
  email: string;
  bio?: string;
  avatarUrl?: string;
  notificationsEnabled: boolean;
  dietaryRestrictions: string[];
  measurementUnit: 'metric' | 'imperial';
  privacyProfilePublic: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

class AuthService {
  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await apiService.post<AuthResponse>(
        API_CONFIG.ENDPOINTS.AUTH.REGISTER,
        data
      );

      if (response.success && response.data?.token) {
        // Save token and user to localStorage
        apiService.setToken(response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }

      return response;
    } catch (error: any) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Login existing user
   */
  async login(data: LoginData): Promise<AuthResponse> {
    try {
      const response = await apiService.post<AuthResponse>(
        API_CONFIG.ENDPOINTS.AUTH.LOGIN,
        data
      );

      if (response.success && response.data?.token) {
        // Save token and user to localStorage
        apiService.setToken(response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }

      return response;
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  logout(): void {
    apiService.clearToken();
    localStorage.removeItem('user');
  }

  /**
   * Get current user from localStorage
   */
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token');
  }

  /**
   * Get auth token
   */
  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  /**
   * Validate token with backend
   */
  async validateToken(): Promise<boolean> {
    const token = this.getToken();
    if (!token) return false;

    try {
      const response = await apiService.post<{
        success: boolean;
        valid: boolean;
        data: { user: User | null };
      }>(API_CONFIG.ENDPOINTS.AUTH.VALIDATE, { token });

      if (response.success && response.valid) {
        // Update user in localStorage
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return true;
      }

      // Token invalid - clear
      this.logout();
      return false;
    } catch (error) {
      this.logout();
      return false;
    }
  }

  /**
   * Get current user from API
   */
  async fetchCurrentUser(): Promise<User> {
    const response = await apiService.get<{ success: boolean; data: any }>(
      API_CONFIG.ENDPOINTS.AUTH.ME
    );

    if (response.success) {
      const user = response.data;
      localStorage.setItem('user', JSON.stringify(user));
      return user;
    }

    throw new Error('Failed to fetch user');
  }
}

export const authService = new AuthService();
```

---

## React Components

### 1. Register Component

**File:** `src/components/auth/Register.tsx`

```tsx
import React, { useState } from 'react';
import { authService } from '../../services/auth.service';

export const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await authService.register(formData);

      if (response.success) {
        console.log('Registration successful:', response.data.user);
        // Redirect to dashboard or home
        window.location.href = '/dashboard';
      } else {
        setError(response.message || 'Registration failed');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        'Registration failed. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="register-container">
      <h1>Create Account</h1>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            minLength={2}
            maxLength={50}
            placeholder="John Doe"
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="john@example.com"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={6}
            maxLength={100}
            placeholder="At least 6 characters"
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>

      <p>
        Already have an account?{' '}
        <a href="/login">Log in</a>
      </p>
    </div>
  );
};
```

---

### 2. Login Component

**File:** `src/components/auth/Login.tsx`

```tsx
import React, { useState } from 'react';
import { authService } from '../../services/auth.service';

export const Login: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await authService.login(formData);

      if (response.success) {
        console.log('Login successful:', response.data.user);
        // Redirect to dashboard or home
        window.location.href = '/dashboard';
      } else {
        setError(response.message || 'Login failed');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        'Login failed. Please check your credentials.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="login-container">
      <h1>Welcome Back</h1>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="john@example.com"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            placeholder="Your password"
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>

      <p>
        Don't have an account?{' '}
        <a href="/register">Sign up</a>
      </p>
    </div>
  );
};
```

---

### 3. Protected Route Component

**File:** `src/components/auth/ProtectedRoute.tsx`

```tsx
import React, { useEffect, useState } from 'react';
import { authService } from '../../services/auth.service';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const isValid = await authService.validateToken();
      setIsAuthenticated(isValid);

      if (!isValid) {
        window.location.href = '/login';
      }
    };

    checkAuth();
  }, []);

  if (isAuthenticated === null) {
    return <div>Loading...</div>;
  }

  return isAuthenticated ? <>{children}</> : null;
};
```

---

### 4. Auth Context (Optional - for React Context API)

**File:** `src/context/AuthContext.tsx`

```tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, User } from '../services/auth.service';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load user from localStorage on mount
    const loadUser = async () => {
      const storedUser = authService.getCurrentUser();
      const storedToken = authService.getToken();

      if (storedUser && storedToken) {
        // Validate token
        const isValid = await authService.validateToken();
        if (isValid) {
          setUser(storedUser);
          setToken(storedToken);
        } else {
          authService.logout();
        }
      }

      setIsLoading(false);
    };

    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authService.login({ email, password });
    if (response.success) {
      setUser(response.data.user);
      setToken(response.data.token);
    } else {
      throw new Error(response.message);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    const response = await authService.register({ name, email, password });
    if (response.success) {
      setUser(response.data.user);
      setToken(response.data.token);
    } else {
      throw new Error(response.message);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

---

## Testing

### 1. Test Registration

**Using curl:**
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Using JavaScript (Browser Console):**
```javascript
fetch('http://localhost:3001/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123'
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

### 2. Test Login

**Using curl:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Using JavaScript:**
```javascript
fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'password123'
  })
})
.then(res => res.json())
.then(data => {
  console.log(data);
  // Save token
  if (data.success) {
    localStorage.setItem('auth_token', data.data.token);
  }
});
```

### 3. Test Protected Endpoint

**Using curl:**
```bash
# Replace TOKEN with actual JWT token from login/register
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer TOKEN"
```

**Using JavaScript:**
```javascript
const token = localStorage.getItem('auth_token');

fetch('http://localhost:3001/api/auth/me', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(res => res.json())
.then(data => console.log(data));
```

---

## Error Handling

### Common Error Responses

**400 Bad Request - Validation Error:**
```json
{
  "statusCode": 400,
  "message": [
    "name must be longer than or equal to 2 characters",
    "email must be an email"
  ],
  "error": "Bad Request"
}
```

**401 Unauthorized - Invalid Credentials:**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

**409 Conflict - Email Already Exists:**
```json
{
  "success": false,
  "message": "Email already exists"
}
```

### Error Handling Example

```typescript
try {
  const response = await authService.login({ email, password });
  // Handle success
} catch (error: any) {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        // Validation error
        setError(data.message || 'Invalid input');
        break;
      case 401:
        // Invalid credentials
        setError('Invalid email or password');
        break;
      case 409:
        // Email already exists
        setError('Email already registered');
        break;
      case 500:
        // Server error
        setError('Server error. Please try again later.');
        break;
      default:
        setError('An error occurred. Please try again.');
    }
  } else if (error.request) {
    // Request made but no response
    setError('Cannot connect to server. Please check your internet connection.');
  } else {
    // Error setting up request
    setError('An unexpected error occurred.');
  }
}
```

---

## Usage Examples

### Example 1: Register Page

```tsx
import React from 'react';
import { Register } from './components/auth/Register';

function RegisterPage() {
  return (
    <div className="page">
      <Register />
    </div>
  );
}

export default RegisterPage;
```

### Example 2: Login Page

```tsx
import React from 'react';
import { Login } from './components/auth/Login';

function LoginPage() {
  return (
    <div className="page">
      <Login />
    </div>
  );
}

export default LoginPage;
```

### Example 3: Protected Dashboard

```tsx
import React from 'react';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { useAuth } from './context/AuthContext';

function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <ProtectedRoute>
      <div className="dashboard">
        <h1>Welcome, {user?.name}!</h1>
        <button onClick={logout}>Logout</button>
      </div>
    </ProtectedRoute>
  );
}

export default Dashboard;
```

### Example 4: Using Auth Context

```tsx
import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
```

---

## Quick Start Checklist

- [ ] Install axios: `npm install axios`
- [ ] Create `src/config/api.ts` with BASE_URL
- [ ] Create `.env.local` with REACT_APP_API_URL
- [ ] Create `src/services/api.service.ts`
- [ ] Create `src/services/auth.service.ts`
- [ ] Create `src/components/auth/Register.tsx`
- [ ] Create `src/components/auth/Login.tsx`
- [ ] Create `src/components/auth/ProtectedRoute.tsx`
- [ ] Create `src/context/AuthContext.tsx` (optional)
- [ ] Test registration with test account
- [ ] Test login with test account
- [ ] Test protected routes
- [ ] Deploy and test on production

---

## Sample Test Accounts

From your seed data, you can use these accounts for testing:

```
Email: alice@example.com
Password: password123

Email: bob@example.com
Password: password123

Email: charlie@example.com
Password: password123
```

---

## Production Deployment

### Environment Variables (Railway/Vercel/Netlify)

```env
REACT_APP_API_URL=https://recipestash-backend-production.up.railway.app/api
```

### CORS Configuration

Your backend already has CORS enabled for all origins (`*`). For production, you should update it:

**File:** `src/main.ts` (Backend)

```typescript
app.enableCors({
  origin: [
    'http://localhost:3000',
    'https://your-frontend.vercel.app',
    'https://your-frontend.netlify.app',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
});
```

---

## Security Best Practices

1. **Token Storage:**
   - Use `localStorage` for web (as shown)
   - For high-security apps, consider `httpOnly` cookies

2. **Token Validation:**
   - Validate token on page load
   - Re-validate on sensitive operations
   - Clear token on 401 responses

3. **Password Requirements:**
   - Minimum 6 characters (enforced by backend)
   - Consider adding strength indicator in UI

4. **HTTPS:**
   - Always use HTTPS in production
   - Backend URL should be `https://...`

5. **Error Messages:**
   - Don't reveal whether email exists during login
   - Backend returns generic "Invalid email or password"

---

## Troubleshooting

### Issue: CORS Error

**Error:** `Access to fetch at '...' has been blocked by CORS policy`

**Solution:** Backend CORS is configured for `*` (all origins). If you still get errors:
1. Check backend is running
2. Check backend URL in `.env.local`
3. Verify backend logs show the request

### Issue: Network Error

**Error:** `Network Error` or `Failed to fetch`

**Solution:**
1. Check backend is running: `curl http://localhost:3001/api/health`
2. Verify API URL in `src/config/api.ts`
3. Check browser console for details

### Issue: Token Not Working

**Error:** `401 Unauthorized` on protected routes

**Solution:**
1. Check token is saved: `localStorage.getItem('auth_token')`
2. Verify token format: Should be `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
3. Check Authorization header: Should be `Bearer <token>`

### Issue: Email Already Exists

**Error:** `Email already exists` during registration

**Solution:**
1. User already registered - use login instead
2. Or use different email
3. Or clear database for testing: `pnpm run db:fresh`

---

## Next Steps

After authentication is working:

1. **Profile Management** - Update user profile, avatar
2. **Password Reset** - Add forgot password flow
3. **Social Login** - Google, Facebook, etc.
4. **Email Verification** - Verify email addresses
5. **Two-Factor Auth** - Add 2FA for security

---

## Support & Resources

- **Backend API Base URL:** `http://localhost:3001/api` (dev) or `https://your-app.railway.app/api` (prod)
- **Health Check:** `GET /api/health`
- **API Documentation:** All endpoints return JSON with `success` boolean
- **Test Accounts:** See "Sample Test Accounts" section above

---

## Quick Test Script

Save this as `test-auth.html` and open in browser:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Auth Test</title>
</head>
<body>
  <h1>RecipeStash Auth Test</h1>
  
  <h2>Register</h2>
  <button onclick="testRegister()">Test Register</button>
  
  <h2>Login</h2>
  <button onclick="testLogin()">Test Login</button>
  
  <h2>Get User</h2>
  <button onclick="testGetUser()">Test Get User</button>
  
  <div id="result"></div>

  <script>
    const API_BASE = 'http://localhost:3001/api';

    async function testRegister() {
      try {
        const response = await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Test User',
            email: `test${Date.now()}@example.com`,
            password: 'password123'
          })
        });
        const data = await response.json();
        document.getElementById('result').innerText = JSON.stringify(data, null, 2);
        
        if (data.success) {
          localStorage.setItem('auth_token', data.data.token);
          alert('Registration successful! Token saved.');
        }
      } catch (error) {
        document.getElementById('result').innerText = error.message;
      }
    }

    async function testLogin() {
      try {
        const response = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'alice@example.com',
            password: 'password123'
          })
        });
        const data = await response.json();
        document.getElementById('result').innerText = JSON.stringify(data, null, 2);
        
        if (data.success) {
          localStorage.setItem('auth_token', data.data.token);
          alert('Login successful! Token saved.');
        }
      } catch (error) {
        document.getElementById('result').innerText = error.message;
      }
    }

    async function testGetUser() {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          alert('Please login first!');
          return;
        }

        const response = await fetch(`${API_BASE}/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        document.getElementById('result').innerText = JSON.stringify(data, null, 2);
      } catch (error) {
        document.getElementById('result').innerText = error.message;
      }
    }
  </script>
</body>
</html>
```

---

**Ready to integrate!** 🚀
