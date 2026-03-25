import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PageWrapper, { cardMotionProps } from "../components/PageWrapper";
import ActionButton from "../components/ActionButton";
import { useAuth } from "../hooks/useAuth";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loginUser(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setError("Email and password are required");
      setLoading(false);
      return;
    }

    try {
      await login({ email: normalizedEmail, password });
      const redirectTarget = location.state?.from?.pathname || "/dashboard";
      navigate(redirectTarget, { replace: true });
    } catch (requestError) {
      setError(requestError.message || "Unable to sign in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageWrapper className="stack-layout auth-page-shell">
      <motion.div className="page-card page-card--form auth-card" {...cardMotionProps}>
        <span className="eyebrow">Secure Access</span>
        <h2>Login</h2>
        <p>Enter your account credentials to access the IQ Matters tournament platform.</p>
        <form className="form-stack" onSubmit={loginUser}>
          <input className="form-input" type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <input className="form-input" type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} />
          {error ? <div className="form-message form-message--error">{error}</div> : null}
          <ActionButton iconName="login" type="submit" disabled={loading}>{loading ? "Signing in..." : "Login"}</ActionButton>
        </form>
        <p className="form-footer">Need an account? <Link to="/register">Register</Link></p>
      </motion.div>
    </PageWrapper>
  );
}

export default Login;
