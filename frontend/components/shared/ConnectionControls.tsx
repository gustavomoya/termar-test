import { ConnectionBadge } from "@/components/shared/ConnectionBadge";
import { DemoNetworkToggle } from "@/components/shared/DemoNetworkToggle";

interface ConnectionControlsProps {
  online: boolean;
}

export function ConnectionControls({ online }: ConnectionControlsProps) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <ConnectionBadge online={online} />
      <DemoNetworkToggle />
    </div>
  );
}
