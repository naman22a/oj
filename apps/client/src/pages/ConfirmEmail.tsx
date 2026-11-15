import React from 'react';
import { Card, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { useNavigate, useParams } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import API from '@/api';
import type { OkResponse } from '@/interfaces';
import { toast } from '@/components/ui/toast';

const ConfirmEmail: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const confirmEmailMutation = useMutation({
        mutationKey: ['auth', 'confirm-email', token],
        mutationFn: async () =>
            await API.post<OkResponse>(`/auth/confirm-email/${token}`)
    });

    const handleClick = async () => {
        try {
            const res = await confirmEmailMutation.mutateAsync();
            if (res.status === 200) {
                toast.add({
                    title: 'Email confimed, now you can login',
                    type: 'success'
                });

                await navigate('/login');
            } else {
                throw new Error(res.data.errors?.toString());
            }
        } catch (error) {
            console.error(error);
            toast.add({
                title: 'Invalid token',
                type: 'error'
            });
        }
    };

    return (
        <div className="flex justify-center items-center min-h-screen">
            <Card className="w-full sm:max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl font-semibold">
                        Confirm Email
                    </CardTitle>
                </CardHeader>
                <CardFooter>
                    <Field orientation="horizontal">
                        <Button onClick={() => handleClick()}>Confirm</Button>
                    </Field>
                </CardFooter>
            </Card>
        </div>
    );
};

export default ConfirmEmail;
