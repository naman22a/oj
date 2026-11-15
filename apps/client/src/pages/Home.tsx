import React from 'react';
import { ModeToggle } from '../components/mode-toggle';
import { useQuery } from '@tanstack/react-query';
import API from '../api';
import { useNavigate } from 'react-router';
import type { MeResponse } from '../interfaces';
import LogoutButton from '../components/logout-button';

const Home: React.FC = () => {
    const navigate = useNavigate();
    const meQuery = useQuery({
        queryKey: ['auth', 'me'],
        queryFn: async () => await API.get<MeResponse>('/auth/me')
    });

    if (meQuery.isLoading) {
        return <p>Loading...</p>;
    }

    if (meQuery.isError) {
        navigate('/login');
        return null;
    }

    return (
        <div>
            <nav className="flex items-center justify-between px-20 py-10">
                <h1 className="text-4xl font-semibold">
                    Welcome back, {meQuery.data?.data.username}
                </h1>
                <div className="flex items-center gap-5">
                    <ModeToggle />
                    <LogoutButton />
                </div>
            </nav>
            <main className="px-20">
                {/* // TODO: add problems list here */}
            </main>
        </div>
    );
};

export default Home;
