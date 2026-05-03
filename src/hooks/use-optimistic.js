import { useCallback, useState } from "react";
import { useDispatch } from "react-redux";
import { updatePost } from "../redux/postSlice.js";

/**
 * useOptimisticUpdate — optimistic UI pattern for like/bookmark toggles.
 *
 * Usage:
 *   const { optimisticToggle } = useOptimisticUpdate({
 *     id: postId,
 *     field: "liked",
 *     countField: "likeCount",
 *     dispatch,
 *     apiFn: (id) => likePost(id),
 *   });
 *   await optimisticToggle();
 */
export function useOptimisticUpdate({ id, field, countField, dispatch, apiFn }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const optimisticToggle = useCallback(
    async (currentValue, currentCount) => {
      setLoading(true);
      setError(null);

      // 1. Optimistic update (invert current value)
      dispatch(updatePost({
        _id: id,
        [field]: !currentValue,
        [countField]: currentValue ? Math.max(0, currentCount - 1) : currentCount + 1,
      }));

      try {
        const result = await apiFn(id);
        if (!result.success) {
          // Rollback on failure
          dispatch(updatePost({
            _id: id,
            [field]: currentValue,
            [countField]: currentCount,
          }));
          setError(result.message || "Action failed");
        }
      } catch {
        // Rollback on network error
        dispatch(updatePost({
          _id: id,
          [field]: currentValue,
          [countField]: currentCount,
        }));
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