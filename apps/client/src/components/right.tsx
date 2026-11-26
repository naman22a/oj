import React, { useEffect, useRef, useState } from 'react';
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
    const activeSubmissionIdRef = useRef<number | null>(null);
    const submittingRef = useRef(false);

    const earlyUpdatesRef = useRef(new Map<number, SubmissionUpdate>());

    const handleSubmissionUpdate = (res: SubmissionUpdate) => {
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
                toast.add({ type: 'success', title: 'Accepted Submission' });
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
                toast.add({ type: 'error', title: 'Memory Limit Exceeded' });
                break;

            case 'RuntimeError':
                toast.add({ type: 'error', title: 'Runtime Error' });
                break;

            case 'InternalError':
                toast.add({ type: 'error', title: 'Internal Error' });
                break;
        }

        if (res.results !== undefined) {
            setResults(res.results);
        }

        const terminalStatuses: SubmissionStatus[] = [
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
            activeSubmissionIdRef.current = null;
        }

        queryClient.invalidateQueries({
            queryKey: ['submissions']
        });
    };

    useEffect(() => {
        const token = getAccessToken();
        if (!token) return;

        connectSocket();

        const socket = getSocket();
        if (!socket) return;

        const onConnect = () => {
            console.log('Connected:', socket.id);
        };

        const onSubmissionUpdate = (res: SubmissionUpdate) => {
            if (!res) return;

            // Ignore updates from unrelated submissions.
            if (res.submissionId !== activeSubmissionIdRef.current) {
                // Buffer updates that arrive before the POST response.
                if (submittingRef.current) {
                    earlyUpdatesRef.current.set(res.submissionId, res);
                }

                return;
            }

            handleSubmissionUpdate(res);
        };

        socket.on('connect', onConnect);
        socket.on('submission:updated', onSubmissionUpdate);

        return () => {
            socket.off('connect', onConnect);
            socket.off('submission:updated', onSubmissionUpdate);

            socket.disconnect();
        };
    }, [getAccessToken()]);

    const handleSubmit = async () => {
        if (loading || submittingRef.current) return;

        setLoading(true);
        setResults([]);

        submittingRef.current = true;
        activeSubmissionIdRef.current = null;
        earlyUpdatesRef.current.clear();

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

            if (!res.data.ok) {
                clearPendingSubmission(problem.slug);
                throw new Error(res.data.errors.toString());
            }

            const submissionId = res.data.data.submissionId;

            // The backend acknowledged the submission.
            clearPendingSubmission(problem.slug);

            // Start tracking this specific submission.
            activeSubmissionIdRef.current = submissionId;
            submittingRef.current = false;

            // Process an update if the worker emitted one
            // before the POST response arrived.
            const earlyUpdate = earlyUpdatesRef.current.get(submissionId);

            earlyUpdatesRef.current.clear();

            if (earlyUpdate) {
                handleSubmissionUpdate(earlyUpdate);
            }
        } catch (error) {
            console.error(error);

            const response = (
                error as {
                    response?: {
                        status?: number;
                    };
                }
            ).response;

            // Keep the key for network failures and 5xx responses.
            // The server may already have created the submission.
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

            submittingRef.current = false;
            activeSubmissionIdRef.current = null;
            earlyUpdatesRef.current.clear();

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
