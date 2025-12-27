/**
 * Antigravity Quota Monitor Extension
 * Main entry point
 */

import * as vscode from 'vscode';
import { fetchMetrics, MetricsResponse } from './metricsClient';
import { QuotaSidebarProvider } from './quotaSidebarProvider';
import { QuotaWebviewPanel } from './quotaWebviewPanel';

let sidebarProvider: QuotaSidebarProvider;
let webviewPanel: QuotaWebviewPanel | undefined;
let cachedData: MetricsResponse | null = null;

export function activate(context: vscode.ExtensionContext) {
    console.log('Antigravity Quota Monitor is now active');

    // Create the sidebar webview provider
    sidebarProvider = new QuotaSidebarProvider(context.extensionUri);

    // Register the webview view provider for the sidebar
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            QuotaSidebarProvider.viewType,
            sidebarProvider
        )
    );

    // Register refresh command
    const refreshCommand = vscode.commands.registerCommand(
        'antigravity-quota.refresh',
        async () => {
            await refreshData();
        }
    );

    // Register show details command (opens full panel)
    const showDetailsCommand = vscode.commands.registerCommand(
        'antigravity-quota.showDetails',
        () => {
            webviewPanel = QuotaWebviewPanel.createOrShow(context);
            if (cachedData) {
                webviewPanel.updateContent(cachedData);
            }
        }
    );

    // Register open settings command
    const openSettingsCommand = vscode.commands.registerCommand(
        'antigravity-quota.openSettings',
        () => {
            vscode.commands.executeCommand(
                'workbench.action.openSettings',
                'antigravityQuota'
            );
        }
    );

    context.subscriptions.push(refreshCommand, showDetailsCommand, openSettingsCommand);

    // Show welcome message
    vscode.window.showInformationMessage(
        'Antigravity Quota Monitor loaded. Click the refresh button to fetch quota data.'
    );
}

async function refreshData(): Promise<void> {
    sidebarProvider.setLoading();

    try {
        const data = await fetchMetrics();
        cachedData = data;

        // Pass current time as last refresh time
        const lastRefreshTime = new Date();
        sidebarProvider.refresh(data ?? undefined, undefined, lastRefreshTime);

        // Update webview panel if open
        if (webviewPanel && data) {
            webviewPanel.updateContent(data);
        }

        vscode.window.showInformationMessage('Quota data refreshed successfully!');
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : 'Unknown error occurred';
        sidebarProvider.refresh(undefined, errorMessage);

        if (webviewPanel) {
            webviewPanel.updateContent(null, errorMessage);
        }

        vscode.window.showErrorMessage(`Failed to refresh: ${errorMessage}`);
    }
}

export function deactivate() {
    if (webviewPanel) {
        webviewPanel.dispose();
    }
}
