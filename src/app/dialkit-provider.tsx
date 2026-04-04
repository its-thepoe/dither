"use client";

import { DialRoot } from "dialkit";
import "dialkit/styles.css";
import { useIsMobile } from "@its-thepoe/dither-react";

export function DialKitProvider({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();

  return (
    <>
      {children}
      <DialRoot position={isMobile ? "bottom-left" : "top-right"} />
    </>
  );
}
