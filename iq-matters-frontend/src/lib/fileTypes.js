export const logoFileAccept = "image/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx";
export const mediaImageAccept = "image/*,.svg,.webp,.avif";
export const mediaVideoAccept = "video/*,.mp4,.webm,.mov,.avi,.mkv,.m4v";

const imageExtensions = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico", "avif"]);
const videoExtensions = new Set(["mp4", "webm", "mov", "avi", "mkv", "m4v"]);

export function getFileExtensionFromUrl(url) {
  if (!url) {
    return "";
  }

  try {
    const resolvedUrl = new URL(url, window.location.origin);
    const match = resolvedUrl.pathname.toLowerCase().match(/\.([a-z0-9]+)$/);
    return match ? match[1] : "";
  } catch (error) {
    const sanitizedUrl = String(url || "").split("?")[0].toLowerCase();
    const match = sanitizedUrl.match(/\.([a-z0-9]+)$/);
    return match ? match[1] : "";
  }
}

export function isImageAssetUrl(url) {
  return imageExtensions.has(getFileExtensionFromUrl(url));
}

export function isVideoAssetUrl(url) {
  return videoExtensions.has(getFileExtensionFromUrl(url));
}

export function getFileBadgeLabel(url) {
  const extension = getFileExtensionFromUrl(url);
  return extension ? extension.slice(0, 4).toUpperCase() : "FILE";
}
