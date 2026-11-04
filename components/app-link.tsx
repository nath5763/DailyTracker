"use client";

import { createContext, useContext } from "react";

const LocalNavigation = createContext(false);
export function LocalNavigationProvider({ children }: { children: React.ReactNode }) {
  return <LocalNavigation.Provider value={true}>{children}</LocalNavigation.Provider>;
}

export function isSignedInPath(path: string) {
  return path === "/dashboard" || path === "/submit" || path === "/leaderboards" ||
    /^\/leaderboards\/[^/]+$/.test(path) || /^\/profile\/[^/]+$/.test(path);
}

export function navigateInApp(href: string, replace = false) {
  const url = new URL(href, window.location.origin);
  if (url.origin !== window.location.origin || !isSignedInPath(url.pathname)) {
    window.location.assign(url.href);
    return;
  }
  const destination = url.pathname + url.search + url.hash;
  window.history[replace ? "replaceState" : "pushState"](null, "", destination);
}

export function AppLink({ href, onClick, target, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const local = useContext(LocalNavigation);
  return <a {...props} href={href} target={target} onClick={(event) => {
    onClick?.(event);
    if (event.defaultPrevented || !local || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
        target && target !== "_self" || props.download) return;
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin || !isSignedInPath(url.pathname)) return;
    event.preventDefault();
    navigateInApp(url.href);
  }}>{children}</a>;
}
