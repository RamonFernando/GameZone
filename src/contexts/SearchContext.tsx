"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type SearchContextValue = {
  query: string;
  setQuery: (value: string) => void;
  platform: string | null;
  setPlatform: (value: string | null) => void;
};

const SearchContext = createContext<SearchContextValue | undefined>(undefined);

type Props = {
  children: ReactNode;
};

export function SearchProvider({ children }: Props) {
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<string | null>(null);
  return (
    <SearchContext.Provider value={{ query, setQuery, platform, setPlatform }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch(): SearchContextValue {
  const ctx = useContext(SearchContext);
  if (!ctx) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return ctx;
}
