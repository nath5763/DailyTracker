import Link from "next/link";

const modes = [
  { href: "/daily/letter-bag", label: "Daily 30 · 90 seconds" },
  { href: "/daily/letter-bag/untimed", label: "30 letters · no timer" },
  { href: "/daily/letter-bag/endless", label: "90 seconds · endless tiles" },
] as const;

export function LetterBagModes({ current }: { current: (typeof modes)[number]["href"] }) {
  return <nav className="shell lb-modes" aria-label="Letter Bag modes">
    {modes.map(mode => <Link key={mode.href} href={mode.href} aria-current={mode.href === current ? "page" : undefined}>{mode.label}</Link>)}
  </nav>;
}
