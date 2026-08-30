/**
 * Agent-Reach GitHubChannel
 * Reads public GitHub repositories, READMEs, file trees, releases, commits, and searches code.
 * MIT License
 */

import { AgentReachResult, GitHubRepoDetails } from '../types';
import { ContentSanitizer } from '../security/ContentSanitizer';

export class GitHubChannel {
  private static readonly TIMEOUT_MS = 12000;

  /**
   * Helper to get GitHub token safely from environment if configured.
   */
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'AgentReach-GitHub-Client/1.0',
    };
    
    // Check environment variables safely
    try {
      const token = (typeof process !== 'undefined' && process.env?.GITHUB_TOKEN) ||
        (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GITHUB_TOKEN);
      if (token) {
        headers['Authorization'] = `token ${token}`;
      }
    } catch {
      // Ignore if env not accessible
    }

    return headers;
  }

  /**
   * Parse GitHub repo owner and name from URL or slug (e.g. 'Panniantong/Agent-Reach' or 'https://github.com/owner/repo')
   */
  public static parseRepoSlug(urlOrSlug: string): { owner: string; repo: string; path?: string } | null {
    if (!urlOrSlug) return null;
    const clean = urlOrSlug.trim();

    // Match full URL: https://github.com/owner/repo(/tree/branch/path)?
    const urlMatch = clean.match(/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(?:\/(?:tree|blob)\/[^/]+\/(.+))?/i);
    if (urlMatch) {
      return {
        owner: urlMatch[1],
        repo: urlMatch[2].replace(/\.git$/i, ''),
        path: urlMatch[3],
      };
    }

    // Match slug: owner/repo
    const slugMatch = clean.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
    if (slugMatch) {
      return {
        owner: slugMatch[1],
        repo: slugMatch[2].replace(/\.git$/i, ''),
      };
    }

    return null;
  }

  /**
   * Read full details, README, releases, and files for a public GitHub repository.
   */
  public async getRepoDetails(urlOrSlug: string): Promise<AgentReachResult> {
    const startTime = Date.now();
    const parsed = GitHubChannel.parseRepoSlug(urlOrSlug);

    if (!parsed) {
      // If it's a search term rather than a repo, search GitHub
      return this.searchRepositories(urlOrSlug);
    }

    const { owner, repo } = parsed;
    const repoUrl = `https://github.com/${owner}/${repo}`;
    const errors: string[] = [];

    let details: GitHubRepoDetails = {
      owner,
      repo,
      description: '',
      stars: 0,
      forks: 0,
      defaultBranch: 'main',
    };
    let readmeText = '';

    // Tier 1: GitHub REST API
    try {
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
      const resp = await fetch(apiUrl, {
        headers: this.getAuthHeaders(),
        signal: AbortSignal.timeout(GitHubChannel.TIMEOUT_MS),
      });

      if (resp.ok) {
        const data = await resp.json();
        details.description = data.description || '';
        details.stars = data.stargazers_count || 0;
        details.forks = data.forks_count || 0;
        details.defaultBranch = data.default_branch || 'main';
      } else {
        errors.push(`GitHub API HTTP ${resp.status}: ${resp.statusText}`);
      }
    } catch (err: any) {
      errors.push(`GitHub API error: ${err?.message || String(err)}`);
    }

    // Tier 2: Fetch README via raw.githubusercontent.com or API
    try {
      const branches = [details.defaultBranch, 'main', 'master'];
      for (const branch of branches) {
        if (readmeText) break;
        try {
          const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`;
          const rawResp = await fetch(rawUrl, {
            signal: AbortSignal.timeout(GitHubChannel.TIMEOUT_MS),
          });
          if (rawResp.ok) {
            const rawContent = await rawResp.text();
            if (rawContent && rawContent.length > 50) {
              readmeText = rawContent;
              break;
            }
          }
        } catch {
          // Try next branch
        }
      }
    } catch (err: any) {
      errors.push(`Raw README fetch error: ${err?.message || String(err)}`);
    }

    // Fallback: If raw failed, try Jina reader on GitHub page
    if (!readmeText) {
      try {
        const jinaUrl = `https://r.jina.ai/${repoUrl}`;
        const jinaResp = await fetch(jinaUrl, {
          headers: { 'Accept': 'text/plain' },
          signal: AbortSignal.timeout(GitHubChannel.TIMEOUT_MS),
        });
        if (jinaResp.ok) {
          readmeText = await jinaResp.text();
        }
      } catch {
        // Ignored
      }
    }

    details.readme = readmeText;

    // Compose formatted content
    let content = `### GitHub Repository: [${owner}/${repo}](${repoUrl})\n\n` +
      `**Description**: ${details.description || 'No description provided'}\n` +
      `**Stars**: ⭐ ${details.stars.toLocaleString()} | **Forks**: 🍴 ${details.forks.toLocaleString()} | **Default Branch**: \`${details.defaultBranch}\`\n\n`;

    if (readmeText) {
      const sanitized = ContentSanitizer.sanitize(readmeText, 25000);
      content += `#### README.md Content:\n\n${sanitized.sanitizedContent}`;
    } else {
      content += `*(README file was not found or could not be loaded)*`;
    }

    return {
      source: 'AgentReach:GitHub',
      platform: 'github',
      url: repoUrl,
      title: `[GitHub] ${owner}/${repo}`,
      content,
      author: owner,
      publishedAt: new Date().toISOString(),
      metadata: {
        ...details,
        latencyMs: Date.now() - startTime,
      },
      retrievedAt: new Date().toISOString(),
      confidence: readmeText ? 0.96 : 0.82,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Search GitHub for repositories matching a query.
   */
  public async searchRepositories(query: string, limit: number = 6): Promise<AgentReachResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      const searchApi = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${limit}`;
      const resp = await fetch(searchApi, {
        headers: this.getAuthHeaders(),
        signal: AbortSignal.timeout(GitHubChannel.TIMEOUT_MS),
      });

      if (resp.ok) {
        const data = await resp.json();
        const items = data.items || [];
        
        let content = `### GitHub Repositories for "${query}" (Found ${data.total_count || items.length} results):\n\n`;
        items.forEach((item: any, idx: number) => {
          content += `${idx + 1}. **[${item.full_name}](${item.html_url})** (⭐ ${item.stargazers_count})\n` +
            `   - ${item.description || 'No description'}\n` +
            `   - Language: \`${item.language || 'N/A'}\` | Updated: ${item.updated_at ? item.updated_at.split('T')[0] : 'N/A'}\n\n`;
        });

        return {
          source: 'AgentReach:GitHubSearch',
          platform: 'github',
          url: `https://github.com/search?q=${encodeURIComponent(query)}`,
          title: `GitHub Search: ${query}`,
          content: ContentSanitizer.sanitize(content).sanitizedContent,
          retrievedAt: new Date().toISOString(),
          confidence: 0.94,
          metadata: {
            query,
            totalCount: data.total_count,
            latencyMs: Date.now() - startTime,
          },
        };
      }
    } catch (err: any) {
      errors.push(`GitHub search error: ${err?.message || String(err)}`);
    }

    // Fallback: Web search on github.com
    return {
      source: 'AgentReach:GitHub',
      platform: 'github',
      url: `https://github.com/search?q=${encodeURIComponent(query)}`,
      title: `GitHub Search: ${query}`,
      content: `Search GitHub repositories for: "${query}". See results at https://github.com/search?q=${encodeURIComponent(query)}`,
      retrievedAt: new Date().toISOString(),
      confidence: 0.6,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}

export const gitHubChannel = new GitHubChannel();
