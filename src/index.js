const core = require('@actions/core')

let branchName = core.getInput("branch-name")
core.info(`Received the following branch name ${branchName}.`)

if (!branchName.startsWith('JIRA')) {
    core.setFailed(`Branch doesn't start with \`JIRA\` prefix, found ${branchName}.`)
    return
}

branchName = branchName.substring(4)
if (!branchName.startsWith('-')) {
    core.setFailed(`Separator after prefix is not \`-\`, found ${branchName.substring(0, 1)}.`)
    return
}

branchName = branchName.substring(1);
const rawJiraId = branchName.match(/^\d*/)[0]
const jiraId = parseInt(rawJiraId)
if (isNaN(jiraId) || jiraId === 0) {
    core.setFailed(`JIRA id is not a positive number, found ${rawJiraId}.`)
    return
}
if (rawJiraId.length !== jiraId.toString().length) {
    core.setFailed(`JIRA id has leading zeros, found ${rawJiraId}.`)
    return
}

branchName = branchName.substring(rawJiraId.length)
if (!branchName.startsWith('-')) {
    core.setFailed(`Separator after JIRA id is not \`-\`, found ${branchName.substring(0, 1)}.`)
    return
}

branchName = branchName.substring(1)
if (!/^[a-zA-Z0-9_]+$/.test(branchName)) {
    core.setFailed(`Description after JIRA id should use underscore as word separator, found ${branchName}.`)
}