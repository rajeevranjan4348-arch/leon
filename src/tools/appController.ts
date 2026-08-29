import { appController, AppControllerArgs, ToolResult } from '@/controllers/appController';

export const APP_CONTROLLER_TOOL_NAME = "app_controller";

export const APP_CONTROLLER_TOOL_SCHEMA = {
  name: APP_CONTROLLER_TOOL_NAME,
  description: "Controls the application UI, active panel/tab, settings, history, chat selection, sidebar, voice mode, and chat scrolling.",
  parameters: {
    type: "OBJECT",
    properties: {
      action: {
        type: "STRING",
        enum: [
          "switch_tab",
          "open_panel",
          "close_panel",
          "toggle_panel",
          "open_settings",
          "open_history",
          "start_new_chat",
          "select_chat",
          "rename_chat",
          "delete_chat",
          "pin_chat",
          "unpin_chat",
          "scroll_chat",
          "focus_input",
          "clear_input",
          "toggle_sidebar",
          "toggle_voice",
          "stop_voice"
        ],
        description: "The application controller action to perform."
      },
      target: {
        type: "STRING",
        description: "Target panel, feature, or element (e.g., 'history', 'contact-feedback', 'settings', 'chat', 'discover', 'maps', 'images')."
      },
      value: {
        type: "STRING",
        description: "Value or direction parameter (e.g. 'up', 'down', new title string, boolean toggle)."
      },
      chatId: {
        type: "STRING",
        description: "Conversation thread ID for select_chat, rename_chat, delete_chat, pin_chat, unpin_chat."
      },
      tab: {
        type: "STRING",
        description: "Tab identifier for switch_tab action."
      }
    },
    required: ["action"]
  }
};

export async function executeAppControllerTool(args: AppControllerArgs): Promise<ToolResult> {
  return await appController.execute(args);
}
