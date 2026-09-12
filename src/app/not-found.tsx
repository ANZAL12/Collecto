import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background text-foreground">
      <div className="w-full max-w-md text-center space-y-4">
        {/* Funny Meme Image without container */}
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/not-found.png"
            alt="Page Not Found"
            className="w-64 max-w-[280px] h-auto object-contain"
          />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-4xl font-extrabold tracking-tight font-mono text-foreground">404</h1>
          <h2 className="text-base font-semibold text-foreground">Page Not Found thirich poykkooo</h2>
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
