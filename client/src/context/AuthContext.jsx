import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

// Helper function to decode JWT and extract role
const decodeToken = (token) => {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch (e) {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  // FIXED PART 3: Role is now derived from the token, not stored in localStorage
  const [role, setRole] = useState(null);

  useEffect(() => {
    if (token) {
      // Decode token to get role and user info
      const decoded = decodeToken(token);
      if (decoded && decoded.role) {
        setRole(decoded.role);
        setUser({ token, role: decoded.role, userId: decoded.userId });
      }
    } else {
      setRole(null);
      setUser(null);
    }
  }, [token]);

  const login = async (data) => {
    localStorage.setItem("token", data.token);
    // FIXED PART 3: No longer storing role in localStorage
    setToken(data.token);
    // Role will be set by the useEffect hook above when token changes
  };

  const logout = async () => {
    // Call logout endpoint to blacklist the token
    try {
      await fetch("http://localhost:5001/api/auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      console.error("Logout request failed:", err);
    }

    // Clear local state
    localStorage.removeItem("token");
    setToken(null);
    setRole(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
