import React from 'react';
import { useQuery } from '@tanstack/react-query';
import API from '@/api';
import type { ExtendedProblem } from '@/interfaces';
import { Navigate, useParams } from 'react-router';
import Left from '@/components/left';
import Right from '@/components/right';

const ProblemDetails: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const problemQuery = useQuery({
        queryKey: ['problems', slug],
        queryFn: async () => await API.get<ExtendedProblem>(`/problems/${slug}`)
    });

    if (problemQuery.isLoading) {
        return <p>Loading...</p>;
    }

    if (problemQuery.isError) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="flex flex-col md:flex-row">
            <Left problem={problemQuery.data?.data!} />
            <Right problem={problemQuery.data?.data!} />
        </div>
    );
};

export default ProblemDetails;
