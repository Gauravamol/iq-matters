import React from "react";
import { motion } from "framer-motion";
import { cardMotionProps } from "./PageWrapper";
import { usePlatform } from "../context/PlatformContext";
import ActionButton from "./ActionButton";

const resources = [
  {
    title: "KRAFTON India Esports",
    description: "Official BGMI esports hub with events, streams, and competitive announcements.",
    href: "https://kraftonindiaesports.com/"
  },
  {
    title: "PandaScore",
    description: "Official esports API provider for matches, teams, schedules, and tournaments.",
    href: "https://developers.pandascore.co/docs/introduction"
  },
  {
    title: "Liquipedia PUBG Mobile",
    description: "Tournament tracking, teams, rosters, and competitive history for PUBG Mobile esports.",
    href: "https://liquipedia.net/pubgmobile/Main_Page"
  },
  {
    title: "HLTV",
    description: "Esports news and statistics reference for broader tournament and team content patterns.",
    href: "https://www.hltv.org/"
  },
  {
    title: "Esports Charts",
    description: "Audience and tournament performance tracking for major esports events.",
    href: "https://escharts.com/"
  },
  {
    title: "Esports.gg",
    description: "Current esports news, event coverage, and community updates.",
    href: "https://esports.gg/"
  }
];

function ResourceSection() {
  const { isFeatureEnabled } = usePlatform();

  if (!isFeatureEnabled("esports_resources", true)) {
    return null;
  }

  return (
    <motion.section className="page-card stack-layout" {...cardMotionProps}>
      <div className="section-head">
        <div>
          <span className="eyebrow">Resources</span>
          <h2>Esports Links</h2>
        </div>
        <p>Reference sites for tournament tracking, esports news, statistics, and official competitive ecosystems.</p>
      </div>

      <div className="resource-grid">
        {resources.map((resource, index) => (
          <motion.article
            key={resource.href}
            className="resource-card"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: Math.min(index * 0.04, 0.18), ease: "easeOut" }}
          >
            <strong>{resource.title}</strong>
            <p>{resource.description}</p>
            <ActionButton href={resource.href} iconName="link" className="nav-button nav-button--ghost">Visit site</ActionButton>
          </motion.article>
        ))}
      </div>
    </motion.section>
  );
}

export default ResourceSection;
