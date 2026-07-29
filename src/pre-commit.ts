#!/usr/bin/env node

import {exec as cpExec} from 'child_process';
import validateBranchName, {DEFAULT_PREFIXES, parsePrefixes} from './validator';

async function run(): Promise<void> {
    const prefixes = parsePrefixArguments(process.argv.slice(2));
    const branchName = await getCurrentBranch();
    const [, results] = validateBranchName(branchName, prefixes);

    results.forEach(message => {
        console.log(message);
    })

    if (results.length > 0) {
        process.exit(1)
    }

    process.exit(0)
}

function parsePrefixArguments(args: string[]): string[] {
    const prefixes: string[] = []

    for (let i = 0; i < args.length; i++) {
        const arg = args[i]

        if (arg === '--prefix' || arg === '-p') {
            const value = args[++i]

            if (value === undefined || value.startsWith('-')) {
                throw new Error(`The "${arg}" option requires a value, e.g. "${arg} JIRA".`)
            }

            prefixes.push(...parseRequiredPrefixes(arg, value))

            continue
        }

        if (arg.startsWith('--prefix=') || arg.startsWith('-p=')) {
            const separator = arg.indexOf('=')

            prefixes.push(...parseRequiredPrefixes(arg.substring(0, separator), arg.substring(separator + 1)))

            continue
        }

        throw new Error(`Unknown option "${arg}". Usage: branch-validator [--prefix <prefix>]...`)
    }

    return prefixes.length > 0 ? prefixes : DEFAULT_PREFIXES
}

function parseRequiredPrefixes(option: string, value: string): string[] {
    const prefixes = parsePrefixes(value)

    if (prefixes.length === 0) {
        throw new Error(`The "${option}" option requires a value, e.g. "${option} JIRA".`)
    }

    return prefixes
}

async function getCurrentBranch(): Promise<string> {
    const {stdout, stderr} = await exec('git branch');

    if (stderr !== '') {
        throw new Error(stderr)
    }

    if (stdout === '') {
        throw new Error('No output was generated from "git branch". Please try again.')
    }

    const branchOutput: string = stdout.toString()

    const branches: string[] = branchOutput.split('\n')

    const branch: string | undefined = branches.find((branch: string) => branch.trim().charAt(0) === '*')

    if (!branch) {
        throw new Error('Unable to find the current branch. Please try again.')
    }

    // Remove "* " prefix
    return branch.trim().substring(2)
}

async function exec(
    command: string,
    options = {cwd: process.cwd()}
): Promise<{ stdout: string; stderr: string }> {
    return new Promise((done, failed) => {
        cpExec(command, {...options}, (err, stdout, stderr) => {
            if (err) {
                process.stdout.write(stdout);
                process.stderr.write(stderr);
                failed(err);
                return;
            }

            done({stdout, stderr});
        });
    });
}

run().catch((error: any) => {
    console.error(error instanceof Error ? error.message : error);

    process.exit(1)
});
