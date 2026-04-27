/**
 * Decorative window-chrome dots (red / yellow / green).
 * Pure decoration — no click handlers, no hover state, cursor: default.
 * Y2K Revival branding signal only.
 */
export function TrafficLights() {
  return (
    <div
      className="pointer-events-none absolute left-4 top-3 z-10 flex select-none gap-1.5"
      style={{ cursor: "default" }}
      aria-hidden="true"
    >
      <span className="block h-[11px] w-[11px] rounded-full border-[1.5px] border-ink bg-[#ff6b6b]" />
      <span className="block h-[11px] w-[11px] rounded-full border-[1.5px] border-ink bg-[#ffd93d]" />
      <span className="block h-[11px] w-[11px] rounded-full border-[1.5px] border-ink bg-[#6bcf7f]" />
    </div>
  );
}
