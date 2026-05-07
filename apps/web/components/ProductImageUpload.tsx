"use client";

import { useState } from "react";

export default function ProductImageUpload({ productId }: { productId: string }) {
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    if (!file) return;

    setError(null);

    const previewUrl = URL.createObjectURL(file);
    setImages((prev) => [...prev, previewUrl]);

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/products/${productId}/upload-image`,
        {
          method: "POST",
          body: formData,
          credentials: "include",
        }
      );

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      const data = await res.json();

      setImages((prev) =>
        prev.map((img) => (img === previewUrl ? data.imageUrl : img))
      );
    } catch (err: any) {
      setImages((prev) => prev.filter((img) => img !== previewUrl));
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }}
      />

      {error && (
        <div className="text-red-500 text-sm mt-2">{error}</div>
      )}

      <div className="grid grid-cols-3 gap-4 mt-4">
        {images.map((img, i) => (
          <div key={i} className="relative">
            <img
              src={img}
              className="w-full h-32 object-cover rounded-lg"
            />

            {uploading && img.startsWith("blob:") && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="text-white text-sm">Uploading...</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
