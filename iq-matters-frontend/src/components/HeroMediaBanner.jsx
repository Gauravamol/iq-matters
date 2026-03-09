import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiRequest } from "../lib/api";
import { usePlatform } from "../context/PlatformContext";

const defaultHeroImages = {
  home: "/media/hero-home.svg",
  tournaments: "/media/hero-tournaments.svg",
  matches: "/media/hero-matches.svg",
  leaderboard: "/media/hero-leaderboard.svg",
  dashboard: "/media/hero-dashboard.svg",
  "team-dashboard": "/media/hero-team-dashboard.svg"
};

function HeroMediaBanner({ page, eyebrow, title, description, actions = null }) {
  const { isFeatureEnabled } = usePlatform();
  const mediaEnabled = isFeatureEnabled("media_sections", true);
  const [asset, setAsset] = useState(null);

  useEffect(() => {
    if (!mediaEnabled) {
      setAsset(null);
      return;
    }

    let isActive = true;

    apiRequest(`/media/${page}`)
      .then((data) => {
        if (isActive) {
          setAsset(data?.asset || null);
        }
      })
      .catch(() => {
        if (isActive) {
          setAsset(null);
        }
      });

    return () => {
      isActive = false;
    };
  }, [mediaEnabled, page]);

  if (!mediaEnabled) {
    return null;
  }

  const mediaLabel = asset ? (asset.media_type === "video" ? "Managed video" : "Managed hero") : "Default hero image";
  const imageSource = asset?.media_type === "image" ? asset.url : defaultHeroImages[page] || defaultHeroImages.dashboard;

  return (
    <motion.section
      className="hero-banner"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: "easeOut" }}
    >
      {asset?.media_type === "video" ? (
        <video className="hero-banner__media" src={asset.url} autoPlay muted playsInline preload="metadata" />
      ) : (
        <img className="hero-banner__media" src={imageSource} alt={`${title} hero banner`} />
      )}

      <div className="hero-banner__overlay" />

      <div className="hero-banner__content">
        <div className="hero-banner__meta">
          <span className="eyebrow">{eyebrow}</span>
          <span className="hero-banner__chip">{mediaLabel}</span>
        </div>
        <h1>{title}</h1>
        <p>{description}</p>
        {actions ? <div className="hero-actions">{actions}</div> : null}
      </div>
    </motion.section>
  );
}

export default HeroMediaBanner;
