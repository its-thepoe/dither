"use client";

import { useState, useEffect } from "react";

const MOBILE_QUERY = "(max-width: 640px)";

export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    setMobile(mql.matches);

    const onChange = (e: MediaQueryListEvent) => setMobile(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return mobile;
}
