import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import API from '../api';
import type { Problem } from '../interfaces';
import { cn } from 'cn';
import { Link } from 'react-router';

const ProblemsList: React.FC = () => {
    const problemsQuery = useQuery({
        queryKey: ['problems'],
        queryFn: async () => await API.get<Problem[]>('/problems')
    });

    if (problemsQuery.isLoading) return <p>Loading...</p>;
    if (problemsQuery.isError) return <p>Something went wrong</p>;

    return (
        <div>
            <h3 className="text-xl font-semibold mb-10">Problems</h3>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>S.No</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Difficulty</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {problemsQuery.data?.data.map((problem, index) => (
                        <TableRow key={index}>
                            <TableCell>{index + 1}</TableCell>

                            <TableCell>
                                <Link to={`/problems/${problem.slug}`}>
                                    {problem.title}
                                </Link>
                            </TableCell>

                            <TableCell>
                                {problem.description.slice(0, 100) + '...'}
                            </TableCell>
                            <TableCell
                                className={cn(
                                    'text-right',
                                    problem.difficulty === 'Easy' &&
                                        'text-green-500',
                                    problem.difficulty === 'Medium' &&
                                        'text-yellow-500',
                                    problem.difficulty === 'Hard' &&
                                        'text-red-500'
                                )}
                            >
                                {problem.difficulty}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};

export default ProblemsList;
