import { AppLink } from "@/components/app-link";

export function Logo() {
  return (
    <AppLink className="logo" href="/">
      <span className="logo-mark" aria-hidden="true">D</span>
      <span>DAILY CLUB</span>
    </AppLink>
  );
}

