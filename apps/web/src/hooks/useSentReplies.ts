import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthContext } from '@/contexts/AuthContext';

export interface SentReply {
  source_ref: string;
  subject: string;
  snippet: string;
  recipient: string;
  date: string;
}

export function useSentReplies() {
  const { user, isGuest } = useAuthContext();
  const enabled = !!user && !isGuest;
  const { data, isLoading } = useQuery({
    queryKey: ['sent-replies', user?.id],
    queryFn: () => api.inbox.sent(),
    enabled,
    staleTime: 60 * 1000,
  });
  return { sent: (data?.sent || []) as SentReply[], isLoading };
}
