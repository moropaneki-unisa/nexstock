'use client';

import { useState } from 'react';

export default function ProductSummaryPage() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="p-6 space-y-6 text-white">

      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold">Product Name</h1>
          <p className="text-gray-400 text-sm">SKU: XXXX • Updated just now</p>
        </div>

        <button className="bg-white text-black px-4 py-2 rounded-lg">
          Edit Product
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">

        <div className="col-span-2 space-y-6">

          <div className="flex gap-6 border-b border-gray-800 pb-2">
            {['overview', 'inventory', 'seo'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`capitalize ${
                  activeTab === tab
                    ? 'text-white border-b-2 border-white'
                    : 'text-gray-500'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div className="grid grid-cols-2 gap-6">

              <Card title="Item Details">
                <Field label="Category" value="-" />
                <Field label="Brand" value="-" />
              </Card>

              <Card title="Pricing">
                <Field label="Selling Price" value="-" />
                <Field label="Tax" value="-" />
              </Card>

              <Card title="Inventory">
                <Field label="Stock" value="0" />
                <Field label="Status" value="Not Tracked" />
              </Card>

              <Card title="Description">
                <p className="text-gray-400 text-sm">
                  No description yet.
                </p>
              </Card>

            </div>
          )}

          {activeTab === 'inventory' && (
            <Card title="Inventory Details">
              <Field label="Stock on Hand" value="0" />
              <Field label="Reorder Level" value="0" />
            </Card>
          )}

          {activeTab === 'seo' && (
            <Card title="SEO Details">
              <Field label="Slug" value="-" />
              <Field label="Meta Title" value="-" />
            </Card>
          )}

        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col items-center justify-center text-center">

          <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 w-full">
            <p className="text-gray-400 mb-2">Drag & drop images here</p>
            <p className="text-xs text-gray-500 mb-4">JPG, PNG, WEBP • Max 5MB</p>

            <button className="bg-white text-black px-4 py-2 rounded-lg">
              Upload Image
            </button>
          </div>

          <p className="text-gray-500 text-xs mt-4">No images added yet</p>

        </div>

      </div>
    </div>
  );
}

function Card({ title, children }: any) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
      <h3 className="text-sm text-gray-400">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, value }: any) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span>{value}</span>
    </div>
  );
}
