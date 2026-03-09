import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PageWrapper, { cardMotionProps } from "../components/PageWrapper";
import ActionButton from "../components/ActionButton";
import { useAuth } from "../hooks/useAuth";

function Register() {
  const navigate = useNavigate();
  const { register, login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function registerUser(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!trimmedName || !normalizedEmail || !password || !confirmPassword) {
      setError("Name, email, password, and confirm password are required");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      await register({ name: trimmedName, email: normalizedEmail, password });

      try {
        await login({ email: normalizedEmail, password });
        navigate("/dashboard", { replace: true });
      } catch (loginError) {
        setSuccess("Account created. Please login with your new credentials.");
        setTimeout(() => navigate("/login", { replace: true }), 900);
      }
    } catch (requestError) {
      setError(requestError.message || "Unable to create account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageWrapper className="stack-layout auth-page-shell">
      <motion.div className="page-card page-card--form auth-card" {...cardMotionProps}>
        <span className="eyebrow">Player Onboarding</span>
        <h2>Register</h2>
        <p>Create an account to join tournaments, manage your team, and access the esports dashboard.</p>
        <form className="form-stack" onSubmit={registerUser}>
          <input className="form-input" placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} />
          <input className="form-input" type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <input className="form-input" type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <input className="form-input" type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
          {error ? <div className="form-message form-message--error">{error}</div> : null}
          {success ? <div className="form-message form-message--success">{success}</div> : null}
          <ActionButton iconName="register" type="submit" disabled={loading}>{loading ? "Creating account..." : "Register"}</ActionButton>
        </form>
        <p className="form-footer">Already have an account? <Link to="/login">Login</Link></p>
      </motion.div>
    </PageWrapper>
  );
}

export default Register;
