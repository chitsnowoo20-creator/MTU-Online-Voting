/**
 * The navigation glyph set, lifted from the v2 design reference.
 *
 * All paths are drawn on Carbon's 32×32 grid and filled with `currentColor`, so
 * a row's text colour drives its icon — there is no separate icon palette.
 */
export const NAV_ICONS = {
  home: "M16 4 3 15h4v13h7v-8h4v8h7V15h4Z",
  status: "M8 3h12l6 6v20H8Zm3 10h14v2H11Zm0 5h14v2H11Zm0 5h9v2h-9Z",
  shield: "M16 3 4 8v8c0 7 5 11 12 13 7-2 12-6 12-13V8Zm-2 18-5-5 2-2 3 3 7-7 2 2Z",
  ballot: "M4 4h24v24H4Zm3 3v18h18V7Zm7 14-5-5 2-2 3 3 7-7 2 2Z",
  results: "M5 27h5V13H5Zm9 0h5V5h-5Zm9 0h5v-9h-5Z",
  queue: "M4 6h24v4H4Zm0 8h24v4H4Zm0 8h24v4H4Z",
  calendar: "M9 3v3H5v23h22V6h-4V3h-3v3H12V3ZM8 12h16v14H8Z",
  people:
    "M11 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-5 0-9 3-9 7v3h18v-3c0-4-4-7-9-7Zm11-2a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-1 0-2 .2-3 .5 2 1.7 3 3.9 3 6.5v3h8v-3c0-4-3.6-7-8-7Z",
  tags: "M4 4h11l13 13-11 11L4 15Zm6 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
  state:
    "M16 10a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm0 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm-2-11h4l.6 4 3 1.3 3.3-2.3 2.8 2.8-2.3 3.3 1.3 3 4 .6v4l-4 .6-1.3 3 2.3 3.3-2.8 2.8-3.3-2.3-3 1.3-.6 4h-4l-.6-4-3-1.3-3.3 2.3-2.8-2.8 2.3-3.3-1.3-3-4-.6v-4l4-.6 1.3-3L5.3 7.8l2.8-2.8 3.3 2.3 3-1.3Z",
  building: "M4 28V8l10-4v6l10-4v22Zm4-4h4v-4H8Zm0-7h4v-4H8Zm8 7h4v-4h-4Zm0-7h4v-4h-4Z",
  log: "M6 3h20v26H6Zm4 5h12v2H10Zm0 5h12v2H10Zm0 5h12v2H10Zm0 5h7v2h-7Z",
  menu: "M4 7h24v3H4Zm0 7h24v3H4Zm0 7h24v3H4Z",
  close:
    "M24 9.4 22.6 8 16 14.6 9.4 8 8 9.4 14.6 16 8 22.6 9.4 24 16 17.4 22.6 24 24 22.6 17.4 16Z",
  chevronLeft: "M20 6 10 16l10 10 2-2-8-8 8-8Z",
  chevronRight: "M12 6l10 10-10 10-2-2 8-8-8-8Z",
  signOut: "M6 4h10v3H9v18h7v3H6Zm14 5 7 7-7 7-2.1-2.1 3.4-3.4H12v-3h10.3l-3.4-3.4Z",
} as const;

export type IconName = keyof typeof NAV_ICONS;

export function NavIcon({
  name,
  className = "",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 32 32"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      <path d={NAV_ICONS[name]} />
    </svg>
  );
}
