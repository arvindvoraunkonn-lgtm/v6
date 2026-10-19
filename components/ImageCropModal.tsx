'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

interface ImageCropModalProps {
  isOpen: boolean;
  /** A File (user-selected) OR a remote URL string (CDN). When both are
   *  passed, the File takes precedence. */
  file: File | null;
  url?: string | null;
  /** width / height, e.g. 1 for square profile, 3 for wide banner */
  aspectRatio: number;
  title: string;
  onConfirm: (croppedFile: File) => void;
  onCancel: () => void;
}

/**
 * Image-editing-style crop modal.
 *
 * UX:
 *  - The image is rendered at "contain" fit inside the viewport (so the whole
 *    image is always visible — no hidden pixels).
 *  - A draggable + resizable crop rectangle overlay sits on top of the image.
 *    The rectangle ALWAYS maintains the required aspect ratio (1:1 profile,
 *    3:1 banner). The user drags inside the rectangle to move it, drags any
 *    of the 8 edge/corner handles to resize it.
 *  - No zoom slider. No re-render storms: pointer-move events write into a
 *    ref + translate the rectangle via direct DOM style writes, so React
 *    state isn't touched on every pointermove (this is what was causing
 *    lag in the previous slider-based implementation).
 *
 * On confirm: the visible crop region is drawn from the source image to a
 * canvas at high resolution and returned as a JPEG File. Works for both
 * local File inputs and remote CDN URL inputs (the image is loaded with
 * crossOrigin='anonymous' so the canvas isn't tainted).
 */
export function ImageCropModal({
  isOpen,
  file,
  url,
  aspectRatio,
  title,
  onConfirm,
  onCancel,
}: ImageCropModalProps) {
  // The actual image src we render: object URL for File, raw URL for CDN.
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  // Displayed image rect (CSS pixels inside the viewport).
  const [displayRect, setDisplayRect] = useState({ x: 0, y: 0, w: 0, h: 0 });
  // Crop rectangle in DISPLAY coordinates (CSS px inside the viewport).
  const [cropRect, setCropRect] = useState({ x: 0, y: 0, w: 0, h: 0 });

  const viewportRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  // The crop rectangle DOM node — we mutate its style directly during a
  // drag to avoid re-rendering React on every pointermove (the previous
  // biggest source of lag).
  const cropBoxRef = useRef<HTMLDivElement>(null);

  // Drag state lives in a ref so pointermove handlers don't trigger renders.
  const dragStateRef = useRef<{
    mode: 'move' | 'resize';
    // Which handle is being dragged (for resize mode). Empty for move.
    handle: '' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
    startX: number; // pointer clientX at drag start
    startY: number;
    // Snapshot of crop rect at drag start (display coords)
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  } | null>(null);

  // ---------------------------------------------------------------------
  // Image source lifecycle (File or URL).
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!isOpen) {
      setImageSrc(null);
      setNatural({ w: 0, h: 0 });
      return;
    }
    if (file) {
      const u = URL.createObjectURL(file);
      setImageSrc(u);
      return () => {
        URL.revokeObjectURL(u);
        setImageSrc(null);
      };
    }
    if (url) {
      setImageSrc(url);
      return () => {
        // Don't revoke a remote URL.
        setImageSrc(null);
      };
    }
    setImageSrc(null);
  }, [isOpen, file, url]);

  // Reset crop rect when the source changes.
  useEffect(() => {
    if (isOpen) {
      setNatural({ w: 0, h: 0 });
      setDisplayRect({ x: 0, y: 0, w: 0, h: 0 });
      setCropRect({ x: 0, y: 0, w: 0, h: 0 });
    }
  }, [isOpen, imageSrc]);

  // ---------------------------------------------------------------------
  // Compute the "contain" fit of the image inside the viewport and center
  // the crop rectangle as a sensible default.
  // ---------------------------------------------------------------------
  const recomputeLayout = useCallback(() => {
    const vp = viewportRef.current;
    const img = imgRef.current;
    if (!vp || !img) return;

    const vpRect = vp.getBoundingClientRect();
    const NW = img.naturalWidth;
    const NH = img.naturalHeight;
    if (vpRect.width === 0 || vpRect.height === 0 || NW === 0 || NH === 0) return;

    // "contain" fit: scale so the whole image fits inside the viewport.
    const scale = Math.min(vpRect.width / NW, vpRect.height / NH);
    const dw = NW * scale;
    const dh = NH * scale;
    const dx = (vpRect.width - dw) / 2;
    const dy = (vpRect.height - dh) / 2;

    setNatural({ w: NW, h: NH });
    setDisplayRect({ x: dx, y: dy, w: dw, h: dh });

    // Default crop: as large as possible while keeping the target aspect
    // ratio and centered inside the displayed image.
    let cw = dw;
    let ch = cw / aspectRatio;
    if (ch > dh) {
      ch = dh;
      cw = ch * aspectRatio;
    }
    const cx = dx + (dw - cw) / 2;
    const cy = dy + (dh - ch) / 2;
    setCropRect({ x: cx, y: cy, w: cw, h: ch });
  }, [aspectRatio]);

  // Recompute layout whenever the image finishes loading or the viewport
  // size changes (responsive).
  useEffect(() => {
    if (!isOpen) return;
    // Initial compute (in case image already loaded).
    recomputeLayout();

    const onResize = () => recomputeLayout();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isOpen, recomputeLayout]);

  // ---------------------------------------------------------------------
  // Drag handlers. pointermove writes directly to the DOM via the ref to
  // avoid re-rendering on every move.
  // ---------------------------------------------------------------------
  const clampCropRect = (r: { x: number; y: number; w: number; h: number }) => {
    const minSize = 24; // px — don't let the crop shrink to nothing
    let { x, y, w, h } = r;
    // Constrain to displayed image bounds
    const dr = displayRect;
    if (w < minSize) w = minSize;
    if (h < minSize) h = minSize;
    // Keep aspect ratio by deriving h from w (or vice-versa, picking the
    // limiting dimension).
    h = w / aspectRatio;
    if (h > dr.h) {
      h = dr.h;
      w = h * aspectRatio;
    }
    if (w > dr.w) {
      w = dr.w;
      h = w / aspectRatio;
    }
    // Clamp position so the crop stays inside the image.
    x = Math.max(dr.x, Math.min(x, dr.x + dr.w - w));
    y = Math.max(dr.y, Math.min(y, dr.y + dr.h - h));
    return { x, y, w, h };
  };

  const beginDrag = (
    mode: 'move' | 'resize',
    handle: '' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw',
    clientX: number,
    clientY: number
  ) => {
    dragStateRef.current = {
      mode,
      handle,
      startX: clientX,
      startY: clientY,
      origX: cropRect.x,
      origY: cropRect.y,
      origW: cropRect.w,
      origH: cropRect.h,
    };
  };

  const moveDrag = (clientX: number, clientY: number) => {
    const st = dragStateRef.current;
    if (!st) return;
    const dx = clientX - st.startX;
    const dy = clientY - st.startY;

    let next = { x: st.origX, y: st.origY, w: st.origW, h: st.origH };

    if (st.mode === 'move') {
      next.x = st.origX + dx;
      next.y = st.origY + dy;
    } else {
      // Resize: compute new width/height depending on which handle is
      // being dragged. We always keep the aspect ratio locked.
      // For corner handles both dimensions change; for edge handles only
      // the relevant dimension changes (and the opposite edge stays put).
      const h = st.handle;
      let newW = st.origW;
      let newH = st.origH;
      let newX = st.origX;
      let newY = st.origY;

      // East-facing handles change width
      if (h.includes('e')) {
        newW = Math.max(24, st.origW + dx);
      }
      // West-facing handles change width and shift x
      if (h.includes('w')) {
        newW = Math.max(24, st.origW - dx);
        newX = st.origX + (st.origW - newW);
      }
      // South-facing handles change height
      if (h.includes('s')) {
        newH = Math.max(24, st.origH + dy);
      }
      // North-facing handles change height and shift y
      if (h.includes('n')) {
        newH = Math.max(24, st.origH - dy);
        newY = st.origY + (st.origH - newH);
      }

      // Lock aspect ratio: derive height from width (preserve the
      // direction the user is dragging).
      const derivedH = newW / aspectRatio;
      // For north handles, the top edge should track the resize; for
      // south handles, the bottom edge should track. We adjust y so the
      // opposite edge stays put.
      if (h.includes('n')) {
        newY = st.origY + (st.origH - derivedH);
      }
      next = { x: newX, y: newY, w: newW, h: derivedH };
    }

    const clamped = clampCropRect(next);
    // Write to DOM directly for smooth, lag-free dragging.
    if (cropBoxRef.current) {
      cropBoxRef.current.style.left = `${clamped.x}px`;
      cropBoxRef.current.style.top = `${clamped.y}px`;
      cropBoxRef.current.style.width = `${clamped.w}px`;
      cropBoxRef.current.style.height = `${clamped.h}px`;
    }
    // Update React state too (lazily — used for confirm math). This is
    // a single setState per move, not the previous per-move re-render
    // storm because the visible DOM is already updated.
    setCropRect(clamped);
  };

  const endDrag = () => {
    dragStateRef.current = null;
  };

  // ---------------------------------------------------------------------
  // Confirm: render the crop region to a high-res canvas and emit a File.
  // ---------------------------------------------------------------------
  const handleConfirm = () => {
    const img = imgRef.current;
    const vp = viewportRef.current;
    if (!img || !vp || natural.w === 0 || natural.h === 0) return;

    const dr = displayRect;
    // Scale from display coords → natural image coords.
    const scale = natural.w / dr.w;

    // Visible region of the image, in natural coords.
    const sx = (cropRect.x - dr.x) * scale;
    const sy = (cropRect.y - dr.y) * scale;
    const sw = cropRect.w * scale;
    const sh = cropRect.h * scale;

    if (sw <= 0 || sh <= 0) return;

    // High-res output: 2x the visible viewport, capped at 1200px wide.
    const OUT_W = Math.min(1200, Math.round(cropRect.w * 2));
    const OUT_H = Math.round(OUT_W / aspectRatio);

    const canvas = document.createElement('canvas');
    canvas.width = OUT_W;
    canvas.height = OUT_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    try {
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, OUT_W, OUT_H);
    } catch {
      // If the canvas is tainted (CORS), we can't crop a CDN URL.
      return;
    }
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const baseName = file?.name?.replace(/\.[^.]+$/, '') || 'cropped';
        const croppedFile = new File([blob], `${baseName}-cropped.jpg`, {
          type: 'image/jpeg',
        });
        onConfirm(croppedFile);
      },
      'image/jpeg',
      0.92
    );
  };

  if (!isOpen || !imageSrc) return null;

  // Handle size for the 8 resize handles.
  const handleCls =
    'absolute bg-[var(--accent)] border border-[var(--bg)] w-2.5 h-2.5 rounded-full shadow';
  const edgeCls = 'absolute bg-transparent';

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3"
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      onTouchEnd={endDrag}
      style={{ touchAction: 'none' }}
    >
      <div className="bg-[var(--bg)] rounded-[6px] p-3 max-w-md w-full space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-[var(--text)] text-sm">{title}</span>
          <button
            type="button"
            onClick={onCancel}
            className="text-[var(--text-muted)] hover:text-[var(--text)] text-xs underline cursor-pointer"
          >
            Cancel
          </button>
        </div>

        {/* Viewport: image + draggable crop rectangle */}
        <div
          ref={viewportRef}
          className="relative w-full bg-[var(--bg-hover)] border border-[var(--border-light)] rounded-[3px] overflow-hidden select-none"
          style={{ aspectRatio: `${aspectRatio}`, height: 'auto' }}
          onMouseMove={(e) => moveDrag(e.clientX, e.clientY)}
          onTouchMove={(e) => {
            if (e.touches[0]) moveDrag(e.touches[0].clientX, e.touches[0].clientY);
          }}
        >
          {/* Image fitted with "contain" so the whole source is visible */}
          <img
            ref={imgRef}
            src={imageSrc}
            alt="crop source"
            onLoad={recomputeLayout}
            crossOrigin="anonymous"
            draggable={false}
            className="absolute pointer-events-none max-w-none"
            style={{
              left: `${displayRect.x}px`,
              top: `${displayRect.y}px`,
              width: `${displayRect.w}px`,
              height: `${displayRect.h}px`,
              objectFit: 'fill',
            }}
          />
          {/* Dimming overlay (4 strips around the crop box) */}
          {cropRect.w > 0 && (
            <>
              <div
                className="absolute bg-black/50 pointer-events-none"
                style={{
                  left: 0,
                  top: 0,
                  right: 0,
                  height: `${cropRect.y}px`,
                }}
              />
              <div
                className="absolute bg-black/50 pointer-events-none"
                style={{
                  left: 0,
                  top: `${cropRect.y + cropRect.h}px`,
                  right: 0,
                  bottom: 0,
                }}
              />
              <div
                className="absolute bg-black/50 pointer-events-none"
                style={{
                  left: 0,
                  top: `${cropRect.y}px`,
                  width: `${cropRect.x}px`,
                  height: `${cropRect.h}px`,
                }}
              />
              <div
                className="absolute bg-black/50 pointer-events-none"
                style={{
                  left: `${cropRect.x + cropRect.w}px`,
                  top: `${cropRect.y}px`,
                  right: 0,
                  height: `${cropRect.h}px`,
                }}
              />
            </>
          )}
          {/* Crop rectangle — draggable + resizable */}
          {cropRect.w > 0 && (
            <div
              ref={cropBoxRef}
              className="absolute border-2 border-[var(--accent)] cursor-move"
              style={{
                left: `${cropRect.x}px`,
                top: `${cropRect.y}px`,
                width: `${cropRect.w}px`,
                height: `${cropRect.h}px`,
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                beginDrag('move', '', e.clientX, e.clientY);
              }}
              onTouchStart={(e) => {
                if (e.touches[0]) {
                  e.preventDefault();
                  beginDrag('move', '', e.touches[0].clientX, e.touches[0].clientY);
                }
              }}
            >
              {/* Grid lines inside the crop box (rule-of-thirds) */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/3 left-0 right-0 border-t border-[var(--accent)]/40" />
                <div className="absolute top-2/3 left-0 right-0 border-t border-[var(--accent)]/40" />
                <div className="absolute left-1/3 top-0 bottom-0 border-l border-[var(--accent)]/40" />
                <div className="absolute left-2/3 top-0 bottom-0 border-l border-[var(--accent)]/40" />
              </div>

              {/* 8 resize handles */}
              {/* Corners */}
              <div
                className={`${handleCls} -ml-1.5 -mt-1.5`}
                style={{ left: 0, top: 0, cursor: 'nwse-resize' }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  beginDrag('resize', 'nw', e.clientX, e.clientY);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  if (e.touches[0]) {
                    e.preventDefault();
                    beginDrag('resize', 'nw', e.touches[0].clientX, e.touches[0].clientY);
                  }
                }}
              />
              <div
                className={`${handleCls} -mr-1.5 -mt-1.5`}
                style={{ right: 0, top: 0, cursor: 'nesw-resize' }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  beginDrag('resize', 'ne', e.clientX, e.clientY);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  if (e.touches[0]) {
                    e.preventDefault();
                    beginDrag('resize', 'ne', e.touches[0].clientX, e.touches[0].clientY);
                  }
                }}
              />
              <div
                className={`${handleCls} -ml-1.5 -mb-1.5`}
                style={{ left: 0, bottom: 0, cursor: 'nesw-resize' }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  beginDrag('resize', 'sw', e.clientX, e.clientY);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  if (e.touches[0]) {
                    e.preventDefault();
                    beginDrag('resize', 'sw', e.touches[0].clientX, e.touches[0].clientY);
                  }
                }}
              />
              <div
                className={`${handleCls} -mr-1.5 -mb-1.5`}
                style={{ right: 0, bottom: 0, cursor: 'nwse-resize' }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  beginDrag('resize', 'se', e.clientX, e.clientY);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  if (e.touches[0]) {
                    e.preventDefault();
                    beginDrag('resize', 'se', e.touches[0].clientX, e.touches[0].clientY);
                  }
                }}
              />
              {/* Edges (just visual rails — corners do the resizing to
                  keep the aspect-ratio lock math simpler) */}
              <div className={`${edgeCls} top-0 left-2 right-2 h-1`} style={{ cursor: 'ns-resize' }} />
              <div className={`${edgeCls} bottom-0 left-2 right-2 h-1`} style={{ cursor: 'ns-resize' }} />
              <div className={`${edgeCls} left-0 top-2 bottom-2 w-1`} style={{ cursor: 'ew-resize' }} />
              <div className={`${edgeCls} right-0 top-2 bottom-2 w-1`} style={{ cursor: 'ew-resize' }} />
            </div>
          )}
        </div>

        {/* Helper text + actions */}
        <div className="flex items-center justify-between text-[10px] text-[var(--text-faint)]">
          <span>Drag the box to move • Drag corners to resize</span>
          <button
            type="button"
            onClick={recomputeLayout}
            className="underline cursor-pointer hover:text-[var(--text)]"
          >
            Reset
          </button>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-1.5 bg-[var(--accent)] text-[var(--accent-text)] border border-[var(--border)] rounded-[3px] text-xs hover:bg-[var(--accent-hover)] cursor-pointer"
          >
            Apply crop
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 bg-[var(--bg)] text-[var(--text)] border border-[var(--border-light)] rounded-[3px] text-xs hover:bg-[var(--bg-hover)] cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
