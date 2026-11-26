import React, { useEffect, useState } from 'react';
import type {
    CreateSubmissionResponse,
    ExtendedProblem,
    SubmissionStatus
} from '../interfaces';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useStore } from '../store';
import { LANG_CONFIGS, languages } from '@/constants';
import Editor from '@monaco-editor/react';
import { useQueryClient } from '@tanstack/react-query';
import { getAccessToken } from '../global';
import { connectSocket, getSocket } from '../lib/socket';
import API from '../api';
import { toast } from './ui/toast';
import { cn } from 'cn';
import { outputsMatch } from '../utils';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';

interface Props {
    problem: ExtendedProblem;
}

export interface SubmissionUpdate {
    submissionId: number;
    status: SubmissionStatus;
    runtime?: number;
    memory?: number;
    testCasesPassed?: number;
    totalTestCases?: number;
    errorMessage?: string | null;
    results?: {
        output: string;
        expectedOutput: string;
    }[];
}

const Right: React.FC<Props> = ({ problem }) => {
    const [results, setResults] = useState<
        {
            output: string;
            expectedOutput: string;
        }[]
    >([]);
    const [loading, setLoading] = useState(false);
    const queryClient = useQueryClient();
    const { language, code, setCode, setLanguage } = useStore();

    useEffect(() => {
        const token = getAccessToken();
        if (!token) return;

        connectSocket();
        const socket = getSocket();
        if (!socket) return;

        socket.on('connect', () => {
            console.log('Connected:', socket.id);
        });

        socket.on('submission:updated', (res: SubmissionUpdate) => {
            console.log('[SOCKET] Submission update:', res);

            if (!res) return;

            switch (res.status) {
                case 'Queued':
                    toast.add({ type: 'info', title: 'Queued Submission' });
                    break;

                case 'Compiling':
                    toast.add({ type: 'info', title: 'Compiling Submission' });
                    break;

                case 'Running':
                    toast.add({ type: 'info', title: 'Running Submission' });
                    break;

                case 'Accepted':
                    toast.add({
                        type: 'success',
                        title: 'Accepted Submission'
                    });
                    break;

                case 'WrongAnswer':
                    toast.add({ type: 'error', title: 'Wrong Answer' });
                    break;

                case 'CompileError':
                    toast.add({ type: 'error', title: 'Compile Error' });
                    break;

                case 'TimeLimitExceeded':
                    toast.add({ type: 'error', title: 'Time Limit Exceeded' });
                    break;

                case 'MemoryLimitExceeded':
                    toast.add({
                        type: 'error',
                        title: 'Memory Limit Exceeded'
                    });
                    break;

                case 'RuntimeError':
                    toast.add({ type: 'error', title: 'Runtime Error' });
                    break;

                case 'InternalError':
                    toast.add({ type: 'error', title: 'Internal Error' });
                    break;
            }

            // Update test case results received from backend.
            if (res.results !== undefined) {
                console.log('[UI] Updating results:', res.results);
                setResults(res.results);
            }

            // Only stop loading when execution has finished.
            const terminalStatuses = [
                'Accepted',
                'WrongAnswer',
                'TimeLimitExceeded',
                'MemoryLimitExceeded',
                'RuntimeError',
                'CompileError',
                'InternalError'
            ];

            if (terminalStatuses.includes(res.status)) {
                setLoading(false);
            }

            queryClient.invalidateQueries({
                queryKey: ['submissions']
            });
        });

        return () => {
            socket.disconnect();
            socket.off('connect');
            socket.off('submission:updated');
        };
    }, [getAccessToken()]);

    const handleSubmit = async () => {
        setLoading(true);
        setResults([]);

        try {
            const res = await API.post<CreateSubmissionResponse>(
                `/submissions/${problem.slug}`,
                {
                    code,
                    language
                }
                // {
                //     headers: {
                //         'Idempotency-Key':
                //             '7f82c0c4-9b2d-4e92-a2a1-123456789abc'
                //     }
                // }
            );

            console.log(res.data);

            if (!res.data.ok) {
                throw new Error(res.data.errors.toString());
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="w-full overflow-y-scroll md:w-1/2 p-5">
            Language:{' '}
            <DropdownMenu>
                <DropdownMenuTrigger className="px-6 py-1 border-2 border-gray-600 rounded-2xl mb-5">
                    {language}
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    {languages.map((lang) => (
                        <DropdownMenuItem
                            key={lang}
                            onClick={() => {
                                setCode(LANG_CONFIGS[lang]?.defaultCode ?? '');
                                setLanguage(lang);
                            }}
                        >
                            {lang}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
            <div className="mb-10">
                <Editor
                    height="50vh"
                    theme="vs-dark"
                    language={language}
                    value={code}
                    onChange={(e: any) => {
                        setCode(e!);
                    }}
                />
            </div>
            <div className="flex gap-5">
                <Button
                    onClick={() => handleSubmit()}
                    disabled={loading}
                    className="text-white bg-green-500 hover:bg-green-600 font-semibold"
                >
                    {loading && <Spinner />}
                    Submit
                </Button>
            </div>
            <Separator className="my-5" />
            {results.length > 0 && (
                <ScrollArea className="my-2 h-[35vh]">
                    {results.map((result, index) => (
                        <div
                            key={index}
                            className={cn(
                                'p-5 my-2 rounded',
                                outputsMatch(
                                    result.output,
                                    result.expectedOutput
                                )
                                    ? 'bg-green-500'
                                    : 'bg-red-500'
                            )}
                        >
                            <h3 className="font-semibold text-lg">
                                Test Case {index + 1}
                            </h3>
                            <span className="font-semibold">Your Output:</span>{' '}
                            {result.output}
                            <br />
                            <span className="font-semibold">
                                Expected Output:
                            </span>{' '}
                            {result.expectedOutput}
                        </div>
                    ))}
                </ScrollArea>
            )}
        </div>
    );
};

export default Right;
