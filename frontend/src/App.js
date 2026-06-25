import { useEffect, useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

function RequireAuth({ children }) {
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(() => auth.currentUser);

  useEffect(() => {
    return onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        localStorage.setItem("cabin_token", await nextUser.getIdToken());
      } else {
        localStorage.removeItem("cabin_token");
      }
      setChecking(false);
    });
  }, []);

  if (checking) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const onStorage = () => forceUpdate((n) => n + 1);
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <div className="App min-h-screen" style={{ background: "#F4F1ED" }}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;
