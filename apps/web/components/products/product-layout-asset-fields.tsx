"use client"

import * as React from "react"
import { UploadCloudIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { apiFetch } from "@/lib/api"

type Asset = {
  url: string
  name?: string
  size?: number
  mimeType?: string
  publicId?: string
  resourceType?: string
}

type AttachmentValue = {
  name: string
  url: string
}

type LayoutField = {
  key: string
  label: string
  type?: string | null
  isActive?: boolean | null
}

type AssetValue = string | AttachmentValue

function stripFileExtension(value: string) {
  return value.replace(/\.[^./\\]+$/, "")
}

function cleanFileName(value: string | undefined, fallback: string) {
  const raw = String(value || fallback || "attachment").trim().replace(/\s+/g, " ")
  const name = stripFileExtension(raw).trim()
  return name || "attachment"
}

function isAttachmentValue(value: unknown): value is AttachmentValue {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && typeof (value as AttachmentValue).url === "string")
}

function safeParseAssetValues(value: string, type: "images" | "attachment"): AssetValue[] {
  if (!value.trim()) return []
  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    if (type === "images") return parsed.filter((item) => typeof item === "string")
    return parsed
      .filter(isAttachmentValue)
      .map((item) => ({ name: cleanFileName(item.name, item.url), url: item.url.trim() }))
      .filter((item) => item.url)
  } catch {
    return []
  }
}

function assetUrl(asset: AssetValue) {
  return typeof asset === "string" ? asset : asset.url
}

function assetName(asset: AssetValue) {
  return typeof asset === "string" ? asset : cleanFileName(asset.name, asset.url)
}

function assetMeta(type: "images" | "attachment") {
  return type === "images" ? "Image URL" : "Attachment file"
}

function writeValue(input: HTMLInputElement, assets: AssetValue[], type: "images" | "attachment") {
  const nextValue = type === "images"
    ? assets.map(assetUrl).map((url) => url.trim()).filter(Boolean)
    : assets
        .filter(isAttachmentValue)
        .map((asset) => ({ name: cleanFileName(asset.name, asset.url), url: asset.url.trim() }))
        .filter((asset) => asset.url)

  input.value = JSON.stringify(nextValue)
  input.dispatchEvent(new Event("input", { bubbles: true }))
  input.dispatchEvent(new Event("change", { bubbles: true }))
}

async function uploadAsset(file: File, type: "images" | "attachment") {
  const body = new FormData()
  body.append("file", file)
  return apiFetch<Asset>(type === "images" ? "/api/products/asset-image" : "/api/products/asset-attachment", {
    method: "POST",
    body,
  })
}

function AssetField({ input, type, label }: { input: HTMLInputElement; type: "images" | "attachment"; label: string }) {
  const [assets, setAssets] = React.useState<AssetValue[]>(() => safeParseAssetValues(input.value, type))
  const [uploading, setUploading] = React.useState(false)

  React.useEffect(() => {
    writeValue(input, assets, type)
  }, [assets, input, type])

  async function onFiles(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    try {
      const uploaded: AssetValue[] = []
      for (const file of Array.from(files)) {
        const asset = await uploadAsset(file, type)
        if (!asset.url) continue
        uploaded.push(type === "images" ? asset.url.trim() : { name: cleanFileName(asset.name, file.name), url: asset.url.trim() })
      }
      setAssets((current) => [...current, ...uploaded])
      toast.success(type === "images" ? "Images uploaded" : "Files uploaded", {
        description: `${uploaded.length} item${uploaded.length === 1 ? "" : "s"} added to ${label}.`,
      })
    } catch (err) {
      toast.error("Upload failed", { description: err instanceof Error ? err.message : "Could not upload file" })
    } finally {
      setUploading(false)
    }
  }

  function remove(index: number) {
    setAssets((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  return (
    <div className="grid gap-3">
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 p-5 text-center transition hover:bg-muted/45">
        <UploadCloudIcon className="mb-2 size-6 text-muted-foreground" />
        <span className="text-sm font-medium">{uploading ? "Uploading..." : type === "images" ? "Upload images" : "Upload attachments"}</span>
        <span className="mt-1 text-xs text-muted-foreground">
          {type === "images" ? "Uploaded images are saved as [imageUrls]." : "Uploaded files are saved as [{ name, url }]."}
        </span>
        <Input type="file" className="hidden" accept={type === "images" ? "image/*" : undefined} multiple disabled={uploading} onChange={(event) => void onFiles(event.target.files)} />
      </label>

      {assets.length ? (
        <div className="grid gap-2">
          {assets.map((asset, index) => (
            <div key={`${assetUrl(asset)}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border bg-background p-2 text-sm">
              <div className="min-w-0 flex items-center gap-2">
                {type === "images" ? <img src={assetUrl(asset)} alt="Uploaded image" className="size-10 rounded-md object-cover" /> : null}
                <div className="min-w-0">
                  <p className="truncate font-medium">{assetName(asset)}</p>
                  <p className="truncate text-xs text-muted-foreground">{assetMeta(type)}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="secondary">{index + 1}</Badge>
                <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => remove(index)}>
                  <XIcon className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function normalizeText(value: string) {
  return value.replace("*", "").replace(/required/i, "").trim().toLowerCase()
}

function findInputForField(field: LayoutField) {
  const labels = Array.from(document.querySelectorAll<HTMLLabelElement>(".product-form-layout-scope label"))
  const label = labels.find((item) => normalizeText(item.textContent || "") === normalizeText(field.label || field.key))
  const wrapper = label?.parentElement
  return wrapper?.querySelector<HTMLInputElement>("input") || null
}

export function ProductLayoutAssetFields({ fields }: { fields: LayoutField[] }) {
  React.useEffect(() => {
    function enhance() {
      const assetFields = fields.filter((field) => field.isActive !== false && (field.type === "images" || field.type === "attachment"))
      for (const field of assetFields) {
        const input = findInputForField(field)
        if (!input || input.dataset.assetEnhanced === "true") continue
        const type = field.type === "images" ? "images" : "attachment"
        const container = document.createElement("div")
        input.type = "hidden"
        input.dataset.layoutAssetType = type
        input.dataset.assetEnhanced = "true"
        input.insertAdjacentElement("afterend", container)
        import("react-dom/client").then(({ createRoot }) => {
          createRoot(container).render(<AssetField input={input} type={type} label={field.label || field.key} />)
        })
      }
    }

    enhance()
    const observer = new MutationObserver(enhance)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [fields])

  return null
}
