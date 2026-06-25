import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { signInWithGoogle } from "@/lib/firebase";
import { KeyRound, Trees } from "lucide-react";

const BG_IMAGE =
  "https://images.unsplash.com/photo-1570793005386-840846445fed?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODh8MHwxfHNlYXJjaHwxfHx3b29kZW4lMjBjYWJpbiUyMGZvcmVzdCUyMHN1bm55fGVufDB8fHx8MTc4MjAxMjc3NHww&ixlib=rb-4.1.0&q=85";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithGoogle();
      toast.success("Welcome to the cottage");
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(err.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      data-testid="auth-gate"
      className="min-h-screen flex flex-col lg:flex-row"
    >
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
            Sign in with Google to access the cabin schedule.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Button
              type="submit"
              data-testid="login-submit-button"
              disabled={loading}
              className="w-full h-12 rounded-full text-base font-medium transition-all"
              style={{
                background: "var(--accent)",
                color: "white",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--accent)")}
            >
              <KeyRound className="h-4 w-4 mr-2" />
              {loading ? "Opening the door..." : "Continue with Google"}
            </Button>
          </form>

          <p className="mt-8 text-xs" style={{ color: "var(--text-muted)" }}>
          </p>
        </div>
      </div>
    </div>
  );
}
