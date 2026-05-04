import React from "react";
import { Navigate } from "react-router-dom";

/**
 * Home — entry point for authenticated users; routes to the main feed.
 */
export default function Home() {
  return <Navigate to="/feed" replace />;
}
