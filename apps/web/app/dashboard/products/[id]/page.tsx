'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function ProductPage() {
  const { id } = useParams();
  const [tab, setTab] = useState('overview');
  const [product, setProduct] = useState<any>(null);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!id) return;

    fetch(`${API_URL}/products/${id}`)
      .then(res => res.json())
      .then(data => {
        setProduct(data);
        setImages(data.images || []);
      });
  }, [id]);

  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);

    const res = await fetch(`${API_URL}/products/upload-image`, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();

    setImages(prev => [...prev, data.secure_url]);
    setUploading(false);
  };

  const handleDelete = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const moveImage = (index: number, dir: number) => {
    const newArr = [...images];
    const target = index + dir;
    if (target < 0 || target >= images.length) return;

    [newArr[index], newArr[target]] = [newArr[target], newArr[index]];
    setImages(newArr);
  };

  return (
    <div className="p-6 space-y-6 text-white">

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">{product?.name || 'Product'}</h1>
          <span className="text-sm text-green-500">● Active</span>
        </div>

        <div className="flex gap-3">
          <button className="px-4 py-2 border border-white/20 rounded-lg">Save</button>
          <button className="px-4 py-2 bg-white text-black rounded-lg">Publish</button>
        </div>
      </div>

      <div className="flex gap-6 border-b border-gray-800 pb-2">
        {['overview', 'inventory', 'pricing', 'media', 'seo'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`capitalize ${tab === t ? 'text-white border-b-2 border-white' : 'text-gray-500'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">

        <div className="col-span-2 space-y-6">
          {tab === 'overview' && (
            <Card title="Product Details">
              <input defaultValue={product?.name} className="w-full p-3 rounded bg-black border border-gray-700" />
              <textarea defaultValue={product?.description} className="w-full p-3 rounded bg-black border border-gray-700" />
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {tab === 'media' && (
            <Card title="Media">

              <div
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files[0]) handleUpload(e.dataTransfer.files[0]);
                }}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-gray-600 rounded-xl p-6 text-center cursor-pointer"
              >
                Drag & Drop Image
              </div>

              <input
                type="file"
                className="mt-3"
                onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
              />

              {uploading && <p className="text-sm text-gray-400">Uploading...</p>}

              <div className="grid grid-cols-3 gap-3 mt-4">
                {images.map((img, i) => (
                  <div key={i} className="relative">
                    <img src={img} className="h-24 w-full object-cover rounded" />

                    <div className="absolute top-1 right-1 flex gap-1">
                      <button onClick={() => moveImage(i, -1)}>⬅</button>
                      <button onClick={() => moveImage(i, 1)}>➡</button>
                      <button onClick={() => handleDelete(i)}>❌</button>
                    </div>
                  </div>
                ))}
              </div>

            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: any) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
      <h3 className="text-sm text-gray-400">{title}</h3>
      {children}
    </div>
  );
}
