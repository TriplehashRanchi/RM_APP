const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export async function uploadToCloudinary(fileUri, options = {}) {
  if (!fileUri) throw new Error("uploadToCloudinary requires fileUri");

  const formData = new FormData();
  formData.append("file", {
    uri: fileUri,
    type: options.type || "image/jpeg",
    name: options.name || "upload.jpg",
  });
  formData.append("upload_preset", uploadPreset);

  if (options.folder) formData.append("folder", options.folder);
  if (options.tags) formData.append("tags", Array.isArray(options.tags) ? options.tags.join(",") : options.tags);

  const resourceType = options.resourceType || "image";
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

  const res = await fetch(url, { method: "POST", body: formData });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}