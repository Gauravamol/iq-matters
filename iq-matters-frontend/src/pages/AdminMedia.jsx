import React, { useEffect, useState } from "react";
import PageWrapper from "../components/PageWrapper";
import HeroMediaBanner from "../components/HeroMediaBanner";
import ActionButton from "../components/ActionButton";
import { useAuth } from "../hooks/useAuth";
import { apiRequest } from "../lib/api";

const slotOptions = [
  { value: "home", label: "Home Hero", mediaType: "image" },
  { value: "tournaments", label: "Tournaments Hero", mediaType: "image" },
  { value: "matches", label: "Matches Hero", mediaType: "image" },
  { value: "leaderboard", label: "Leaderboard Hero", mediaType: "image" },
  { value: "dashboard", label: "Dashboard Hero", mediaType: "image" },
  { value: "team-dashboard", label: "Team Dashboard Hero", mediaType: "image" },
  { value: "home-video", label: "Home Video", mediaType: "video" },
  { value: "tournaments-video", label: "Tournament Video", mediaType: "video" }
];

function AdminMedia() {
  const { token } = useAuth();
  const [assetsByPage, setAssetsByPage] = useState({});
  const [form, setForm] = useState({
    page_name: "home",
    media_type: "image",
    url: ""
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAssets();
  }, [token]);

  async function loadAssets() {
    try {
      const results = await Promise.all(
        slotOptions.map((slot) => apiRequest(`/media/${slot.value}`, { token }))
      );

      const nextAssets = {};
      results.forEach((result) => {
        nextAssets[result.page] = result.asset;
      });

      setAssetsByPage(nextAssets);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function saveMedia(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      await apiRequest("/admin/media", {
        method: "POST",
        token,
        body: {
          page_name: form.page_name,
          media_type: form.media_type,
          url: form.url.trim()
        }
      });

      setForm({ ...form, url: "" });
      setMessage("Media asset updated.");
      await loadAssets();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeMedia(id) {
    setMessage("");
    setError("");

    try {
      await apiRequest(`/admin/media/${id}`, {
        method: "DELETE",
        token
      });

      setMessage("Media asset removed.");
      await loadAssets();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <PageWrapper className="stack-layout">
      <HeroMediaBanner
        page="dashboard"
        eyebrow="Media Control"
        title="Media Assets"
        description="Manage hero banners, page cover imagery, and featured videos from one centralized admin screen."
      />

      <section className="page-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Media Manager</span>
            <h2>Platform Media</h2>
          </div>
          <p>Hero images and video slots update the frontend dynamically through the `media_assets` table.</p>
        </div>
        <div className="button-row">
          <ActionButton to="/admin/settings" iconName="settings" className="nav-button nav-button--ghost">Back to Settings</ActionButton>
          <ActionButton to="/dashboard" iconName="dashboard" className="nav-button nav-button--ghost">Dashboard</ActionButton>
        </div>
      </section>

      <section className="page-card page-card--form">
        <h3>Update Media Slot</h3>
        <form className="form-stack" onSubmit={saveMedia}>
          <select
            className="form-input"
            value={form.page_name}
            onChange={(event) => {
              const slot = slotOptions.find((item) => item.value === event.target.value);
              setForm({
                ...form,
                page_name: event.target.value,
                media_type: slot?.mediaType || "image"
              });
            }}
          >
            {slotOptions.map((slot) => (
              <option key={slot.value} value={slot.value}>{slot.label}</option>
            ))}
          </select>
          <select className="form-input" value={form.media_type} onChange={(event) => setForm({ ...form, media_type: event.target.value })}>
            <option value="image">Image</option>
            <option value="video">Video</option>
          </select>
          <input className="form-input" placeholder="Paste image or video URL" value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} />
          {message ? <div className="form-message form-message--success">{message}</div> : null}
          {error ? <div className="form-message form-message--error">{error}</div> : null}
          <ActionButton iconName="media" type="submit" disabled={saving || !form.url.trim()}>{saving ? "Saving..." : "Save Media Asset"}</ActionButton>
        </form>
      </section>

      <section className="page-card">
        <h3>Active Media Slots</h3>
        <div className="media-grid">
          {slotOptions.map((slot) => {
            const asset = assetsByPage[slot.value];

            return (
              <article key={slot.value} className="page-card media-card">
                <span className="eyebrow">{slot.label}</span>
                <h3>{asset ? `${asset.media_type === "video" ? "Video" : "Image"} active` : "Using default asset"}</h3>
                <p>{asset ? asset.url : "No custom media uploaded for this slot yet."}</p>

                {asset ? (
                  <div className="media-preview">
                    {asset.media_type === "video" ? (
                      <video src={asset.url} controls preload="metadata" />
                    ) : (
                      <img src={asset.url} alt={`${slot.label} preview`} />
                    )}
                  </div>
                ) : null}

                <div className="media-card__footer">
                  <span>{asset ? new Date(asset.created_at).toLocaleString() : "Default platform artwork"}</span>
                  {asset ? (
                    <ActionButton iconName="media" className="nav-button nav-button--ghost" onClick={() => removeMedia(asset.id)}>
                      Delete Media
                    </ActionButton>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </PageWrapper>
  );
}

export default AdminMedia;
