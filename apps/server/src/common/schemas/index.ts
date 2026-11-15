import { Type, type Static } from '@sinclair/typebox';

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
