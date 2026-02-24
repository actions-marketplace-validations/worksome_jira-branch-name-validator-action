#!/usr/bin/env node
"use strict";

// src/pre-commit.ts
var import_child_process = require("child_process");

// src/validator.ts
function validator_default(branchName, prefix) {
  let result = [];
  if (!branchName.startsWith(prefix)) {
    result.push(`Branch doesn't start with \`${prefix}\` prefix, found ${branchName}.`);
  }
  branchName = branchName.substring(prefix.length);
  if (!branchName.startsWith("-")) {
    result.push(`Separator after prefix is not \`-\`, found ${branchName.substring(0, 1)}.`);
  }
  branchName = branchName.substring(1);
  let matches = branchName.match(/^\d*/);
  const rawJiraId = matches ? matches[0] : "0";
  const jiraId = parseInt(rawJiraId);
  if (isNaN(jiraId) || jiraId === 0) {
    result.push(`JIRA id is not a positive number, found ${rawJiraId}.`);
  }
  if (rawJiraId.length !== jiraId.toString().length) {
    result.push(`JIRA id has leading zeros, found ${rawJiraId}.`);
  }
  branchName = branchName.substring(rawJiraId.length);
  if (!/^[\-_]/.test(branchName)) {
    result.push(`Separator after JIRA id is not \`_\` or \`-\`, found ${branchName.substring(0, 1)}.`);
  }
  branchName = branchName.substring(1);
  if (!/^[a-zA-Z0-9\-_]+$/.test(branchName)) {
    result.push(`Description after JIRA id should use hyphen or underscore as word separator, found ${branchName}.`);
  }
  if (branchName.length > 100) {
    result.push(`Description after JIRA id has to be shorter than 100 characters, found ${branchName}.`);
  }
  return [`${prefix}-${jiraId}`, result];
}

// src/pre-commit.ts
async function run() {
  const branchName = await getCurrentBranch();
  const [, results] = validator_default(branchName, "JIRA");
  results.forEach((message) => {
    console.log(message);
  });
  if (results.length > 0) {
    process.exit(1);
  }
  process.exit(0);
}
async function getCurrentBranch() {
  const { stdout, stderr } = await exec("git branch");
  if (stderr !== "") {
    throw new Error(stderr);
  }
  if (stdout === "") {
    throw new Error('No output was generated from "git branch". Please try again.');
  }
  const branchOutput = stdout.toString();
  const branches = branchOutput.split("\n");
  const branch = branches.find((branch2) => branch2.trim().charAt(0) === "*");
  if (!branch) {
    throw new Error("Unable to find the current branch. Please try again.");
  }
  return branch.trim().substring(2);
}
async function exec(command, options = { cwd: process.cwd() }) {
  return new Promise((done, failed) => {
    (0, import_child_process.exec)(command, { ...options }, (err, stdout, stderr) => {
      if (err) {
        process.stdout.write(stdout);
        process.stderr.write(stderr);
        failed(err);
        return;
      }
      done({ stdout, stderr });
    });
  });
}
run();
