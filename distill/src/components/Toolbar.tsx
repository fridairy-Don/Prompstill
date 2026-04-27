import { useEffect } from "react";
import { useAppStore } from "../store/useAppStore";
import { recommendedModel } from "../lib/api";
import { ModeDropdown } from "./ModeDropdown";
import { ModelPicker } from "./ModelPicker";
import { StampButton } from "./StampButton";

export function Toolbar() {
  const { preset, setModel } = useAppStore();

  // When preset changes, snap model to recommended
  useEffect(() => {
    let cancelled = false;
    recommendedModel(preset).then((m) => {
      if (!cancelled) setModel(m);
    });
    return () => {
      cancelled = true;
    };
  }, [preset, setModel]);

  return (
    <div className="flex items-center gap-2">
      <ModeDropdown />
      <ModelPicker />
      <StampButton />
    </div>
  );
}
