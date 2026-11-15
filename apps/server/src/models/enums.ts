export enum Difficulty {
    EASY = 'Easy',
    MEDIUM = 'Medium',
    HARD = 'Hard'
}

export enum SubmissionLanguage {
    CPP = 'cpp',
    JAVA = 'java',
    JAVASCRIPT = 'javascript',
    PYTHON = 'python',
    GO = 'go',
    RUST = 'rust',
    CSHARP = 'csharp',
    RUBY = 'ruby',
    SWIFT = 'swift',
    PHP = 'php',
    KOTLIN = 'kotlin',
    DART = 'dart',
    R = 'R',
    PERL = 'perl',
    TYPESCRIPT = 'typescript',
    HASKELL = 'haskell'
}

export enum SubmissionStatus {
    ACCEPTED = 'Accepted',
    WRONG_ANSWER = 'WrongAnswer',
    TIME_LIMIT_EXCEEDED = 'TimeLimitExceeded',
    MEMORY_LIMIT_EXCEEDED = 'MemoryLimitExceeded',
    RUNTIME_ERROR = 'RuntimeError',
    COMPILE_ERROR = 'CompileError',
    PENDING = 'Pending'
}

export enum ProblemStatus {
    SOLVED = 'Solved',
    ATTEMPTED = 'Attempted',
    TODO = 'Todo'
}

export enum VoteType {
    UPVOTE = 'Upvote',
    DOWNVOTE = 'Downvote'
}
