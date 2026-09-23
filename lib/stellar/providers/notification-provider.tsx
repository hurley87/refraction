'use client';

import React, { createContext, ReactNode, useMemo, useCallback } from 'react';
import { toast } from 'sonner';

type NotificationType =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'error'
  | 'warning';

interface NotificationContextType {
  addNotification: (message: string, type: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const addNotification = useCallback(
    (message: string, type: NotificationType) => {
      if (!toast?.info) return;

      switch (type) {
        case 'success':
          toast.success(message);
          break;
        case 'error':
          toast.error(message);
          break;
        case 'warning':
          toast.warning(message);
          break;
        default:
          toast.info(message);
          break;
      }
    },
    []
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
