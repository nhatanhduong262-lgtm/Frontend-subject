import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedToken = window.localStorage.getItem('token');
    const storedProfile = window.localStorage.getItem('profile');

    if (storedToken && storedProfile) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedProfile));
      } catch (err) {
        console.error("Error parsing user profile from local storage", err);
        logout();
      }
    }
    setLoading(false);
  }, []);

  const login = (newUser, newToken) => {
    setUser(newUser);
    setToken(newToken);
    window.localStorage.setItem('token', newToken);
    window.localStorage.setItem('userId', newUser.id || newUser.userId);
    window.localStorage.setItem('profile', JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    window.localStorage.removeItem('token');
    window.localStorage.removeItem('userId');
    window.localStorage.removeItem('profile');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
