import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  Building2,
  Eye,
  EyeOff,
  Headphones,
  Leaf,
  Lock,
  LogIn,
  Settings,
  ShieldCheck,
  User,
  Wheat,
} from "lucide-react";
import { loginRequest } from "@/api/auth";
import { useAuth } from "@/context/AuthContext";
import loginHero from "@/assets/login-hero.png";

const FEATURES = [
  {
    icon: BarChart3,
    title: "Live Mill Monitoring",
    desc: "Batching, mixing, and dispatch in one view",
  },
  {
    icon: Wheat,
    title: "Formulation Control",
    desc: "Recipes, nutrients, and batch accuracy",
  },
  {
    icon: ShieldCheck,
    title: "Feed Traceability",
    desc: "Lots tracked from grain receipt to bag",
  },
  {
    icon: Leaf,
    title: "Herd Nutrition",
    desc: "Consistent feed quality for healthier cattle",
  },
];

function BrandMark() {
  return (
    <span className="cf-login-mark" aria-hidden>
      <Wheat size={22} strokeWidth={2.2} />
    </span>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const mail = email.trim() || "demo";
    setSubmitting(true);
    setError("");
    try {
      const data = await loginRequest(mail, password);
      const user = {
        ...data.user,
        name: data.user.name || data.user.username || data.user.email,
      };
      login(user, data.token || "");
      void remember;
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cf-auth">
      <section className="cf-auth-form">
        <div className="cf-auth-brand">
          <BrandMark />
          <div>
            <p className="cf-auth-name">CattleFeed</p>
            <p className="cf-auth-tag">Cattle Feed Mill System</p>
          </div>
        </div>

        <div className="cf-auth-body">
          <h1>Welcome Back!</h1>
          <p className="cf-auth-lead">
            Login to access your feed mill operations, formulation, and stock.
          </p>

          <form className="cf-auth-fields" onSubmit={onSubmit}>
            {error ? <div className="cf-auth-error">{error}</div> : null}

            <label className="cf-auth-label">
              User ID / Email
              <span className="cf-auth-input">
                <User size={18} />
                <input
                  type="text"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your user ID or email"
                />
              </span>
            </label>

            <label className="cf-auth-label">
              Password
              <span className="cf-auth-input">
                <Lock size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="cf-auth-eye"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>

            <div className="cf-auth-row">
              <label className="cf-auth-remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Remember me
              </label>
              <button type="button" className="cf-auth-forgot">
                Forgot Password?
              </button>
            </div>

            <button type="submit" className="cf-auth-submit" disabled={submitting}>
              <LogIn size={16} />
              {submitting ? "Signing in…" : "Login"}
            </button>
          </form>
        </div>

        <div className="cf-auth-secure">
          <ShieldCheck size={14} />
          <span>
            Secure Login <span className="cf-auth-dot">|</span> Demo mode — any login works
          </span>
        </div>
      </section>

      <section className="cf-auth-hero">
        <img src={loginHero} alt="Cattle feed mill with grain and pellets" />
        <div className="cf-auth-hero-shade" />

        <div className="cf-auth-hero-content">
          <div className="cf-auth-hero-top">
            <div>
              <h2>
                Better Feed.
                <br />
                <span>Healthier Herds.</span>
              </h2>
              <div className="cf-auth-rule" />
              <p>
                Accurate formulation. Clean batching. Reliable dispatch.
                <br />
                Built for cattle feed mills.
              </p>
            </div>
            <span className="cf-auth-badge">
              <ShieldCheck size={14} />
              Mill-grade traceability
            </span>
          </div>

          <div className="cf-auth-hero-spacer" />

          <div className="cf-auth-features">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="cf-auth-feature">
                <span className="cf-auth-feature-icon">
                  <Icon size={16} strokeWidth={2.2} />
                </span>
                <div className="cf-auth-feature-copy">
                  <p>{title}</p>
                  <span>{desc}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="cf-auth-footer">
            <span>
              <Headphones size={14} />
              <span>
                <strong>Need Help?</strong> Contact Support
              </span>
            </span>
            <span>
              <Settings size={14} />
              Version 1.0.0 <span className="cf-auth-dot">|</span> All rights reserved
            </span>
            <span>
              <Building2 size={14} />
              <span>
                <strong>CattleFeed</strong> Empowering cattle feed mills
              </span>
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
