"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type ViewMode = "admin" | "org" | "giver";

interface EditModeCtx {
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
}

const EditModeContext = createContext<EditModeCtx>({
  editMode: false,
  setEditMode: () => {},
  viewMode: "admin",
  setViewMode: () => {},
});

export function EditModeProvider({ children }: { children: ReactNode }) {
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("admin");
  return (
    <EditModeContext.Provider value={{ editMode, setEditMode, viewMode, setViewMode }}>
      {children}
    </EditModeContext.Provider>
  );
}

export function useEditMode() {
  return useContext(EditModeContext);
}
