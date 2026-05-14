"use client"

export function ProductFormAlignmentFix() {
  return (
    <style>{`
      .product-form-layout-scope form div:has(> span.sr-only) {
        display: grid !important;
        height: auto !important;
        min-height: 4.25rem !important;
        align-content: center !important;
        align-items: center !important;
        gap: 0.375rem !important;
        padding: 0.75rem !important;
      }

      .product-form-layout-scope form div:has(> span.sr-only) > span.sr-only {
        position: static !important;
        width: auto !important;
        height: auto !important;
        margin: 0 !important;
        overflow: visible !important;
        clip: auto !important;
        white-space: normal !important;
        border: 0 !important;
        padding: 0 !important;
        font-size: 0.75rem !important;
        line-height: 1rem !important;
        font-weight: 500 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.025em !important;
        color: hsl(var(--muted-foreground)) !important;
      }

      .product-form-layout-scope form div:has(> span.sr-only) > span.sr-only + * {
        min-width: 0 !important;
      }

      .product-form-layout-scope form main > [data-slot="card"] [data-slot="card-content"] input,
      .product-form-layout-scope form main > [data-slot="card"] [data-slot="card-content"] textarea,
      .product-form-layout-scope form main > [data-slot="card"] [data-slot="card-content"] button[role="combobox"] {
        width: 100% !important;
      }

      .product-form-layout-scope form main > [data-slot="card"] [data-slot="card-content"] > div {
        min-width: 0 !important;
      }

      .product-form-layout-scope form main > [data-slot="card"]:has([data-slot="card-title"] svg) [data-slot="card-content"].md\\:grid-cols-2 {
        align-items: start !important;
      }

      @media (min-width: 768px) {
        .product-form-layout-scope form main > [data-slot="card"]:has([data-slot="card-content"].md\\:grid-cols-2) [data-slot="card-content"] > div {
          display: grid !important;
          gap: 1rem !important;
          align-content: start !important;
        }
      }
    `}</style>
  )
}
