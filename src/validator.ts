export const DEFAULT_PREFIXES: string[] = ['JIRA']

export function parsePrefixes(value: string): string[] {
    return value
        .split(/[\s,]+/)
        .map(prefix => prefix.trim())
        .filter(prefix => prefix.length > 0)
}

export function formatPrefixes(prefixes: string[]): string {
    return prefixes.map(prefix => `\`${prefix}\``).join(', ')
}

export default function (branchName: string, prefixes: string[]): [string, string[]] {
    if (prefixes.length === 0) {
        throw new Error('At least one prefix has to be provided.')
    }

    let result: string[] = []

    // Longest match first, so that `JIRA` doesn't shadow a `JIRAX` prefix.
    const matchedPrefix = prefixes
        .filter(prefix => branchName.startsWith(prefix))
        .sort((a, b) => b.length - a.length)[0]

    if (matchedPrefix === undefined) {
        result.push(prefixes.length === 1
            ? `Branch doesn't start with \`${prefixes[0]}\` prefix, found ${branchName}.`
            : `Branch doesn't start with one of the ${formatPrefixes(prefixes)} prefixes, found ${branchName}.`)
    }

    // Without a match, fall back to whatever the branch itself leads with, so that the
    // remaining rules are reported against the actual branch name instead of an offset one.
    const prefix = matchedPrefix ?? (branchName.match(/^[a-zA-Z]+/) ?? [''])[0]

    branchName = branchName.substring(prefix.length)
    if (!branchName.startsWith('-')) {
        result.push(`Separator after prefix is not \`-\`, found ${branchName.substring(0, 1)}.`)
    }

    branchName = branchName.substring(1);
    let matches: string[] | null = branchName.match(/^\d*/);

    const rawJiraId = matches ? matches[0] : '0'
    const jiraId = parseInt(rawJiraId)

    if (isNaN(jiraId) || jiraId === 0) {
        result.push(`JIRA id is not a positive number, found ${rawJiraId}.`)
    }
    if (rawJiraId.length !== jiraId.toString().length) {
        result.push(`JIRA id has leading zeros, found ${rawJiraId}.`)
    }

    branchName = branchName.substring(rawJiraId.length)
    if (!/^[\-_]/.test(branchName)) {
        result.push(`Separator after JIRA id is not \`_\` or \`-\`, found ${branchName.substring(0, 1)}.`)
    }

    branchName = branchName.substring(1)
    if (!/^[a-zA-Z0-9\-_]+$/.test(branchName)) {
        result.push(`Description after JIRA id should use hyphen or underscore as word separator, found ${branchName}.`)
    }

    if (branchName.length > 100) {
        result.push(`Description after JIRA id has to be shorter than 100 characters, found ${branchName}.`)
    }

    return [`${prefix}-${jiraId}`, result]
}
