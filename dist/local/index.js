#!/usr/bin/env node
"use strict";

// src/pre-commit.ts
var import_child_process = require("child_process");

// src/validator.ts
var DEFAULT_PREFIXES = ["JIRA"];
function parsePrefixes(value) {
  return value.split(/[\s,]+/).map((prefix) => prefix.trim()).filter((prefix) => prefix.length > 0);
}
function formatPrefixes(prefixes) {
  return prefixes.map((prefix) => `\`${prefix}\``).join(", ");
}
function validator_default(branchName, prefixes) {
  if (prefixes.length === 0) {
    throw new Error("At least one prefix has to be provided.");
  }
  let result = [];
  const matchedPrefix = prefixes.filter((prefix2) => branchName.startsWith(prefix2)).sort((a, b) => b.length - a.length)[0];
  if (matchedPrefix === void 0) {
    result.push(prefixes.length === 1 ? `Branch doesn't start with \`${prefixes[0]}\` prefix, found ${branchName}.` : `Branch doesn't start with one of the ${formatPrefixes(prefixes)} prefixes, found ${branchName}.`);
  }
  const prefix = matchedPrefix ?? (branchName.match(/^[a-zA-Z]+/) ?? [""])[0];
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
  const prefixes = parsePrefixArguments(process.argv.slice(2));
  const branchName = await getCurrentBranch();
  const [, results] = validator_default(branchName, prefixes);
  results.forEach((message) => {
    console.log(message);
  });
  if (results.length > 0) {
    process.exit(1);
  }
  process.exit(0);
}
function parsePrefixArguments(args) {
  const prefixes = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--prefix" || arg === "-p") {
      const value = args[++i];
      if (value === void 0 || value.startsWith("-")) {
        throw new Error(`The "${arg}" option requires a value, e.g. "${arg} JIRA".`);
      }
      prefixes.push(...parseRequiredPrefixes(arg, value));
      continue;
    }
    if (arg.startsWith("--prefix=") || arg.startsWith("-p=")) {
      const separator = arg.indexOf("=");
      prefixes.push(...parseRequiredPrefixes(arg.substring(0, separator), arg.substring(separator + 1)));
      continue;
    }
    throw new Error(`Unknown option "${arg}". Usage: branch-validator [--prefix <prefix>]...`);
  }
  return prefixes.length > 0 ? prefixes : DEFAULT_PREFIXES;
}
function parseRequiredPrefixes(option, value) {
  const prefixes = parsePrefixes(value);
  if (prefixes.length === 0) {
    throw new Error(`The "${option}" option requires a value, e.g. "${option} JIRA".`);
  }
  return prefixes;
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
run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
