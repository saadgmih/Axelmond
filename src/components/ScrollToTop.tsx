import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { scrollAppToTopDeferred } from "../utils/scroll-app-to-top";

/** Remonte en haut à chaque changement de route. */
export default function ScrollToTop() {
  const { pathname, key } = useLocation();

  useLayoutEffect(() => {
    scrollAppToTopDeferred();
  }, [pathname, key]);

  return null;
}
