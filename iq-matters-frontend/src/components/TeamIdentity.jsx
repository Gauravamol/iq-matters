import React from "react";

function getInitials(name) {
  return String(name || "IQ")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function TeamIdentity({ name }) {
  return (
    <div className="team-identity">
      <span className="team-logo-badge">{getInitials(name)}</span>
      <span>{name}</span>
    </div>
  );
}

export default TeamIdentity;
