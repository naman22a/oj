import React from 'react';
import { Button } from './ui/button';
import { LogOut } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import API from '@/api';
import { toast } from './ui/toast';
import { useNavigate } from 'react-router';

const LogoutButton: React.FC = () => {
    const logoutMutation = useMutation({
        mutationKey: ['auth', 'logout'],
        mutationFn: async () => await API.post('/auth/logout')
    });
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            const res = await logoutMutation.mutateAsync();
            if (res.status === 200) {
                toast.add({
                    title: 'Logged out',
                    type: 'success'
                });
                navigate('/login');
            }
        } catch (error) {
            console.error(error);
            toast.add({
                title: 'Something went wrong',
                type: 'error'
            });
        }
    };

    return (
        <Button onClick={() => handleLogout()}>
            <LogOut />
            Logout
        </Button>
    );
};

export default LogoutButton;
