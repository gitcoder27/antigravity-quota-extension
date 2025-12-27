/**
 * Metrics Client for Antigravity IDE
 * Discovers the Language Server and fetches quota data
 */

import { execSync } from 'child_process';
import * as https from 'https';
import * as http from 'http';

export interface QuotaInfo {
    remainingFraction: number;
    resetTime: string;
}

export interface ModelConfig {
    label: string;
    modelOrAlias: { model: string };
    quotaInfo?: QuotaInfo;
    supportsImages?: boolean;
    isRecommended?: boolean;
}

export interface PlanStatus {
    planInfo: {
        planName: string;
        monthlyPromptCredits: number;
        monthlyFlowCredits: number;
    };
    availablePromptCredits: number;
    availableFlowCredits: number;
}

export interface UserStatus {
    name: string;
    email: string;
    planStatus: PlanStatus;
    cascadeModelConfigData: {
        clientModelConfigs: ModelConfig[];
    };
    userTier: {
        id: string;
        name: string;
        description: string;
    };
}

export interface MetricsResponse {
    userStatus: UserStatus;
}

interface ServerInfo {
    pid: string;
    token: string;
    port: string;
}

/**
 * Discover the Antigravity Language Server process
 */
function discoverServer(): ServerInfo | null {
    try {
        // Find language_server process - look for the Antigravity language server binary
        // It could be language_server_macos_arm, language_server_macos_x64, or similar
        const psOutput = execSync(
            'ps aux | grep -E "language_server_macos|language_server" | grep "csrf_token" | grep -v grep',
            {
                encoding: 'utf-8',
                timeout: 5000,
            }
        ).trim();

        if (!psOutput) {
            return null;
        }

        // Take the first matching process
        const firstLine = psOutput.split('\n')[0];

        // Extract PID (second field in ps aux output)
        const parts = firstLine.trim().split(/\s+/);
        const pid = parts[1];

        if (!pid || isNaN(parseInt(pid))) {
            return null;
        }

        // Extract CSRF token from command line arguments
        const tokenMatch = firstLine.match(/--csrf_token\s+([a-zA-Z0-9-]+)/);
        if (!tokenMatch) {
            return null;
        }
        const token = tokenMatch[1];

        // Find the listening ports for this process
        const lsofOutput = execSync(
            `lsof -iTCP -sTCP:LISTEN -P -n -p ${pid} 2>/dev/null | grep "127.0.0.1"`,
            { encoding: 'utf-8', timeout: 5000 }
        ).trim();

        if (!lsofOutput) {
            return null;
        }

        // Extract all ports
        const ports: string[] = [];
        for (const line of lsofOutput.split('\n')) {
            // Port is after the last colon before the "(LISTEN)" text
            const match = line.match(/:(\d+)\s/);
            if (match) {
                ports.push(match[1]);
            }
        }

        if (ports.length === 0) {
            return null;
        }

        // Find the active port by testing each one
        for (const port of ports) {
            try {
                const testResponse = execSync(
                    `curl -s -o /dev/null -w "%{http_code}" -X POST "http://127.0.0.1:${port}/exa.language_server_pb.LanguageServerService/GetUserStatus" ` +
                    `-H "X-Codeium-Csrf-Token: ${token}" ` +
                    `-H "Connect-Protocol-Version: 1" ` +
                    `-H "Content-Type: application/json" ` +
                    `-d '{}' 2>/dev/null`,
                    { encoding: 'utf-8', timeout: 3000 }
                ).trim();

                if (testResponse === '200') {
                    return { pid, token, port };
                }
            } catch {
                // Try next port
            }
        }

        return null;
    } catch (error) {
        return null;
    }
}

/**
 * Fetch metrics from the Language Server
 */
export async function fetchMetrics(): Promise<MetricsResponse | null> {
    const serverInfo = discoverServer();

    if (!serverInfo) {
        throw new Error(
            'Could not find Antigravity Language Server. Make sure the IDE is running.'
        );
    }

    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            metadata: {
                ideName: 'antigravity',
                extensionName: 'quota-monitor',
                locale: 'en',
            },
        });

        const options: http.RequestOptions = {
            hostname: '127.0.0.1',
            port: parseInt(serverInfo.port),
            path: '/exa.language_server_pb.LanguageServerService/GetUserStatus',
            method: 'POST',
            headers: {
                'X-Codeium-Csrf-Token': serverInfo.token,
                'Connect-Protocol-Version': '1',
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
            },
        };

        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data) as MetricsResponse;
                    resolve(parsed);
                } catch (error) {
                    reject(new Error('Failed to parse metrics response'));
                }
            });
        });

        req.on('error', (error) => {
            reject(new Error(`Failed to fetch metrics: ${error.message}`));
        });

        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timed out'));
        });

        req.write(postData);
        req.end();
    });
}

/**
 * Format reset time to human-readable relative time
 */
export function formatResetTime(resetTime: string): string {
    const reset = new Date(resetTime);
    const now = new Date();
    const diffMs = reset.getTime() - now.getTime();

    if (diffMs <= 0) {
        return 'resetting...';
    }

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
        return `${diffDays}d ${diffHours % 24}h`;
    } else if (diffHours > 0) {
        return `${diffHours}h ${diffMins % 60}m`;
    } else {
        return `${diffMins}m`;
    }
}

/**
 * Get quota status color based on remaining fraction
 */
export function getQuotaColor(remainingFraction: number): string {
    if (remainingFraction >= 0.7) {
        return 'green';
    } else if (remainingFraction >= 0.3) {
        return 'yellow';
    } else {
        return 'red';
    }
}
