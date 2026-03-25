import React, { useEffect, useMemo, useState } from "react";
import PageWrapper from "../components/PageWrapper";
import HeroMediaBanner from "../components/HeroMediaBanner";
import AdminPanelNav from "../components/AdminPanelNav";
import ActionButton from "../components/ActionButton";
import { usePlatform } from "../context/PlatformContext";
import { useAuth } from "../hooks/useAuth";
import { apiRequest } from "../lib/api";

function toEditablePointsSystem(pointsSystem) {
  return (pointsSystem || []).map((rule) => ({
    position: String(rule.position ?? ""),
    points: String(rule.points ?? "")
  }));
}

function AdminSettings() {
  const { token } = useAuth();
  const { features, loading: featuresLoading, updateFeature, refreshFeatures } = usePlatform();
  const [bgImage, setBgImage] = useState("");
  const [pointsSystem, setPointsSystem] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [token]);

  const sortedPointsSystem = useMemo(() => {
    return [...pointsSystem].sort((left, right) => Number(left.position || 0) - Number(right.position || 0));
  }, [pointsSystem]);

  async function loadSettings() {
    try {
      setError("");
      const data = await apiRequest("/admin/settings", { token });
      setBgImage(data?.leaderboardSettings?.bg_image || "");
      setPointsSystem(toEditablePointsSystem(data?.pointsSystem || []));
      await refreshFeatures();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleFeatureToggle(featureKey, enabled) {
    setMessage("");
    setError("");

    try {
      await updateFeature(featureKey, enabled);
      setMessage("Platform feature updated.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function updateRule(index, field, value) {
    setPointsSystem((current) => current.map((rule, ruleIndex) => (
      ruleIndex === index ? { ...rule, [field]: value } : rule
    )));
  }

  function addRule() {
    setPointsSystem((current) => ([
      ...current,
      {
        position: String(current.length + 1),
        points: "0"
      }
    ]));
  }

  function removeRule(index) {
    setPointsSystem((current) => current.filter((_, ruleIndex) => ruleIndex !== index));
  }

  function buildPointsPayload() {
    const normalized = sortedPointsSystem
      .map((rule) => ({
        position: Number(rule.position),
        points: Number(rule.points)
      }))
      .filter((rule) => Number.isFinite(rule.position) && rule.position > 0 && Number.isFinite(rule.points) && rule.points >= 0);

    if (!normalized.length) {
      throw new Error("Add at least one valid points rule before saving.");
    }

    return normalized;
  }

  async function saveSettings(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await apiRequest("/admin/settings", {
        method: "PUT",
        token,
        body: {
          leaderboardSettings: {
            bg_image: bgImage.trim() || null
          },
          pointsSystem: buildPointsPayload()
        }
      });

      setBgImage(response?.leaderboardSettings?.bg_image || "");
      setPointsSystem(toEditablePointsSystem(response?.pointsSystem || []));
      setMessage("Admin settings updated.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageWrapper className="stack-layout">
      <HeroMediaBanner
        page="dashboard"
        eyebrow="Admin Settings"
        title="Platform Settings"
        description="Control feature availability, leaderboard presentation, and points allocation from one protected admin screen."
      />

      <AdminPanelNav />

      <section className="page-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Platform Features</span>
            <h2>Dynamic Feature Management</h2>
          </div>
          <p>Enable or disable media, animations, video sections, external data, and related platform capabilities without a deploy.</p>
        </div>
        {message ? <div className="form-message form-message--success">{message}</div> : null}
        {error ? <div className="form-message form-message--error">{error}</div> : null}
        {featuresLoading ? <p>Loading platform features...</p> : null}
        <div className="feature-grid">
          {features.map((feature) => (
            <article key={feature.feature_key} className="page-card feature-card">
              <div>
                <span className="eyebrow">Feature</span>
                <h3>{feature.label}</h3>
              </div>
              <p>{feature.description}</p>
              <label className="toggle-row">
                <span>{feature.enabled ? "Enabled" : "Disabled"}</span>
                <input type="checkbox" checked={Boolean(feature.enabled)} onChange={(event) => handleFeatureToggle(feature.feature_key, event.target.checked)} />
              </label>
            </article>
          ))}
        </div>
      </section>

      <section className="page-card page-card--form">
        <div className="section-head">
          <div>
            <span className="eyebrow">Leaderboard Control</span>
            <h3>Background and Placement Points</h3>
          </div>
          <p>Update leaderboard visuals and tune the placement points system used across tournament standings.</p>
        </div>
        <form className="form-stack" onSubmit={saveSettings}>
          <input className="form-input" placeholder="Leaderboard background image URL" value={bgImage} onChange={(event) => setBgImage(event.target.value)} />

          <div className="points-grid">
            {sortedPointsSystem.map((rule, index) => (
              <div key={`${rule.position}-${index}`} className="points-row">
                <input
                  className="form-input"
                  type="number"
                  min="1"
                  placeholder="Position"
                  value={rule.position}
                  onChange={(event) => updateRule(index, "position", event.target.value)}
                />
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  placeholder="Points"
                  value={rule.points}
                  onChange={(event) => updateRule(index, "points", event.target.value)}
                />
                <ActionButton
                  type="button"
                  iconName="action"
                  className="nav-button nav-button--ghost"
                  onClick={() => removeRule(index)}
                  disabled={sortedPointsSystem.length === 1}
                >
                  Remove
                </ActionButton>
              </div>
            ))}
          </div>

          <div className="button-row">
            <ActionButton type="button" iconName="settings" className="nav-button nav-button--ghost" onClick={addRule}>Add Points Rule</ActionButton>
            <ActionButton iconName="settings" type="submit" disabled={saving}>{saving ? "Saving..." : "Save Settings"}</ActionButton>
          </div>
        </form>
      </section>

      <section className="button-row">
        <ActionButton to="/admin/media" iconName="media">Open Media Manager</ActionButton>
      </section>
    </PageWrapper>
  );
}

export default AdminSettings;
