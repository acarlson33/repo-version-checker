interface GitHubTag {
  name: string;
  commit: {
    sha: string;
  };
}

interface GitHubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  html_url: string;
  prerelease: boolean;
  draft: boolean;
}

// Helper function to normalize version strings (remove 'v' prefix)
function normalizeVersion(version: string): string {
  return version.replace(/^v/, "");
}

// Helper function to parse version into comparable parts
function parseVersion(version: string): number[] {
  const normalized = normalizeVersion(version);
  const parts = normalized.split(/[.\-+]/);
  return parts.map((p) => {
    const num = parseInt(p, 10);
    return isNaN(num) ? 0 : num;
  });
}

// Compare two versions: returns -1 if v1 < v2, 0 if equal, 1 if v1 > v2
function compareVersions(v1: string, v2: string): number {
  const parts1 = parseVersion(v1);
  const parts2 = parseVersion(v2);
  const maxLength = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLength; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 < p2) return -1;
    if (p1 > p2) return 1;
  }
  return 0;
}

// Calculate version difference
function getVersionDifference(current: string, latest: string): string {
  const currentParts = parseVersion(current);
  const latestParts = parseVersion(latest);

  // Check major version difference
  if (currentParts[0] !== latestParts[0]) {
    const diff = latestParts[0] - currentParts[0];
    return `${diff} major version${diff !== 1 ? "s" : ""}`;
  }

  // Check minor version difference
  if (currentParts[1] !== latestParts[1]) {
    const diff = latestParts[1] - (currentParts[1] || 0);
    return `${diff} minor version${diff !== 1 ? "s" : ""}`;
  }

  // Check patch version difference
  if (currentParts[2] !== latestParts[2]) {
    const diff = latestParts[2] - (currentParts[2] || 0);
    return `${diff} patch version${diff !== 1 ? "s" : ""}`;
  }

  return "up to date";
}

// This is your Appwrite function
// It's executed each time we get a request
export default async ({ req, res, log, error }: any) => {
  try {
    // Get repository info from environment variables
    const owner = process.env.GITHUB_REPO_OWNER;
    const repo = process.env.GITHUB_REPO_NAME;

    if (!owner || !repo) {
      return res.json(
        {
          success: false,
          message:
            "Repository not configured. Set GITHUB_REPO_OWNER and GITHUB_REPO_NAME environment variables.",
        },
        500
      );
    }

    // Parse request body - only version is required
    const { version } = req.bodyJson;

    if (!version) {
      return res.json(
        {
          success: false,
          message: "Missing required parameter: version",
        },
        400
      );
    }

    log(`Checking version ${version} against latest for ${owner}/${repo}`);

    // Fetch the latest release from GitHub API
    const githubResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/releases/latest`,
      {
        headers: {
          "User-Agent": "Appwrite-Function",
          Accept: "application/vnd.github.v3+json",
          ...(process.env.GITHUB_TOKEN && {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          }),
        },
      }
    );

    if (!githubResponse.ok) {
      if (githubResponse.status === 404) {
        // Try to get tags if no releases exist
        const tagsResponse = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/tags`,
          {
            headers: {
              "User-Agent": "Appwrite-Function",
              Accept: "application/vnd.github.v3+json",
              ...(process.env.GITHUB_TOKEN && {
                Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
              }),
            },
          }
        );

        if (!tagsResponse.ok) {
          throw new Error(`GitHub API error: ${tagsResponse.statusText}`);
        }

        const tags = (await tagsResponse.json()) as GitHubTag[];

        if (tags.length === 0) {
          return res.json({
            success: false,
            message: "No releases or tags found for this repository",
          });
        }

        const latestTag = tags[0];
        const latestVersion = latestTag.name;

        // Compare versions
        const comparison = compareVersions(version, latestVersion);
        const isOutdated = comparison < 0;
        const versionDifference = isOutdated
          ? getVersionDifference(version, latestVersion)
          : null;

        return res.json({
          success: true,
          latestVersion: latestVersion,
          currentVersion: version,
          isOutdated,
          versionDifference,
          commitSha: latestTag.commit.sha,
          source: "tag",
          repository: `${owner}/${repo}`,
        });
      }

      throw new Error(`GitHub API error: ${githubResponse.statusText}`);
    }

    const release = (await githubResponse.json()) as GitHubRelease;
    const latestVersion = release.tag_name;

    // Compare versions
    const comparison = compareVersions(version, latestVersion);
    const isOutdated = comparison < 0;
    const versionDifference = isOutdated
      ? getVersionDifference(version, latestVersion)
      : null;

    return res.json({
      success: true,
      latestVersion: latestVersion,
      currentVersion: version,
      isOutdated,
      versionDifference,
      name: release.name,
      publishedAt: release.published_at,
      htmlUrl: release.html_url,
      prerelease: release.prerelease,
      draft: release.draft,
      source: "release",
      repository: `${owner}/${repo}`,
    });
  } catch (err: any) {
    error(`Error: ${err.message}`);
    return res.json(
      {
        success: false,
        message: err.message,
      },
      500
    );
  }
};
