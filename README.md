# appwrite-function-version-checker

An Appwrite function to check the version of a GitHub repository.

## Features

- Fetches the latest release version from a GitHub repository
- Falls back to tags if no releases are available
- Optional GitHub token support for higher rate limits
- Returns detailed version information

## Setup

1. Install dependencies:

```bash
bun install
```

2. Configure your Appwrite project:

   - Update `appwrite.json` with your project ID
   - Optionally add a GitHub token in the environment variables for higher API rate limits

3. Deploy to Appwrite:

```bash
appwrite deploy function
```

## Usage

Send a POST request to your function endpoint with the following body:

```json
{
  "owner": "appwrite",
  "repo": "appwrite"
}
```

### Response Format

For releases:

```json
{
  "success": true,
  "version": "1.5.0",
  "name": "Version 1.5.0",
  "publishedAt": "2024-01-15T10:30:00Z",
  "htmlUrl": "https://github.com/owner/repo/releases/tag/1.5.0",
  "prerelease": false,
  "draft": false,
  "source": "release",
  "repository": "owner/repo"
}
```

For tags (when no releases exist):

```json
{
  "success": true,
  "version": "v1.0.0",
  "commitSha": "abc123...",
  "source": "tag",
  "repository": "owner/repo"
}
```

## Environment Variables

- `GITHUB_TOKEN` (optional): GitHub personal access token for higher API rate limits
- `APPWRITE_FUNCTION_API_ENDPOINT`: Auto-provided by Appwrite
- `APPWRITE_FUNCTION_PROJECT_ID`: Auto-provided by Appwrite
- `APPWRITE_API_KEY`: Your Appwrite API key

## Development

Build the TypeScript code:

```bash
npm run build
```

Watch for changes:

```bash
npm run dev
```

## License

MIT
API to track versions for firepit
