/**
 * The real WhatsApp glyph, as a drop-in replacement for lucide-react's
 * generic `MessageCircle` bubble wherever a button/link specifically means
 * "WhatsApp". Sizing/color work exactly like a lucide icon — pass the same
 * className you'd give `<MessageCircle className="h-4 w-4" />` and it
 * inherits the surrounding text color via `fill="currentColor"`.
 */
export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M16.001 3C9.373 3 4 8.373 4 15c0 2.386.706 4.61 1.92 6.47L4 29l7.72-1.877A11.94 11.94 0 0 0 16.001 27C22.628 27 28 21.627 28 15S22.628 3 16.001 3zm6.988 16.99c-.297.837-1.47 1.53-2.4 1.72-.638.13-1.47.235-4.27-.918-3.583-1.48-5.887-5.1-6.066-5.34-.176-.24-1.454-1.93-1.454-3.686 0-1.755.914-2.615 1.24-2.973.297-.325.647-.407.863-.407.216 0 .432.002.62.011.198.01.464-.075.727.554.297.72.994 2.48 1.08 2.66.088.18.146.39.03.63-.117.24-.176.39-.35.6-.176.21-.37.47-.53.63-.176.18-.36.372-.155.73.207.36.918 1.51 1.968 2.443 1.353 1.203 2.494 1.577 2.85 1.755.353.18.56.15.766-.09.207-.24.883-1.03 1.12-1.38.234-.36.47-.3.79-.18.323.12 2.058.97 2.41 1.147.353.18.588.27.674.42.088.15.088.87-.207 1.71z" />
    </svg>
  );
}
