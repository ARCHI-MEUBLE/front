import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { HOME_MONO } from "@/components/home/homeLayout";

const FILE_TYPES = ["JPG", "PNG", "HEIC", "MP4", "MOV"];

// HEIC et certaines vidéos arrivent sans type MIME (surtout sous Windows) : on se rabat sur l'extension
const MEDIA_EXTENSION = /\.(jpe?g|png|gif|webp|avif|heic|heif|mp4|m4v|mov|avi|webm)$/i;

export function isMediaFile(file: File): boolean {
  return file.type.startsWith("image/") || file.type.startsWith("video/") || MEDIA_EXTENSION.test(file.name);
}

export function fileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(bytes / (1024 * 1024))} Mo`;
}

export function FileDropzone({
  files,
  onAdd,
  onRemove,
  disabled = false,
  labelledBy,
  compact = false,
}: {
  files: File[];
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
  labelledBy?: string;
  // Version basse (une seule ligne) pour les formulaires qui doivent tenir dans l'écran
  compact?: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleList = (list: FileList | null) => {
    if (disabled || !list || list.length === 0) return;
    onAdd(Array.from(list));
    // Vider le champ permet de choisir à nouveau un fichier qu'on vient de retirer
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={`flex flex-col ${compact ? "gap-2" : "gap-3"}`}>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleList(e.dataTransfer.files);
        }}
        className={`flex items-center rounded-xl border-[1.5px] border-dashed transition-colors ${compact ? "gap-3 px-3 py-2.5" : "gap-[18px] p-[18px]"} has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-black ${
          isDragging ? "border-am-navy bg-am-mist/30" : "border-black bg-white"
        } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-am-mist/20"}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*,.heic,.heif"
          multiple
          disabled={disabled}
          aria-labelledby={labelledBy}
          onChange={(e) => handleList(e.target.files)}
          className="sr-only"
        />
        <span
          aria-hidden="true"
          className={`flex flex-none items-center justify-center rounded-full bg-am-mist ${compact ? "h-9 w-9" : "h-12 w-12"}`}
        >
          <Upload className={compact ? "h-4 w-4" : "h-5 w-5"} strokeWidth={2} />
        </span>
        <span className={`flex min-w-0 flex-col ${compact ? "gap-0.5" : "gap-2"}`}>
          <span className={`font-medium leading-snug ${compact ? "text-[15px]" : "text-[16px]"}`}>
            Déposez vos photos ou vidéos, ou <span className="underline underline-offset-4">parcourez</span>
          </span>
          {compact ? (
            <span className={`text-[11px] ${HOME_MONO}`}>{FILE_TYPES.join(" · ")}</span>
          ) : (
            <span className="flex flex-wrap gap-1.5">
              {FILE_TYPES.map((type) => (
                <span key={type} className={`rounded-full border border-black/30 px-2.5 py-0.5 text-xs ${HOME_MONO}`}>
                  {type}
                </span>
              ))}
            </span>
          )}
        </span>
      </label>

      {files.length > 0 && (
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {files.map((file, index) => (
            <li
              key={fileKey(file)}
              className="flex max-w-full items-center gap-2 rounded-full border border-black bg-white py-1 pl-3.5 pr-1 text-[14px]"
            >
              <span className="min-w-0 truncate">{file.name}</span>
              <span className="flex-none text-black/70">{formatSize(file.size)}</span>
              <button
                type="button"
                onClick={() => onRemove(index)}
                disabled={disabled}
                aria-label={`Retirer ${file.name}`}
                className="flex h-8 w-8 flex-none items-center justify-center rounded-full transition-colors hover:bg-am-mist/40"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
