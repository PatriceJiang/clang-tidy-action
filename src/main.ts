/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-console */
import * as core from "@actions/core";
import * as output from "./output";
import {relative} from "path";
import {parseReplacementsFile, Diagnostic} from "./diagnostics";

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

		const diagsMap = collectDiagnostic(await parseReplacementsFile(fixesFile));
		let cnt = 0;
		for (const file of diagsMap.keys()) {
			const diags = diagsMap.get(file);
			// core.startGroup(file);
			core.info(file);
			for (const diag of diags!) {
				output.fileError(
					`${diag.message} (${diag.name})`,
					relative(process.cwd(), diag.filePath),
					diag.location.line,
					diag.location.column,
				);
				cnt += 1;
			}
			core.info("");
			// core.endGroup();
		}

		if (!noFailure && cnt > 0) {
			core.setFailed(`Found ${cnt} clang-tidy issues`);
		} else if (noFailure) {
			core.debug("Not failing due to option.");
		}
	} catch (error) {
		core.setFailed(error.message);
	}
}

run().catch(e => core.error(e));
