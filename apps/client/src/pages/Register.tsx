import React from 'react';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle
} from '@/components/ui/card';
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff } from 'lucide-react';
import { registerSchema } from '@/schemas';
import { useMutation } from '@tanstack/react-query';
import API from '@/api';
import type { OkResponse } from '@/interfaces';
import { toast } from '@/components/ui/toast';
import axios from 'axios';

const Register: React.FC = () => {
    const [showPassword, setShowPassword] = React.useState(false);
    const form = useForm<z.infer<typeof registerSchema>>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            username: '',
            email: '',
            password: ''
        }
    });
    const registerMutation = useMutation({
        mutationKey: ['auth', 'register'],
        mutationFn: async (data: z.infer<typeof registerSchema>) =>
            await API.post<OkResponse>('/auth/register', data)
    });

    const onSubmit = async (data: z.infer<typeof registerSchema>) => {
        try {
            const res = await registerMutation.mutateAsync(data);
            if (res.status === 201) {
                toast.add({
                    title: 'Please check your email',
                    type: 'success'
                });
            } else {
                throw new Error(res.data.errors!.toString());
            }
        } catch (error) {
            if (axios.isAxiosError(error) && error.status === 400) {
                for (const err of error.response?.data.errors) {
                    form.setError(err.field as any, {
                        message: err.message
                    });
                }
            } else {
                console.error(error);
                toast.add({
                    title: 'Something went wrong',
                    type: 'error'
                });
            }
        }
    };

    return (
        <div className="flex justify-center items-center min-h-screen">
            <Card className="w-full sm:max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl font-semibold">
                        Register
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form
                        id="form-register"
                        onSubmit={form.handleSubmit(onSubmit)}
                    >
                        <FieldGroup>
                            <Controller
                                name="username"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="form-register-username">
                                            Username
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id="form-register-username"
                                            aria-invalid={fieldState.invalid}
                                            placeholder="Enter username"
                                            autoComplete="off"
                                        />
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />
                            <Controller
                                name="email"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="form-register-email">
                                            Email
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id="form-register-email"
                                            aria-invalid={fieldState.invalid}
                                            placeholder="Enter email"
                                            autoComplete="off"
                                            type="email"
                                        />
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />
                            <Controller
                                name="password"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field
                                        data-invalid={fieldState.invalid}
                                        className="relative"
                                    >
                                        <FieldLabel htmlFor="form-register-password">
                                            Password
                                        </FieldLabel>
                                        <div className="flex items-center justify-between">
                                            <Input
                                                {...field}
                                                id="form-register-password"
                                                aria-invalid={
                                                    fieldState.invalid
                                                }
                                                placeholder="Enter password"
                                                autoComplete="off"
                                                type={
                                                    showPassword
                                                        ? 'text'
                                                        : 'password'
                                                }
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="px-3 py-2 hover:bg-transparent"
                                                onClick={() =>
                                                    setShowPassword(
                                                        (prev) => !prev
                                                    )
                                                }
                                                disabled={field.disabled}
                                            >
                                                {showPassword ? (
                                                    <EyeOff
                                                        className="h-4 w-4 text-muted-foreground"
                                                        aria-hidden="true"
                                                    />
                                                ) : (
                                                    <Eye
                                                        className="h-4 w-4 text-muted-foreground"
                                                        aria-hidden="true"
                                                    />
                                                )}
                                                <span className="sr-only">
                                                    {showPassword
                                                        ? 'Hide password'
                                                        : 'Show password'}
                                                </span>
                                            </Button>
                                        </div>
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />
                        </FieldGroup>
                    </form>
                </CardContent>
                <CardFooter>
                    <Field orientation="horizontal">
                        <Button type="submit" form="form-register">
                            Register
                        </Button>
                    </Field>
                </CardFooter>
            </Card>
        </div>
    );
};

export default Register;
