import { useRouter } from "next/router";

export default function BackButton({ label = "← Back", fallback = "/" }) {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallback);
  };

  return (
    <button
      type="button"
      className="ghost-button"
      onClick={handleBack}
      style={{ minHeight: 40 }}
    >
      {label}
    </button>
  );
}
