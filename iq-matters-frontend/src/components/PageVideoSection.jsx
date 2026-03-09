import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cardMotionProps } from "./PageWrapper";
import { apiRequest } from "../lib/api";
import { usePlatform } from "../context/PlatformContext";
import ActionButton from "./ActionButton";

function toEmbedUrl(url) {
  if (!url) {
    return null;
  }

  if (url.includes("youtube.com/watch?v=")) {
    const videoId = url.split("watch?v=")[1]?.split("&")[0];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  }

  if (url.includes("youtu.be/")) {
    const videoId = url.split("youtu.be/")[1]?.split("?")[0];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  }

  return url;
}

function isIframeSource(url) {
  return Boolean(url && url.includes("youtube.com/embed"));
}

function PageVideoSection({ slot, title, description, fallbackVideos = [] }) {
  const { isFeatureEnabled } = usePlatform();
  const videosEnabled = isFeatureEnabled("video_sections", true);
  const [asset, setAsset] = useState(null);

  useEffect(() => {
    if (!videosEnabled) {
      setAsset(null);
      return;
    }

    let isActive = true;

    apiRequest(`/media/${slot}`)
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
  }, [slot, videosEnabled]);

  if (!videosEnabled) {
    return null;
  }

  const managedVideo = asset?.media_type === "video"
    ? [{ title: "Managed Feature Video", source: asset.url, cta: "Open source" }]
    : [];
  const videos = managedVideo.length ? managedVideo : fallbackVideos;
  const primaryVideo = videos[0];

  if (!primaryVideo) {
    return null;
  }

  const primarySource = toEmbedUrl(primaryVideo.source);

  return (
    <motion.section className="page-card stack-layout" {...cardMotionProps}>
      <div className="section-head">
        <div>
          <span className="eyebrow">Video Feature</span>
          <h2>{title}</h2>
        </div>
        <p>{description}</p>
      </div>

      <div className="video-layout">
        <div className="video-frame">
          {isIframeSource(primarySource) ? (
            <iframe
              src={primarySource}
              title={primaryVideo.title}
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video src={primarySource} controls preload="metadata" />
          )}
        </div>

        <div className="video-list">
          {videos.map((video) => (
            <div key={video.source} className="video-card">
              <strong>{video.title}</strong>
              {video.description ? <p>{video.description}</p> : null}
              <ActionButton href={video.source} iconName="play" className="nav-button nav-button--ghost">Watch video</ActionButton>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

export default PageVideoSection;
