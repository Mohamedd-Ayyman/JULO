import React from "react";
import { Link } from "react-router-dom";
import Logo from "../../components/Logo.jsx";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute -top-40 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/20 blur-[120px] animate-float" />
      <div className="absolute -bottom-40 right-1/4 w-[500px] h-[500px] rounded-full bg-accent/15 blur-[120px] animate-float" style={{ animationDelay: "2s" }} />

      <div className="text-center max-w-md relative z-10 animate-fade-in-up">
        <div className="flex justify-center mb-8"><Logo size={36} /></div>
        <p className="text-[120px] font-black text-gradient-primary leading-none mb-2 animate-gradient" style={{ backgroundSize: "200% 200%" }}>
          404
        </p>
        <h1 className="text-2xl font-bold text-foreground mb-3">Lost in the cosmos</h1>
        <p className="text-muted-foreground mb-8">
          The page you're looking for drifted into a parallel universe.
        </p>
        <Link to="/" className="btn btn-primary px-7 py-3 text-base">
          Take me home
        </Link>
      </div>
    </div>
  );
}
