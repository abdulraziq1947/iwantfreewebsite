import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  categoryLabel,
  MAX_UPLOAD_BYTES,
  UPLOAD_CATEGORIES,
  type UploadCategory,
} from "../lib/image-sniff";

export type UploadDto = {
  id: string;
  category: string;
  originalFilename: string;
  contentType: string;
  byteSize: number;
  createdAt: string;
  contentUrl: string;
};

type QueuedFile = {
  localId: string;
  file: File;
  category: UploadCategory;
  progress: number;
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
  previewUrl: string;
  upload?: UploadDto;
};

type MediaUploaderProps = {
  /** "order" uses pre-account upload session; "organisation" uses Better Auth. */
  mode: "order" | "organisation";
  organisationId?: string;
  title?: string;
  description?: string;
  /** Lock uploads to one category and hide the type selector. */
  fixedCategory?: UploadCategory;
};

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaUploader({
  mode,
  organisationId,
  title = "Upload images",
  description = "JPG, PNG or WebP · max 10 MB each · stored privately until your site is built.",
  fixedCategory,
}: MediaUploaderProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<UploadCategory>(
    fixedCategory ?? "logo",
  );
  const [uploads, setUploads] = useState<UploadDto[]>([]);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [ready, setReady] = useState(mode === "organisation");
  const [bootError, setBootError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const uploadingRef = useRef(false);
  const previewUrlsRef = useRef<Set<string>>(new Set());
  const activeCategory = fixedCategory ?? category;

  const listUrl =
    mode === "organisation" && organisationId
      ? `/api/uploads/organisation/${organisationId}`
      : "/api/uploads";
  const postUrl =
    mode === "organisation" && organisationId
      ? `/api/uploads/organisation/${organisationId}`
      : "/api/uploads";

  const refreshList = useCallback(async () => {
    const res = await fetch(listUrl, { credentials: "same-origin" });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error || "Could not load uploads.");
    }
    const body = (await res.json()) as { uploads: UploadDto[] };
    setUploads(body.uploads);
  }, [listUrl]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (mode === "order") {
          const sessionRes = await fetch("/api/uploads/session", {
            method: "POST",
            credentials: "same-origin",
          });
          if (!sessionRes.ok) {
            const body = (await sessionRes.json().catch(() => ({}))) as {
              error?: string;
            };
            throw new Error(
              body.error || "Uploads unavailable right now. You can continue and add files later.",
            );
          }
        }
        if (!cancelled) {
          await refreshList();
          setReady(true);
          setBootError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setBootError(
            error instanceof Error ? error.message : "Uploads unavailable.",
          );
          setReady(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, refreshList]);

  useEffect(() => {
    const urls = previewUrlsRef.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);

  const enqueueFiles = useCallback(
    (files: FileList | File[]) => {
      const next: QueuedFile[] = [];
      for (const file of Array.from(files)) {
        const previewUrl = URL.createObjectURL(file);
        previewUrlsRef.current.add(previewUrl);
        if (file.size > MAX_UPLOAD_BYTES) {
          next.push({
            localId: crypto.randomUUID(),
            file,
            category: activeCategory,
            progress: 0,
            status: "error",
            error: "File exceeds 10 MB.",
            previewUrl,
          });
          continue;
        }
        next.push({
          localId: crypto.randomUUID(),
          file,
          category: activeCategory,
          progress: 0,
          status: "queued",
          previewUrl,
        });
      }
      setQueue((prev) => [...prev, ...next]);
    },
    [activeCategory],
  );

  const uploadOne = useCallback(
    async (item: QueuedFile) => {
      setQueue((prev) =>
        prev.map((q) =>
          q.localId === item.localId
            ? { ...q, status: "uploading", progress: 15, error: undefined }
            : q,
        ),
      );

      const form = new FormData();
      form.set("category", item.category);
      form.set("file", item.file, item.file.name);

      try {
        // Fake progress pulse while waiting (fetch has no upload progress in Workers UI).
        const pulse = window.setInterval(() => {
          setQueue((prev) =>
            prev.map((q) =>
              q.localId === item.localId && q.status === "uploading"
                ? { ...q, progress: Math.min(90, q.progress + 12) }
                : q,
            ),
          );
        }, 180);

        const res = await fetch(postUrl, {
          method: "POST",
          body: form,
          credentials: "same-origin",
        });
        window.clearInterval(pulse);

        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          upload?: UploadDto;
        };
        if (!res.ok || !body.upload) {
          throw new Error(body.error || "Upload failed.");
        }

        const dto: UploadDto = {
          ...body.upload,
          contentUrl:
            body.upload.contentUrl || `/api/uploads/${body.upload.id}/content`,
        };

        setQueue((prev) =>
          prev.map((q) =>
            q.localId === item.localId
              ? { ...q, status: "done", progress: 100, upload: dto }
              : q,
          ),
        );
        setUploads((prev) => {
          if (prev.some((u) => u.id === dto.id)) return prev;
          return [dto, ...prev];
        });
      } catch (error) {
        setQueue((prev) =>
          prev.map((q) =>
            q.localId === item.localId
              ? {
                  ...q,
                  status: "error",
                  progress: 0,
                  error:
                    error instanceof Error ? error.message : "Upload failed.",
                }
              : q,
          ),
        );
      }
    },
    [postUrl],
  );

  useEffect(() => {
    if (uploadingRef.current) return;
    const next = queue.find((q) => q.status === "queued");
    if (!next || !ready) return;
    uploadingRef.current = true;
    void uploadOne(next).finally(() => {
      uploadingRef.current = false;
    });
  }, [queue, ready, uploadOne]);

  async function removeUpload(id: string) {
    const res = await fetch(`/api/uploads/${id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setBootError(body.error || "Could not remove image.");
      return;
    }
    setUploads((prev) => prev.filter((u) => u.id !== id));
    setQueue((prev) => prev.filter((q) => q.upload?.id !== id));
  }

  function retryItem(localId: string) {
    setQueue((prev) =>
      prev.map((q) =>
        q.localId === localId
          ? { ...q, status: "queued", progress: 0, error: undefined }
          : q,
      ),
    );
  }

  function dismissQueueItem(localId: string) {
    setQueue((prev) => {
      const item = prev.find((q) => q.localId === localId);
      if (item) {
        URL.revokeObjectURL(item.previewUrl);
        previewUrlsRef.current.delete(item.previewUrl);
      }
      return prev.filter((q) => q.localId !== localId);
    });
  }

  const visibleQueue = queue.filter((q) => q.status !== "done");
  const visibleUploads = fixedCategory
    ? uploads.filter((u) => u.category === fixedCategory)
    : uploads;

  return (
    <section className="iwfw-uploader" aria-label={title}>
      <div className="iwfw-uploader__head">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

      {bootError && (
        <p className="iwfw-uploader__banner" role="status">
          {bootError}
        </p>
      )}

      {!fixedCategory && (
        <div className="iwfw-uploader__toolbar">
          <label className="iwfw-field iwfw-uploader__category">
            <span>Image type</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as UploadCategory)}
            >
              {UPLOAD_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {categoryLabel(c)}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div
        className={`iwfw-uploader__drop${dragging ? " is-dragging" : ""}${!ready ? " is-disabled" : ""}`}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!ready) return;
          if (e.dataTransfer.files?.length) enqueueFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          multiple
          className="iwfw-uploader__input"
          disabled={!ready}
          onChange={(e) => {
            if (e.target.files?.length) enqueueFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <p className="iwfw-uploader__drop-title">
          Drag &amp; drop images here
        </p>
        <p className="iwfw-uploader__drop-hint">
          or{" "}
          <button
            type="button"
            className="iwfw-uploader__browse"
            disabled={!ready}
            onClick={() => inputRef.current?.click()}
          >
            browse files
          </button>
        </p>
      </div>

      {visibleQueue.length > 0 && (
        <ul className="iwfw-uploader__queue">
          {visibleQueue.map((item) => (
            <li key={item.localId} className="iwfw-uploader__item">
              <img
                src={item.previewUrl}
                alt=""
                className="iwfw-uploader__thumb"
              />
              <div className="iwfw-uploader__meta">
                <strong>{item.file.name}</strong>
                <span>
                  {categoryLabel(item.category)} · {formatBytes(item.file.size)}
                </span>
                {item.status === "uploading" && (
                  <div
                    className="iwfw-uploader__bar"
                    role="progressbar"
                    aria-valuenow={item.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <span style={{ width: `${item.progress}%` }} />
                  </div>
                )}
                {item.error && (
                  <span className="iwfw-uploader__error">{item.error}</span>
                )}
              </div>
              <div className="iwfw-uploader__actions">
                {item.status === "error" && (
                  <button
                    type="button"
                    className="iwfw-btn iwfw-btn--outline"
                    onClick={() => retryItem(item.localId)}
                  >
                    Retry
                  </button>
                )}
                {item.status !== "uploading" && (
                  <button
                    type="button"
                    className="iwfw-btn iwfw-btn--outline"
                    onClick={() => dismissQueueItem(item.localId)}
                  >
                    Dismiss
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {visibleUploads.length > 0 && (
        <ul className="iwfw-uploader__grid">
          {visibleUploads.map((u) => (
            <li key={u.id} className="iwfw-uploader__card">
              <a
                href={u.contentUrl}
                target="_blank"
                rel="noreferrer"
                className="iwfw-uploader__preview-link"
              >
                <img
                  src={u.contentUrl}
                  alt={u.originalFilename}
                  className="iwfw-uploader__preview"
                  loading="lazy"
                />
              </a>
              <div className="iwfw-uploader__card-body">
                <strong>{u.originalFilename}</strong>
                <span>
                  {categoryLabel(
                    (UPLOAD_CATEGORIES as readonly string[]).includes(u.category)
                      ? (u.category as UploadCategory)
                      : "other",
                  )}{" "}
                  · {formatBytes(u.byteSize)}
                </span>
                <button
                  type="button"
                  className="iwfw-btn iwfw-btn--outline iwfw-uploader__remove"
                  onClick={() => void removeUpload(u.id)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {ready && visibleUploads.length === 0 && visibleQueue.length === 0 && (
        <p className="iwfw-uploader__empty">No images uploaded yet.</p>
      )}
    </section>
  );
}
