import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Scissors, ArrowRight, ArrowLeft, Mail, Lock, User, Store, Loader2, ShieldAlert, Phone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  getLockoutRemainingMs,
  registerFailedAttempt,
  clearAttempts,
  formatRemaining,
} from "@/lib/loginRateLimit";

type LoginRole = "customer" | "tailor";

const Login = () => {
  const location = useLocation();
  const isSignupRoute = location.pathname === "/signup";
  const [selectedRole, setSelectedRole] = useState<LoginRole | null>(null);
  const [mode, setMode] = useState<"login" | "signup">(isSignupRoute ? "signup" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lockoutMs, setLockoutMs] = useState(0);
  const { signIn, signUp, user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Poll lockout countdown for the currently-entered email
  useEffect(() => {
    if (mode !== "login" || !email.trim()) {
      setLockoutMs(0);
      return;
    }
    const tick = () => setLockoutMs(getLockoutRemainingMs(email));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [email, mode]);

  // Redirect logged-in users based on their role
  useEffect(() => {
    if (user && !roleLoading && role) {
      if (role === "admin") navigate("/admin/dashboard", { replace: true });
      else if (role === "tailor") navigate("/tailor/dashboard", { replace: true });
      else navigate("/", { replace: true });
    }
  }, [user, role, roleLoading, navigate]);

  if (user && !roleLoading) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!email.trim() || !password.trim()) {
      toast({ title: "Missing fields", description: "Please enter email and password.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Weak password", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    if (mode === "signup") {
      if (!fullName.trim()) {
        toast({ title: "Missing name", description: "Please enter your full name.", variant: "destructive" });
        setSubmitting(false);
        return;
      }
      const { error } = await signUp(email, password, fullName, selectedRole || "customer");
      if (error) {
        toast({ title: "Signup failed", description: error, variant: "destructive" });
      } else {
        toast({ title: "Account created!", description: "Please check your email to verify your account." });
      }
    } else {
      const remaining = getLockoutRemainingMs(email);
      if (remaining > 0) {
        toast({ title: "Too many attempts", description: `Please try again in ${formatRemaining(remaining)}.`, variant: "destructive" });
        setLockoutMs(remaining);
        setSubmitting(false);
        return;
      }

      // Server-side rate limit pre-check
      try {
        const { data: rl } = await supabase.functions.invoke("check-login-rate-limit", { body: { email, action: "check" } });
        if ((rl as any)?.locked) {
          toast({ title: "Too many attempts", description: "Please try again later.", variant: "destructive" });
          setLockoutMs(15 * 60 * 1000);
          setSubmitting(false);
          return;
        }
      } catch { /* non-fatal */ }

      const { error } = await signIn(email, password);
      if (error) {
        const res = registerFailedAttempt(email);
        supabase.functions.invoke("check-login-rate-limit", { body: { email, action: "report_failure" } }).catch(() => {});
        if (res.locked) {
          setLockoutMs(res.remainingMs);
          toast({ title: "Too many attempts", description: "Please try again later.", variant: "destructive" });
        } else {
          toast({ title: "Login failed", description: error, variant: "destructive" });
        }
      } else {
        clearAttempts(email);
        const { data: { user: u } } = await supabase.auth.getUser();
        if (u) {
          const { data: prof } = await supabase.from("profiles").select("account_status").eq("id", u.id).maybeSingle();
          if ((prof as any)?.account_status === "suspended") {
            await supabase.auth.signOut();
            toast({ title: "Account suspended", description: "Please contact support.", variant: "destructive" });
            setSubmitting(false);
            return;
          }
          supabase.rpc("log_user_activity" as any, {
            p_user_id: u.id, p_email: email, p_event: "login_success",
            p_ip: null, p_user_agent: navigator.userAgent, p_metadata: { method: "password" },
          }).then(() => {});
          supabase.functions.invoke("check-login-rate-limit", { body: { email, action: "report_success" } }).catch(() => {});
        }
        toast({ title: "Welcome back!", description: "You are now logged in." });
      }
    }

    setSubmitting(false);
  };

  // Step 1: Role selection
  if (!selectedRole) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <div className="h-14 w-14 rounded-2xl accent-gradient flex items-center justify-center mx-auto mb-4">
              <Scissors className="h-7 w-7 text-accent-foreground" />
            </div>
            <h1 className="text-2xl font-bold">Welcome to ZyloFit</h1>
            <p className="text-muted-foreground text-sm mt-1">How would you like to continue?</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setSelectedRole("customer")}
              className="group bg-card rounded-2xl p-6 card-shadow hover:card-shadow-hover transition-all duration-200 text-left border border-transparent hover:border-accent/30"
            >
              <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:accent-gradient transition-all">
                <User className="h-6 w-6 text-accent group-hover:text-accent-foreground" />
              </div>
              <h3 className="font-bold text-base mb-1">I'm a Customer</h3>
              <p className="text-sm text-muted-foreground">Find tailors and order custom clothing</p>
            </button>

            <button
              onClick={() => setSelectedRole("tailor")}
              className="group bg-card rounded-2xl p-6 card-shadow hover:card-shadow-hover transition-all duration-200 text-left border border-transparent hover:border-accent/30"
            >
              <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:accent-gradient transition-all">
                <Store className="h-6 w-6 text-accent group-hover:text-accent-foreground" />
              </div>
              <h3 className="font-bold text-base mb-1">I'm a Tailor</h3>
              <p className="text-sm text-muted-foreground">Manage your shop and accept orders</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Login / Signup form
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <button
            onClick={() => setSelectedRole(null)}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="h-14 w-14 rounded-2xl accent-gradient flex items-center justify-center mx-auto mb-4">
            <Scissors className="h-7 w-7 text-accent-foreground" />
          </div>
          <h1 className="text-2xl font-bold">
            {mode === "login" ? "Welcome back" : "Create an account"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {mode === "login"
              ? `Sign in as a ${selectedRole}`
              : `Sign up as a ${selectedRole}`}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-2xl p-6 card-shadow space-y-4">
          {mode === "signup" && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="rounded-xl pl-10 h-12"
                />
              </div>
            </div>
          )}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="rounded-xl pl-10 h-12"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="rounded-xl pl-10 h-12"
              />
            </div>
          </div>
          {mode === "login" && lockoutMs > 0 && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Too many attempts. Please try again later.</p>
                <p className="text-xs opacity-80 mt-0.5">Unlocks in {formatRemaining(lockoutMs)}</p>
              </div>
            </div>
          )}
          <Button
            variant="default"
            className="w-full"
            size="lg"
            type="submit"
            disabled={submitting || (mode === "login" && lockoutMs > 0)}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Please wait...
              </>
            ) : mode === "login" && lockoutMs > 0 ? (
              `Locked (${formatRemaining(lockoutMs)})`
            ) : (
              <>
                {mode === "login" ? "Sign In" : "Create Account"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        {mode === "login" && (
          <div className="flex items-center justify-between mt-4 text-sm">
            <Link to="/forgot-password" className="text-muted-foreground hover:text-accent">Forgot password?</Link>
            <Link to="/login/phone" className="inline-flex items-center gap-1 text-accent font-medium hover:underline">
              <Phone className="h-3.5 w-3.5" /> Sign in with phone
            </Link>
          </div>
        )}

        <p className="text-center text-sm text-muted-foreground mt-6">
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="text-accent font-semibold hover:underline"
          >
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
