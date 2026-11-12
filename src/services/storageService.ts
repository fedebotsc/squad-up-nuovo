import { supabase } from "@/integrations/supabase/client";

export type UploadTarget =
  | "avatar"
  | "banner"
  | "frame"
  | "clan-logo"
  | "clan-banner"
  | "clan-frame"
  | "post-media";

/**
 * Normalizza il MIME type per evitare errori di rigetto dai bucket Supabase Storage
 */
function normalizeMimeType(file: File, ext: string): string {
  const rawType = (file.type || "").toLowerCase().trim();

  if (rawType.includes("jpeg") || rawType.includes("jpg") || rawType.includes("pjpeg")) {
    return "image/jpeg";
  }
  if (rawType.includes("png")) return "image/png";
  if (rawType.includes("webp")) return "image/webp";
  if (rawType.includes("gif")) return "image/gif";
  if (rawType.includes("svg")) return "image/svg+xml";

  // Fallback in base all'estensione
  switch (ext) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "svg":
      return "image/svg+xml";
    case "jpg":
    case "jpeg":
    default:
      return "image/jpeg";
  }
}

/**
 * Carica un file immagine o multimediale su Supabase Storage con catena di fallback automatica
 */
export async function uploadMediaFile(
  file: File,
  target: UploadTarget,
  userId: string,
  extraId?: string
): Promise<{ url: string; path: string; bucket: string }> {
  if (!userId) {
    throw new Error("Devi essere autenticato per caricare immagini su SquadUP.");
  }

  // Estensione sicura e normalizzata
  const rawExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const ext = ["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(rawExt) ? rawExt : "jpg";
  const contentType = normalizeMimeType(file, ext);
  const timestamp = Date.now();

  let bucketsToTry: string[] = ["social-media", "avatars", "clan-media"];
  let filename = `${target}_${timestamp}.${ext}`;

  if (target === "avatar") {
    bucketsToTry = ["avatars", "social-media", "clan-media"];
    filename = `avatar_${timestamp}.${ext}`;
  } else if (target === "banner") {
    bucketsToTry = ["banners", "social-media", "avatars"];
    filename = `banner_${timestamp}.${ext}`;
  } else if (target === "frame") {
    bucketsToTry = ["avatars", "social-media", "banners", "clan-media"];
    filename = `frame_${timestamp}.${ext}`;
  } else if (target === "clan-logo") {
    bucketsToTry = ["clan-media", "avatars", "social-media"];
    filename = `clan_logo_${extraId || "clan"}_${timestamp}.${ext}`;
  } else if (target === "clan-banner") {
    bucketsToTry = ["clan-media", "banners", "social-media"];
    filename = `clan_banner_${extraId || "clan"}_${timestamp}.${ext}`;
  } else if (target === "clan-frame") {
    bucketsToTry = ["clan-media", "social-media", "avatars"];
    filename = `clan_frame_${extraId || "clan"}_${timestamp}.${ext}`;
  }

  // Il percorso DEVE iniziare con auth.uid() per soddisfare le policy RLS: (storage.foldername(name))[1] = auth.uid()
  const filePath = `${userId}/${filename}`;

  let lastError: any = null;

  for (const bucketName of bucketsToTry) {
    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          upsert: true,
          cacheControl: "3600",
          contentType: contentType,
        });

      if (!error && data) {
        const { data: publicUrlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath);

        if (publicUrlData?.publicUrl) {
          return {
            url: publicUrlData.publicUrl,
            path: filePath,
            bucket: bucketName,
          };
        }
      }

      if (error) {
        lastError = error;
        console.warn(`[storageService] Upload fallito su bucket '${bucketName}':`, error.message);
      }
    } catch (e) {
      lastError = e;
      console.warn(`[storageService] Errore inaspettato su bucket '${bucketName}':`, e);
    }
  }

  throw new Error(
    lastError?.message ||
      "Impossibile completare il caricamento su storage. Verifica il formato del file (JPG, PNG, WEBP max 20MB)."
  );
}
