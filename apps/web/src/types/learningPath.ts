export interface LearningVideo {
  videoId: string;
  title: string;
  url: string;
}

export type ResourceKind = 'video' | 'article' | 'doc' | 'pdf' | 'course' | 'practice';

export type ResourceSource =
  | 'youtube'
  | 'freecodecamp'
  | 'mdn'
  | 'khanacademy'
  | 'ncert'
  | 'devto'
  | 'medium'
  | 'coursera'
  | 'edx'
  | 'github'
  | 'official-docs'
  | 'google'
  | 'other';

export interface LearningResource {
  kind: ResourceKind;
  source: ResourceSource;
  title: string;
  url: string;
  // for videos
  videoId?: string;
}

export interface LearningCheckpoint {
  id: string;
  title: string;
  description: string;
  estimatedHours?: number;
  type?: 'theory' | 'practice' | 'project' | 'revision';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  resources?: LearningResource[];
  // backward compat — older paths
  videos?: LearningVideo[];
  videoId?: string;
  videoTitle?: string;
  url?: string;
  completedAt?: string;
  notes?: string;
}

export interface LearningPath {
  id: string;
  topic: string;
  category?: string;
  checkpoints: LearningCheckpoint[];
  createdAt: string;
  updatedAt?: string;
  totalEstimatedHours?: number;
  description?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}
