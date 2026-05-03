/**
 * useOptimisticAvatar — optimistic UI pattern for avatar uploads.
 *
 * Flow:
 *  1. User picks file → preview shown instantly (no waiting)
 *  2. uploadAvatar() fires immediately (background)
 *  3. On success: Redux updated, cache busted
 *  4. On failure: rollback to previous URL + toast error
 *
 * Usage:
 *   const { optimisticUpload, previewUrl, uploading } = useOptimisticAvatar();
 *
 * The previewUrl is set synchronously on file select (blob URL) so the UI
 * updates instantly — even before the API call starts.
 */
import { useCallback, useState } from "react";
import { useDispatch } from "react-redux";
import { updateUserAvatar } from "../redux/usersSlice.js";

export function useOptimisticAvatar({ currentAvatar, onSuccess, onError } = {}) {
  const dispatch = useDispatch();
  const [previewUrl, setPreviewUrl] = useState(currentAvatar || null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  /**
   * Set preview from a file (blob URL) — instant, no side effects.
   */
  const setPreview = useCallback((file) => {
    if (!file) {
      setPreviewUrl(currentAvatar || null);
      return;
    }
    const blob = URL.createObjectURL(file);
    setPreviewUrl(blob);
  }, [currentAvatar]);

  /**
   * Upload with optimistic rollback.
   * @param {File} file - the avatar image file
   * @param {Function} uploadFn - async upload function (receives file)
   * @param {string} previousUrl - URL to rollback to on failure
   */
  const optimisticUpload = useCallback(
    async (file, uploadFn, previousUrl = currentAvatar) => {
      if (!file) return { success: false, message: "No file provided" };

      // ── Step 1: Show blob preview instantly ─────────────────────────────
      const blobUrl = URL.createObjectURL(file);
      setPreviewUrl(blobUrl);

      // ── Step 2: Fire API call ───────────────────────────────────────────
      setUploading(true);
      setUploadError(null);

      try {
        const result = await uploadFn(file);

        if (!result.success) {
          // ── Rollback ──────────────────────────────────────────────────
          setPreviewUrl(previousUrl);
          setUploadError(result.message || "Upload failed");
          onError?.(result.message || "Upload failed");
          return result;
        }

        // ── Step 3: Commit to Redux + bust cache ─────────────────────────
        const newUrl = result.data?.url || result.url;
        if (newUrl) {
          dispatch(updateUserAvatar(newUrl));
          // Cache-bust: append ?t=timestamp to avoid stale CDN cached avatar
          const bustUrl = `${newUrl}${newUrl.includes("?") ? "&" : "?"}t=${Date.now()}`;
          setPreviewUrl(bustUrl);
        }

        onSuccess?.(result);
        return result;

      } catch (err) {
        // ── Network error rollback ─────────────────────────────────────
        setPreviewUrl(previousUrl);
        setUploadError("Network error — please try again");
        onError?.("Network error — please try again");
        return { success: false, message: "Network error — please try again" };
      } finally {
        setUploading(false);
      }
    },
    [dispatch, currentAvatar, onSuccess, onError]
  );

  /**
   * Revert to a given URL without triggering an upload.
   * Used when user cancels or on validation failure.
   */
  const revert = useCallback((url) => {
    setPreviewUrl(url || currentAvatar || null);
    setUploadError(null);
  }, [currentAvatar]);

  return {
    optimisticUpload,
    setPreview,
    revert,
    previewUrl,
    uploading,
    uploadError,
  };
}

/**
 * useOptimisticUpdate — optimistic UI pattern for like/bookmark toggles.
 * Extended to also support arbitrary field updates.
 */
export function useOptimisticUpdate({ id, field, countField, dispatch, apiFn }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const optimisticToggle = useCallback(
    async (currentValue, currentCount) => {
      setLoading(true);
      setError(null);

      dispatch({
        type: "post/updatePost",
        payload: {
          _id: id,
          [field]: !currentValue,
          [countField]: currentValue ? Math.max(0, currentCount - 1) : currentCount + 1,
        },
      });

      try {
        const result = await apiFn(id);
        if (!result.success) {
          dispatch({
            type: "post/updatePost",
            payload: { _id: id, [field]: currentValue, [countField]: currentCount },
          });
          setError(result.message || "Action failed");
        }
      } catch {
        dispatch({
          type: "post/updatePost",
          payload: { _id: id, [field]: currentValue, [countField]: currentCount },
        });
        setError("Network error");
      } finally {
        setLoading(false);
      }
    },
    [id, field, countField, dispatch, apiFn]
  );

  return { optimisticToggle, loading, error };
}

/**
 * useOptimisticMessage — optimistic message send for chat.
 */
export function useOptimisticMessage({ onSend }) {
  const [sending, setSending] = useState(false);

  const sendOptimistic = useCallback(
    async (chatId, text, tempId) => {
      setSending(true);
      try {
        const result = await onSend(chatId, text);
        setSending(false);
        return result;
      } catch {
        setSending(false);
        throw new Error("Failed to send message");
      }
    },
    [onSend]
  );

  return { sendOptimistic, sending };
}