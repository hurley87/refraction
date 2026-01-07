"use client";

import React, {
  createContext,
  useState,
  ReactNode,
  useMemo,
  useCallback,
} from "react";
import { toast } from "sonner";

type NotificationType =
  | "primary"
  | "secondary"
  | "success"
  | "error"
  | "warning";

interface NotificationContextType {
  addNotification: (message: string, type: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const addNotification = useCallback(
    (message: string, type: NotificationType) => {
      // Map Stellar notification types to Sonner toast types
      const toastType =
        type === "success"
          ? "success"
          : type === "error"
            ? "error"
            : type === "warning"
              ? "warning"
              : "info";

      toast[toastType](message);
    },
    [],
  );

  const contextValue = useMemo(() => ({ addNotification }), [addNotification]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

export { NotificationContext };
export type { NotificationContextType };
