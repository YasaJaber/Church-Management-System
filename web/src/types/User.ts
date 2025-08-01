export interface User {
  id: string
  username: string
  name?: string
  email?: string
  role: 'admin' | 'user' | 'servant' | 'serviceLeader' | 'classTeacher'
  permissions?: string[]
  classId?: string
  assignedClass?: {
    _id: string
    name: string
  }
  createdAt: Date
  updatedAt: Date
}

export interface LoginCredentials {
  username: string
  password: string
  rememberMe?: boolean
}

export interface LoginResponse {
  success: boolean
  message: string
  user: User
  token: string
}

export interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<LoginResponse>
  logout: () => Promise<void>
  checkAuth: () => Promise<boolean>
}
