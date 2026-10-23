"use client";

import { createContext, useContext } from "react";

const ZernioPromoContext = createContext(false);

export function ZernioPromoProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <ZernioPromoContext.Provider value={enabled}>
      {children}
    </ZernioPromoContext.Provider>
  );
}

export function useZernioPromo(): boolean {
  return useContext(ZernioPromoContext);
}
