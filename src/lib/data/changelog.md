# ChatLounge Changelog

## 20 Oct, 2025

Added image upload support to ChatLounge! 🎉 You can now send images in your conversations with AI models that support vision capabilities.

**Key Features:**

- **Multiple upload methods**: Attach images using the upload button or simply paste them directly into the chat input
- **Supported formats**: PNG, JPEG, JPG, GIF, and WebP (up to 5MB per image)
- **Image preview**: See thumbnails of your uploaded images before sending
- **Secure storage**: Images are stored in Cloudflare R2 with presigned URLs for security
- **Automatic cleanup**: When you delete a conversation, associated images are automatically removed from storage
- **Model filtering**: The upload button is only available for models that support image inputs

Simply look for the image upload button next to the chat input when using a vision-capable model like Claude, GPT-4O, or Gemini. Click to select files or paste an image directly into the input field!

## 19 Oct, 2025

We've completely redesigned the model selector to make it easier to find and choose models:

- **Provider-based organization**: Models are now grouped by provider (Anthropic, Google, Mistral, OpenAI, etc.) in alphabetical order, making it much easier to find the model you're looking for.
- **Searchable dropdown**: Added a search bar at the top of the model selector that filters models in real-time, perfect for quickly finding a specific model.
- **Deprecated model support**: Introduced a new deprecation system for models. When a model is deprecated:
  - It appears in a "Deprecated" submenu within its provider group
  - It's visually indicated with reduced opacity, strikethrough text, and a "(Deprecated)" label
  - It cannot be selected for new conversations, but existing conversations using deprecated models will continue to work
  - Agents with deprecated preferred models will automatically have their preference cleared

This update ensures a smoother experience as the model landscape evolves, while preserving access to your existing conversations.

## 15 Oct, 2025

Added a [contact form](https://chatlounge.app/contact) so you can easily get in touch with us. Whether you have questions, feedback, or need support, we're here to help! You can find the link to the contact form in the footer of any page.

## 3 Oct, 2025

Added experimental support for tool calling for models that support this functionality. The tools currently available are a web search tool using the [Exa.ai](https://exa.ai/) API and a simple tool for fetching the current time. You don't need to take any special action to use the tools; if the model decides to use a tool, it will do so automatically, and you can of course prompt the model directly, e.g. "use the web search tool". Note that tool usage is still experimental and may not work perfectly in all cases.

## 27 Sep, 2025

Added a new section to the settings page for managing base instructions (custom system prompt). You can enable or disable the use of base instructions, view a summary of the default ones, and add your own custom instructions if desired. This allows you to set a consistent tone and style for all your AI interactions.

We also took the opportunity to revamp the API keys section, turning the repetitive sections for each provider into a more compact and user-friendly component. This should make it easier to manage your API keys and see which providers are configured.

## 16 Sep, 2025

Introduced a new core system prompt that defines the AI's writing style as direct and avoids the "not X, but Y" rhetorical cliché. This change aims to enhance the sophistication of the AI's communication by eliminating weak, formulaic phrasing. The core instructions are now included in all agent prompts to ensure consistent adherence to this style across conversations.

## 4 Sep, 2025

Added a "New Conversation" option to the folder page, allowing you to start a new conversation directly within a folder. This will automatically add the new conversation to the current folder, making it easier to organize your chats from the outset. Likewise, added a "New Conversation in Folder" option to the agent actions menu, enabling you to start a new conversation with a specific agent and have it placed in the desired folder right away.

## 24 Aug, 2025

Added a "thinking" toggle to the chat input for supported models. This is available for hybrid reasoning models that support both a thinking mode and a direct response mode, such as Claude Sonnet 4, Opus 4, and DeepSeek V3.1. When enabled, the model will first "think" (i.e., generate reasoning content) before providing a final answer.

## 22 Aug, 2025

Added a feature to fork agents. You can now create a private copy of an existing public agent, allowing you to modify the agent without affecting the original. This is useful for experimenting with different configurations or creating variations of an agent.

## 21 Aug, 2025

Added bulk actions. You can now select multiple conversations, agents, or folders, and perform actions on them, such as deleting, pinning, or moving to a folder.

## 20 Aug, 2025

Major infrastructure update migrating to AI SDK v5 with several improvements and fixes:

- **AI SDK v5 Migration**: Upgraded the entire AI system to use AI SDK v5, bringing improved performance and better support for modern AI features including structured message handling with content parts.
- **Enhanced Reasoning Display**: Improved how reasoning/thinking content is displayed for models that support it, with better formatting and conditional visibility.
- **OpenRouter Integration**: Switched to using the dedicated OpenRouter provider package instead of the OpenAI SDK for better compatibility and features.

This update includes significant under-the-hood changes that improve the overall stability and future-proofing of the application. Please report any issues you encounter after this update.

## 12 Aug, 2025

Added a verbosity option to characters to control how much they say in response to user messages. This allows you to create characters that are more concise or more verbose, depending on your needs. The verbosity option can be set when creating or editing a character.

## 9 Aug, 2025

Added preferred model to agents. If you have an agent that works best with a specific model, you can now set that model as the preferred one. This will make it easier to use the agent without having to manually select the model each time. The preferred model will be used by default when starting a new conversation with the agent.

## 7 Aug, 2025

We've made several minor user experience and technical improvements in this update:

- Switched from OpenAI Whisper to ElevenLabs Scribe for speech-to-text transcription. This should improve transcription accuracy and performance. It also means that you no longer need an OpenAI key to use voice input, only an ElevenLabs key and your chosen LLM provider.
- Updated the getting started guide to include the providers we've added since the last update, making it easier for new users to set up their API keys and start chatting.
- Added agent type indicators and explanations to the agents page. This will help you understand the different types of agents available and how to use them effectively. Also added type explanations to the agent create dialog to help you choose the right type for your use case.

## 31 Jul, 2025

Added a model indicator to the message component. This shows which model generated the message, making it easier to identify the source of each response, especially when using multiple models in a conversation. The model indicator will appear next to the message if it was generated by a different model than the one currently selected for the conversation.

## 17 Jul, 2025

Improved full-text search across conversations, agents, and folders. The search now better handles multi-word queries by using a hybrid approach that prioritizes exact phrase matches while still supporting partial word matching. For example, searching for "professor higgins" will now find conversations containing that exact phrase first, while still finding conversations with both "professor" and "higgins" separately. Additionally, partial searches like "prof" will now match "professor" and other words starting with "prof".

## 16 Jul, 2025

Added support for OpenRouter. This gives us access to the vast library of models available on OpenRouter. For now, we've enabled [DeepSeek V3 03-24](https://openrouter.ai/deepseek/deepseek-chat-v3-0324) and [Venice Uncensored](https://openrouter.ai/cognitivecomputations/dolphin-mistral-24b-venice-edition), but we expect to add more in the future. Feel free to suggest new models. As usual, you can set your OpenRouter API key on the settings page and start chatting with the new models right away!

## 7 Jul, 2025

Added support for XAI's Grok 3 and Grok 3 Mini models. As usual, you can set your API key on the settings page and start chatting with Grok right away!

## 20 Jun, 2025

This is a big update with many changes across the app. Highlights include:

- Migrated to Svelte 5, bringing erformance improvements and future-proofing the app.
- Vastly improved TTS playback experience, fixing a long-standing issue where playback would stop and the UI state would be stuck on "generating" if the file was too long.
- Added a new title generator agent for better, more relevant, and spoiler-free conversation titles (especially for story-writing agents).
- Redesigned the voices page.

**Known issues:**

- The edit agent dialog will sometimes not receive focus automatically. When this happens, you can find the dialog manually at the bottom of the page and click on it.

Please let us know if you encounter any other issues or have any feedback on the new features. Enjoy! 🚀

## 11 Jun, 2025

A small update replacing the soon-to-be-deprecated Gemini 2.5 Pro Preview model with the newer June version. Also added a sound effect when the AI response starts streaming in, useful for reasoning models that can take some time to "think" before responding.

## 29 May, 2025

Added support for the new Claude 4 family of models from Anthropic.

## 21 May, 2025

Added a follow-up suggestions feature. If you're not sure where to take the conversation next, you can now ask the AI for three possible follow-up questions or next steps. Clicking on one of the suggestions will insert it into the chat input, ready for you to edit it or just send it as-is. Enjoy!

## 16 May, 2025

Fixed a long-standing bug where the chat input would sometimes be unresponsive when switching between conversations or agents.

## 30 Apr, 2025

Added voice settings to the advanced TTS settings dialog. You can now adjust the speed, stability, and other ElevenLabs settings for the selected voice.

Also added a sorting panel to the conversations, agents, and folders pages.

## 29 Apr, 2025

The conversation import eature is now out of beta. Also added a load all messages button alongside the load more button.

## 16 Mar, 2025

Added folders. You can now organize your conversations into folders, making it easier to find and manage them. Start by creating a new folder on the folders page. You can then add conversations to the folder by clicking the "Add to folder" button in the conversation menu. Hope you enjoy the new feature! 🚀

## 6 Feb, 2025

Added support for Google's new Gemini 2.0 Flash model. You can set your Google API key in the settings page and start chatting with Gemini 2.0 Flash right away!

## 2 Feb, 2025

Added the ability to pin conversations to the top of the list, making them easier to find. You can pin a conversation by clicking the "Pin to top" option in the conversation menu. Also added support for OpenAI's reasoning models: O3 Mini, O1, and O1 Mini. Enjoy! 🚀

## 25 Jan, 2025

Added the ability to edit a message without regenerating the AI's response. This is useful for fixing typos and other minor edits.

## 17 Jan, 2025

Fixed public pages, like shared conversations, so they're actually, you know, public. Whoops. 😅

## 1 Jan, 2025

Added support for Anthropic's Claude 3.5 family of models. You can set your API key in the settings page and start chatting with Anthropic models right away! Happy New Year!

## 29 Dec, 2024

We now only load the most recent 20 messages when you navigate to a conversation. This will improve performance for long threads. You can load older messages by clicking the "load more" button at the top of the chat list. We've also fixed a bug where the search query for conversations was not working correctly.

## 24 Dec, 2024

Shared conversations are here! 🎉 You can now share conversations with other users. Just click the Share button in the conversation menu, and the share link will be copied to your clipboard. You can then share the link with anyone you want. Anyone with the link will be able to continue the conversation from where you left off (each user will have their own, separate copy of the conversation). Note that shared conversations do not update as you add new messages to the original conversation, i.e. they are fixed at the point of creation. This will be addressed in a future update, but for now you can unshare and reshare the conversation to update it.

You can view conversations you've shared in the new My shared conversations page, which you can access from the user dropdown menu.

We hope you enjoy the new updates. Let us know if you have any feedback or suggestions! Merry Christmas! 🎅

## 12 Dec, 2024

Fixed a bug where the greeting message remained even if deleted.

## 1 Dec, 2024

We've added a rewind conversation feature. This allows you to rewind the conversation to a specific message, deleting all messages beyond that point. Also, you can now send an empty message and the AI will continue the conversation from that point.

## 25 Nov, 2024

This release brings some major, though mostly under-the-hood, changes to the app.

- Migrated the app to a self-hosted server and a local database. In practice, this should make the app feel much snappier in many cases. As this is a major change, please let us know if you encounter any issues.
- Added a feature to import a chat. This requires a JSON file structured like the one exported by the app. The import will be queued and processed in the background, though in most cases it will take only a few seconds to complete. You can check the progress of the import in the conversations page. This feature is still in beta and may have some issues, so please report any problems you encounter.
- The language model is no longer locked in once you start a conversation. You can now switch between models at any time, and the conversation will continue using the new model. This should make it easier to experiment with different models and see how they perform.
- Updated GPT 4O to the latest snapshot, 2024-11-20.

## 7 Nov, 2024

Added an option to export a chat as JSON and fixed an issue with model selection.

## 4 Nov, 2024

Added basic support for characters. Characters are another type of agent optimised for chatting with characters, real or fictional. You can create a character just like a standard agent, but with a few additional features. The greeting field allows you to add an initial message that will be used as the first message in any new chat with the character. Also, you can use the {{user}} and {{char}} placeholders in your instructions to refer to the user and the character, respectively. These will automatically be replaced with the appropriate names when the character is used in a chat. We expect to add more features to characters in the future, so don't hesitate to let us know if you have any suggestions!

In addition, we've added a feature to export chats as plain text, allowing you to easily share your conversations with others. Simply click the "Export chat" button in the chat window to download a text file containing all the messages in the conversation. Enjoy! 🚀

## 4 Sep, 2024

Per user request, we now remove any code blocks from the text before generating TTS.

## 15 Aug, 2024

Fixed a bug where editing a message other than the last one in a conversation would result in strange behaviour, such as the new message being appended to the end of the conversation instead of replacing the old message.

## 13 Aug, 2024

We've added a new page where you can freely generate speech with your own text using ElevenLabs without being tied to a conversation with a language model.

## 11 Aug, 2024

We've added an advanced TTS settings dialog. For now, you can select the ElevenLabs model you wish to use. Turbo V2 is still the default if you don't select a different model, but when you do, your selection is remembered until you change it. More options coming soon. Happy chatting!

## 10 Aug, 2024

We've rolled out a potential fix for the issue where the Google provider occasionally does not generate a conversation title.

## 7 Aug, 2024

We've added a TTS history page. You can now play, download, and delete TTS history items. You can find the page in the new TTS section of the navigation menu. Enjoy!

## 1 Aug, 2024

We removed the soon-to-be-deprecated Mistral AI models, mistral-small and mistral-medium, and added the new gpt-4o-mini model. We also fixed a few bugs related to deleting conversations and agents. In addition, we added a popup that notifies you when the app has been updated.

On a side note, ElevenLabs recently released their new Turbo v2.5 model. However, after careful evaluation, we've decided not to switch to it by default as it actually makes some voices sound worse. We'll keep the Turbo v2 model for now, but we'll add a setting to switch between models in the future.

## 12 Jun, 2024

We've added support for Google's Gemini models, specifically Gemini 1.5 Flash and Gemini 1.5 Pro. You can set your Google API key in the settings page just like the other providers. Note that, if you're in Europe, you'll need to have a paid account to use the Gemini models. Happy chatting! 🚀

## 2 Jun, 2024

We've added agent sharing to ChatLounge. You can now share agents with other users, allowing them to use your agent in their conversations. You can make your agents visible to all users or shareable by a link. We've also fixed some bugs around creating new conversations and TTS. Enjoy!

## 1 May, 2024

This release brings the long-awaited conversation history feature. You can now view and search your past conversations with the AI. The agents page has also received a facelift, making it easier to manage your agents. We've also added a new keyboard shortcut, Shift + Escape, to focus the chat input. In addition, we've made several improvements and bug fixes to enhance your ChatLounge experience, including a general performance boost. Happy chatting! 🚀

## 7 Apr, 2024

- Added agents. You can now create custom AI agents with specific personalities and characteristics. Support for agent sharing is coming soon.

## 3 Apr, 2024

- OpenAI support is in. You can now chat with OpenAI's GPT-3.5 Turbo, GPT-4, and GPT-4 Turbo models.

## 2 Apr, 2024

- Added a getting started guide to help new users set up their API keys and start chatting with the AI.
- Added a button to reset the conversation.

## 24 Mar, 2024

- Added a hotkey to toggle recording: `Ctrl + Shift + S`.
- Fixed audio transcription issue.

## 23 Mar, 2024

- Added the ability to have voice conversations with the AI. This completes the original vision of the project.

## 21 Mar, 2024

- Migrated to a different database system for better performance.

## 19 Mar, 2024

- Improved the default filename of generated audio files. We now use the AI-generated text as the basis for the filename.
- Fixed a bug where TTS would not work on Firefox. We fall back to non-streaming TTS in this case, which will be slower but still functional.
- Fixed a bug where pressing enter in the chat input would not send the message in Firefox.

## 16 Mar, 2024

- Added the ability to select a model and voice for the AI to use. This allows for customisation of the AI's voice and behaviour.
- We now show a loading spinner when TTS is being generated.
- We now show toast notifications for TTS-related errors.

## 15 Mar, 2024

- Added a button to copy code blocks to the clipboard.
- Added a confirmation dialog when deleting a voice.
- Added an error message when the chat API fails to respond.

## 12 Mar, 2024

- Added the ability to download generated audio files.
- Added settings page where you can set your API keys.
- Added voices page where you can manage your ElevenLabs voices.
- Added the ability to copy messages to the clipboard.

## 25 Feb, 2024

- Initial, rough version of ChatLounge. This version only supports text input and output.
