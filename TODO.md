## Conversations:

- [x] Make it work with agents. Add a route /agents/:id/conversations/:id
- [x] Check what happens if we stop the generation before it finishes.
- [ ] Make it work when there are multiple responses from the AI. Add parentId column to message and display a choices UI if there are multiple children.
- [ ] Allow user to reset the thread at a certain point. Delete all messages after that point.
- [ ] Add rename and delete conversation options.
- [ ] Make a proper conversation list page.
- [ ] If the thread is too long for the token limit (90%?), generate a summary to send to the AI. We still save the full thread in the database and display it to the user.

## General

- [x] Refactor the Mistral and OpenAI services to use a common interface.
- [ ] Make the agents list at the top dynamic with Query just like the conversations list.
- [ ] Add preferred model and voice to agents.
- [ ] Add ability to pin agents and conversations to the top of the list.
- [ ] Cache voices because they don't change often and there's no need to call the ElevenLabs API every time we change a page. This will also make the app faster. We can use Query.

## TTS

- [ ] Add a TTS history page.
- [ ] Add advanced TTS options.
- [ ] Add a way to create and edit voices.

## Long term

- [ ] Implement agent and conversation sharing.
- [ ] Add a way to talk to other agents in the same conversation.
- [ ] Add multi-user conversation support.
- [ ] Add image support.
