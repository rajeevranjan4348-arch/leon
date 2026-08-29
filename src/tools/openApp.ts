import { appController, ToolResult } from '@/controllers/appController';

export const OPEN_APP_TOOL_NAME = "open_app";

export const OPEN_APP_TOOL_SCHEMA = {
  name: OPEN_APP_TOOL_NAME,
  description: "Open an installed Android application directly on the user's device.",
  parameters: {
    type: "OBJECT",
    properties: {
      app_name: {
        type: "STRING",
        description: "The name of the installed application to open (e.g., 'WhatsApp', 'Instagram', 'YouTube', 'Chrome', 'Telegram', 'Settings', 'Camera', 'Calculator').",
      },
      appName: {
        type: "STRING",
        description: "Alternate parameter for the application name to open.",
      },
    },
    required: ["app_name"],
  },
};

export async function executeOpenAppTool(args: { app_name?: string; appName?: string; target?: string; package_name?: string; packageName?: string }): Promise<ToolResult> {
  const targetApp = args.app_name || args.appName || args.package_name || args.packageName || args.target || '';
  return await appController.execute({
    action: 'open_app',
    target: targetApp,
    appName: targetApp,
  });
}
