export type ChatThread = {
  id: string;
  kind: 'support' | 'match';
  support_user_id: string | null;
  user_a_id: string | null;
  user_b_id: string | null;
  status: 'available' | 'active' | 'ended';
  opened_by: string | null;
  opened_at: string | null;
  ended_by: string | null;
  created_at: string;
  last_message_at: string;
  ended_at: string | null;
};

export type ChatMessage = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string | null;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
  created_at: string;
  attachment_url?: string | null;
};

export type ChatPreview = {
  thread_id: string;
  sender_id: string | null;
  body: string | null;
  attachment_name: string | null;
  created_at: string | null;
};

export type ExchangeSubmission = {
  thread_id: string;
  user_id: string;
  submitted_at: string;
};

export type ExchangeFile = {
  id: string;
  thread_id: string;
  uploader_id: string;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  file_size: number;
  created_at: string;
  signed_url?: string | null;
};

export type Profile = {
  id: string;
  full_name: string | null;
};

export type WorksheetMatch = {
  id: string;
  user_a_id: string;
  user_b_id: string;
  user_a_gives_course_id: string;
  user_b_gives_course_id: string;
  status: 'active' | 'invalidated';
};

export type Course = {
  id: string;
  code: string | null;
  name: string;
};
