"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AppLink, navigateInApp } from "@/components/app-link";
import type { Game } from "@/lib/types";

export function filterLeaderboardGames(games: Game[], query: string) {
  const search = query.trim().toLocaleLowerCase();
  return search ? games.filter(game => `${game.name} ${game.slug}`.toLocaleLowerCase().includes(search)) : games;
}

export function leaderboardGameHref(boardId: string, gameSlug: string, range: string) {
  return `/leaderboards/${encodeURIComponent(boardId)}?game=${encodeURIComponent(gameSlug)}&range=${encodeURIComponent(range)}`;
}

export function LeaderboardGameSelector({ boardId, games, selected, range }: {
  boardId: string; games: Game[]; selected: Game; range: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const listId = useId();
  const visible = filterLeaderboardGames(games, query);

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function show() {
    setQuery("");
    setActiveIndex(Math.max(0, games.findIndex(game => game.slug === selected.slug)));
    setOpen(true);
  }

  function onSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (visible.length) setActiveIndex(index => (index + (event.key === "ArrowDown" ? 1 : -1) + visible.length) % visible.length);
    } else if (event.key === "Enter" && visible[activeIndex]) {
      event.preventDefault();
      setOpen(false);
      if (visible[activeIndex].slug !== selected.slug)
        navigateInApp(leaderboardGameHref(boardId, visible[activeIndex].slug, range));
      else trigger.current?.focus();
    }
  }

  return <div className="leaderboard-game-selector" ref={root}
    onKeyDown={event => { if (open && event.key === "Escape") { event.preventDefault(); setOpen(false); trigger.current?.focus(); } }}
    onBlur={event => { if (open && !event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <span className="field-label">Game</span>
    <button className="leaderboard-game-trigger" type="button" ref={trigger} aria-expanded={open} aria-controls={listId}
      onClick={() => open ? setOpen(false) : show()}
      onKeyDown={event => { if (!open && event.key === "ArrowDown") { event.preventDefault(); show(); } }}>
      <span>{selected.name}</span><span aria-hidden="true">⌄</span>
    </button>
    {open ? <div className="leaderboard-game-popover">
      <input ref={search} type="search" role="combobox" aria-label="Search leaderboard games" aria-autocomplete="list"
        aria-expanded="true" aria-controls={listId} aria-activedescendant={visible[activeIndex] ? `${listId}-${visible[activeIndex].slug}` : undefined}
        placeholder="Search games" value={query} onChange={event => { setQuery(event.target.value); setActiveIndex(0); }}
        onKeyDown={onSearchKeyDown} />
      <div className="leaderboard-game-options" role="listbox" id={listId} aria-label="Leaderboard games">
        {visible.length ? visible.map((game, index) => <AppLink id={`${listId}-${game.slug}`} role="option" aria-selected={game.slug === selected.slug}
          className={`leaderboard-game-option ${index === activeIndex ? "highlighted" : ""}`}
          href={leaderboardGameHref(boardId, game.slug, range)} key={game.slug} onClick={() => setOpen(false)}>
          {game.name}{game.slug === selected.slug ? <span aria-hidden="true">✓</span> : null}
        </AppLink>) : <p className="leaderboard-game-empty">No matching games</p>}
      </div>
    </div> : null}
  </div>;
}
