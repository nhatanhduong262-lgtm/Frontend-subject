"use client";

import { useEffect, useState } from "react";

const THEME_KEY = "pixelpulse-theme";

export default function ThemeToggle() {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_KEY) || "dark";
    setTheme(storedTheme);
    document.documentElement.setAttribute("data-theme", storedTheme);
    document.documentElement.style.colorScheme = storedTheme === "dark" ? "dark" : "light";
  }, []);

  const applyTheme = (nextTheme) => {
    document.documentElement.setAttribute("data-theme", nextTheme);
    document.documentElement.style.colorScheme = nextTheme === "dark" ? "dark" : "light";
    window.localStorage.setItem(THEME_KEY, nextTheme);
    setTheme(nextTheme);
  };

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
  };

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label="Toggle color theme"
    >
      {theme === "dark" ? "☀ Light" : "☾ Dark"}
    </button>
  );
}
