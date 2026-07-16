import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import PostDetailView from "./PostDetailView.jsx";

export default function PostDetailModal() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();

  const isModal = location.state?.modal;
  const postId = params.postId;

  if (!isModal || !postId) return null;

  const close = () => navigate(-1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={close}
    >
      <div
        className="brutal-card w-full max-w-2xl max-h-[90vh] overflow-auto animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <PostDetailView postId={postId} onClose={close} />
      </div>
    </div>
  );
}
