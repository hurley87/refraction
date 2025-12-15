import { supabase } from "./client";
import type { WebhookNotification } from "../types";

/**
 * Insert a webhook notification
 */
export const insertNotification = async (notification: WebhookNotification) => {
  const { data, error } = await supabase
    .from("irlnotifications")
    .insert(notification);
  if (error) {
    throw error;
  }
  return data;
};

