/**
 * Sidebar Webview Provider for Quota Display
 * Modern, Premium Dark UI Design with Neon Effects
 */

import * as vscode from 'vscode';
import { MetricsResponse, ModelConfig, formatResetTime } from './metricsClient';

export class QuotaSidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'antigravityQuota';
    private _view?: vscode.WebviewView;
    private _metricsData: MetricsResponse | null = null;
    private _error: string | null = null;
    private _isLoading: boolean = false;
    private _lastRefreshTime: Date | null = null;

    constructor(private readonly _extensionUri: vscode.Uri) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        };

        webviewView.webview.html = this._getHtmlContent();
    }

    public setLoading(): void {
        this._isLoading = true;
        this._error = null;
        this._updateView();
    }

    public refresh(data?: MetricsResponse, error?: string, lastRefreshTime?: Date): void {
        this._metricsData = data ?? null;
        this._error = error ?? null;
        this._isLoading = false;
        if (lastRefreshTime) {
            this._lastRefreshTime = lastRefreshTime;
        }
        this._updateView();
    }

    private _updateView(): void {
        if (this._view) {
            this._view.webview.html = this._getHtmlContent();
        }
    }

    private _getHeroModelNames(): string[] {
        const config = vscode.workspace.getConfiguration('antigravityQuota');
        return [
            config.get<string>('heroModel1', 'Claude Opus 4.5 (Thinking)'),
            config.get<string>('heroModel2', 'Gemini 3 Pro (High)'),
            config.get<string>('heroModel3', 'Gemini 3 Flash'),
        ];
    }

    private _formatLastRefresh(): string {
        if (!this._lastRefreshTime) {
            return 'Not yet refreshed';
        }

        const now = new Date();
        const diffMs = now.getTime() - this._lastRefreshTime.getTime();
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);

        if (diffSecs < 10) {
            return 'Just now';
        } else if (diffSecs < 60) {
            return `${diffSecs}s ago`;
        } else if (diffMins < 60) {
            return `${diffMins}m ago`;
        } else {
            return `${diffHours}h ${diffMins % 60}m ago`;
        }
    }

    private _getHtmlContent(): string {
        if (this._isLoading) {
            return this._getLoadingHtml();
        }

        if (this._error) {
            return this._getErrorHtml(this._error);
        }

        if (!this._metricsData) {
            return this._getWelcomeHtml();
        }

        return this._getDataHtml(this._metricsData);
    }

    private _getDataHtml(data: MetricsResponse): string {
        const userStatus = data.userStatus;
        const models = userStatus.cascadeModelConfigData.clientModelConfigs;
        const planStatus = userStatus.planStatus;

        // Get all models with quota info
        const modelsWithQuota = models.filter(m => m.quotaInfo);

        // Get hero model names from settings
        const heroModelNames = this._getHeroModelNames();

        // Find hero models based on settings
        const heroModels: ModelConfig[] = [];
        for (const name of heroModelNames) {
            const found = modelsWithQuota.find(m =>
                m.label.toLowerCase().includes(name.toLowerCase()) ||
                name.toLowerCase().includes(m.label.toLowerCase())
            );
            if (found && !heroModels.includes(found)) {
                heroModels.push(found);
            }
        }

        // If we don't have 3 hero models, fill with top remaining
        if (heroModels.length < 3) {
            for (const m of modelsWithQuota) {
                if (!heroModels.includes(m) && heroModels.length < 3) {
                    heroModels.push(m);
                }
            }
        }

        // Format last refresh time
        const lastRefreshStr = this._formatLastRefresh();
        const refreshTimeFormatted = this._lastRefreshTime
            ? this._lastRefreshTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '--:--';

        // Generate hero gauge cards with neon effects
        const heroGauges = heroModels.map((model, idx) => {
            if (!model.quotaInfo) return '';
            const percentage = Math.round(model.quotaInfo.remainingFraction * 100);
            const resetTime = formatResetTime(model.quotaInfo.resetTime);

            // Elegant neon colors - toned down for readability
            let strokeColor: string;
            let glowColor: string;
            let bgGlow: string;

            if (percentage < 30) {
                // Soft red/coral
                strokeColor = '#ff5577';
                glowColor = 'rgba(255, 85, 119, 0.25)';
                bgGlow = 'rgba(255, 85, 119, 0.08)';
            } else if (percentage < 70) {
                // Soft amber/orange
                strokeColor = '#ffbb33';
                glowColor = 'rgba(255, 187, 51, 0.25)';
                bgGlow = 'rgba(255, 187, 51, 0.08)';
            } else {
                // Soft green/mint
                strokeColor = '#44dd88';
                glowColor = 'rgba(68, 221, 136, 0.25)';
                bgGlow = 'rgba(68, 221, 136, 0.08)';
            }

            const radius = 34;
            const circumference = 2 * Math.PI * radius;
            const strokeDashoffset = circumference - (percentage / 100) * circumference;
            const shortName = this._getShortModelName(model.label);

            return `
                <div class="hero-gauge">
                    <div class="gauge-ring" style="--stroke: ${strokeColor}; --glow: ${glowColor}; --bg-glow: ${bgGlow};">
                        <svg viewBox="0 0 80 80">
                            <defs>
                                <filter id="glow${idx}" x="-30%" y="-30%" width="160%" height="160%">
                                    <feGaussianBlur stdDeviation="1.5" result="blur"/>
                                    <feMerge>
                                        <feMergeNode in="blur"/>
                                        <feMergeNode in="SourceGraphic"/>
                                    </feMerge>
                                </filter>
                            </defs>
                            <circle class="gauge-bg" cx="40" cy="40" r="${radius}"/>
                            <circle class="gauge-fill" cx="40" cy="40" r="${radius}" 
                                stroke="${strokeColor}"
                                filter="url(#glow${idx})"
                                style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${strokeDashoffset};"
                            />
                        </svg>
                        <div class="gauge-center">
                            <span class="gauge-pct" style="color: ${strokeColor};">${percentage}<small>%</small></span>
                            <span class="gauge-time">${resetTime}</span>
                        </div>
                    </div>
                    <div class="gauge-name">${shortName}</div>
                </div>
            `;
        }).join('');

        // Generate ALL model list items
        const modelListItems = modelsWithQuota.map(model => {
            if (!model.quotaInfo) return '';
            const percentage = Math.round(model.quotaInfo.remainingFraction * 100);
            const resetTime = formatResetTime(model.quotaInfo.resetTime);

            let statusClass = 'healthy';
            let barColor = '#00ff88';
            if (percentage < 30) {
                statusClass = 'critical';
                barColor = '#ff3366';
            } else if (percentage < 70) {
                statusClass = 'warning';
                barColor = '#ffaa00';
            }

            return `
                <div class="model-row">
                    <span class="dot ${statusClass}"></span>
                    <span class="name">${model.label}</span>
                    <div class="bar-track">
                        <div class="bar-fill" style="width:${percentage}%;background:${barColor}"></div>
                    </div>
                    <span class="pct">${percentage}%</span>
                    <span class="time">⏱${resetTime}</span>
                </div>
            `;
        }).join('');

        // Credits calculations
        const promptCurrent = planStatus.availablePromptCredits;
        const promptTotal = planStatus.planInfo.monthlyPromptCredits;
        const promptPercent = Math.min(100, Math.round((promptCurrent / promptTotal) * 100));

        const flowCurrent = planStatus.availableFlowCredits;
        const flowTotal = planStatus.planInfo.monthlyFlowCredits;
        const flowPercent = Math.min(100, Math.round((flowCurrent / flowTotal) * 100));

        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; font-src https://fonts.gstatic.com; style-src-elem 'unsafe-inline' https://fonts.googleapis.com;">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Orbitron:wght@500;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-base: #0a0a0f;
            --bg-surface: #12121a;
            --bg-elevated: #1a1a25;
            --bg-overlay: #22222f;
            
            --border-default: #2a2a3a;
            --border-muted: rgba(255, 255, 255, 0.06);
            
            --fg-default: #f0f0f5;
            --fg-muted: #9090a0;
            --fg-subtle: #606070;
            
            --neon-green: #00ff88;
            --neon-yellow: #ffaa00;
            --neon-red: #ff3366;
            --neon-blue: #00d4ff;
            --neon-purple: #aa66ff;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: var(--bg-base);
            color: var(--fg-default);
            font-size: 12px;
            line-height: 1.5;
            -webkit-font-smoothing: antialiased;
            padding: 0;
            overflow-x: hidden;
        }

        .container {
            padding: 12px;
        }

        /* ===== LAST REFRESH BANNER ===== */
        .refresh-banner {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            background: var(--bg-surface);
            border: 1px solid var(--border-default);
            border-radius: 8px;
            margin-top: 4px;
            margin-bottom: 12px;
            font-size: 10px;
            color: var(--fg-subtle);
        }

        .refresh-banner .icon {
            font-size: 12px;
        }

        .refresh-banner .time {
            color: var(--neon-green);
            font-weight: 600;
        }

        .refresh-banner .ago {
            color: var(--fg-muted);
        }

        /* ===== HERO GAUGES WITH NEON GLOW ===== */
        .hero {
            display: flex;
            justify-content: center;
            gap: 12px;
            padding: 16px 0 20px;
            border-bottom: 1px solid var(--border-muted);
            margin-bottom: 12px;
            background: radial-gradient(ellipse at center top, rgba(0, 255, 136, 0.03) 0%, transparent 60%);
        }

        .hero-gauge {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            flex: 1;
            max-width: 110px;
        }

        .gauge-ring {
            position: relative;
            width: 80px;
            height: 80px;
            background: radial-gradient(circle, var(--bg-glow) 0%, transparent 70%);
            border-radius: 50%;
            padding: 4px;
        }

        .gauge-ring svg {
            width: 100%;
            height: 100%;
            transform: rotate(-90deg);
            filter: drop-shadow(0 0 4px var(--glow));
        }

        .gauge-bg {
            fill: none;
            stroke: var(--bg-overlay);
            stroke-width: 5;
        }

        .gauge-fill {
            fill: none;
            stroke-width: 6;
            stroke-linecap: round;
            transition: stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .gauge-center {
            position: absolute;
            inset: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
        }

        .gauge-pct {
            font-family: 'Orbitron', monospace;
            font-size: 17px;
            font-weight: 700;
            line-height: 1;
            text-shadow: 0 0 6px currentColor;
        }

        .gauge-pct small {
            font-size: 10px;
            font-weight: 500;
            opacity: 0.8;
        }

        .gauge-time {
            font-size: 10px;
            font-weight: 500;
            color: var(--fg-default);
            margin-top: 4px;
            opacity: 0.85;
        }

        .gauge-name {
            font-size: 10px;
            font-weight: 600;
            color: var(--fg-muted);
            text-align: center;
            line-height: 1.2;
            max-width: 90px;
        }

        /* ===== CARDS ===== */
        .card {
            background: var(--bg-surface);
            border: 1px solid var(--border-default);
            border-radius: 12px;
            margin-bottom: 10px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 14px;
            border-bottom: 1px solid var(--border-muted);
            background: var(--bg-elevated);
        }

        .card-title {
            font-size: 10px;
            font-weight: 700;
            color: var(--fg-muted);
            text-transform: uppercase;
            letter-spacing: 0.8px;
        }

        .card-meta {
            font-size: 9px;
            color: var(--fg-subtle);
        }

        .card-content {
            padding: 14px;
        }

        /* ===== CREDITS WITH GLOW ===== */
        .credits-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
        }

        .credit-box {
            background: var(--bg-overlay);
            border-radius: 10px;
            padding: 12px;
            border: 1px solid var(--border-muted);
        }

        .credit-label {
            font-size: 9px;
            font-weight: 700;
            color: var(--fg-subtle);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
        }

        .credit-value {
            font-family: 'Orbitron', monospace;
            font-size: 18px;
            font-weight: 700;
            color: var(--fg-default);
        }

        .credit-value span {
            font-size: 12px;
            font-weight: 400;
            color: var(--fg-subtle);
            font-family: 'Inter', sans-serif;
        }

        .credit-bar {
            height: 4px;
            background: var(--bg-base);
            border-radius: 2px;
            margin-top: 10px;
            overflow: hidden;
        }

        .credit-bar-fill {
            height: 100%;
            border-radius: 2px;
            transition: width 0.8s ease;
        }

        .credit-bar-fill.prompt {
            background: linear-gradient(90deg, var(--neon-purple), var(--neon-blue));
            box-shadow: 0 0 8px var(--neon-purple);
        }

        .credit-bar-fill.flow {
            background: linear-gradient(90deg, var(--neon-blue), var(--neon-green));
            box-shadow: 0 0 8px var(--neon-blue);
        }

        /* ===== USER ROW ===== */
        .user-row {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 14px;
        }

        .user-avatar {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--neon-purple), var(--neon-blue));
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 14px;
            color: #fff;
            flex-shrink: 0;
            box-shadow: 0 0 15px rgba(170, 102, 255, 0.4);
        }

        .user-info {
            flex: 1;
            min-width: 0;
        }

        .user-name {
            font-size: 13px;
            font-weight: 600;
            color: var(--fg-default);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .user-email {
            font-size: 10px;
            color: var(--fg-subtle);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .user-badge {
            background: linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(0, 255, 136, 0.2));
            border: 1px solid rgba(0, 212, 255, 0.4);
            color: var(--neon-blue);
            padding: 4px 10px;
            border-radius: 14px;
            font-size: 9px;
            font-weight: 700;
            white-space: nowrap;
            text-shadow: 0 0 8px var(--neon-blue);
        }

        /* ===== MODEL LIST WITH NEON DOTS ===== */
        .model-row {
            display: grid;
            grid-template-columns: 10px 1fr 50px 36px auto;
            gap: 8px;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid var(--border-muted);
        }

        .model-row:last-child {
            border-bottom: none;
            padding-bottom: 0;
        }

        .dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
        }

        .dot.healthy { 
            background: var(--neon-green); 
            box-shadow: 0 0 8px var(--neon-green), 0 0 16px var(--neon-green);
        }
        .dot.warning { 
            background: var(--neon-yellow); 
            box-shadow: 0 0 8px var(--neon-yellow), 0 0 16px var(--neon-yellow);
        }
        .dot.critical { 
            background: var(--neon-red); 
            box-shadow: 0 0 8px var(--neon-red), 0 0 16px var(--neon-red);
        }

        .name {
            font-size: 11px;
            font-weight: 500;
            color: var(--fg-default);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .bar-track {
            height: 4px;
            background: var(--bg-base);
            border-radius: 2px;
            overflow: hidden;
        }

        .bar-fill {
            height: 100%;
            border-radius: 2px;
            transition: width 0.6s ease;
            box-shadow: 0 0 6px currentColor;
        }

        .pct {
            font-family: 'Orbitron', monospace;
            font-size: 10px;
            font-weight: 600;
            color: var(--fg-muted);
            text-align: right;
        }

        .time {
            font-size: 9px;
            color: var(--fg-subtle);
            white-space: nowrap;
        }

        /* ===== FOOTER ===== */
        .footer {
            text-align: center;
            padding: 14px;
            font-size: 9px;
            color: var(--fg-subtle);
        }

        /* ===== ANIMATIONS ===== */
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @keyframes glow-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }

        .refresh-banner { animation: fadeIn 0.3s ease; }
        .hero { animation: fadeIn 0.5s ease; }
        .card { animation: fadeIn 0.4s ease backwards; }
        .card:nth-child(1) { animation-delay: 0.1s; }
        .card:nth-child(2) { animation-delay: 0.15s; }
        .card:nth-child(3) { animation-delay: 0.2s; }

        .dot {
            animation: glow-pulse 2s ease-in-out infinite;
        }
    </style>
</head>
<body>
    <div class="container">


        <!-- Hero Gauges -->
        <div class="hero">
            ${heroGauges}
        </div>

        <!-- Credits Card -->
        <div class="card">
            <div class="card-header">
                <span class="card-title">AI Credits</span>
                <span class="card-meta">Monthly quota</span>
            </div>
            <div class="card-content">
                <div class="credits-grid">
                    <div class="credit-box">
                        <div class="credit-label">Prompt</div>
                        <div class="credit-value">${this._formatK(promptCurrent)}<span>/${this._formatK(promptTotal)}</span></div>
                        <div class="credit-bar">
                            <div class="credit-bar-fill prompt" style="width:${promptPercent}%"></div>
                        </div>
                    </div>
                    <div class="credit-box">
                        <div class="credit-label">Flow</div>
                        <div class="credit-value">${this._formatK(flowCurrent)}<span>/${this._formatK(flowTotal)}</span></div>
                        <div class="credit-bar">
                            <div class="credit-bar-fill flow" style="width:${flowPercent}%"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- User Card -->
        <div class="card">
            <div class="user-row">
                <div class="user-avatar">${userStatus.name.charAt(0).toUpperCase()}</div>
                <div class="user-info">
                    <div class="user-name">${userStatus.name}</div>
                    <div class="user-email">${userStatus.email}</div>
                </div>
                <span class="user-badge">${userStatus.userTier.name}</span>
            </div>
        </div>

        <!-- All Models Card -->
        <div class="card">
            <div class="card-header">
                <span class="card-title">All Models</span>
                <span class="card-meta">${modelsWithQuota.length} total</span>
            </div>
            <div class="card-content">
                ${modelListItems}
            </div>
        </div>

        <!-- Last Refresh Banner -->
        <div class="refresh-banner">
            <span class="icon">🔄</span>
            <span>Last refreshed:</span>
            <span class="time">${refreshTimeFormatted}</span>
            <span class="ago">(${lastRefreshStr})</span>
        </div>

        <div class="footer">
            ⚡ Powered by Antigravity
        </div>
    </div>
</body>
</html>
        `;
    }

    private _getShortModelName(label: string): string {
        const mappings: Record<string, string> = {
            'Claude Opus 4.5 (Thinking)': 'Claude Opus',
            'Claude Sonnet 4.5': 'Sonnet',
            'Claude Sonnet 4.5 (Thinking)': 'Sonnet Think',
            'Gemini 3 Pro (High)': 'Gemini Pro',
            'Gemini 3 Pro (Low)': 'Gemini Pro',
            'Gemini 3 Flash': 'Gemini Flash',
            'GPT-OSS 120B (Medium)': 'GPT-OSS',
        };
        if (mappings[label]) return mappings[label];
        return label.split(' ').slice(0, 2).join(' ');
    }

    private _formatK(num: number): string {
        if (num >= 1000) {
            return (num / 1000).toFixed(num % 1000 === 0 ? 0 : 1) + 'K';
        }
        return num.toString();
    }

    private _getLoadingHtml(): string {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
        body {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background: #0a0a0f;
            color: #9090a0;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 12px;
        }
        .spinner {
            width: 36px;
            height: 36px;
            border: 3px solid #22222f;
            border-top-color: #00ff88;
            border-radius: 50%;
            animation: spin 0.7s linear infinite;
            margin-bottom: 14px;
            box-shadow: 0 0 15px rgba(0, 255, 136, 0.3);
        }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="spinner"></div>
    <div>Loading quotas...</div>
</body>
</html>
        `;
    }

    private _getErrorHtml(error: string): string {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
        body {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            padding: 20px;
            background: #0a0a0f;
            color: #f0f0f5;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 12px;
            text-align: center;
        }
        .icon {
            width: 44px;
            height: 44px;
            margin-bottom: 14px;
            color: #ff3366;
            filter: drop-shadow(0 0 10px rgba(255, 51, 102, 0.5));
        }
        h3 { 
            margin: 0 0 8px; 
            font-size: 14px;
            color: #ff3366;
            text-shadow: 0 0 10px rgba(255, 51, 102, 0.5);
        }
        p { 
            margin: 0; 
            color: #9090a0;
            line-height: 1.4;
        }
    </style>
</head>
<body>
    <svg class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <circle cx="12" cy="12" r="10" stroke-width="2"/>
        <line x1="12" y1="8" x2="12" y2="12" stroke-width="2" stroke-linecap="round"/>
        <circle cx="12" cy="16" r="1" fill="currentColor"/>
    </svg>
    <h3>Connection Error</h3>
    <p>${error}</p>
</body>
</html>
        `;
    }

    private _getWelcomeHtml(): string {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
        body {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            padding: 20px;
            background: #0a0a0f;
            color: #f0f0f5;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 12px;
            text-align: center;
        }
        .icon {
            width: 52px;
            height: 52px;
            margin-bottom: 18px;
            color: #00ff88;
            animation: pulse 2s ease-in-out infinite;
            filter: drop-shadow(0 0 12px rgba(0, 255, 136, 0.5));
        }
        @keyframes pulse {
            0%, 100% { opacity: 0.7; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.08); }
        }
        h3 { 
            margin: 0 0 8px; 
            font-size: 15px;
            font-weight: 700;
            background: linear-gradient(135deg, #00ff88, #00d4ff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        p { 
            margin: 0; 
            color: #9090a0;
            line-height: 1.5;
        }
        .hint {
            margin-top: 18px;
            padding: 10px 14px;
            background: #12121a;
            border: 1px solid #2a2a3a;
            border-radius: 8px;
            font-size: 11px;
            color: #9090a0;
        }
        .hint code {
            color: #00ff88;
            background: #0a0a0f;
            padding: 2px 6px;
            border-radius: 4px;
            text-shadow: 0 0 8px rgba(0, 255, 136, 0.4);
        }
    </style>
</head>
<body>
    <svg class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
            d="M13 10V3L4 14h7v7l9-11h-7z"/>
    </svg>
    <h3>Antigravity Quota Monitor</h3>
    <p>Click the refresh button above to load your AI model quotas.</p>
    <div class="hint">
        Use <code>⟳</code> to refresh · <code>⚙</code> for settings
    </div>
</body>
</html>
        `;
    }
}
