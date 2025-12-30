/**
 * Webview Panel for detailed quota display
 * Premium, "World Class" Dark UI Design
 * Inspired by modern dashboard aesthetics
 */

import * as vscode from 'vscode';
import { MetricsResponse, formatResetTime, formatResetTimeAbsolute } from './metricsClient';

export class QuotaWebviewPanel {
    public static currentPanel: QuotaWebviewPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel) {
        this._panel = panel;
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    public static createOrShow(context: vscode.ExtensionContext): QuotaWebviewPanel {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (QuotaWebviewPanel.currentPanel) {
            QuotaWebviewPanel.currentPanel._panel.reveal(column);
            return QuotaWebviewPanel.currentPanel;
        }

        const panel = vscode.window.createWebviewPanel(
            'antigravityQuotaDetails',
            'Antigravity Quota Details',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            }
        );

        QuotaWebviewPanel.currentPanel = new QuotaWebviewPanel(panel);
        return QuotaWebviewPanel.currentPanel;
    }

    public updateContent(data: MetricsResponse | null, error?: string): void {
        this._panel.webview.html = this._getHtmlContent(data, error);
    }

    private _getHtmlContent(data: MetricsResponse | null, error?: string): string {
        if (error) {
            return this._getErrorHtml(error);
        }
        if (!data) {
            return this._getLoadingHtml();
        }

        const userStatus = data.userStatus;
        const models = userStatus.cascadeModelConfigData.clientModelConfigs;
        const planStatus = userStatus.planStatus;

        // Group models and get top 3 for hero display
        const modelsWithQuota = models.filter(m => m.quotaInfo);
        const heroModels = modelsWithQuota.slice(0, 3);

        // Generate hero gauge cards (top 3)
        const heroGauges = heroModels.map(model => {
            if (!model.quotaInfo) return '';
            const percentage = Math.round(model.quotaInfo.remainingFraction * 100);
            const resetTime = this._formatResetTimeByPreference(model.quotaInfo.resetTime);

            let strokeColor = '#22c55e'; // green
            let glowColor = 'rgba(34, 197, 94, 0.3)';
            if (percentage < 30) {
                strokeColor = '#ef4444'; // red
                glowColor = 'rgba(239, 68, 68, 0.3)';
            } else if (percentage < 70) {
                strokeColor = '#f59e0b'; // amber
                glowColor = 'rgba(245, 158, 11, 0.3)';
            }

            // SVG circle calculations
            const radius = 36;
            const circumference = 2 * Math.PI * radius;
            const strokeDashoffset = circumference - (percentage / 100) * circumference;

            // Shorten model name for hero display
            const shortName = this._getShortModelName(model.label);

            return `
                <div class="hero-gauge">
                    <div class="gauge-ring" style="--stroke-color: ${strokeColor}; --glow-color: ${glowColor}">
                        <svg viewBox="0 0 100 100">
                            <circle class="gauge-bg" cx="50" cy="50" r="${radius}"/>
                            <circle class="gauge-progress" cx="50" cy="50" r="${radius}" 
                                stroke="${strokeColor}"
                                style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${strokeDashoffset};"
                            />
                        </svg>
                        <div class="gauge-center">
                            <span class="gauge-value">${percentage}<span class="gauge-percent">%</span></span>
                            <span class="gauge-time">${resetTime}</span>
                        </div>
                    </div>
                    <div class="gauge-label">${shortName}</div>
                </div>
            `;
        }).join('');

        // Generate model list items for remaining models
        const remainingModels = modelsWithQuota.slice(3);
        const modelListItems = remainingModels.map(model => {
            if (!model.quotaInfo) return '';
            const percentage = Math.round(model.quotaInfo.remainingFraction * 100);
            const resetTime = this._formatResetTimeByPreference(model.quotaInfo.resetTime);

            let statusClass = 'healthy';
            let barColor = '#22c55e';
            if (percentage < 30) {
                statusClass = 'critical';
                barColor = '#ef4444';
            } else if (percentage < 70) {
                statusClass = 'warning';
                barColor = '#f59e0b';
            }

            return `
                <div class="model-item ${statusClass}">
                    <div class="model-info">
                        <span class="model-dot"></span>
                        <span class="model-name">${model.label}</span>
                    </div>
                    <div class="model-stats">
                        <div class="mini-bar-track">
                            <div class="mini-bar" style="width: ${percentage}%; background: ${barColor};"></div>
                        </div>
                        <span class="model-percent">${percentage}%</span>
                        <span class="model-reset">⏱ ${resetTime}</span>
                    </div>
                </div>
            `;
        }).join('');

        // Credits calculations
        const promptCurrent = planStatus.availablePromptCredits;
        const promptTotal = planStatus.planInfo.monthlyPromptCredits;
        const promptPercent = Math.min(100, Math.max(0, Math.round((promptCurrent / promptTotal) * 100)));

        const flowCurrent = planStatus.availableFlowCredits;
        const flowTotal = planStatus.planInfo.monthlyFlowCredits;
        const flowPercent = Math.min(100, Math.max(0, Math.round((flowCurrent / flowTotal) * 100)));

        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Antigravity Quota</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-primary: #0d1117;
            --bg-secondary: #161b22;
            --bg-tertiary: #21262d;
            --border-primary: #30363d;
            --border-subtle: rgba(240, 246, 252, 0.1);
            
            --text-primary: #e6edf3;
            --text-secondary: #8b949e;
            --text-tertiary: #6e7681;
            
            --accent-blue: #58a6ff;
            --accent-purple: #a371f7;
            --accent-cyan: #39d5ff;
            
            --success: #3fb950;
            --warning: #d29922;
            --danger: #f85149;
            
            --shadow-sm: 0 1px 0 rgba(27,31,36,0.04);
            --shadow-md: 0 3px 6px rgba(0,0,0,0.15);
            --shadow-lg: 0 8px 24px rgba(0,0,0,0.2);
            --shadow-glow: 0 0 20px;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.5;
            -webkit-font-smoothing: antialiased;
        }

        .container {
            padding: 20px;
            max-width: 600px;
            margin: 0 auto;
        }

        /* Hero Section - Circular Gauges */
        .hero-section {
            display: flex;
            justify-content: center;
            gap: 16px;
            padding: 24px 0 32px;
            animation: fadeInUp 0.6s ease-out;
        }

        .hero-gauge {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
        }

        .gauge-ring {
            position: relative;
            width: 90px;
            height: 90px;
            filter: drop-shadow(var(--shadow-glow) var(--glow-color));
            transition: transform 0.3s ease;
        }

        .gauge-ring:hover {
            transform: scale(1.05);
        }

        .gauge-ring svg {
            width: 100%;
            height: 100%;
            transform: rotate(-90deg);
        }

        .gauge-bg {
            fill: none;
            stroke: var(--bg-tertiary);
            stroke-width: 6;
        }

        .gauge-progress {
            fill: none;
            stroke-width: 6;
            stroke-linecap: round;
            transition: stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .gauge-center {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            display: flex;
            flex-direction: column;
            line-height: 1.2;
        }

        .gauge-value {
            font-family: 'JetBrains Mono', monospace;
            font-size: 18px;
            font-weight: 600;
            color: var(--text-primary);
        }

        .gauge-percent {
            font-size: 10px;
            color: var(--text-secondary);
        }

        .gauge-time {
            font-size: 10px;
            color: var(--text-tertiary);
            margin-top: 2px;
        }

        .gauge-label {
            font-size: 11px;
            font-weight: 500;
            color: var(--text-secondary);
            text-align: center;
            max-width: 80px;
        }

        /* Cards */
        .card {
            background: var(--bg-secondary);
            border: 1px solid var(--border-primary);
            border-radius: 12px;
            margin-bottom: 12px;
            overflow: hidden;
            transition: border-color 0.2s ease;
        }

        .card:hover {
            border-color: var(--border-subtle);
        }

        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            border-bottom: 1px solid var(--border-primary);
        }

        .card-title {
            font-size: 12px;
            font-weight: 600;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .card-content {
            padding: 16px;
        }

        /* User Section */
        .user-card .card-content {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 14px 16px;
        }

        .user-avatar {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--accent-purple), var(--accent-blue));
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 14px;
        }

        .user-info {
            flex: 1;
        }

        .user-name {
            font-weight: 600;
            font-size: 14px;
            color: var(--text-primary);
        }

        .user-email {
            font-size: 12px;
            color: var(--text-tertiary);
        }

        .user-badge {
            background: linear-gradient(135deg, rgba(163, 113, 247, 0.15), rgba(88, 166, 255, 0.15));
            border: 1px solid rgba(163, 113, 247, 0.3);
            color: var(--accent-purple);
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
        }

        /* Credits Section */
        .credits-row {
            display: flex;
            gap: 12px;
        }

        .credit-item {
            flex: 1;
            padding: 14px;
            background: var(--bg-tertiary);
            border-radius: 8px;
        }

        .credit-label {
            font-size: 11px;
            color: var(--text-tertiary);
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }

        .credit-value {
            font-family: 'JetBrains Mono', monospace;
            font-size: 16px;
            font-weight: 600;
            color: var(--text-primary);
        }

        .credit-value span {
            font-size: 12px;
            color: var(--text-tertiary);
            font-weight: 400;
        }

        .credit-bar-track {
            height: 4px;
            background: var(--bg-primary);
            border-radius: 2px;
            margin-top: 10px;
            overflow: hidden;
        }

        .credit-bar {
            height: 100%;
            border-radius: 2px;
            transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .credit-bar.prompt { background: linear-gradient(90deg, var(--accent-purple), var(--accent-blue)); }
        .credit-bar.flow { background: linear-gradient(90deg, var(--accent-cyan), var(--accent-blue)); }

        /* Model List */
        .model-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid var(--border-subtle);
        }

        .model-item:last-child {
            border-bottom: none;
        }

        .model-info {
            display: flex;
            align-items: center;
            gap: 10px;
            flex: 1;
            min-width: 0;
        }

        .model-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            flex-shrink: 0;
        }

        .model-item.healthy .model-dot { background: var(--success); box-shadow: 0 0 8px var(--success); }
        .model-item.warning .model-dot { background: var(--warning); box-shadow: 0 0 8px var(--warning); }
        .model-item.critical .model-dot { background: var(--danger); box-shadow: 0 0 8px var(--danger); }

        .model-name {
            font-size: 13px;
            font-weight: 500;
            color: var(--text-primary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .model-stats {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-shrink: 0;
        }

        .mini-bar-track {
            width: 50px;
            height: 4px;
            background: var(--bg-tertiary);
            border-radius: 2px;
            overflow: hidden;
        }

        .mini-bar {
            height: 100%;
            border-radius: 2px;
            transition: width 0.8s ease;
        }

        .model-percent {
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px;
            font-weight: 500;
            color: var(--text-secondary);
            width: 36px;
            text-align: right;
        }

        .model-reset {
            font-size: 11px;
            color: var(--text-tertiary);
            min-width: 60px;
        }

        /* Footer */
        .footer {
            text-align: center;
            padding: 20px;
            color: var(--text-tertiary);
            font-size: 11px;
        }

        .footer a {
            color: var(--accent-blue);
            text-decoration: none;
        }

        /* Animations */
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .card {
            animation: fadeInUp 0.5s ease-out;
            animation-fill-mode: both;
        }

        .card:nth-child(1) { animation-delay: 0.1s; }
        .card:nth-child(2) { animation-delay: 0.15s; }
        .card:nth-child(3) { animation-delay: 0.2s; }
        .card:nth-child(4) { animation-delay: 0.25s; }

        /* Refresh indicator */
        .refresh-time {
            font-size: 10px;
            color: var(--text-tertiary);
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Hero Gauges -->
        <div class="hero-section">
            ${heroGauges}
        </div>

        <!-- Credits Card -->
        <div class="card">
            <div class="card-header">
                <span class="card-title">AI Credits</span>
                <span class="refresh-time">Updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div class="card-content">
                <div class="credits-row">
                    <div class="credit-item">
                        <div class="credit-label">Prompt</div>
                        <div class="credit-value">${this._formatK(promptCurrent)}<span>/${this._formatK(promptTotal)}</span></div>
                        <div class="credit-bar-track">
                            <div class="credit-bar prompt" style="width: ${promptPercent}%;"></div>
                        </div>
                    </div>
                    <div class="credit-item">
                        <div class="credit-label">Flow</div>
                        <div class="credit-value">${this._formatK(flowCurrent)}<span>/${this._formatK(flowTotal)}</span></div>
                        <div class="credit-bar-track">
                            <div class="credit-bar flow" style="width: ${flowPercent}%;"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- User Card -->
        <div class="card user-card">
            <div class="card-content">
                <div class="user-avatar">${userStatus.name.charAt(0).toUpperCase()}</div>
                <div class="user-info">
                    <div class="user-name">${userStatus.name}</div>
                    <div class="user-email">${userStatus.email}</div>
                </div>
                <span class="user-badge">${userStatus.userTier.name}</span>
            </div>
        </div>

        <!-- More Models Card -->
        ${remainingModels.length > 0 ? `
        <div class="card">
            <div class="card-header">
                <span class="card-title">More Models</span>
                <span class="refresh-time">${modelsWithQuota.length} total</span>
            </div>
            <div class="card-content">
                ${modelListItems}
            </div>
        </div>
        ` : ''}

        <div class="footer">
            Powered by <a href="#">Antigravity</a>
        </div>
    </div>
</body>
</html>
        `;
    }

    private _getShortModelName(label: string): string {
        // Shorten common model names for hero display
        const mappings: { [key: string]: string } = {
            'Claude Opus 4.5 (Thinking)': 'Claude Opus',
            'Claude Sonnet 4.5': 'Claude Sonnet',
            'Claude Sonnet 4.5 (Thinking)': 'Claude Sonnet',
            'Gemini 3 Pro (High)': 'Gemini Pro',
            'Gemini 3 Pro (Low)': 'Gemini Pro',
            'Gemini 3 Flash': 'Gemini Flash',
            'GPT-OSS 120B (Medium)': 'GPT-OSS',
        };
        return mappings[label] || label.split(' ').slice(0, 2).join(' ');
    }

    private _formatNumber(num: number): string {
        return num.toLocaleString();
    }

    private _formatK(num: number): string {
        if (num >= 1000) {
            return (num / 1000).toFixed(num % 1000 === 0 ? 0 : 1) + 'K';
        }
        return num.toString();
    }

    private _getResetTimeFormat(): 'relative' | 'absolute' {
        const config = vscode.workspace.getConfiguration('antigravityQuota');
        return config.get<'relative' | 'absolute'>('resetTimeFormat', 'relative');
    }

    private _formatResetTimeByPreference(resetTime: string): string {
        const format = this._getResetTimeFormat();
        return format === 'absolute'
            ? formatResetTimeAbsolute(resetTime)
            : formatResetTime(resetTime);
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
            justify-content: center;
            align-items: center;
            height: 100vh;
            background: #0d1117;
            color: #e6edf3;
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .loader {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
        }
        .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #21262d;
            border-top-color: #a371f7;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }
        .text {
            color: #8b949e;
            font-size: 14px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="loader">
        <div class="spinner"></div>
        <div class="text">Loading quota data...</div>
    </div>
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
            justify-content: center;
            align-items: center;
            height: 100vh;
            background: #0d1117;
            color: #e6edf3;
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .error-box {
            padding: 32px;
            background: #161b22;
            border: 1px solid #f8514930;
            border-radius: 12px;
            text-align: center;
            max-width: 400px;
        }
        .error-icon {
            width: 48px;
            height: 48px;
            margin-bottom: 16px;
            color: #f85149;
        }
        h3 {
            margin: 0 0 8px;
            color: #f85149;
            font-weight: 600;
        }
        p {
            margin: 0;
            color: #8b949e;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="error-box">
        <svg class="error-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h3>Connection Error</h3>
        <p>${error}</p>
    </div>
</body>
</html>
        `;
    }

    public dispose(): void {
        QuotaWebviewPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
