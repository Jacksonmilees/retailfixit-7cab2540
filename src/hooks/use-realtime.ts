import * as React from "react";
import { api } from "@/lib/api/client";
import type { RealtimeEvent, RealtimeEventType } from "@/lib/types";

export function useRealtime(types: RealtimeEventType[], handler: (e: RealtimeEvent) => void) {
  const ref = React.useRef(handler);
  ref.current = handler;
  React.useEffect(() => {
    return api.subscribe((e) => {
      if (types.includes(e.type)) ref.current(e);
    });
  }, [types.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps
}
