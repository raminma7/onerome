"use client";
import { ImagePlus, Star, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { getBrowserClient } from "@/lib/supabase/client";
import { useErrorText } from "@/lib/use-action";
import { cn } from "@/lib/utils";
import { addPhotoAction, deletePhotoAction, reorderPhotosAction } from "@/server/actions/photos";

export type ManagedPhoto = { id: string; url: string | null };

const MAX_PHOTOS = 6;
const MAX_BYTES = 5 * 1024 * 1024;

/** Re-encodes the image (max 1600px, WebP). Re-encoding also strips EXIF/GPS metadata. */
async function prepareImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/webp", 0.85));
}

export function PhotoManager({ userId, initial, onChange }: { userId: string; initial: ManagedPhoto[]; onChange?: (count: number) => void }) {
  const t = useTranslations("onboarding");
  const errorText = useErrorText();
  const [photos, setPhotos] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const update = (next: ManagedPhoto[]) => {
    setPhotos(next);
    onChange?.(next.length);
  };

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    let current = photos;
    for (const file of Array.from(files).slice(0, MAX_PHOTOS - current.length)) {
      if (!["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(file.type)) {
        toast.error(t("photoType"));
        continue;
      }
      if (file.size > MAX_BYTES * 3) {
        toast.error(t("photoTooBig"));
        continue;
      }
      try {
        const blob = await prepareImage(file);
        if (blob.size > MAX_BYTES) {
          toast.error(t("photoTooBig"));
          continue;
        }
        const path = `${userId}/${crypto.randomUUID()}.webp`;
        const { error } = await getBrowserClient().storage.from("profile-photos").upload(path, blob, { contentType: "image/webp", upsert: false });
        if (error) throw error;
        const result = await addPhotoAction(path);
        if (!result.ok) {
          toast.error(errorText(result.error));
          continue;
        }
        current = [...current, { id: result.data.id, url: result.data.url ?? URL.createObjectURL(blob) }];
        update(current);
      } catch {
        toast.error(errorText("upload_failed"));
      }
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function remove(id: string) {
    const prev = photos;
    update(photos.filter((p) => p.id !== id));
    const result = await deletePhotoAction(id);
    if (!result.ok) {
      update(prev);
      toast.error(errorText(result.error));
    }
  }

  async function makeCover(id: string) {
    const next = [photos.find((p) => p.id === id)!, ...photos.filter((p) => p.id !== id)];
    update(next);
    const result = await reorderPhotosAction(next.map((p) => p.id));
    if (!result.ok) toast.error(errorText(result.error));
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {photos.map((photo, i) => (
        <div key={photo.id} className={cn("group relative aspect-[3/4] overflow-hidden rounded-[1.5rem] bg-travertine shadow-soft", i === 0 && "col-span-2 row-span-2 ring-2 ring-coral ring-offset-2 ring-offset-ivory")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {photo.url && <img src={photo.url} alt="" className="size-full object-cover" />}
          {i === 0 && <span className="bg-brand absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white">{t("cover")}</span>}
          <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-ink/60 p-2">
            {i !== 0 ? (
              <button type="button" onClick={() => makeCover(photo.id)} className="rounded-full bg-ivory/90 p-1.5 text-ink" aria-label={t("makeCover")} title={t("makeCover")}>
                <Star className="size-3.5" />
              </button>
            ) : <span />}
            <button type="button" onClick={() => remove(photo.id)} className="rounded-full bg-ivory/90 p-1.5 text-danger" aria-label="Delete">
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
      ))}
      {photos.length < MAX_PHOTOS && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-[1.5rem] border-2 border-dashed border-coral/30 bg-white/60 text-sm font-medium text-coral transition hover:border-coral hover:bg-white disabled:opacity-60"
        >
          {uploading ? <span className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <ImagePlus className="size-6" />}
          {uploading ? t("uploading") : t("addPhoto")}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple hidden onChange={(e) => onFiles(e.target.files)} />
    </div>
  );
}
