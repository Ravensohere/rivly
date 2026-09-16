// Environment bindings
export type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  GEMINI_API_KEY: string;
  GROQ_API_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  TAVILY_API_KEY: string;
  OPENWEATHER_API_KEY: string;
  YOUTUBE_API_KEY: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  FRONTEND_URL?: string;
  /** Comma-separated admin allowlist. Overrides ADMIN_EMAILS_FALLBACK when set. */
  ADMIN_EMAILS?: string;
  /** Cashfree credentials — required for real payment processing. */
  CASHFREE_APP_ID?: string;
  CASHFREE_SECRET_KEY?: string;
  CASHFREE_WEBHOOK_SECRET?: string;
  CASHFREE_ENV?: 'sandbox' | 'production';
};

// Context variables
export type Variables = {
  userId: string;
  userEmail?: string;
};

// AI Action types
export type AIAction = 
  | 'start_focus' 
  | 'stop_focus' 
  | 'create_task' 
  | 'create_tasks'
  | 'create_time_block' 
  | 'open_journal' 
  | 'set_theme'
  | 'navigate'
  | 'log_checkin'
  | 'log_sleep'
  | 'online_response'
  | 'search_web'
  | 'get_weather'
  | 'search_youtube'
  | 'get_news'
  | 'create_learning_path'
  | 'unknown';

// AI Response structure
export interface AIResponse {
  message: string;
  action: AIAction;
  data?: any;
}

// Task data
export interface Task {
  id?: string;
  user_id: string;
  title: string;
  status: 'todo' | 'done';
  date_key: string;
  tag?: string;
  created_at?: string;
  completed_at?: string;
}

// Focus session data
export interface FocusSession {
  id?: string;
  user_id: string;
  duration_min: number;
  date_key: string;
  created_at?: string;
}

// Waitlist entry
export interface WaitlistEntry {
  email: string;
  motivation?: string;
  user_type?: string;
  phone?: string;
  status?: 'pending' | 'approved' | 'rejected';
}
