import React from 'react';
import { ModeToggle } from '@/components/mode-toggle';
import { useQuery } from '@tanstack/react-query';
import API from '@/api';
import { Navigate } from 'react-router';
import type { MeResponse } from '@/interfaces';
import LogoutButton from '@/components/logout-button';
import ProblemsList from '../components/problems-list';

const Home: React.FC = () => {
    const meQuery = useQuery({
        queryKey: ['auth', 'me'],
        queryFn: async () => await API.get<MeResponse>('/auth/me')
    });

    if (meQuery.isLoading) {
        return <p>Loading...</p>;
    }

    if (meQuery.isError) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div>
            <nav className="flex items-center justify-between px-20 py-10">
                <h1 className="text-4xl font-semibold border-b-2 border-b-amber-500 pb-2">
                    Online Judge
                </h1>
                <div className="flex items-center gap-5">
                    <h2 className="text-2xl font-semibold">
                        {meQuery.data?.data.username}
                    </h2>
                    <ModeToggle />
                    <LogoutButton />
                </div>
            </nav>
            <main className="px-20">
                <ProblemsList />
            </main>
        </div>
    );
};

export default Home;
