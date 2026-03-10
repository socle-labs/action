import * as core from "@actions/core";
import { HttpClient } from "@actions/http-client";

const TERMINAL_STATUSES = new Set(["applied", "failed", "cancelled"]);
const POLL_INTERVAL_MS = 5000;

interface Run {
	id: string;
	type: string;
	status: string;
	createdAt: string;
	completedAt: string | null;
	errorMessage: string | null;
}

async function run(): Promise<void> {
	try {
		const apiKey = core.getInput("api-key", { required: true });
		const serverUrl = core.getInput("server-url", { required: true }).replace(/\/$/, "");
		const workspaceId = core.getInput("workspace-id", { required: true });
		const command = core.getInput("command", { required: true });
		const wait = core.getInput("wait") === "true";

		const client = new HttpClient("socle-action", [], {
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
		});

		// Validate API key
		core.info("Validating API key...");
		const tokenRes = await client.postJson<{ organizationId: string }>(
			`${serverUrl}/api/v1/auth/token`,
			{ apiKey },
		);

		if (tokenRes.statusCode !== 200 || !tokenRes.result) {
			throw new Error("Invalid API key or server unreachable");
		}

		const orgId = tokenRes.result.organizationId;
		core.info(`Authenticated with org ${orgId.slice(0, 8)}...`);

		// Trigger run
		core.info(`Triggering ${command} run on workspace ${workspaceId.slice(0, 8)}...`);
		const runRes = await client.postJson<Run>(
			`${serverUrl}/api/v1/orgs/${orgId}/workspaces/${workspaceId}/runs`,
			{ type: command },
		);

		if (runRes.statusCode !== 200 || !runRes.result) {
			throw new Error(`Failed to trigger run: HTTP ${runRes.statusCode}`);
		}

		const createdRun = runRes.result;
		core.setOutput("run-id", createdRun.id);
		core.info(`Run created: ${createdRun.id.slice(0, 8)} (${createdRun.status})`);

		if (!wait) {
			core.setOutput("status", createdRun.status);
			core.info("Not waiting for completion (wait=false)");
			return;
		}

		// Poll for completion
		core.info("Waiting for run to complete...");
		let currentRun = createdRun;

		while (!TERMINAL_STATUSES.has(currentRun.status)) {
			await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

			const pollRes = await client.getJson<Run>(`${serverUrl}/api/v1/runs/${currentRun.id}`);

			if (pollRes.statusCode !== 200 || !pollRes.result) {
				throw new Error(`Failed to poll run status: HTTP ${pollRes.statusCode}`);
			}

			currentRun = pollRes.result;
			core.info(`Status: ${currentRun.status}`);
		}

		core.setOutput("status", currentRun.status);

		if (currentRun.status === "applied") {
			core.info("Run completed successfully.");
		} else if (currentRun.status === "failed") {
			core.setFailed(`Run failed: ${currentRun.errorMessage ?? "Unknown error"}`);
		} else {
			core.warning(`Run ended with status: ${currentRun.status}`);
		}
	} catch (error) {
		if (error instanceof Error) {
			core.setFailed(error.message);
		} else {
			core.setFailed("An unexpected error occurred");
		}
	}
}

run();
