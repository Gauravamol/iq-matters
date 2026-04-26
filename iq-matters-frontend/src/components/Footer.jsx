import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const navigationLinks = [
  { to: "/", label: "Home" },
  { to: "/tournaments", label: "Tournaments" },
  { to: "/matches", label: "Matches" },
  { to: "/leaderboard", label: "Leaderboard" }
];

const platformLinks = [
  { to: "/register", label: "Register" },
  { to: "/login", label: "Login" }
];

const socialLinks = [
  { href: "https://discord.com", label: "Discord" },
  { href: "https://www.instagram.com", label: "Instagram" },
  { href: "https://www.youtube.com", label: "YouTube" }
];

export default function Footer() {
  const { isAuthenticated, user } = useAuth();
  const dashboardPath = user?.role === "admin" ? "/admin/dashboard" : "/dashboard";

  return (
    <footer className="site-footer" aria-label="Site footer">
      <div className="site-footer__inner">
        <section className="site-footer__section site-footer__section--brand">
          <span className="site-footer__title">Platform</span>
          <strong className="site-footer__brand">IQ Matters</strong>
        </section>

        <section className="site-footer__section">
          <h2 className="site-footer__title">Navigation</h2>
          <ul className="site-footer__list">
            {navigationLinks.map((item) => (
              <li key={item.to}>
                <Link className="site-footer__link" to={item.to}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="site-footer__section">
          <h2 className="site-footer__title">Platform Links</h2>
          <ul className="site-footer__list">
            {platformLinks.map((item) => (
              <li key={item.to}>
                <Link className="site-footer__link" to={item.to}>
                  {item.label}
                </Link>
              </li>
            ))}
            {isAuthenticated ? (
              <li>
                <Link className="site-footer__link" to={dashboardPath}>
                  Dashboard
                </Link>
              </li>
            ) : null}
          </ul>
        </section>

        <section className="site-footer__section">
          <h2 className="site-footer__title">Community</h2>
          <ul className="site-footer__list">
            {socialLinks.map((item) => (
              <li key={item.href}>
                <a
                  className="site-footer__link"
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </footer>
  );
}
