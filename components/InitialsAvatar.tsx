const AVATAR_TONES = 8;

function initialsOf(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "?";

  const named = words.filter((word) => /^\p{L}/u.test(word));
  const source = named.length > 0 ? named : words;

  if (source.length === 1) return source[0].slice(0, 2).toUpperCase();
  return (source[0][0] + source[source.length - 1][0]).toUpperCase();
}

function toneOf(name: string): number {
  let hash = 0;
  for (const char of name) {
    hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  }
  return hash % AVATAR_TONES;
}

function GroupIcon({ size }: { size: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function InitialsAvatar({
  name,
  className = "",
  isGroup = false,
}: {
  readonly name: string;
  readonly className?: string;
  readonly isGroup?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`avatar-tint avatar-c${toneOf(name)} inline-flex items-center justify-center rounded-full font-semibold select-none ${className}`}
    >
      {isGroup ? <GroupIcon size={18} /> : initialsOf(name)}
    </span>
  );
}
