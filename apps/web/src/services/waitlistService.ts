
import { supabase } from "@/integrations/supabase/client";

export type WaitlistStatus = 'pending' | 'approved' | 'rejected';

export interface WaitlistEntry {
  id: string;
  email: string;
  status: WaitlistStatus;
  joined_at: string;
  user_id: string | null;
  motivation?: string;
  user_type?: string;
  phone?: string;
  approved_by?: string | null;
  approved_at?: string | null;
}

export const getWaitlistStatus = async (email: string): Promise<WaitlistStatus | null> => {
  try {
    const workerUrl = import.meta.env.VITE_WORKER_URL || 'https://rivly-api.gnvenkatapathiraju.workers.dev';
    const response = await fetch(`${workerUrl}/api/waitlist/status?email=${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Waitlist check failed: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Server returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    if (data.inWaitlist && data.status) {
      return data.status as WaitlistStatus;
    }
    
    // Explicitly return null if not in waitlist or not_found
    return null; 
  } catch (error) {
    console.error('Error in getWaitlistStatus:', error);
    // Re-throw so the UI can see the error
    throw error;
  }
};

export const getWaitlistEntries = async (): Promise<WaitlistEntry[]> => {
  const { data, error } = await supabase
    .from('waitlist')
    .select('*')
    .order('joined_at', { ascending: false });

  if (error) {
    console.error('Error fetching waitlist entries:', error);
    throw error;
  }

  return data as WaitlistEntry[];
};

export const updateWaitlistStatus = async (
  id: string, 
  status: WaitlistStatus,
  approved_by?: string | null,
  approved_at?: string | null
) => {
  const updatePayload: any = { status };
  
  // Only update if explicitly provided (including null to clear)
  if (approved_by !== undefined) updatePayload.approved_by = approved_by;
  if (approved_at !== undefined) updatePayload.approved_at = approved_at;

  const { error } = await supabase
    .from('waitlist')
    .update(updatePayload)
    .eq('id', id);

  if (error) {
    console.error('Error updating waitlist status:', error);
    throw error;
  }
};

export const deleteWaitlistEntry = async (id: string) => {
  // Use the admin_delete_user function to delete both waitlist entry and auth user
  const { error } = await supabase.rpc('admin_delete_user', { waitlist_id: id });

  if (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};
