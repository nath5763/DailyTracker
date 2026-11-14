"use client";

import { useEffect, useRef, useState } from "react";
import { AppLink } from "@/components/app-link";
import { SignOutButton } from "@/components/sign-out-button";
import { avatarBackground } from "@/lib/avatar-color";

type HeaderProfile = { shareId: string; displayName: string; avatarColor: string };

export function HeaderNavigation({ user, profile }: { user: boolean; profile: HeaderProfile | null }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const accountLink = profile ? <AppLink className="avatar-link" href={`/profile/${profile.shareId}`} title="Your profile and subscription" aria-label="Your profile and subscription" onClick={() => setOpen(false)}>
    <span>Profile</span>
    <span className="avatar small" style={{ background: avatarBackground(profile.avatarColor) }}>{profile.displayName.slice(0, 1).toUpperCase()}</span>
  </AppLink> : <AppLink className="button button-small" href={user ? "/onboarding" : "/auth"}>{user ? "Finish setup" : "Sign in"}</AppLink>;

  return <div className="header-navigation">
    <nav className="desktop-navigation" aria-label="Main navigation">
      <AppLink href="/games">Games</AppLink>
      <AppLink href="/pricing">Pricing</AppLink>
      {profile ? <>
        <AppLink href="/dashboard">Overview</AppLink>
        <AppLink href="/submit">Add score</AppLink>
        <AppLink href="/leaderboards">Leaderboards</AppLink>
      </> : null}
      {accountLink}
      {profile ? <SignOutButton /> : null}
    </nav>
    <div className="mobile-navigation" ref={menuRef}>
      {accountLink}
      <button className="menu-toggle" ref={buttonRef} type="button" aria-label={open ? "Close main menu" : "Open main menu"} aria-expanded={open} aria-controls="mobile-main-menu" onClick={() => setOpen(value => !value)}>
        <span className="menu-toggle-lines" aria-hidden="true"><span /><span /><span /></span>
      </button>
      <nav className="mobile-menu" id="mobile-main-menu" aria-label="Main navigation" hidden={!open}>
        <AppLink href="/games" onClick={() => setOpen(false)}>Games</AppLink>
        <AppLink href="/pricing" onClick={() => setOpen(false)}>Pricing</AppLink>
        {profile ? <>
          <AppLink href="/dashboard" onClick={() => setOpen(false)}>Overview</AppLink>
          <AppLink href="/submit" onClick={() => setOpen(false)}>Add score</AppLink>
          <AppLink href="/leaderboards" onClick={() => setOpen(false)}>Leaderboards</AppLink>
          <SignOutButton />
        </> : null}
      </nav>
    </div>
  </div>;
}
