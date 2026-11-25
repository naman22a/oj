import React from 'react';
import type { ExtendedProblem } from '../interfaces';
import { useStore } from '../store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    CodeBlock,
    CodeBlockActions,
    CodeBlockContent,
    CodeBlockCopyButton,
    CodeBlockHeader,
    CodeBlockTitle
} from '@/components/ui/code-block';
import { cn } from 'cn';
import { ScrollArea } from './ui/scroll-area';
import Submissions from './submissions';

interface Props {
    problem: ExtendedProblem;
}

const Left: React.FC<Props> = ({ problem }) => {
    const { tabValue, setTabValue } = useStore();

    return (
        <ScrollArea className="h-screen w-full md:w-1/2 p-5 relative">
            <Tabs defaultValue="account" value={tabValue}>
                <TabsList className="mb-5">
                    <TabsTrigger
                        onClick={() => setTabValue('description')}
                        value="description"
                    >
                        Description
                    </TabsTrigger>
                    <TabsTrigger
                        onClick={() => setTabValue('submissions')}
                        value="submissions"
                    >
                        Submissions
                    </TabsTrigger>
                    <TabsTrigger
                        onClick={() => setTabValue('editorial')}
                        value="editorial"
                    >
                        Editorial
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="description">
                    <div className="flex flex-col gap-5 items-start md:overflow-y-scroll">
                        <h1 className="text-4xl font-semibold">
                            {problem.title}
                        </h1>
                        <span
                            className={cn(
                                'font-semibold text-lg text-white px-6 py-2 rounded-full',
                                problem.difficulty === 'Easy' && 'bg-green-500',
                                problem.difficulty === 'Medium' &&
                                    'bg-yellow-500',
                                problem.difficulty === 'Hard' && 'bg-red-500'
                            )}
                        >
                            {problem.difficulty.toUpperCase()}
                        </span>
                        <p>{problem.description}</p>
                        <h2 className="font-semibold text-lg">Test cases</h2>
                        <div>
                            {problem.testCases.map((testCase, index) => (
                                <div key={testCase.id}>
                                    <h3>Example {index + 1}</h3>
                                    <CodeBlock className="my-2">
                                        <CodeBlockHeader>
                                            <CodeBlockTitle>
                                                Input
                                            </CodeBlockTitle>
                                            <CodeBlockActions>
                                                <CodeBlockCopyButton
                                                    value={testCase.input}
                                                />
                                            </CodeBlockActions>
                                        </CodeBlockHeader>
                                        <CodeBlockContent>
                                            {testCase.input}
                                        </CodeBlockContent>
                                    </CodeBlock>

                                    <CodeBlock className="my-2">
                                        <CodeBlockHeader>
                                            <CodeBlockTitle>
                                                Output
                                            </CodeBlockTitle>
                                            <CodeBlockActions>
                                                <CodeBlockCopyButton
                                                    value={
                                                        testCase.expectedOutput
                                                    }
                                                />
                                            </CodeBlockActions>
                                        </CodeBlockHeader>
                                        <CodeBlockContent>
                                            {testCase.expectedOutput}
                                        </CodeBlockContent>
                                    </CodeBlock>
                                    {testCase.explanation && (
                                        <p>
                                            Explaination: {testCase.explanation}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                        {problem.constraints && (
                            <>
                                <h2 className="font-semibold text-lg">
                                    Constraints
                                </h2>
                                <pre>{problem.constraints}</pre>
                            </>
                        )}
                        {problem.problemTags.length > 0 && (
                            <>
                                <h2 className="font-semibold text-lg">
                                    Topics
                                </h2>
                                <div>
                                    {problem.problemTags.map((tag) => (
                                        <span key={tag.tag?.id} className="m-2">
                                            {tag.tag?.name}
                                        </span>
                                    ))}
                                </div>
                            </>
                        )}
                        {problem.hints.length > 0 && (
                            <>
                                <h2 className="font-semibold text-lg">Hints</h2>
                                <ul className="list-disc">
                                    {problem.hints.map((hint, index) => (
                                        <li key={index}>{hint}</li>
                                    ))}
                                </ul>
                            </>
                        )}
                        {problem.problemCompanies.length > 0 && (
                            <>
                                <h2 className="font-semibold text-lg">
                                    Companies
                                </h2>
                                <div className="list-disc">
                                    {problem.problemCompanies.map((company) => (
                                        <span
                                            className="m-2"
                                            key={company.company?.id}
                                        >
                                            {company.company?.name}
                                        </span>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </TabsContent>
                <TabsContent value="submissions">
                    <Submissions id={problem.id} />
                </TabsContent>
                <TabsContent value="editorial">
                    <h1>Editorial</h1>
                </TabsContent>
            </Tabs>
        </ScrollArea>
    );
};

export default Left;
