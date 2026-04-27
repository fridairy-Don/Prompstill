/**
 * Decorative window-chrome dots (red / yellow / green).
 * Inert — does not implement OS window controls.
 */
export function TrafficLights() {
  return (
    <div className="absolute top-3 left-4 z-10 flex gap-1.5 pointer-events-none">
      <span className="block w-[11px] h-[11px] rounded-full border-[1.5px] border-ink bg-[#ff6b6b]" />
      <span className="block w-[11px] h-[11px] rounded-full border-[1.5px] border-ink bg-[#ffd93d]" />
      <span className="block w-[11px] h-[11px] rounded-full border-[1.5px] border-ink bg-[#6bcf7f]" />
    </div>
  );
}
