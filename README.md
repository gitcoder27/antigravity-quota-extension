# Antigravity Quota Monitor 🚀

**Antigravity Quota Monitor** is a premium VS Code extension designed to provide real-time visibility into your AI model usage quotas. Built with a "World-Class" dark UI, it brings a sleek, aesthetic experience to monitoring your developer resources.

![Antigravity Quota Mockup](https://raw.githubusercontent.com/gitcoder27/antigravity-quota-extension/main/assets/mockup.png)
*(Note: Mockup shown for illustrative purposes)*

## ✨ Features

- 💎 **Modern Dark UI**: Glassmorphism-inspired design with neon progress indicators.
- 📊 **Hero Gauges**: Circular progress gauges for your most-used "Hero" models.
- 💳 **Credit Tracking**: Real-time monitoring of Prompt and Flow credits.
- 🕒 **Reset Countdown**: Dynamic calculation of when your quotas will refresh.
- ⚙️ **Customizable**: Choose which models appear in your hero section via settings.
- 🔄 **One-Click Refresh**: Quickly fetch the latest data from the Antigravity API.

## 🚀 Installation

1. Open **VS Code**.
2. Go to the **Extensions** view (`Ctrl+Shift+X`).
3. Search for `Antigravity Quota Monitor`.
4. Click **Install**.
5. Restart VS Code if prompted.

## 🛠 Usage

### Quota Sidebar
Access the **Antigravity Quota** icon in the Activity Bar to see a high-level overview of your usage:
- **Hero Models**: Top three chosen models displayed as circular gauges.
- **AI Credits**: Bar charts for Prompt and Flow credits.
- **Model List**: Detailed list of all other available models with reset times.

### Commands
- `Shift + Cmd + P` -> `Antigravity Quota: Refresh Quotas`
- `Shift + Cmd + P` -> `Antigravity Quota: Show Quota Details`

## ⚙️ Configuration

You can customize the **Hero Models** section by navigating to `Settings` -> `Extensions` -> `Antigravity Quota Monitor`:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `antigravityQuota.heroModel1` | String | Claude Opus 4.5 (Thinking) | Primary model gauge |
| `antigravityQuota.heroModel2` | String | Gemini 3 Pro (High) | Secondary model gauge |
| `antigravityQuota.heroModel3` | String | Gemini 3 Flash | Tertiary model gauge |

## 🛠 Development

### Prerequisites
- Node.js (v18+)
- VS Code

### Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/gitcoder27/antigravity-quota-extension.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Open in VS Code:
   ```bash
   code .
   ```
4. Press `F5` to start a new Extension Development Host window.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*Crafted with ❤️ by [ayansaha](https://github.com/gitcoder27)*
