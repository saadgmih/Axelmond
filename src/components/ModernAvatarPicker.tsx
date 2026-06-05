import React, { useState, useRef, useEffect } from "react";
import { Camera, Trash2, Check, X, Loader2, ZoomIn, ZoomOut, Move } from "lucide-react";

interface ModernAvatarPickerProps {
  currentAvatarUrl?: string | null;
  userName: string;
  onUpload: (file: File) => Promise<void>;
  onDelete: () => Promise<void>;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const CROP_AREA_SIZE = 280; // Size of the square crop viewport in the modal

export const ModernAvatarPicker: React.FC<ModernAvatarPickerProps> = ({
  currentAvatarUrl,
  userName,
  onUpload,
  onDelete,
  className = "",
  size = "xl",
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Crop & Adjust state
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 }); // Display dimensions at zoom = 1
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 }); // Original image size

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Clean up object URL
  useEffect(() => {
    return () => {
      if (imageSrc && !imageSrc.startsWith("http") && !imageSrc.startsWith("data:")) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [imageSrc]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Veuillez sélectionner une image valide.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) { // 8MB limit
      setErrorMsg("L'image ne doit pas dépasser 8 Mo.");
      return;
    }

    setSelectedFile(file);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    const url = URL.createObjectURL(file);
    setImageSrc(url);
  };

  // Calculate cover size when image loads inside the modal crop container
  const handleImageLoaded = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const nW = img.naturalWidth;
    const nH = img.naturalHeight;
    setNaturalSize({ width: nW, height: nH });

    const cWidth = CROP_AREA_SIZE;
    const cHeight = CROP_AREA_SIZE;

    let fitW = 0;
    let fitH = 0;

    // Cover scale logic
    if (nW / nH > cWidth / cHeight) {
      fitH = cHeight;
      fitW = cHeight * (nW / nH);
    } else {
      fitW = cWidth;
      fitH = cWidth * (nH / nW);
    }

    setImageSize({ width: fitW, height: fitH });
    setPosition({
      x: (cWidth - fitW) / 2,
      y: (cHeight - fitH) / 2,
    });
  };

  // Keep image within container bounds (no white gaps inside crop circle)
  const getBoundedPosition = (x: number, y: number, currentZoom: number) => {
    const cWidth = CROP_AREA_SIZE;
    const cHeight = CROP_AREA_SIZE;

    const w = imageSize.width * currentZoom;
    const h = imageSize.height * currentZoom;

    const minX = cWidth - w;
    const maxX = 0;
    const minY = cHeight - h;
    const maxY = 0;

    const boundedX = w <= cWidth ? (cWidth - w) / 2 : Math.min(maxX, Math.max(minX, x));
    const boundedY = h <= cHeight ? (cHeight - h) / 2 : Math.min(maxY, Math.max(minY, y));

    return { x: boundedX, y: boundedY };
  };

  // Keep centering correct while zooming
  const handleZoomChange = (newZoom: number) => {
    const cWidth = CROP_AREA_SIZE;
    const cHeight = CROP_AREA_SIZE;

    const centerX = (cWidth / 2 - position.x) / zoom;
    const centerY = (cHeight / 2 - position.y) / zoom;

    const nextX = cWidth / 2 - centerX * newZoom;
    const nextY = cHeight / 2 - centerY * newZoom;

    setZoom(newZoom);
    setPosition(getBoundedPosition(nextX, nextY, newZoom));
  };

  // Drag handlers
  const handleStart = (clientX: number, clientY: number) => {
    if (isUploading) return;
    setIsDragging(true);
    setDragStart({
      x: clientX - position.x,
      y: clientY - position.y,
    });
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging || isUploading) return;
    const nextX = clientX - dragStart.x;
    const nextY = clientY - dragStart.y;
    setPosition(getBoundedPosition(nextX, nextY, zoom));
  };

  const handleEnd = () => {
    setIsDragging(false);
  };

  // Save the cropped image
  const handleSave = async () => {
    if (!selectedFile || !imageSrc) return;
    setIsUploading(true);
    setErrorMsg(null);

    try {
      const cWidth = CROP_AREA_SIZE;
      const cropOutputSize = 400; // Output dimension
      const scale = cropOutputSize / cWidth;

      const canvas = document.createElement("canvas");
      canvas.width = cropOutputSize;
      canvas.height = cropOutputSize;
      const ctx = canvas.getContext("2d");

      if (!ctx) throw new Error("Impossible de créer le contexte 2D.");

      const img = new Image();
      img.src = imageSrc;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // Fill canvas background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, cropOutputSize, cropOutputSize);

      // Render the image section into the canvas
      ctx.drawImage(
        img,
        position.x * scale,
        position.y * scale,
        imageSize.width * zoom * scale,
        imageSize.height * zoom * scale
      );

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9);
      });

      if (!blob) throw new Error("Erreur de rendu de l'image.");

      const croppedFile = new File([blob], selectedFile.name, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });

      await onUpload(croppedFile);

      // Reset file and dialog states
      setSelectedFile(null);
      setImageSrc(null);
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur lors de l'ajustement de l'image.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setImageSrc(null);
    setErrorMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    if (!confirm("Voulez-vous vraiment supprimer votre photo de profil ?")) return;
    setIsUploading(true);
    setErrorMsg(null);
    try {
      await onDelete();
      setSelectedFile(null);
      setImageSrc(null);
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur lors de la suppression.");
    } finally {
      setIsUploading(false);
    }
  };

  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "AR";

  const sizeClasses = {
    sm: "w-10 h-10 text-sm",
    md: "w-16 h-16 text-xl",
    lg: "w-24 h-24 text-3xl",
    xl: "w-32 h-32 text-4xl",
  };

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div className="relative group">
        <div
          className={`relative ${sizeClasses[size]} rounded-full overflow-hidden shadow-xl bg-slate-900 flex items-center justify-center font-black text-slate-300 transition-all duration-300 ring-2 ring-offset-2 ring-offset-transparent ring-slate-800 hover:ring-pink-500/80 cursor-pointer hover:scale-105`}
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          {currentAvatarUrl ? (
            <img
              src={currentAvatarUrl}
              alt={userName}
              className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-60"
            />
          ) : (
            initials
          )}

          {/* Hover Camera Icon overlay */}
          {!isUploading && (
            <div className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[2px]">
              <Camera className="w-5 h-5 text-white drop-shadow-lg mb-1 transform group-hover:scale-110 transition-transform duration-300" />
              <span className="text-[9px] font-black text-white uppercase tracking-widest text-center px-1 drop-shadow-md">
                Modifier
              </span>
            </div>
          )}

          {/* Upload loading spinner */}
          {isUploading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-full">
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            </div>
          )}
        </div>

        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Delete button option */}
      {currentAvatarUrl && !isUploading && (
        <button
          onClick={handleDelete}
          disabled={isUploading}
          type="button"
          className="flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400 hover:text-red-500 font-bold transition-all py-1.5 px-3 rounded-lg hover:bg-slate-100 border border-slate-200/50 mt-1"
        >
          <Trash2 className="w-3 h-3" />
          Supprimer
        </button>
      )}

      {/* Error notification outside modal (if upload fails or delete fails) */}
      {errorMsg && !selectedFile && (
        <div className="text-xs font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 text-center max-w-[200px] mt-1">
          {errorMsg}
        </div>
      )}

      {/* Interactive Modal Crop Editor (WhatsApp/Facebook style) */}
      {selectedFile && imageSrc && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm flex flex-col items-center gap-5 shadow-2xl relative text-white animate-in zoom-in-95 duration-200">
            {/* Close button */}
            <button
              onClick={handleCancel}
              disabled={isUploading}
              type="button"
              className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 p-2 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="text-center space-y-1">
              <h3 className="text-base font-black tracking-tight text-slate-100">
                Ajuster la photo de profil
              </h3>
              <p className="text-xs text-slate-400">
                Choisissez la partie à afficher dans le cercle
              </p>
            </div>

            {/* Crop Viewport with image drag listeners */}
            <div
              className="relative w-[280px] h-[280px] overflow-hidden bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
              onMouseDown={(e) => {
                e.preventDefault();
                handleStart(e.clientX, e.clientY);
              }}
              onMouseMove={(e) => {
                handleMove(e.clientX, e.clientY);
              }}
              onMouseUp={handleEnd}
              onMouseLeave={handleEnd}
              onTouchStart={(e) => {
                const touch = e.touches[0];
                handleStart(touch.clientX, touch.clientY);
              }}
              onTouchMove={(e) => {
                const touch = e.touches[0];
                handleMove(touch.clientX, touch.clientY);
              }}
              onTouchEnd={handleEnd}
            >
              {/* Image Preview */}
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Crop preview"
                onLoad={handleImageLoaded}
                className="select-none max-w-none max-h-none absolute pointer-events-none"
                style={{
                  width: imageSize.width,
                  height: imageSize.height,
                  transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                  transformOrigin: "0 0",
                }}
              />

              {/* Circular Cutout Mask Overlay (WhatsApp style) */}
              <div className="absolute inset-0 pointer-events-none rounded-full border-2 border-indigo-500/80 shadow-[0_0_0_9999px_rgba(15,23,42,0.75)]" />
            </div>

            {/* Micro animation details */}
            <div className="flex items-center gap-1.5 text-indigo-400 text-[10px] font-bold uppercase tracking-wider">
              <Move className="w-3.5 h-3.5 animate-pulse" />
              Glissez pour centrer la photo
            </div>

            {/* Zoom controls */}
            <div className="flex items-center gap-3 w-full px-2">
              <ZoomOut className="w-4 h-4 text-slate-500" />
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={zoom}
                disabled={isUploading}
                onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none disabled:opacity-50"
              />
              <ZoomIn className="w-4 h-4 text-slate-500" />
            </div>

            {/* Modal level error messages */}
            {errorMsg && (
              <div className="text-xs font-bold text-red-400 bg-red-950/40 px-3 py-2 rounded-xl border border-red-900/60 text-center w-full">
                {errorMsg}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 w-full mt-1">
              <button
                onClick={handleCancel}
                disabled={isUploading}
                type="button"
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors border border-slate-700/50"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={isUploading}
                type="button"
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/80 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Rendu...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Appliquer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
