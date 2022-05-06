/* eslint-disable @typescript-eslint/no-explicit-any */
import * as core from "@actions/core";
import * as output from "./output";
import {relative} from "path";
import {parseReplacementsFile, Diagnostic} from "./diagnostics";

import {reportAnnotations} from "./annotations";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function collectDiagnostic(diags: Diagnostic[]): Map<string, Diagnostic[]> {
	const map: Map<string, Diagnostic[]> = new Map();

	for (const d of diags) {
		if (!map.has(d.filePath)) {
			map.set(d.filePath, []);
		}
		map.get(d.filePath)?.push(d);
	}

	for (const file of map.keys()) {
		map.get(file)?.sort((a, b) => {
			return a.location.line * 200 + a.location.column - b.location.line * 200 - b.location.column;
		});
	}

	return map;
}

async function run(): Promise<void> {
	try {
		core.debug("Start");

		const fixesFile = core.getInput("fixesFile", {
			required: true,
		});
		const noFailure = core.getInput("noFailOnIssue") === "true";

		// core.debug(`Parsing replacements ${fixesFile}`);
		const diagList = await parseReplacementsFile(fixesFile);
		// const diagsMap = collectDiagnostic(diagList);
		const cnt = diagList.length;
		const useLog = core.getInput("useLog") === "true";
		if (useLog) {
			// 使用 log 输出错误
			for (const diag of diagList) {
				/// do not use logs, warnings are limited to 10
				core.debug(`Error on file ${diag.filePath}`);
				output.fileError(
					`${diag.message} (${diag.name})`,
					relative(process.cwd(), diag.filePath),
					diag.location.line,
					diag.location.column,
				);
			}

			if (!noFailure && cnt > 0) {
				core.setFailed(`Found ${cnt} clang-tidy issues`);
			} else if (noFailure) {
				core.debug("Not failing due to option.");
			}
		} else {
			// 使用 Github Check API 输出错误
			try {
				await reportAnnotations({success: noFailure ? true : cnt === 0, diags: diagList});
			} catch (e) {
				core.error((e as unknown) as any);
				core.setFailed(((e as unknown) as any).message);
			}
		}
	} catch (e) {
		core.setFailed(((e as unknown) as any).message);
	}
}

run().catch(e => core.error(e));
