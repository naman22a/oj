import { SubmissionLanguage } from '../../../models/enums.ts';
import type { Compiler } from '../compiler/compiler.interface.js';
import type { Sandbox } from '../sandbox/sandbox.interface.js';

import { CppCompiler } from '../compiler/cpp.compiler.js';
import { JavaCompiler } from '../compiler/java.compiler.js';
import { PythonCompiler } from '../compiler/python.compiler.ts';
import { JavaScriptCompiler } from '../compiler/javascript.compiler.js';

interface LanguageConfig {
    image: string;
    compiler: (sandbox: Sandbox) => Compiler;
}

const languageRegistry: Partial<Record<SubmissionLanguage, LanguageConfig>> = {
    [SubmissionLanguage.CPP]: {
        image: 'oj-cpp:local',
        compiler: (sandbox) => new CppCompiler(sandbox)
    },
    [SubmissionLanguage.JAVA]: {
        image: 'oj-java:local',
        compiler: (sandbox) => new JavaCompiler(sandbox)
    },
    [SubmissionLanguage.PYTHON]: {
        image: 'oj-python:local',
        compiler: (sandbox) => new PythonCompiler(sandbox)
    },
    [SubmissionLanguage.JAVASCRIPT]: {
        image: 'oj-javascript:local',
        compiler: (sandbox) => new JavaScriptCompiler(sandbox)
    }
};

export function getLanguageConfig(
    language: SubmissionLanguage
): LanguageConfig {
    const config = languageRegistry[language];

    if (!config) {
        throw new Error(`Unsupported submission language: ${language}`);
    }

    return config;
}
