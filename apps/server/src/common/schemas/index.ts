import { Type, type Static } from '@sinclair/typebox';

// ==========================================
// COMMON SCHEMAS
// ==========================================

const DateType = Type.String({ format: 'date-time' });

export const FieldErrorSchema = Type.Object({
    field: Type.String({ minLength: 1 }),
    message: Type.String({ minLength: 1 })
});

export const OkResponse = Type.Object({
    ok: Type.Boolean()
});

export const OkResponseAndErrors = Type.Object({
    ok: Type.Boolean(),
    errors: Type.Optional(Type.Array(FieldErrorSchema))
});

// ==========================================
// AUTH SCHEMAS
// ==========================================

export const RegisterSchema = {
    body: Type.Object({
        username: Type.String({ minLength: 3 }),
        email: Type.String({ format: 'email' }),
        password: Type.String({ minLength: 6 })
    }),
    response: {
        201: OkResponse,
        400: OkResponseAndErrors,
        500: OkResponseAndErrors
    }
};

export type RegisterType = {
    Body: Static<typeof RegisterSchema.body>;
    Reply:
        | Static<(typeof RegisterSchema.response)['201']>
        | Static<(typeof RegisterSchema.response)['400']>
        | Static<(typeof RegisterSchema.response)['500']>;
};

export const ConfirmEmailSchema = {
    params: Type.Object({
        token: Type.String({ format: 'uuid' })
    }),
    response: {
        200: OkResponse,
        400: OkResponse,
        500: OkResponseAndErrors
    }
};

export type ConfirmEmailType = {
    Params: Static<typeof ConfirmEmailSchema.params>;
    Reply:
        | Static<(typeof ConfirmEmailSchema.response)['200']>
        | Static<(typeof ConfirmEmailSchema.response)['400']>
        | Static<(typeof ConfirmEmailSchema.response)['500']>;
};

export const AccessTokenResponse = Type.Object({
    accessToken: Type.String()
});

export const LoginSchema = {
    body: Type.Object({
        email: Type.String({ format: 'email' }),
        password: Type.String({ minLength: 1 })
    }),
    response: {
        200: AccessTokenResponse,
        400: OkResponseAndErrors,
        500: OkResponseAndErrors
    }
};

export type LoginType = {
    Body: Static<typeof LoginSchema.body>;
    Reply:
        | Static<(typeof LoginSchema.response)['200']>
        | Static<(typeof LoginSchema.response)['400']>
        | Static<(typeof LoginSchema.response)['500']>;
};

export const LogoutSchema = {
    response: {
        200: OkResponse,
        500: OkResponseAndErrors
    }
};

export type LogoutType = {
    Reply:
        | Static<(typeof LogoutSchema.response)['200']>
        | Static<(typeof LogoutSchema.response)['500']>;
};

export const UserSchema = Type.Object({
    id: Type.Number(),
    username: Type.String(),
    email: Type.String({ format: 'email' }),
    fullName: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    avatarUrl: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    bio: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    githubUrl: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    linkedinUrl: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    websiteUrl: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    isAdmin: Type.Boolean(),
    createdAt: DateType,
    updatedAt: DateType
});

export const MeSchema = {
    response: {
        200: UserSchema,
        404: OkResponseAndErrors,
        500: OkResponseAndErrors
    }
};

export type MeType = {
    Reply:
        | Static<(typeof MeSchema.response)['200']>
        | Static<(typeof MeSchema.response)['500']>;
};

export const ForgotPasswordSchema = {
    body: Type.Object({
        email: Type.String({ format: 'email' })
    }),
    response: {
        200: OkResponse,
        400: OkResponseAndErrors,
        500: OkResponseAndErrors
    }
};

export type ForgotPasswordType = {
    Body: Static<typeof ForgotPasswordSchema.body>;
    Reply:
        | Static<(typeof ForgotPasswordSchema.response)['200']>
        | Static<(typeof ForgotPasswordSchema.response)['400']>
        | Static<(typeof ForgotPasswordSchema.response)['500']>;
};

export const ResetPasswordSchema = {
    body: Type.Object({
        password: Type.String({ minLength: 6 })
    }),
    params: Type.Object({
        token: Type.String({ format: 'uuid' })
    }),
    response: {
        200: OkResponse,
        400: OkResponseAndErrors,
        500: OkResponseAndErrors
    }
};

export type ResetPasswordType = {
    Params: Static<typeof ResetPasswordSchema.params>;
    Body: Static<typeof ResetPasswordSchema.body>;
    Reply:
        | Static<(typeof ResetPasswordSchema.response)['200']>
        | Static<(typeof ResetPasswordSchema.response)['400']>
        | Static<(typeof ResetPasswordSchema.response)['500']>;
};

export const RefreshTokenSchema = {
    response: {
        200: AccessTokenResponse,
        400: OkResponseAndErrors,
        500: OkResponseAndErrors
    }
};

export type RefreshTokenType = {
    Reply:
        | Static<(typeof RefreshTokenSchema.response)['200']>
        | Static<(typeof RefreshTokenSchema.response)['400']>
        | Static<(typeof RefreshTokenSchema.response)['500']>;
};

// ==========================================
// USERS SCHEMAS
// ==========================================

export const GetUsersSchema = {
    response: {
        200: Type.Array(UserSchema),
        500: OkResponseAndErrors
    }
};

export type GetUsersType = {
    Reply:
        | Static<(typeof GetUsersSchema.response)['200']>
        | Static<(typeof GetUsersSchema.response)['500']>;
};

export const GetUserSchema = {
    params: Type.Object({
        id: Type.Integer()
    }),
    response: {
        200: UserSchema,
        404: OkResponseAndErrors,
        500: OkResponseAndErrors
    }
};

export type GetUserType = {
    Params: Static<typeof GetUserSchema.params>;
    Reply:
        | Static<(typeof GetUserSchema.response)['200']>
        | Static<(typeof GetUserSchema.response)['404']>
        | Static<(typeof GetUserSchema.response)['500']>;
};

export const DifficultySchema = Type.Union([
    Type.Literal('Easy'),
    Type.Literal('Medium'),
    Type.Literal('Hard')
]);

// ==========================================
// PROBLEMS SCHEMAS
// ==========================================

export type Difficulty = Static<typeof DifficultySchema>;

export const ProblemSchema = Type.Object({
    id: Type.Number(),
    title: Type.String(),
    slug: Type.String(),
    description: Type.String(),
    difficulty: DifficultySchema,
    acceptanceRate: Type.String(),
    totalSubmissions: Type.Number(),
    totalAccepted: Type.Number(),
    likes: Type.Number(),
    dislikes: Type.Number(),
    constraints: Type.String(),
    hints: Type.Array(Type.String()),
    similarProblems: Type.Array(Type.Number()),
    createdById: Type.Number(),
    createdAt: Type.String({ format: 'date-time' }),
    updatedAt: Type.String({ format: 'date-time' })
});

export type Problem = Static<typeof ProblemSchema>;

export const GetProblemsSchema = {
    response: {
        200: Type.Array(ProblemSchema),
        500: OkResponseAndErrors
    }
};

export type GetProblemsType = {
    Reply:
        | Static<(typeof GetProblemsSchema.response)['200']>
        | Static<(typeof GetProblemsSchema.response)['500']>;
};

// --- Tags & Companies (Join Entities) ---
// Assuming Tag and Company have standard { id, name, slug? } shapes; adjust if needed
export const TagSchema = Type.Object({
    id: Type.Number(),
    name: Type.String(),
    slug: Type.Optional(Type.String())
});

export const ProblemTagSchema = Type.Object({
    problemId: Type.Number(),
    tagId: Type.Number(),
    tag: Type.Optional(TagSchema)
});

export const CompanySchema = Type.Object({
    id: Type.Number(),
    name: Type.String(),
    slug: Type.Optional(Type.String())
});

export const ProblemCompanySchema = Type.Object({
    problemId: Type.Number(),
    companyId: Type.Number(),
    frequency: Type.Number(),
    lastAskedDate: Type.Optional(
        Type.Union([Type.String({ format: 'date' }), Type.Null()])
    ),
    company: Type.Optional(CompanySchema)
});

// --- Test Cases ---
export const TestCaseSchema = Type.Object({
    id: Type.Number(),
    problemId: Type.Number(),
    input: Type.String(),
    expectedOutput: Type.String(),
    isSample: Type.Boolean(),
    isActive: Type.Boolean(),
    explanation: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    createdAt: Type.String({ format: 'date-time' })
});

// --- Editorials ---
export const EditorialSchema = Type.Object({
    id: Type.Number(),
    problemId: Type.Number(),
    title: Type.String({ maxLength: 255 }),
    approach: Type.Optional(
        Type.Union([Type.String({ maxLength: 100 }), Type.Null()])
    ),
    content: Type.String(),
    codeSnippets: Type.Optional(
        Type.Union([Type.Record(Type.String(), Type.Unknown()), Type.Null()])
    ),
    timeComplexity: Type.Optional(
        Type.Union([Type.String({ maxLength: 100 }), Type.Null()])
    ),
    spaceComplexity: Type.Optional(
        Type.Union([Type.String({ maxLength: 100 }), Type.Null()])
    ),
    isOfficial: Type.Boolean(),
    createdById: Type.Number(),
    createdAt: Type.String({ format: 'date-time' }),
    updatedAt: Type.String({ format: 'date-time' })
});

// --- Comments (Recursive for replies) ---
export const CommentSchema = Type.Recursive((This) =>
    Type.Object({
        id: Type.Number(),
        problemId: Type.Number(),
        userId: Type.Number(),
        parentId: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
        title: Type.Optional(
            Type.Union([Type.String({ maxLength: 255 }), Type.Null()])
        ),
        content: Type.String(),
        isSolution: Type.Boolean(),
        language: Type.Optional(
            Type.Union([Type.String({ maxLength: 50 }), Type.Null()])
        ),
        upvotes: Type.Number(),
        downvotes: Type.Number(),
        isPinned: Type.Boolean(),
        isDeleted: Type.Boolean(),
        createdAt: Type.String({ format: 'date-time' }),
        updatedAt: Type.String({ format: 'date-time' }),
        replies: Type.Optional(Type.Array(This))
    })
);

// --- User Interactions (Bookmarks & Likes) ---
export const BookmarkSchema = Type.Object({
    userId: Type.Number(),
    problemId: Type.Number(),
    notes: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    createdAt: Type.String({ format: 'date-time' })
});

export const ProblemLikeSchema = Type.Object({
    userId: Type.Number(),
    problemId: Type.Number(),
    isLike: Type.Boolean(),
    createdAt: Type.String({ format: 'date-time' })
});

export const ExtendedProblemSchema = Type.Composite([
    ProblemSchema,
    Type.Object({
        problemTags: Type.Array(ProblemTagSchema),
        problemCompanies: Type.Array(ProblemCompanySchema),
        testCases: Type.Array(TestCaseSchema),
        editorials: Type.Array(EditorialSchema),
        comments: Type.Array(CommentSchema),
        bookmarks: Type.Array(BookmarkSchema),
        problemLikes: Type.Array(ProblemLikeSchema)
    })
]);

export type ExtendedProblem = Static<typeof ExtendedProblemSchema>;

export const GetProblemSchema = {
    params: Type.Object({
        id: Type.Integer()
    }),
    response: {
        200: ExtendedProblemSchema,
        404: OkResponseAndErrors,
        500: OkResponseAndErrors
    }
};

export type GetProblemType = {
    Params: Static<typeof GetProblemSchema.params>;
    Reply:
        | Static<(typeof GetProblemSchema.response)['200']>
        | Static<(typeof GetProblemSchema.response)['404']>
        | Static<(typeof GetProblemSchema.response)['500']>;
};

export const CreateTestCaseInputSchema = Type.Object({
    input: Type.String(),
    expectedOutput: Type.String(),
    isSample: Type.Optional(Type.Boolean({ default: false })),
    isActive: Type.Optional(Type.Boolean({ default: true })),
    explanation: Type.Optional(Type.Union([Type.String(), Type.Null()]))
});

export const CreateProblemCompanyInputSchema = Type.Object({
    companyId: Type.Integer(),
    frequency: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
    lastAskedDate: Type.Optional(
        Type.Union([Type.String({ format: 'date' }), Type.Null()])
    )
});

export const CreateEditorialInputSchema = Type.Object({
    title: Type.String({ maxLength: 255 }),
    approach: Type.Optional(
        Type.Union([Type.String({ maxLength: 100 }), Type.Null()])
    ),
    content: Type.String(),
    codeSnippets: Type.Optional(
        Type.Union([Type.Record(Type.String(), Type.Unknown()), Type.Null()])
    ),
    timeComplexity: Type.Optional(
        Type.Union([Type.String({ maxLength: 100 }), Type.Null()])
    ),
    spaceComplexity: Type.Optional(
        Type.Union([Type.String({ maxLength: 100 }), Type.Null()])
    ),
    isOfficial: Type.Optional(Type.Boolean({ default: true })),
    createdById: Type.Integer()
});

// --- Create Problem Route Schema & Type ---

export const CreateProblemBodySchema = Type.Object({
    title: Type.String({ minLength: 1, maxLength: 255 }),
    slug: Type.String({ minLength: 1, maxLength: 255 }),
    description: Type.String({ minLength: 1 }),
    difficulty: DifficultySchema,
    constraints: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    hints: Type.Optional(Type.Array(Type.String(), { default: [] })),
    similarProblems: Type.Optional(Type.Array(Type.Integer(), { default: [] })),
    createdById: Type.Integer(), // Omit if extracted from req.user auth context

    // Optional relational inputs created alongside the problem
    tagIds: Type.Optional(Type.Array(Type.Integer())),
    companies: Type.Optional(Type.Array(CreateProblemCompanyInputSchema)),
    testCases: Type.Optional(Type.Array(CreateTestCaseInputSchema)),
    editorials: Type.Optional(Type.Array(CreateEditorialInputSchema))
});

export const CreateProblemSchema = {
    body: CreateProblemBodySchema,
    response: {
        201: ExtendedProblemSchema,
        400: OkResponseAndErrors,
        409: OkResponseAndErrors, // for duplicate case
        500: OkResponseAndErrors
    }
};

export type CreateProblemType = {
    Body: Static<typeof CreateProblemSchema.body>;
    Reply:
        | Static<(typeof CreateProblemSchema.response)['201']>
        | Static<(typeof CreateProblemSchema.response)['400']>
        | Static<(typeof CreateProblemSchema.response)['409']>
        | Static<(typeof CreateProblemSchema.response)['500']>;
};

export const UpdateProblemBodySchema = Type.Object({
    title: Type.String({ minLength: 1, maxLength: 255 }),
    slug: Type.String({ minLength: 1, maxLength: 255 }),
    description: Type.String({ minLength: 1 }),
    difficulty: DifficultySchema,
    constraints: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    hints: Type.Optional(Type.Array(Type.String(), { default: [] })),
    similarProblems: Type.Optional(Type.Array(Type.Integer(), { default: [] })),

    // Relational collections replaced on PUT when provided
    tagIds: Type.Optional(Type.Array(Type.Integer(), { default: [] })),
    companies: Type.Optional(
        Type.Array(CreateProblemCompanyInputSchema, { default: [] })
    ),
    testCases: Type.Optional(
        Type.Array(CreateTestCaseInputSchema, { default: [] })
    ),
    editorials: Type.Optional(
        Type.Array(CreateEditorialInputSchema, { default: [] })
    )
});

export const UpdateProblemSchema = {
    params: Type.Object({
        id: Type.Integer()
    }),
    body: UpdateProblemBodySchema,
    response: {
        200: ExtendedProblemSchema,
        400: OkResponseAndErrors,
        404: OkResponseAndErrors,
        409: OkResponseAndErrors,
        500: OkResponseAndErrors
    }
};

export type UpdateProblemType = {
    Params: Static<typeof UpdateProblemSchema.params>;
    Body: Static<typeof UpdateProblemSchema.body>;
    Reply:
        | Static<(typeof UpdateProblemSchema.response)['200']>
        | Static<(typeof UpdateProblemSchema.response)['400']>
        | Static<(typeof UpdateProblemSchema.response)['404']>
        | Static<(typeof UpdateProblemSchema.response)['409']>
        | Static<(typeof UpdateProblemSchema.response)['500']>;
};

export const DeleteProblemSchema = {
    params: Type.Object({
        id: Type.Integer()
    }),
    response: {
        200: Type.Object({
            ok: Type.Literal(true),
            id: Type.Integer()
        }),
        404: OkResponseAndErrors,
        500: OkResponseAndErrors
    }
};

export type DeleteProblemType = {
    Params: Static<typeof DeleteProblemSchema.params>;
    Reply:
        | Static<(typeof DeleteProblemSchema.response)['200']>
        | Static<(typeof DeleteProblemSchema.response)['404']>
        | Static<(typeof DeleteProblemSchema.response)['500']>;
};

// ==========================================
// TAGS SCHEMAS
// ==========================================

export const TagResponseSchema = Type.Object({
    id: Type.Number(),
    name: Type.String(),
    slug: Type.String(),
    description: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    createdAt: Type.String({ format: 'date-time' })
});

export const GetTagsSchema = {
    response: {
        200: Type.Array(TagResponseSchema),
        500: OkResponseAndErrors
    }
};

export type GetTagsType = {
    Reply:
        | Static<(typeof GetTagsSchema.response)['200']>
        | Static<(typeof GetTagsSchema.response)['500']>;
};

export const GetTagSchema = {
    params: Type.Object({
        id: Type.Integer()
    }),
    response: {
        200: TagResponseSchema,
        404: OkResponseAndErrors,
        500: OkResponseAndErrors
    }
};

export type GetTagType = {
    Params: Static<typeof GetTagSchema.params>;
    Reply:
        | Static<(typeof GetTagSchema.response)['200']>
        | Static<(typeof GetTagSchema.response)['404']>
        | Static<(typeof GetTagSchema.response)['500']>;
};

export const BulkCreateTagsSchema = {
    body: Type.Object({
        tags: Type.Array(
            Type.Object({
                name: Type.String({ minLength: 1, maxLength: 100 }),
                slug: Type.String({ minLength: 1, maxLength: 100 }),
                description: Type.Optional(
                    Type.Union([
                        Type.String({ minLength: 1, maxLength: 100 }),
                        Type.Null()
                    ])
                )
            }),
            { minItems: 1 }
        )
    }),
    response: {
        201: Type.Array(TagResponseSchema),
        409: OkResponseAndErrors,
        500: OkResponseAndErrors
    }
};

export type BulkCreateTagsType = {
    Body: Static<typeof BulkCreateTagsSchema.body>;
    Reply:
        | Static<(typeof BulkCreateTagsSchema.response)['201']>
        | Static<(typeof BulkCreateTagsSchema.response)['409']>
        | Static<(typeof BulkCreateTagsSchema.response)['500']>;
};

// ==========================================
// COMPANIES SCHEMAS
// ==========================================

export const CompanyResponseSchema = Type.Object({
    id: Type.Number(),
    name: Type.String(),
    slug: Type.String(),
    logoUrl: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    createdAt: Type.String({ format: 'date-time' })
});

export const GetCompaniesSchema = {
    response: {
        200: Type.Array(CompanyResponseSchema),
        500: OkResponseAndErrors
    }
};

export type GetCompaniesType = {
    Reply:
        | Static<(typeof GetCompaniesSchema.response)['200']>
        | Static<(typeof GetCompaniesSchema.response)['500']>;
};

export const GetCompanySchema = {
    params: Type.Object({
        id: Type.Integer()
    }),
    response: {
        200: CompanyResponseSchema,
        404: OkResponseAndErrors,
        500: OkResponseAndErrors
    }
};

export type GetCompanyType = {
    Params: Static<typeof GetCompanySchema.params>;
    Reply:
        | Static<(typeof GetCompanySchema.response)['200']>
        | Static<(typeof GetCompanySchema.response)['404']>
        | Static<(typeof GetCompanySchema.response)['500']>;
};

export const BulkCreateCompaniesSchema = {
    body: Type.Object({
        companies: Type.Array(
            Type.Object({
                name: Type.String({ minLength: 1, maxLength: 100 }),
                slug: Type.String({ minLength: 1, maxLength: 100 }),
                logoUrl: Type.Optional(
                    Type.Union([
                        Type.String({ minLength: 1, maxLength: 255 }),
                        Type.Null()
                    ])
                )
            }),
            { minItems: 1 }
        )
    }),
    response: {
        201: Type.Array(CompanyResponseSchema),
        409: OkResponseAndErrors,
        500: OkResponseAndErrors
    }
};

export type BulkCreateCompaniesType = {
    Body: Static<typeof BulkCreateCompaniesSchema.body>;
    Reply:
        | Static<(typeof BulkCreateCompaniesSchema.response)['201']>
        | Static<(typeof BulkCreateCompaniesSchema.response)['409']>
        | Static<(typeof BulkCreateCompaniesSchema.response)['500']>;
};
