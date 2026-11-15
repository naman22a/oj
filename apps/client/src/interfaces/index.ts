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
