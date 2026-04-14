"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"

import { Dropzone, DropzoneContent, DropzoneEmptyState } from "@/components/dropzone"
import { useSupabaseUpload } from "@/hooks/use-supabase-upload"

type Work = {
  id: string
  slug: string
  title: string
  category: string
  image: string
  description: string | null
  client: string | null
  published: boolean
  created_at: string
  updated_at: string
}

interface WorkFormProps {
  work?: Work | null
  onSuccess: () => void
}

function generateSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function WorkForm({ work, onSuccess }: WorkFormProps) {
  const isEditing = !!work
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState(work?.title ?? "")
  const [customSlug, setCustomSlug] = useState(work?.slug ?? "")
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [category, setCategory] = useState(work?.category ?? "")
  const [description, setDescription] = useState(work?.description ?? "")
  const [client, setClient] = useState(work?.client ?? "")

  const [published, setPublished] = useState<boolean>(
    isEditing ? Boolean(work?.published) : true
  )

  useEffect(() => {
    if (work) {
      setTitle(work.title)
      setCustomSlug(work.slug)
      setCategory(work.category)
      setDescription(work.description ?? "")
      setClient(work.client ?? "")
      setPublished(Boolean(work.published))
      setSlugManuallyEdited(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [work?.id])

  const slug = slugManuallyEdited ? customSlug : generateSlug(title)

  const uploadProps = useSupabaseUpload({
    bucketName: "works-images",
    path: "work-images",
    allowedMimeTypes: ["image/*"],
    maxFiles: 1,
    maxFileSize: 1000 * 1000 * 10,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      let image: string = work?.image ?? ""

      if (uploadProps.files.length > 0) {
        await uploadProps.onUpload()

        const file = uploadProps.files[0]
        const filePath = `work-images/${file.name}`
        const { data } = supabase.storage.from("works-images").getPublicUrl(filePath)
        image = data.publicUrl
      }

      const payload = {
        title: title.trim(),
        slug: slug.trim(),
        category: category.trim(),
        description: description.trim() || null,
        client: client.trim() || null,
        image,
        published,
      }

      if (isEditing) {
        const { error } = await supabase
          .from("works")
          .update(payload)
          .eq("id", work.id)

        if (error) {
          setError(error.message)
          toast.error("Failed to update work", { description: error.message })
          return
        }

        toast.success("Work updated", {
          description: `"${payload.title}" was updated successfully.`,
        })
      } else {
        const { error } = await supabase.from("works").insert(payload)

        if (error) {
          setError(error.message)
          toast.error("Failed to create work", { description: error.message })
          return
        }

        toast.success("Work created", {
          description: `"${payload.title}" was created successfully.`,
        })
      }

      setTimeout(() => onSuccess(), 100)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong"
      setError(message)
      toast.error("Something went wrong", { description: message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
        <Input
          id="title"
          placeholder="Work title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="slug">Slug <span className="text-destructive">*</span></Label>
        <Input
          id="slug"
          placeholder="Title slug (auto generated)"
          value={slug}
          onChange={(e) => {
            setCustomSlug(e.target.value)
            setSlugManuallyEdited(true)
          }}
          onBlur={(e) => setCustomSlug(generateSlug(e.target.value))}
          required
        />
        <p className="text-xs text-muted-foreground">
          Auto-generated from title. You can override it manually.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="category">Category <span className="text-destructive">*</span></Label>
        <Input
          id="category"
          placeholder="Work category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="client">Client</Label>
        <Input
          id="client"
          placeholder="Client for work"
          value={client}
          onChange={(e) => setClient(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Short description of the work..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Image</Label>
        {isEditing && work.image && uploadProps.files.length === 0 && (
          <img
            src={work.image}
            alt="Current work image"
            className="h-32 w-full rounded-md object-cover mb-1"
          />
        )}
        <Dropzone {...uploadProps}>
          <DropzoneEmptyState />
          <DropzoneContent />
        </Dropzone>
        {isEditing && (
          <p className="text-xs text-muted-foreground">
            Upload a new image to replace the current one, or leave empty to keep it.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="published">Publish immediately</Label>
        <Switch
          id="published"
          checked={published}
          onCheckedChange={setPublished}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : isEditing ? "Save Changes" : "Create Work"}
      </Button>
    </form>
  )
}