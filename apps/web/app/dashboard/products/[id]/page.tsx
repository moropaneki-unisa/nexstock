'use client';

import { useState } from 'react';

export default function ProductPage() {
  const [tab, setTab] = useState('overview');

  return (
    <div className="p-6 space-y-6 text-white">
      
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Product Name</h1>
          <span className="text-sm text-green-500">● Active</span>
        </div>

        <div className="flex gap-3">
          <button className="px-4 py-2 border border-white/20 rounded-lg">Save</button>
          <button className="px-4 py-2 bg-white text-black rounded-lg">
            Publish
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-6 border-b border-gray-800 pb-2">
        {['overview', 'inventory', 'pricing', 'media', 'seo'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`capitalize ${
              tab === t ? 'text-white border-b-2 border-white' : 'text-gray-500'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-3 gap-6">
        
        {/* LEFT */}
        <div className="col-span-2 space-y-6">

          {tab === 'overview' && (
            <Card title="Product Details">
              <input className="w-full p-3 rounded bg-black border border-gray-700" placeholder="Product name" />
              <textarea className="w-full p-3 rounded bg-black border border-gray-700" placeholder="Description" />

              <div className="grid grid-cols-2 gap-4">
                <input className="p-3 rounded bg-black border border-gray-700" placeholder="Category" />
                <input className="p-3 rounded bg-black border border-gray-700" placeholder="Brand" />
              </div>
            </Card>
          )}

          {tab === 'inventory' && (
            <Card title="Inventory">
              <input className="p-3 rounded bg-black border border-gray-700 w-full" placeholder="SKU" />
              <input className="p-3 rounded bg-black border border-gray-700 w-full" placeholder="Stock Quantity" />

              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input type="checkbox" /> Track inventory
              </label>
            </Card>
          )}

          {tab === 'pricing' && (
            <Card title="Pricing">
              <input className="p-3 rounded bg-black border border-gray-700 w-full" placeholder="Cost Price" />
              <input className="p-3 rounded bg-black border border-gray-700 w-full" placeholder="Selling Price" />
              <p className="text-xs text-gray-500">Margin auto-calculated</p>
            </Card>
          )}

        </div>

        {/* RIGHT */}
        <div className="space-y-6">

          {tab === 'media' && (
            <Card title="Media">
              <div className="border-2 border-dashed border-gray-600 rounded-xl p-6 text-center">
                Drag & drop images
              </div>
            </Card>
          )}

          {tab === 'seo' && (
            <Card title="SEO">
              <input className="p-3 rounded bg-black border border-gray-700 w-full" placeholder="Slug" />
              <input className="p-3 rounded bg-black border border-gray-700 w-full" placeholder="Meta Title" />
              <textarea className="p-3 rounded bg-black border border-gray-700 w-full" placeholder="Meta Description" />
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
