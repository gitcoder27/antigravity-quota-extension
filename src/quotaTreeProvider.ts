/**
 * Tree View Provider for Quota Display
 */

import * as vscode from 'vscode';
import {
    MetricsResponse,
    ModelConfig,
    formatResetTime,
    getQuotaColor,
} from './metricsClient';

export class QuotaTreeProvider implements vscode.TreeDataProvider<QuotaTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<QuotaTreeItem | undefined | null | void> =
        new vscode.EventEmitter<QuotaTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<QuotaTreeItem | undefined | null | void> =
        this._onDidChangeTreeData.event;

    private metricsData: MetricsResponse | null = null;
    private error: string | null = null;
    private isLoading: boolean = false;

    constructor() { }

    refresh(data?: MetricsResponse, error?: string): void {
        this.metricsData = data ?? null;
        this.error = error ?? null;
        this.isLoading = false;
        this._onDidChangeTreeData.fire();
    }

    setLoading(): void {
        this.isLoading = true;
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: QuotaTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: QuotaTreeItem): Thenable<QuotaTreeItem[]> {
        if (this.isLoading) {
            return Promise.resolve([
                new QuotaTreeItem(
                    'Loading...',
                    '',
                    vscode.TreeItemCollapsibleState.None,
                    'loading'
                ),
            ]);
        }

        if (this.error) {
            return Promise.resolve([
                new QuotaTreeItem(
                    'Error',
                    this.error,
                    vscode.TreeItemCollapsibleState.None,
                    'error'
                ),
            ]);
        }

        if (!this.metricsData) {
            return Promise.resolve([
                new QuotaTreeItem(
                    'Click refresh to load data',
                    '',
                    vscode.TreeItemCollapsibleState.None,
                    'info'
                ),
            ]);
        }

        if (!element) {
            // Root level - show categories
            const items: QuotaTreeItem[] = [];

            // User info header
            const userStatus = this.metricsData.userStatus;
            items.push(
                new QuotaTreeItem(
                    `👤 ${userStatus.name}`,
                    `${userStatus.userTier.name} • ${userStatus.email}`,
                    vscode.TreeItemCollapsibleState.None,
                    'user'
                )
            );

            // Credits section
            items.push(
                new QuotaTreeItem(
                    '💎 Credits',
                    '',
                    vscode.TreeItemCollapsibleState.Expanded,
                    'credits-header'
                )
            );

            // AI Models section
            items.push(
                new QuotaTreeItem(
                    '🤖 AI Models',
                    '',
                    vscode.TreeItemCollapsibleState.Expanded,
                    'models-header'
                )
            );

            return Promise.resolve(items);
        }

        // Child items
        if (element.contextValue === 'credits-header') {
            const planStatus = this.metricsData.userStatus.planStatus;
            return Promise.resolve([
                new QuotaTreeItem(
                    `Prompt Credits: ${planStatus.availablePromptCredits.toLocaleString()}`,
                    `of ${planStatus.planInfo.monthlyPromptCredits.toLocaleString()} monthly`,
                    vscode.TreeItemCollapsibleState.None,
                    'credit'
                ),
                new QuotaTreeItem(
                    `Flow Credits: ${planStatus.availableFlowCredits.toLocaleString()}`,
                    `of ${planStatus.planInfo.monthlyFlowCredits.toLocaleString()} monthly`,
                    vscode.TreeItemCollapsibleState.None,
                    'credit'
                ),
            ]);
        }

        if (element.contextValue === 'models-header') {
            const models = this.metricsData.userStatus.cascadeModelConfigData.clientModelConfigs;
            return Promise.resolve(
                models.map((model) => this.createModelItem(model))
            );
        }

        return Promise.resolve([]);
    }

    private createModelItem(model: ModelConfig): QuotaTreeItem {
        const quota = model.quotaInfo;

        if (!quota) {
            return new QuotaTreeItem(
                model.label,
                'No quota info',
                vscode.TreeItemCollapsibleState.None,
                'model'
            );
        }

        const percentage = Math.round(quota.remainingFraction * 100);
        const resetTimeStr = formatResetTime(quota.resetTime);
        const color = getQuotaColor(quota.remainingFraction);

        // Create a visual block progress bar (10 steps)
        // █ = full block, ░ = light shade block
        const totalBlocks = 8;
        const filledBlocks = Math.round((percentage / 100) * totalBlocks);
        const emptyBlocks = totalBlocks - filledBlocks;
        const progressBar = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);

        // Determine status color icon
        const statusEmoji = color === 'green' ? '🟢' : color === 'yellow' ? '🟡' : '🔴';

        const item = new QuotaTreeItem(
            `${model.label}`,
            `${progressBar}  ${percentage}% · ⏱ ${resetTimeStr}`,
            vscode.TreeItemCollapsibleState.None,
            'model'
        );

        // Set icon path based on color for the tree item icon
        if (color === 'green') {
            item.iconPath = new vscode.ThemeIcon('circle-large-filled', new vscode.ThemeColor('charts.green'));
        } else if (color === 'yellow') {
            item.iconPath = new vscode.ThemeIcon('circle-large-filled', new vscode.ThemeColor('charts.yellow'));
        } else {
            item.iconPath = new vscode.ThemeIcon('circle-large-filled', new vscode.ThemeColor('charts.red'));
        }

        return item;
    }
}

export class QuotaTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly description: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string
    ) {
        super(label, collapsibleState);
        this.description = description;
        this.contextValue = contextValue;

        // Set icons based on context
        switch (contextValue) {
            case 'loading':
                this.iconPath = new vscode.ThemeIcon('loading~spin');
                break;
            case 'error':
                this.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground'));
                break;
            case 'info':
                this.iconPath = new vscode.ThemeIcon('info');
                break;
            case 'user':
                this.iconPath = new vscode.ThemeIcon('account');
                break;
            case 'credits-header':
                this.iconPath = new vscode.ThemeIcon('credit-card');
                break;
            case 'models-header':
                this.iconPath = new vscode.ThemeIcon('hubot');
                break;
            case 'credit':
                this.iconPath = new vscode.ThemeIcon('sparkle');
                break;
        }
    }
}
