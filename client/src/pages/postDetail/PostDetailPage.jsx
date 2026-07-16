import React from "react";
import { useParams } from "react-router-dom";
import AppLayout from "../../components/appLayout.jsx";
import PostDetailView from "./PostDetailView.jsx";

export default function PostDetailPage() {
  const { postId } = useParams();
  return (
    <AppLayout title="Post">
      <div className="max-w-2xl mx-auto px-3 sm:px-5 py-4 sm:py-6">
        <div className="brutal-card animate-fade-in-up">
          <PostDetailView postId={postId} />
        </div>
      </div>
    </AppLayout>
  );
}
