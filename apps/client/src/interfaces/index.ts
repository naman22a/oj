export interface FieldError {
    field: string;
    message: string;
}

export interface OkResponse {
    ok: boolean;
    errors?: FieldError[];
}

export interface LoginResponse extends OkResponse {
    accessToken: string;
}

export interface User {
    id: number;
    username: string;
    email: string;
    isAdmin: boolean;
    createdAt: string;
    updatedAt: string;
    fullName: string | null;
    avatarUrl: string | null;
    bio: string | null;
    githubUrl: string | null;
    linkedinUrl: string | null;
    websiteUrl: string | null;
}

export interface MeResponse extends User {}

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface Problem {
    id: number;
    title: string;
    slug: string;
    description: string;
    difficulty: Difficulty;
    acceptanceRate: string;
    totalSubmissions: number;
    totalAccepted: number;
    likes: number;
    dislikes: number;
    constraints: string;
    hints: string[];
    similarProblems: number[];
    createdById: number;
    createdAt: string;
    updatedAt: string;
}

export interface Tag {
    id: number;
    name: string;
    slug?: string;
}

export interface ProblemTag {
    problemId: number;
    tagId: number;
    tag?: Tag;
}

export interface Company {
    id: number;
    name: string;
    slug?: string;
}

export interface ProblemCompany {
    problemId: number;
    companyId: number;
    frequency: number;
    lastAskedDate?: string | null;
    company?: Company;
}

export interface TestCase {
    id: number;
    problemId: number;
    input: string;
    expectedOutput: string;
    isSample: boolean;
    isActive: boolean;
    explanation?: string | null;
    createdAt: string;
}

export interface Editorial {
    id: number;
    problemId: number;
    title: string;
    approach?: string | null;
    content: string;
    codeSnippets?: Record<string, unknown> | null;
    timeComplexity?: string | null;
    spaceComplexity?: string | null;
    isOfficial: boolean;
    createdById: number;
    createdAt: string;
    updatedAt: string;
}

export interface Comment {
    id: number;
    problemId: number;
    userId: number;
    parentId?: number | null;
    title?: string | null;
    content: string;
    isSolution: boolean;
    language?: string | null;
    upvotes: number;
    downvotes: number;
    isPinned: boolean;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
    replies?: Comment[];
}

export interface Bookmark {
    userId: number;
    problemId: number;
    notes?: string | null;
    createdAt: string;
}

export interface ProblemLike {
    userId: number;
    problemId: number;
    isLike: boolean;
    createdAt: string;
}

export interface ExtendedProblem extends Problem {
    problemTags: ProblemTag[];
    problemCompanies: ProblemCompany[];
    testCases: TestCase[];
    editorials: Editorial[];
    comments: Comment[];
    bookmarks: Bookmark[];
    problemLikes: ProblemLike[];
}

export type CreateSubmissionResponse =
    | {
          ok: true;
          data: {
              submissionId: number;
              status: string;
          };
      }
    | {
          ok: false;
          jobId?: number | null;
          errors: FieldError[];
      };

export const SubmissionStatus = {
    QUEUED: 'Queued',
    COMPILING: 'Compiling',
    RUNNING: 'Running',

    ACCEPTED: 'Accepted',
    WRONG_ANSWER: 'WrongAnswer',
    TIME_LIMIT_EXCEEDED: 'TimeLimitExceeded',
    MEMORY_LIMIT_EXCEEDED: 'MemoryLimitExceeded',
    RUNTIME_ERROR: 'RuntimeError',
    COMPILE_ERROR: 'CompileError',
    INTERNAL_ERROR: 'InternalError',

    PENDING: 'Pending'
} as const;

export type SubmissionStatus =
    (typeof SubmissionStatus)[keyof typeof SubmissionStatus];

export interface ISubmission {
    id: number;
    userId: number;
    problemId: number;
    language: string;
    code: string;
    status: SubmissionStatus;
    runtime: number;
    memory: number;
    testCasesPassed: number;
    totalTestCases: number;
    errorMessage: string;
    submittedAt: string;
    idempotencyKey: string | null;
}
