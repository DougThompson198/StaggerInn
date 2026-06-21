import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import { KeyRound, Trees } from "lucide-react";

const BG_IMAGE =
  "https://images.unsplash.com/photo-1570793005386-840846445fed?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODh8MHwxfHNlYXJjaHwxfHx3b29kZW4lMjBjYWJpbiUyMGZvcmVzdCUyMHN1bm55fGVufDB8fHx8MTc4MjAxMjc3NHww&ixlib=rb-4.1.0&q=85";

export default function Login() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    try {
      const { data } = await apiClient.post("/auth/login", { password });
      localStorage.setItem("cabin_token", data.token);
      toast.success("Welcome to the cottage");
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      data-testid="auth-gate"
      className="min-h-screen flex flex-col lg:flex-row"
    >
      {/* Visual side */}
      <div
        className="hidden lg:block lg:w-1/2 relative"
        style={{
          backgroundImage: `url(${BG_IMAGE})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(45,43,42,0.35), rgba(45,43,42,0.55))" }} />
        <div className="relative z-10 h-full flex flex-col justify-end p-12 text-white">
          <div className="flex items-center gap-2 mb-3 uppercase-label" style={{ color: "rgba(255,255,255,0.85)" }}>
            <Trees className="h-4 w-4" />
            <span>The Cottage Logbook</span>
          </div>
          <h1 className="font-display text-5xl xl:text-6xl font-light leading-tight">
            Who&apos;s at the lake<br />this weekend?
          </h1>
          <p className="mt-4 text-base max-w-md opacity-90">
            A shared logbook for tracking guests at Homestead &amp; Bunkie and PinePoint.
          </p>
        </div>
      </div>

      {/* Form side */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md animate-in">
          <div className="lg:hidden flex items-center gap-2 mb-6 uppercase-label">
            <Trees className="h-4 w-4" />
            <span>The Cottage Logbook</span>
          </div>

          <h2 className="font-display text-4xl sm:text-5xl font-light mb-3" style={{ color: "var(--text-primary)" }}>
            Welcome back.
          </h2>
          <p className="text-base mb-10" style={{ color: "var(--text-secondary)" }}>
            Enter the family password to access the cabin schedule.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="password" className="uppercase-label block mb-2">
                Family Password
              </Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--text-muted)" }} />
                <Input
                  id="password"
                  data-testid="login-password-input"
                  type="password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="pl-10 h-12 text-base"
                  style={{ background: "#FFFFFF", borderColor: "var(--border-soft)" }}
                />
              </div>
            </div>

            <Button
              type="submit"
              data-testid="login-submit-button"
              disabled={loading || !password}
              className="w-full h-12 rounded-full text-base font-medium transition-all"
              style={{
                background: "var(--accent)",
                color: "white",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--accent)")}
            >
              {loading ? "Opening the door…" : "Open the logbook"}
            </Button>
          </form>

          <p className="mt-8 text-xs" style={{ color: "var(--text-muted)" }}>
            Default password is <span className="font-mono">cottage2026</span> — change it in <span className="font-mono">backend/.env</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
