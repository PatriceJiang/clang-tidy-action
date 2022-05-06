import * as github from "@actions/github";
import * as core from "@actions/core";

const token = core.getInput("repo-token", {required: true});
const errorLimit = core.getInput("error-limit", {required: true});
const octokit = github.getOctokit(token);
const pullRequest = github.context.payload.pull_request;

const getPrNumber = (): number => {
	if (!pullRequest) {
		return -1;
	}

	return pullRequest.number;
};

const getSha = (): string => {
	if (!pullRequest) {
		return github.context.sha;
	}

	return pullRequest.head.sha;
};
core.info("output octokit:");
core.info(JSON.stringify(octokit));

export default {
	OWNER: github.context.repo.owner,
	REPO: github.context.repo.repo,
	PULL_REQUEST: pullRequest,
	PR_NUMBER: getPrNumber(),
	CHECK_NAME: "ClangTidy report",
	GITHUB_WORKSPACE: process.env.GITHUB_WORKSPACE,
	TOKEN: token,
	OCTOKIT: octokit,
	SHA: getSha(),
	ERROR_LIMIT: parseInt(errorLimit),
};
