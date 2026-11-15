import React from 'react';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle
} from '../components/ui/card';
import { FieldError, FieldGroup } from '@/components/ui/field';
import { Controller, useForm } from 'react-hook-form';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { resetPasswordSchema } from '../schemas';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import type { OkResponse } from '../interfaces';
import API from '../api';
import { useNavigate, useParams } from 'react-router';
import { toast } from '../components/ui/toast';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Eye, EyeOff } from 'lucide-react';

const ResetPassword: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [showPassword, setShowPassword] = React.useState(false);
    const form = useForm<z.infer<typeof resetPasswordSchema>>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            password: '',
            cpassword: ''
        }
    });
    const resetPasswordMutation = useMutation({
        mutationKey: ['auth', 'reset-password'],
        mutationFn: async (data: { password: string; token: string }) =>
            await API.post<OkResponse>(`/auth/reset-password/${data.token}`, {
                password: data.password
            })
    });
    const navigate = useNavigate();

    const onSubmit = async (data: z.infer<typeof resetPasswordSchema>) => {
        const { password, cpassword } = data;
        if (password !== cpassword) {
            form.setError('password', { message: 'passwords must be same' });
            form.setError('cpassword', { message: 'passwords must be same' });
            return;
        }

        try {
            const res = await resetPasswordMutation.mutateAsync({
                token: token!,
                password: data.password
            });
            if (res.status === 200) {
                toast.add({
                    title: 'Now you can login',
                    type: 'success'
                });
                navigate('/login');
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
                        Reset Password
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form
                        id="form-reset-password"
                        onSubmit={form.handleSubmit(onSubmit)}
                    >
                        <FieldGroup>
                            <Controller
                                name="password"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field
                                        data-invalid={fieldState.invalid}
                                        className="relative"
                                    >
                                        <FieldLabel htmlFor="form-reset-password-password">
                                            Password
                                        </FieldLabel>
                                        <div className="flex items-center justify-between">
                                            <Input
                                                {...field}
                                                id="form-reset-password-password"
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
                            <Controller
                                name="cpassword"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field
                                        data-invalid={fieldState.invalid}
                                        className="relative"
                                    >
                                        <FieldLabel htmlFor="form-reset-password-cpassword">
                                            Confirm Password
                                        </FieldLabel>
                                        <div className="flex items-center justify-between">
                                            <Input
                                                {...field}
                                                id="form-reset-password-cpassword"
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
                        <Button type="submit" form="form-reset-password">
                            Reset Password
                        </Button>
                    </Field>
                </CardFooter>
            </Card>
        </div>
    );
};

export default ResetPassword;
