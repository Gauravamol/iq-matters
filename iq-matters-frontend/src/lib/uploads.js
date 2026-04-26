import { apiRequest } from "./api";

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read the selected file."));
    reader.readAsDataURL(file);
  });
}

export async function uploadManagedFile({ file, token, kind = "misc" }) {
  if (!file) {
    throw new Error("Select a file before uploading.");
  }

  const dataUrl = await readFileAsDataUrl(file);
  const response = await apiRequest("/uploads", {
    method: "POST",
    token,
    body: {
      kind,
      file_name: file.name,
      mime_type: file.type,
      data_url: dataUrl
    }
  });

  return response?.file || null;
}
