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

interface PendingSubmission {
    key: string;
    slug: string;
    code: string;
    language: string;
}

const getPendingSubmission = (slug: string): PendingSubmission | null => {
    const stored = sessionStorage.getItem(`pending-submission:${slug}`);

    if (!stored) return null;

    try {
        return JSON.parse(stored) as PendingSubmission;
    } catch {
        sessionStorage.removeItem(`pending-submission:${slug}`);
        return null;
    }
};

const savePendingSubmission = (submission: PendingSubmission) => {
    sessionStorage.setItem(
        `pending-submission:${submission.slug}`,
        JSON.stringify(submission)
    );
};

const clearPendingSubmission = (slug: string) => {
    sessionStorage.removeItem(`pending-submission:${slug}`);
};

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
        if (loading) return;

        setLoading(true);
        setResults([]);

        const payload = {
            code,
            language
        };

        let pending = getPendingSubmission(problem.slug);

        // Reuse the key only if this is the exact same submission.
        if (
            !pending ||
            pending.code !== payload.code ||
            pending.language !== payload.language
        ) {
            pending = {
                key: crypto.randomUUID(),
                slug: problem.slug,
                code: payload.code,
                language: payload.language
            };

            savePendingSubmission(pending);
        }

        try {
            const res = await API.post<CreateSubmissionResponse>(
                `/submissions/${problem.slug}`,
                payload,
                {
                    headers: {
                        'Idempotency-Key': pending.key
                    }
                }
            );

            console.log(res.data);

            if (!res.data.ok) {
                clearPendingSubmission(problem.slug);
                throw new Error(res.data.errors.toString());
            }

            // The backend acknowledged the submission.
            // Future submissions should receive a new key.
            clearPendingSubmission(problem.slug);
        } catch (error) {
            console.error(error);

            const response = (
                error as {
                    response?: {
                        status?: number;
                    };
                }
            ).response;

            // Keep the key for network failures and 5xx responses:
            // the server may have already created the submission.
            //
            // Clear it for 4xx responses because the server
            // explicitly rejected the request.
            if (
                response?.status &&
                response.status >= 400 &&
                response.status < 500
            ) {
                clearPendingSubmission(problem.slug);
            }

            setLoading(false);
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
