"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AppLink, navigateInApp } from "@/components/app-link";
import type { Game } from "@/lib/types";

const QUICK_PICK_LIMIT = 5;
const selectionKey = (boardId: string) => `daily-club:leaderboard:${boardId}:game`;

export function filterLeaderboardGames(games: Game[], query: string) {
  const search = query.trim().toLocaleLowerCase();
  return search ? games.filter(game => `${game.name} ${game.slug}`.toLocaleLowerCase().includes(search)) : games;
}

export function quickPickLeaderboardGames(games: Game[], recentGameSlugs: string[], selectedSlug: string,
                                          limit = QUICK_PICK_LIMIT) {
  const bySlug = new Map(games.map(game => [game.slug, game]));
  const ordered = [...recentGameSlugs.map(slug => bySlug.get(slug)), ...games]
      .filter((game): game is Game => Boolean(game));
  const unique = ordered.filter((game, index) => ordered.findIndex(candidate => candidate.slug === game.slug) === index);
  const picks = unique.slice(0, limit);
  const selected = bySlug.get(selectedSlug);
  if (selected && !picks.some(game => game.slug === selected.slug)) {
    if (picks.length === limit) picks[picks.length - 1] = selected;
    else picks.push(selected);
  }
  return picks;
}

export function readLastSelectedLeaderboardGame(boardId: string) {
  if (typeof window === "undefined") return null;
  try { return window.localStorage.getItem(selectionKey(boardId)); }
  catch { return null; }
}

export function rememberSelectedLeaderboardGame(boardId: string, gameSlug: string) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(selectionKey(boardId), gameSlug); }
  catch { /* Selection still works when browser storage is unavailable. */ }
}

export function nextQuickPickIndex(index: number, count: number, key: string) {
  if (!count) return null;
  if (key === "ArrowRight") return (index + 1) % count;
  if (key === "ArrowLeft") return (index - 1 + count) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return null;
}

export function leaderboardGameHref(boardId: string, gameSlug: string, range: string) {
  return `/leaderboards/${encodeURIComponent(boardId)}?game=${encodeURIComponent(gameSlug)}&range=${encodeURIComponent(range)}`;
}

export function LeaderboardGameSelector({ boardId, games, selected, range, recentGameSlugs = [] }: {
  boardId: string; games: Game[]; selected: Game; range: string; recentGameSlugs?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const listId = useId();
  const labelId = useId();
  const quickPicks = quickPickLeaderboardGames(games, recentGameSlugs, selected.slug);
  const quickPickSlugs = new Set(quickPicks.map(game => game.slug));
  const moreGames = games.filter(game => !quickPickSlugs.has(game.slug));
  const visible = filterLeaderboardGames(moreGames, query);

  useEffect(() => {
    rememberSelectedLeaderboardGame(boardId, selected.slug);
  }, [boardId, selected.slug]);

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
    setActiveIndex(0);
    setOpen(true);
  }

  function choose(game: Game) {
    rememberSelectedLeaderboardGame(boardId, game.slug);
    setOpen(false);
    if (game.slug !== selected.slug) navigateInApp(leaderboardGameHref(boardId, game.slug, range));
    else trigger.current?.focus();
  }

  function onSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (visible.length) setActiveIndex(index => (index + (event.key === "ArrowDown" ? 1 : -1) + visible.length) % visible.length);
    } else if (event.key === "Enter" && visible[activeIndex]) {
      event.preventDefault();
      choose(visible[activeIndex]);
    }
  }

  function onQuickPickKeyDown(event: React.KeyboardEvent<HTMLAnchorElement>, index: number) {
    const target = nextQuickPickIndex(index, quickPicks.length, event.key);
    if (target === null) return;
    event.preventDefault();
    document.getElementById(`${listId}-quick-${quickPicks[target].slug}`)?.focus();
  }

  return <div className="leaderboard-game-selector">
    <span className="field-label" id={labelId}>Game</span>
    <div className="leaderboard-game-controls" aria-labelledby={labelId}>
      <div className="leaderboard-game-quick-picks" role="tablist" aria-label="Quick game selection">
        {quickPicks.map((game, index) => <AppLink id={`${listId}-quick-${game.slug}`} role="tab" aria-selected={game.slug === selected.slug}
          aria-controls="leaderboard-game-results" tabIndex={game.slug === selected.slug ? 0 : -1}
          className={`leaderboard-game-tab ${game.slug === selected.slug ? "active" : ""}`}
          href={leaderboardGameHref(boardId, game.slug, range)} key={game.slug}
          onKeyDown={event => onQuickPickKeyDown(event, index)}
          onClick={() => rememberSelectedLeaderboardGame(boardId, game.slug)}>{game.name}</AppLink>)}
      </div>
      {moreGames.length ? <div className="leaderboard-game-more" ref={root}
        onKeyDown={event => { if (open && event.key === "Escape") { event.preventDefault(); setOpen(false); trigger.current?.focus(); } }}
        onBlur={event => { if (open && !event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
        <button className="leaderboard-more-trigger" type="button" ref={trigger} aria-expanded={open}
          aria-haspopup="listbox" aria-controls={listId} onClick={() => open ? setOpen(false) : show()}
          onKeyDown={event => { if (!open && (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ")) { event.preventDefault(); show(); } }}>
          More games <span aria-hidden="true">⌄</span>
        </button>
        {open ? <div className="leaderboard-game-popover">
          <input ref={search} type="search" role="combobox" aria-label="Search more leaderboard games" aria-autocomplete="list"
            aria-expanded="true" aria-controls={listId} aria-activedescendant={visible[activeIndex] ? `${listId}-${visible[activeIndex].slug}` : undefined}
            placeholder="Search games" value={query} onChange={event => { setQuery(event.target.value); setActiveIndex(0); }}
            onKeyDown={onSearchKeyDown} />
          <div className="leaderboard-game-options" role="listbox" id={listId} aria-label="More leaderboard games">
            {visible.length ? visible.map((game, index) => <AppLink id={`${listId}-${game.slug}`} role="option" aria-selected="false"
              className={`leaderboard-game-option ${index === activeIndex ? "highlighted" : ""}`}
              href={leaderboardGameHref(boardId, game.slug, range)} key={game.slug}
              onClick={() => { rememberSelectedLeaderboardGame(boardId, game.slug); setOpen(false); }}>{game.name}</AppLink>)
              : <p className="leaderboard-game-empty">No matching games</p>}
          </div>
        </div> : null}
      </div> : null}
    </div>
  </div>;
}
