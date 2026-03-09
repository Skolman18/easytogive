"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface EditModeCtx {
  editMode: boolean;
  setEditMode: (v: boolean) => void;
}

const EditModeContext = createContext<EditModeCtx>({
  editMode: false,
  setEditMode: () => {},
});

export function EditModeProvider({ children }: { children: ReactNode }) {
  const [editMode, setEditMode] = useState(false);
  return (
    <EditModeContext.Provider value={{ editMode, setEditMode }}>
      {children}
    </EditModeContext.Provider>
  );
}

export function useEditMode() {
  return useContext(EditModeContext);
}
