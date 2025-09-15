import React from "react";

const LoadingIndicator = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <span className="h-20 w-20 border-8 border-gray-300 border-t-blue-600 rounded-full animate-spin"></span>
    </div>
  );
};

export default LoadingIndicator;
