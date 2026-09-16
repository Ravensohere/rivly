/**
 * Generate a learning path with topic-aware multi-source resources.
 * Selects best free sources based on what the user wants to learn:
 *   programming/dev → YouTube + freeCodeCamp + MDN + official docs
 *   indian-exam/school → YouTube + NCERT + Khan Academy
 *   math/science → YouTube + Khan Academy
 *   design/creative → YouTube + dev.to + free Coursera audits
 *   business/soft-skills → YouTube + Medium + dev.to
 *   hobby/practical → YouTube only
 */

import { MODEL_FOR_TASK } from '../../config/constants';
import { groqChat } from './groq';
import { searchYouTube } from '../tools';

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
  videoId?: string;
}

export interface LearningCheckpoint {
  title: string;
  description: string;
  estimatedHours?: number;
  type?: 'theory' | 'practice' | 'project' | 'revision';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  searchQuery?: string;
  resources?: LearningResource[];
  // backward-compat fields (still populated when a video is found)
  videos?: { videoId: string; title: string; url: string }[];
  videoId?: string;
  videoTitle?: string;
  url?: string;
}

export interface LearningPathResult {
  topic: string;
  category?: string;
  description?: string;
  difficulty?: string;
  totalEstimatedHours?: number;
  checkpoints: LearningCheckpoint[];
}

/**
 * Plan returned by the LLM. Resources here are *hints* — we resolve them
 * into concrete URLs ourselves to avoid hallucinated links.
 */
interface ResourceHint {
  kind: ResourceKind;
  source: ResourceSource;
  title: string;
  searchTerm: string;
}

interface PlannedCheckpoint {
  title: string;
  description: string;
  estimatedHours?: number;
  type?: 'theory' | 'practice' | 'project' | 'revision';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  searchQuery?: string;
  resources?: ResourceHint[];
}

// Deterministic search-URL builders for trusted free sources.
// Using search URLs (not specific article URLs) avoids broken links if pages move.
function buildSourceUrl(source: ResourceSource, searchTerm: string): string {
  const q = encodeURIComponent(searchTerm);
  switch (source) {
    case 'freecodecamp':
      return `https://www.freecodecamp.org/news/search/?query=${q}`;
    case 'mdn':
      return `https://developer.mozilla.org/en-US/search?q=${q}`;
    case 'khanacademy':
      return `https://www.khanacademy.org/search?referer=%2F&page_search_query=${q}`;
    case 'ncert':
      return `https://www.google.com/search?q=${q}+NCERT+filetype%3Apdf`;
    case 'devto':
      return `https://dev.to/search?q=${q}`;
    case 'medium':
      return `https://medium.com/search?q=${q}`;
    case 'coursera':
      return `https://www.coursera.org/search?query=${q}`;
    case 'edx':
      return `https://www.edx.org/search?q=${q}`;
    case 'github':
      return `https://github.com/search?q=${q}&type=repositories`;
    case 'official-docs':
      return `https://www.google.com/search?q=${q}+official+documentation`;
    case 'google':
    case 'other':
    default:
      return `https://www.google.com/search?q=${q}`;
  }
}

const SOURCE_DOMAINS: Record<ResourceSource, string> = {
  youtube: 'YouTube',
  freecodecamp: 'freeCodeCamp',
  mdn: 'MDN Web Docs',
  khanacademy: 'Khan Academy',
  ncert: 'NCERT',
  devto: 'dev.to',
  medium: 'Medium',
  coursera: 'Coursera (free audit)',
  edx: 'edX (free audit)',
  github: 'GitHub',
  'official-docs': 'Official Docs',
  google: 'Web',
  other: 'Web',
};

export async function generateLearningPath(
  groqApiKey: string,
  topic: string,
  youtubeApiKey: string
): Promise<LearningPathResult> {
  const prompt = `You are an expert tutor and curriculum designer. The user wants to learn: "${topic}".

Create a detailed, structured learning roadmap that a student can follow self-paced.

STEP 1 — Classify the topic into ONE category:
- "programming"           (any coding/CS/devops/web/mobile/AI/ML topic)
- "indian-exam"           (JEE, NEET, UPSC, CBSE/ICSE board subjects)
- "math-science"          (general math, physics, chem, biology — not exam-specific)
- "design-creative"       (UI/UX, graphic design, video, photography, music)
- "business-soft-skills"  (marketing, finance basics, communication, leadership)
- "language"              (English, Spanish, Hindi, any spoken language)
- "hobby-practical"       (cooking, fitness, gardening, DIY — visual/practical)

STEP 2 — Pick 2-4 source types appropriate for THIS topic:
- programming           → youtube, freecodecamp, mdn (for web), official-docs, github
- indian-exam           → youtube, ncert, khanacademy
- math-science          → youtube, khanacademy, mdn (if related)
- design-creative       → youtube, coursera, devto, medium
- business-soft-skills  → youtube, medium, devto, coursera
- language              → youtube, medium
- hobby-practical       → youtube ONLY

STEP 3 — Create 6 to 10 checkpoints (modules/chapters), ordered beginner → advanced. Each checkpoint must include:
- title: concise module name
- description: 2-3 sentences on what they'll learn and why it matters
- estimatedHours: 0.5 to 4
- type: "theory" | "practice" | "project" | "revision"
- difficulty: "beginner" | "intermediate" | "advanced"
- searchQuery: specific YouTube search query for this subtopic
- resources: array of 2-4 resource hints. Each hint:
    {
      "kind": "video" | "article" | "doc" | "pdf" | "course" | "practice",
      "source": one of the source types you picked,
      "title": short human-readable title for this resource,
      "searchTerm": specific search phrase (we will build the URL from this)
    }
  Always include at least 1 video resource per checkpoint.
  For programming, also include at least 1 doc/article resource.
  For indian-exam, also include at least 1 pdf (ncert) resource.

STEP 4 — Also include top-level fields:
- category: the category you chose in step 1
- description: 1-2 sentence overview of the path
- difficulty: overall difficulty
- totalEstimatedHours: sum of checkpoint hours

Return ONLY valid JSON:
{
  "category": "...",
  "description": "...",
  "difficulty": "...",
  "totalEstimatedHours": N,
  "checkpoints": [ ... ]
}

Be SPECIFIC to "${topic}". Don't give generic advice.`;

  // Quality tier: the user pays 60 credits for this — roadmap quality is the
  // product. groqChat auto-degrades to the next model if this one is
  // unavailable. groqChat defaults to reasoning_effort 'low' to protect small
  // token budgets; this call has 3000 to spend, so it opts back into deeper
  // reasoning where the extra thinking actually shows up in the roadmap.
  const content = (await groqChat(groqApiKey, [{ role: 'user', content: prompt }], {
    model: MODEL_FOR_TASK.learning_path,
    temperature: 0.6,
    max_tokens: 3000,
    json: true,
    timeoutMs: 30000,
    reasoningEffort: 'medium',
  })) || '{}';

  let parsed: any = {};
  try {
    parsed = JSON.parse(content);
  } catch {
    return { topic, checkpoints: [] };
  }

  const category: string | undefined = parsed.category;
  const description: string = parsed.description || '';
  const difficulty: string = parsed.difficulty || '';
  let totalEstimatedHours: number = parsed.totalEstimatedHours || 0;

  let steps: PlannedCheckpoint[] = [];
  if (Array.isArray(parsed.checkpoints)) steps = parsed.checkpoints;
  else if (Array.isArray(parsed.steps)) steps = parsed.steps;
  else if (Array.isArray(parsed)) steps = parsed;

  if (steps.length === 0) {
    return { topic, category, checkpoints: [] };
  }

  if (!totalEstimatedHours) {
    totalEstimatedHours = steps.reduce((sum, s) => sum + (s.estimatedHours || 1), 0);
  }

  const checkpoints: LearningCheckpoint[] = [];

  for (const step of steps) {
    const hints = Array.isArray(step.resources) ? step.resources : [];
    const resources: LearningResource[] = [];
    const ytVideos: { videoId: string; title: string; url: string }[] = [];

    // Resolve resources. Cap at 4 per checkpoint.
    for (const hint of hints.slice(0, 4)) {
      if (!hint || !hint.kind || !hint.source) continue;
      const searchTerm = hint.searchTerm || step.searchQuery || `${topic} ${step.title}`;

      if (hint.kind === 'video' || hint.source === 'youtube') {
        // Resolve via YouTube API
        try {
          const videoJson = await searchYouTube(searchTerm, youtubeApiKey);
          const video = JSON.parse(videoJson);
          if (video?.videoId && !ytVideos.some(v => v.videoId === video.videoId)) {
            ytVideos.push({
              videoId: video.videoId,
              title: video.title,
              url: video.url,
            });
            resources.push({
              kind: 'video',
              source: 'youtube',
              title: video.title || hint.title || searchTerm,
              url: video.url,
              videoId: video.videoId,
            });
          }
        } catch {
          // fall through; skip this video
        }
      } else {
        // Non-video: build a deterministic search URL
        resources.push({
          kind: hint.kind,
          source: hint.source,
          title: hint.title || `${SOURCE_DOMAINS[hint.source] || 'Search'}: ${searchTerm}`,
          url: buildSourceUrl(hint.source, searchTerm),
        });
      }
    }

    // Fallback: if no video was found, try once with searchQuery
    if (ytVideos.length === 0 && step.searchQuery) {
      try {
        const videoJson = await searchYouTube(step.searchQuery, youtubeApiKey);
        const video = JSON.parse(videoJson);
        if (video?.videoId) {
          ytVideos.push({
            videoId: video.videoId,
            title: video.title,
            url: video.url,
          });
          resources.unshift({
            kind: 'video',
            source: 'youtube',
            title: video.title,
            url: video.url,
            videoId: video.videoId,
          });
        }
      } catch {
        // ignore
      }
    }

    const primary = ytVideos[0];

    checkpoints.push({
      title: step.title,
      description: step.description,
      estimatedHours: step.estimatedHours,
      type: step.type,
      difficulty: step.difficulty,
      searchQuery: step.searchQuery,
      resources,
      // backward-compat
      videos: ytVideos.length > 0 ? ytVideos : undefined,
      videoId: primary?.videoId,
      videoTitle: primary?.title,
      url: primary?.url,
    });
  }

  return { topic, category, description, difficulty, totalEstimatedHours, checkpoints };
}
