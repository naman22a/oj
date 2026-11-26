import { describe, expect, it } from 'vitest';
import { SubmissionLanguage } from '../../src/models/enums.ts';
import { CppCompiler } from '../../src/workers/execution/compiler/cpp.compiler.ts';
import { getLanguageConfig } from '../../src/workers/execution/config/language.registry.ts';
import { JavaCompiler } from '../../src/workers/execution/compiler/java.compiler.ts';
import { PythonCompiler } from '../../src/workers/execution/compiler/python.compiler.ts';
import type { Sandbox } from '../../src/workers/execution/sandbox/sandbox.interface.ts';
import { JavaScriptCompiler } from '../../src/workers/execution/compiler/javascript.compiler.ts';
import { images } from '../../src/workers/execution/config/images.ts';

describe('language registry', () => {
    it('returns the C++ compiler and image', () => {
        const config = getLanguageConfig(SubmissionLanguage.CPP);

        expect(config.compiler).toBeTypeOf('function');

        const compiler = config.compiler({} as Sandbox);

        expect(compiler).toBeInstanceOf(CppCompiler);
        expect(config.image).toBe(images.cpp);
    });

    it('returns the Java compiler and image', () => {
        const config = getLanguageConfig(SubmissionLanguage.JAVA);

        expect(config.compiler).toBeTypeOf('function');

        const compiler = config.compiler({} as Sandbox);

        expect(compiler).toBeInstanceOf(JavaCompiler);
        expect(config.image).toBe(images.java);
    });

    it('should return Python configuration', () => {
        const config = getLanguageConfig(SubmissionLanguage.PYTHON);

        expect(config.image).toBe(images.python);
        expect(config.compiler).toBeTypeOf('function');

        const compiler = config.compiler({} as Sandbox);

        expect(compiler).toBeInstanceOf(PythonCompiler);
    });

    it('should return JavaScript configuration', () => {
        const config = getLanguageConfig(SubmissionLanguage.JAVASCRIPT);

        expect(config.image).toBe(images.javascript);
        expect(config.compiler).toBeTypeOf('function');

        const compiler = config.compiler({} as Sandbox);

        expect(compiler).toBeInstanceOf(JavaScriptCompiler);
    });
});
