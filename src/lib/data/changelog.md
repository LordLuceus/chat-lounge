# ChatLounge Changelog

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
