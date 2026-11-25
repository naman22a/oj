import React from 'react';
import { useStore } from '../store';
import { useQuery } from '@tanstack/react-query';
import API from '../api';
import type { ISubmission } from '../interfaces';
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { cn } from 'cn';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

interface Props {
    id: number;
}

const Submissions: React.FC<Props> = ({ id }) => {
    const { setCode, setLanguage } = useStore();
    const submissionsQuery = useQuery({
        queryKey: ['submissions'],
        queryFn: () => API.get<ISubmission[]>(`/submissions/history/${id}`),
        select(res) {
            return res.data;
        }
    });

    if (submissionsQuery.isLoading) return <p>Loading...</p>;

    if (submissionsQuery.isError) return <p>Something went wrong</p>;

    return (
        <Table>
            <TableCaption>A list of your recent submissions.</TableCaption>
            <TableHeader>
                <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead>Submitted On</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {submissionsQuery.data?.map((submission) => (
                    <TableRow
                        key={submission.id}
                        className="cursor-pointer"
                        onClick={() => {
                            setCode(submission.code);
                            setLanguage(submission.language);
                        }}
                    >
                        <TableCell
                            className={cn(
                                submission.status === 'WrongAnswer'
                                    ? 'text-red-600'
                                    : 'text-green-500'
                            )}
                        >
                            {submission.status}
                        </TableCell>
                        <TableCell>{submission.language}</TableCell>
                        <TableCell>
                            {dayjs(submission.submittedAt).fromNow()}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};

export default Submissions;
