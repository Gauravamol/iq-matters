import React from "react";
import { getFileBadgeLabel, isImageAssetUrl } from "../lib/fileTypes";

function getInitials(name) {
  return String(name || "IQ")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function TeamIdentity({ name, logoUrl, subtitle = null }) {
  return (
    <div className="team-identity">
      {logoUrl && isImageAssetUrl(logoUrl) ? (
        <img className="team-logo-image" src={logoUrl} alt={`${name} logo`} />
      ) : logoUrl ? (
        <a className="team-logo-badge team-logo-badge--file" href={logoUrl} target="_blank" rel="noreferrer">
          {getFileBadgeLabel(logoUrl)}
        </a>
      ) : (
        <span className="team-logo-badge">{getInitials(name)}</span>
      )}
      <span>
        <strong>{name}</strong>
        {subtitle ? <small className="team-identity__meta">{subtitle}</small> : null}
      </span>
    </div>
  );
}

export default TeamIdentity;
