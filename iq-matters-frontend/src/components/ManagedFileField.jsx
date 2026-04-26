import React, { useId, useState } from "react";
import { uploadManagedFile } from "../lib/uploads";
import { getFileBadgeLabel, isImageAssetUrl } from "../lib/fileTypes";

function ManagedFileField({
  token,
  value,
  onChange,
  kind = "misc",
  accept = "*/*",
  placeholder = "Paste file URL or upload a file",
  uploadLabel = "Upload File",
  showPreview = true
}) {
  const inputId = useId();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFileSelection(event) {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";

    if (!selectedFile) {
      return;
    }

    setUploading(true);
    setError("");

    try {
      const uploadedFile = await uploadManagedFile({
        file: selectedFile,
        token,
        kind
      });
      onChange(uploadedFile?.url || "");
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="managed-file-field">
      <input className="form-input" placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
      <div className="managed-file-field__actions">
        <label className="managed-file-field__picker" htmlFor={inputId}>
          {uploading ? "Uploading..." : uploadLabel}
        </label>
        <input id={inputId} className="managed-file-field__input" type="file" accept={accept} onChange={handleFileSelection} />
        {value ? (
          <a className="managed-file-field__link" href={value} target="_blank" rel="noreferrer">
            Open {getFileBadgeLabel(value)}
          </a>
        ) : null}
      </div>
      {showPreview && value ? (
        isImageAssetUrl(value) ? (
          <img className="managed-file-field__preview" src={value} alt="Uploaded preview" loading="lazy" />
        ) : (
          <a className="managed-file-field__file" href={value} target="_blank" rel="noreferrer">
            {getFileBadgeLabel(value)}
          </a>
        )
      ) : null}
      {error ? <div className="form-message form-message--error">{error}</div> : null}
    </div>
  );
}

export default ManagedFileField;
