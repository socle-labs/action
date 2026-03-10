# Socle GitHub Action

Trigger Terraform/OpenTofu runs via the Socle API from your GitHub Actions workflows.

## Usage

```yaml
name: Infrastructure Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Plan Infrastructure
        uses: socle-labs/socle/.github/actions/socle-action@main
        with:
          api-key: ${{ secrets.SOCLE_API_KEY }}
          server-url: https://api.socle.cloud
          workspace-id: ${{ vars.WORKSPACE_ID }}
          command: plan

      - name: Apply Infrastructure
        uses: socle-labs/socle/.github/actions/socle-action@main
        with:
          api-key: ${{ secrets.SOCLE_API_KEY }}
          server-url: https://api.socle.cloud
          workspace-id: ${{ vars.WORKSPACE_ID }}
          command: apply
          wait: 'true'
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `api-key` | Socle API key | Yes | |
| `server-url` | Socle server URL | Yes | `https://api.socle.cloud` |
| `workspace-id` | Workspace ID | Yes | |
| `command` | Run type: `plan`, `apply`, or `destroy` | Yes | `plan` |
| `wait` | Wait for run completion | No | `true` |

## Outputs

| Output | Description |
|--------|-------------|
| `run-id` | ID of the created run |
| `status` | Final status of the run |
