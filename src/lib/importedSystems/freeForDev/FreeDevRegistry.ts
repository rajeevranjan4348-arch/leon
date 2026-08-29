import { FreeDevCategory, FreeDevServiceItem } from './types';

/**
 * FreeDevRegistry
 * Structured catalog of free developer tiers and cloud services based on ripienaar/free-for-dev.
 */
export class FreeDevRegistry {
  private static instance: FreeDevRegistry;
  private services = new Map<string, FreeDevServiceItem>();

  private constructor() {
    this.seedCatalog();
  }

  public static getInstance(): FreeDevRegistry {
    if (!FreeDevRegistry.instance) {
      FreeDevRegistry.instance = new FreeDevRegistry();
    }
    return FreeDevRegistry.instance;
  }

  private seedCatalog(): void {
    const rawServices: FreeDevServiceItem[] = [
      // Hosting / PaaS
      {
        id: 'cloud-run',
        name: 'Google Cloud Run',
        category: 'hosting-paas',
        description: 'Deploy containerized web services and apps with scale-to-zero serverless infrastructure.',
        url: 'https://cloud.google.com/run',
        freeTierDetails: '2 million requests per month, 360,000 GB-seconds memory, 180,000 vCPU-seconds free.',
        requiresCreditCard: true,
        limits: {
          bandwidthOrRequests: '2,000,000 req/mo',
          computeOrRuntime: '180,000 vCPU-sec/mo',
        },
        tags: ['cloud-run', 'serverless', 'containers', 'docker', 'google-cloud'],
        recommendedFor: ['Fullstack Apps', 'Microservices', 'Fast APIs', 'Containerized AI Services'],
      },
      {
        id: 'vercel',
        name: 'Vercel',
        category: 'hosting-paas',
        description: 'Frontend cloud platform for static websites, Next.js, and serverless functions.',
        url: 'https://vercel.com',
        freeTierDetails: 'Hobby plan: Unlimited deployments, 100 GB bandwidth, serverless execution.',
        requiresCreditCard: false,
        limits: {
          bandwidthOrRequests: '100 GB/mo',
          computeOrRuntime: '100 GB-Hrs serverless execution',
        },
        tags: ['nextjs', 'react', 'static-site', 'serverless', 'frontend'],
        recommendedFor: ['React Web Apps', 'Next.js', 'Landing Pages', 'Portfolios'],
      },
      {
        id: 'netlify',
        name: 'Netlify',
        category: 'hosting-paas',
        description: 'Platform for building and hosting modern web applications and JAMstack sites.',
        url: 'https://www.netlify.com',
        freeTierDetails: 'Starter tier: 100GB bandwidth, 300 build minutes/month, form handling included.',
        requiresCreditCard: false,
        limits: {
          bandwidthOrRequests: '100 GB/mo',
          computeOrRuntime: '300 build mins/mo',
        },
        tags: ['jamstack', 'react', 'vue', 'static-site', 'forms'],
        recommendedFor: ['Single Page Apps', 'Documentation Sites', 'JAMstack'],
      },

      // Databases & Backends
      {
        id: 'firebase-firestore',
        name: 'Firebase Firestore & Auth',
        category: 'databases-backends',
        description: 'NoSQL document database, real-time synchronization, and complete authentication suite.',
        url: 'https://firebase.google.com',
        freeTierDetails: 'Spark Plan: 1 GB storage, 50k reads/day, 20k writes/day, unlimited email/password auth.',
        requiresCreditCard: false,
        limits: {
          storage: '1 GB',
          bandwidthOrRequests: '50k reads/day, 20k writes/day',
          usersOrSeats: 'Unlimited users',
        },
        tags: ['firestore', 'firebase', 'nosql', 'realtime', 'auth'],
        recommendedFor: ['Web Applications', 'Mobile Apps', 'Real-Time Chat', 'User Auth'],
      },
      {
        id: 'supabase',
        name: 'Supabase',
        category: 'databases-backends',
        description: 'Open source Firebase alternative with PostgreSQL, Auth, Realtime subscriptions, and Storage.',
        url: 'https://supabase.com',
        freeTierDetails: 'Free plan: 2 active projects, 500MB database, 1GB file storage, 50,000 monthly active users.',
        requiresCreditCard: false,
        limits: {
          storage: '500 MB DB + 1 GB Files',
          usersOrSeats: '50,000 MAU',
        },
        tags: ['postgresql', 'sql', 'auth', 'realtime', 'storage'],
        recommendedFor: ['Relational Apps', 'Postgres Projects', 'CRUD APIs', 'Fullstack Apps'],
      },
      {
        id: 'neon-postgres',
        name: 'Neon Serverless Postgres',
        category: 'databases-backends',
        description: 'Serverless, scalable PostgreSQL with branching, autoscaling, and scale-to-zero.',
        url: 'https://neon.tech',
        freeTierDetails: 'Free tier: 0.5 GB storage, instant database branching, unlimited compute hours.',
        requiresCreditCard: false,
        limits: {
          storage: '0.5 GB',
          computeOrRuntime: 'Scale to zero compute',
        },
        tags: ['postgres', 'serverless', 'sql', 'drizzle', 'prisma'],
        recommendedFor: ['Prisma / Drizzle ORM', 'Serverless APIs', 'Next.js Backends'],
      },

      // Storage & Media
      {
        id: 'cloudflare-r2',
        name: 'Cloudflare R2 Storage',
        category: 'storage-media',
        description: 'S3-compatible zero-egress fee object storage.',
        url: 'https://www.cloudflare.com/products/r2/',
        freeTierDetails: '10 GB storage per month, 1M Class A operations, 10M Class B operations, 0 egress fees.',
        requiresCreditCard: true,
        limits: {
          storage: '10 GB',
          bandwidthOrRequests: 'Zero egress fees',
        },
        tags: ['s3', 'storage', 'media', 'cdn', 'cloudflare'],
        recommendedFor: ['Image Uploads', 'User Documents', 'Asset CDN'],
      },

      // CI/CD & Automation
      {
        id: 'github-actions',
        name: 'GitHub Actions',
        category: 'cicd-automation',
        description: 'Automate software workflows and CI/CD pipelines directly in GitHub.',
        url: 'https://github.com/features/actions',
        freeTierDetails: '2,000 free runner minutes per month for private repositories; unlimited for public.',
        requiresCreditCard: false,
        limits: {
          computeOrRuntime: '2,000 mins/mo private repos',
        },
        tags: ['cicd', 'automation', 'github', 'testing', 'deploy'],
        recommendedFor: ['Automated Testing', 'Docker Builds', 'Deployment Pipelines'],
      },

      // Auth & Identity
      {
        id: 'clerk-dev',
        name: 'Clerk Auth',
        category: 'auth-identity',
        description: 'Complete user authentication, social logins, session management, and UI components.',
        url: 'https://clerk.com',
        freeTierDetails: 'Free plan: Up to 10,000 monthly active users, social logins, passwordless MFA.',
        requiresCreditCard: false,
        limits: {
          usersOrSeats: '10,000 MAU',
        },
        tags: ['auth', 'user-management', 'oauth', 'mfa', 'react-auth'],
        recommendedFor: ['React / Next.js Auth', 'Social Login', 'User Onboarding'],
      },

      // Messaging & Email
      {
        id: 'resend',
        name: 'Resend',
        category: 'messaging-email-sms',
        description: 'Email API for developers with React Email templates and high deliverability.',
        url: 'https://resend.com',
        freeTierDetails: 'Free tier: 3,000 emails/month, 100 emails/day, 1 custom domain.',
        requiresCreditCard: false,
        limits: {
          bandwidthOrRequests: '3,000 emails/month (100/day)',
        },
        tags: ['email', 'transactional-email', 'resend', 'react-email'],
        recommendedFor: ['Password Resets', 'Transactional Emails', 'Welcome Letters'],
      },

      // AI & Machine Learning
      {
        id: 'google-ai-studio',
        name: 'Google AI Studio & Gemini API',
        category: 'ai-machine-learning',
        description: 'State-of-the-art multimodal Gemini models with grounding and 1M+ token context windows.',
        url: 'https://ai.google.dev',
        freeTierDetails: 'Generous free tier: Up to 15 Requests Per Minute (RPM) for Gemini 2.5 Flash without cost.',
        requiresCreditCard: false,
        limits: {
          bandwidthOrRequests: '15 RPM free tier',
          computeOrRuntime: '1M+ token context',
        },
        tags: ['gemini', 'ai', 'multimodal', 'llm', 'google-ai'],
        recommendedFor: ['AI Assistants', 'Multimodal Understanding', 'Code Analysis', 'RAG'],
      },
      {
        id: 'groq-cloud',
        name: 'Groq Cloud LPU',
        category: 'ai-machine-learning',
        description: 'Ultra-fast low-latency open model inference (Llama 3, Mixtral, Gemma).',
        url: 'https://groq.com',
        freeTierDetails: 'Free developer tier: High token-per-second rate limits for popular open source models.',
        requiresCreditCard: false,
        limits: {
          bandwidthOrRequests: '30 requests/min free tier',
        },
        tags: ['groq', 'llama3', 'fast-inference', 'llm', 'open-weights'],
        recommendedFor: ['Fast Real-Time Chat', 'Voice Response Generation', 'Summarization'],
      },

      // Monitoring & Analytics
      {
        id: 'sentry',
        name: 'Sentry Error Tracking',
        category: 'monitoring-analytics',
        description: 'Application performance monitoring, crash diagnostics, and error stack tracking.',
        url: 'https://sentry.io',
        freeTierDetails: 'Developer plan: 5,000 errors/month, 10,000 performance units, 1 user.',
        requiresCreditCard: false,
        limits: {
          bandwidthOrRequests: '5,000 errors/month',
        },
        tags: ['monitoring', 'error-tracking', 'apm', 'sentry', 'telemetry'],
        recommendedFor: ['Frontend Crash Monitoring', 'Backend Error Auditing', 'APM'],
      },
    ];

    rawServices.forEach(s => this.services.set(s.id, s));
  }

  public getService(id: string): FreeDevServiceItem | undefined {
    return this.services.get(id);
  }

  public getAllServices(): FreeDevServiceItem[] {
    return Array.from(this.services.values());
  }

  public getByCategory(category: FreeDevCategory): FreeDevServiceItem[] {
    return Array.from(this.services.values()).filter(s => s.category === category);
  }
}

export const freeDevRegistry = FreeDevRegistry.getInstance();
