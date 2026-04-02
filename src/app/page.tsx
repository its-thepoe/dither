"use client";

import { useRef, useCallback, useState } from "react";
import ParticleCanvas from "@/components/particle-canvas";
import { WordmarkSvg } from "@/components/wordmark-svg";

const footerLinkClass =
  "pointer-events-auto inline-flex items-end text-black/45 underline-offset-2 transition-colors duration-200 ease hover:text-black/70 hover:underline motion-reduce:transition-none";

const footerWordmarkClass = "h-4 w-auto shrink-0";

const poeWordmarkLinkClass = `${footerLinkClass} translate-y-[5px]`;

export default function Home() {
  const [imageSrc, setImageSrc] = useState("/linear-app-icon.png");
  const inputRef = useRef<HTMLInputElement>(null);
  const blobUrlRef = useRef<string | null>(null);

  const handleUpload = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      const url = URL.createObjectURL(file);
      blobUrlRef.current = url;
      setImageSrc(url);
    }
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden">
      <ParticleCanvas
        imageSrc={imageSrc}
        onUploadRequest={handleUpload}
        onLogoPresetChange={setImageSrc}
      />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
      <span className="absolute bottom-3 left-3 text-[11px] text-black/35 pointer-events-none select-none">
        Dither Playground
      </span>
      <span className="absolute bottom-3 right-3 inline-flex flex-wrap items-end justify-end gap-x-1 text-[11px] text-black/35 select-none text-right leading-none">
        <span className="pb-px">Built by</span>{" "}
        <a
          href="https://thepoe.xyz/"
          target="_blank"
          rel="noopener noreferrer"
          className={poeWordmarkLinkClass}
          aria-label="The Poe"
        >
          <WordmarkSvg variant="light" className={footerWordmarkClass} />
        </a>{" "}
        <span className="text-black/25">•</span>{" "}
        <a
          href="https://github.com/its-thepoe/dither"
          target="_blank"
          rel="noopener noreferrer"
          className={footerLinkClass}
        >
          GitHub
        </a>
      </span>
    </div>
  );
}
