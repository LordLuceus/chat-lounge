## Bugfixes

- [ ] Fix bug with editing a message that is not the last message in the conversation.
- [ ] Fix bug where typing in the chat input does not work when switching between conversations or agents.

## Conversations:

- [x] CRITICAL: Fix the bug where continuing a conversation with a new message does not work in the case when we have just navigated to a newly saved conversation (using pushState). This is likely a store sync issue.
- [x] Make it work with agents. Add a route /agents/:id/conversations/:id
- [x] Check what happens if we stop the generation before it finishes.
- [x] Make it work when there are multiple responses from the AI. Add parentId column to message and display a choices UI if there are multiple children.
- [x] Allow user to reset the thread at a certain point. Delete all messages after that point. (In fact, we do not need to delete all the messages; setting the parent id of the new message to the same as the parent id of the message we are resetting to will be enough. This way, we can keep the history of the conversation.)
- [x] Add rename and delete conversation options.
- [x] Make a proper conversation list page.
- [x] If the thread is too long for the token limit (90%?), generate a summary to send to the AI. We still save the full thread in the database and display it to the user.

## General

- [ ] Update models: add gpt-4o-mini, remove mistral-small and mistral-medium.
- [x] Refactor the Mistral and OpenAI services to use a common interface.
- [x] Make the agents list at the top dynamic with Query just like the conversations list.
- [x] Always show the current agent and conversation at the top of the page. (Done with infiniteQuery.)
- [ ] Add preferred model and voice to agents.
- [ ] Add ability to pin agents and conversations to the top of the list.
- [x] Cache voices because they don't change often and there's no need to call the ElevenLabs API every time we change a page. This will also make the app faster. We can use Query.
- [ ] Add custom instructions.
- [x] Use the user's API key for title generation.
- [x] Add agent sharing.

## TTS

- [x] Strip special characters from the text before sending it to the TTS service.
- [ ] Add a TTS history page.
- [ ] Add advanced TTS options.
- [ ] Add a way to create and edit voices.

## Long term

- [ ] Implement conversation sharing.
- [ ] Add a way to talk to other agents in the same conversation.
- [ ] Add multi-user conversation support.
- [ ] Add image, audio, and video support.
- [ ] Add internet search support.
