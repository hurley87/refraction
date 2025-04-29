import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Types for our number assignment system
export type NumberAssignment = {
  id: number;
  user_address: string;
  assigned_number: number;
  created_at: string;
};

export type Notification = {
  id: number;
  user_address: string;
  created_at: string;
};

export type WebhookNotification = {
  fid: number;
  url?: string;
  token?: string;
};

export type Checkin = {
  id?: number;
  address: string;
  email: string;
  created_at?: string;
};

export const insertNotification = async (notification: WebhookNotification) => {
  const { data, error } = await supabase
    .from("irlnotifications")
    .insert(notification);
  if (error) {
    throw error;
  }
  return data;
};

export const insertCheckin = async (checkin: Checkin) => {
  const { data, error } = await supabase.from("irlcheckins").insert(checkin);

  if (error) {
    throw error;
  }

  return data;
};

export const getCheckinByAddress = async (address: string) => {
  try {
    const { data, error } = await supabase
      .from("irlcheckins")
      .select("*")
      .eq("address", address);

    console.log("data", data);

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
};
