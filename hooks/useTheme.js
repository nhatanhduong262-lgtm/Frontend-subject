"use client";
import { useEffect, useState } from "react";

const THEME_KEY = "pixelpulse-theme";

export function useTheme() {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_KEY) || "dark";
    setTheme(stored);

    const observer = new MutationObserver(() => {
      const current = document.documentElement.getAttribute("data-theme") || "dark";
      setTheme(current);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const isLight = theme === "light";
  return { theme, isLight };
}
