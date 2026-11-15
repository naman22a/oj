import { Type, type Static } from '@sinclair/typebox';

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
