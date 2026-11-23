import { useEffect } from "react";

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Women Skill` : "Women Skill";
  }, [title]);
}
