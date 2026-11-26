export const LANG_CONFIGS: Record<
    string,
    { image: string; compile?: string[]; run: string[]; defaultCode?: string }
> = {
    cpp: {
        image: 'gcc:15',
        compile: ['g++', 'solution.cpp', '-o', 'solution'],
        run: ['./solution'],
        defaultCode: `#include <iostream>
using namespace std;

int main(){
    return 0;
}`
    },
    python: {
        image: 'python:3.9',
        run: ['python3', 'solution.py'],
        defaultCode: ''
    },
    javascript: {
        image: 'node:18',
        run: ['node', 'solution.js'],
        defaultCode: ''
    },
    java: {
        image: 'eclipse-temurin:17-jdk',
        compile: ['javac', 'Solution.java'],
        run: ['java', 'Solution'],
        defaultCode: `public class Main {
    public static void main(String[] args) {
        
    }
}`
    }
};

export const languages = ['cpp', 'python', 'javascript', 'java'];
