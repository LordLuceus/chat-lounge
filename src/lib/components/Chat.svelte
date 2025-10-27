<script lang="ts">
  import { browser } from "$app/environment";
  import { afterNavigate, goto } from "$app/navigation";
  import { page } from "$app/state";
  import Message from "$lib/components/Message.svelte";
  import ModelSelector from "$lib/components/ModelSelector.svelte";
  import Recorder from "$lib/components/Recorder.svelte";
  import TtsSettings from "$lib/components/TtsSettings.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Textarea } from "$lib/components/ui/textarea";
  import { Toggle } from "$lib/components/ui/toggle";
  import { formatMessageContent, getMessageSiblings } from "$lib/helpers";
  import type { ApiKeyMap } from "$lib/helpers/api-key-utils";
  import type { ConversationWithMessageMap } from "$lib/server/conversations-service";
  import {
    audioFilename,
    conversationStore,
    currentAudioUrl,
    downloadUrl,
    newConversation,
    selectedTtsModel,
    selectedVoice,
    ttsProps,
    voices
  } from "$lib/stores";
  import { type DBMessage, ReasoningType } from "$lib/types/db";
  import { ModelID } from "$lib/types/elevenlabs";
  import { Chat } from "@ai-sdk/svelte";
  import type { AIProvider } from "@prisma/client";
  import { createMutation, useQueryClient } from "@tanstack/svelte-query";
  import {
    DefaultChatTransport,
    type FileUIPart,
    type UIDataTypes,
    type UIMessagePart,
    type UITools
  } from "ai";
  import { PersistedState } from "runed";
  import { onDestroy, onMount, tick } from "svelte";
  import { toast } from "svelte-sonner";
  import { v4 as uuidv4 } from "uuid";

  interface ModelData {
    id: string;
    name: string;
    reasoningType: ReasoningType;
    deprecated: boolean;
    supportsImages: boolean;
  }

  interface ProviderGroup {
    provider: AIProvider;
    models: ModelData[];
    deprecatedModels: ModelData[];
  }

  interface Props {
    agent?: { id: string; name: string } | undefined;
    apiKeys: ApiKeyMap | undefined;
    modelGroups: ProviderGroup[] | undefined;
    selectedModelId?: string | undefined;
    initialMessages?: DBMessage[] | undefined;
    folderId?: string | undefined;
  }

  let {
    agent = undefined,
    apiKeys,
    modelGroups,
    selectedModelId = $bindable(undefined),
    initialMessages = undefined,
    folderId = undefined
  }: Props = $props();

  let chatForm: HTMLFormElement | null = $state(null);
  let startSound: HTMLAudioElement;
  let finishSound: HTMLAudioElement;
  let voiceMessage: string | null = $state(null);

  // The thinking parameter we send to the API
  let thinking = $state(false);

  // Persisted thinking mode setting for hybrid models
  const thinkingMode = new PersistedState<boolean>("thinkingMode", false);

  // Find selected model details
  const selectedModel = $derived(() => {
    if (!selectedModelId || !modelGroups) return null;
    for (const group of modelGroups) {
      const model = [...group.models, ...group.deprecatedModels].find(
        (m) => m.id === selectedModelId
      );
      if (model) return model;
    }
    return null;
  });

  $effect(() => {
    const model = selectedModel();
    switch (model?.reasoningType) {
      case ReasoningType.None:
        thinking = false;
        break;
      case ReasoningType.Full:
        thinking = true;
        break;
      case ReasoningType.Hybrid:
        thinking = thinkingMode.current;
        break;
      default:
        thinking = false;
        break;
    }
  });

  let controller: AbortController;
  let signal: AbortSignal;

  const initialMessageCount = 20;
  let visibleMessageCount = $state(initialMessageCount);
  let chatInput = $state("");

  // File upload state
  interface AttachedFile {
    id: string;
    mediaType: string;
    dataUrl: string; // Temporary preview only
    key: string; // R2 key - what gets stored in DB
    url: string; // 24h presigned URL for AI
    filename: string;
    uploading?: boolean;
  }
  let attachedFiles = $state<AttachedFile[]>([]);
  let fileInputRef: HTMLInputElement | null = $state(null);

  // Track storage parts for each message (for conversation creation)
  let messageStorageParts = $state<
    Map<string, Array<{ type: "file"; key: string; mediaType: string; filename: string }>>
  >(new Map());

  const client = useQueryClient();

  const createConversationMutation = createMutation<ConversationWithMessageMap>(() => ({
    mutationFn: async () => {
      // Process messages to replace file URLs with R2 keys
      const processedMessages = chat.messages.map((msg, index) => {
        const storageParts = messageStorageParts.get(index.toString());

        if (!storageParts || !msg.parts) return msg;

        // Replace file URLs with R2 keys in message parts
        const updatedParts = msg.parts.map((part) => {
          if (part.type === "file" && "url" in part) {
            // Find matching storage part by filename
            const storagePart = storageParts.find((sp) => {
              const filename = sp.key.split("/").pop();
              return part.filename === filename || part.url?.includes(filename || "");
            });
            if (storagePart) {
              return storagePart;
            }
          }
          return part;
        });

        return { ...msg, parts: updatedParts };
      });

      const response = await fetch("/api/conversations", {
        method: "POST",
        body: JSON.stringify({
          agentId: agent?.id,
          modelId: selectedModelId,
          messages: processedMessages,
          folderId: folderId
        })
      });

      // Clear tracked storage parts after conversation is created
      messageStorageParts.clear();

      return response.json();
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["conversations"] });
      client.invalidateQueries({ queryKey: ["agents"] });
    }
  }));

  const chat = new Chat({
    onFinish: async ({ message }) => {
      if (voiceMessage) {
        ttsProps.set({
          text: formatMessageContent(message.parts),
          voice: $selectedVoice?.value,
          signal,
          modelId: $selectedTtsModel?.value || ModelID.ElevenTurboV2
        });
        setVoiceMessage("");
      } else {
        finishSound.play();
      }

      if (!$conversationStore && chat.status !== "error") {
        createConversationMutation.mutate(undefined, {
          onSuccess: async (data) => {
            if (data.id) {
              newConversation.set(true);
              await goto(`${agent?.id ? "/agents/" + agent.id : ""}/conversations/${data.id}`, {
                keepFocus: true,
                noScroll: true
              });
              newConversation.set(false);
            }
          }
        });
      } else if ($conversationStore && chat.status !== "error")
        client.invalidateQueries({ queryKey: ["conversations"] });
    },
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: "/api/chat" })
  });

  const visibleMessages = $derived(chat.messages.slice(-visibleMessageCount));

  let followups: string[] = $state([]);
  const followupsMutation = createMutation<string[]>(() => ({
    mutationFn: async () =>
      (
        await fetch(`/api/conversations/${$conversationStore?.id}/followups`, {
          method: "POST"
        })
      ).json(),
    onSuccess: (data) => (followups = data),
    onError: () => toast.error("Failed to load follow-up suggestions.")
  }));

  function loadMoreMessages() {
    const newVisibleCount = visibleMessageCount + 20;
    visibleMessageCount = Math.min(newVisibleCount, chat.messages.length);
  }

  function loadAllMessages() {
    visibleMessageCount = chat.messages.length;
  }

  function handleMessageSubmit(event: KeyboardEvent) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!chatForm) return;
      chatForm.requestSubmit();
    }
  }

  function handleFocusChatInput(event: KeyboardEvent) {
    if (event.key === "Escape" && event.shiftKey) {
      event.preventDefault();
      focusChatInput();
    }
  }

  function focusChatInput() {
    if ($newConversation) return;
    if (!chatForm) return;
    const chatInput = chatForm.querySelector("textarea") as HTMLTextAreaElement;
    if (!chatInput) return;
    setTimeout(() => {
      chatInput.focus();
    }, 0);
  }

  async function copyLastMessage() {
    if (!chat.messages) return;
    const lastMessage = chat.messages.at(-1);
    if (lastMessage?.role !== "assistant") return;
    await navigator.clipboard.writeText(formatMessageContent(lastMessage.parts));
    toast.success("Last message copied to clipboard.");
  }

  function handleCopyLastMessage(event: KeyboardEvent) {
    if (event.ctrlKey && event.shiftKey && event.key === "C") {
      event.preventDefault();
      copyLastMessage();
    }
  }

  // File upload handlers
  async function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);

    for (const file of files) {
      // Validate size
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 5MB limit`);
        continue;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const id = crypto.randomUUID();
        const dataUrl = e.target?.result as string;
        attachedFiles.push({
          id,
          mediaType: file.type,
          dataUrl, // For preview only
          key: "", // Will be filled after upload
          url: "", // Will be filled after upload
          filename: file.name,
          uploading: true
        });

        // Upload to R2 for storage
        uploadFile(id, dataUrl, file.name);
      };
      reader.readAsDataURL(file);
    }

    // Reset input
    if (input) input.value = "";
  }

  async function uploadFile(fileId: string, dataUrl: string, filename: string) {
    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl, filename })
      });

      if (!response.ok) throw new Error("Upload failed");

      const { key, url } = await response.json();

      // Update file with R2 key and presigned URL
      attachedFiles = attachedFiles.map((f) =>
        f.id === fileId ? { ...f, key, url, uploading: false } : f
      );
    } catch (err) {
      toast.error(`Failed to upload ${filename}`);
      removeFile(fileId);
    }
  }

  function removeFile(fileId: string) {
    attachedFiles = attachedFiles.filter((f) => f.id !== fileId);
  }

  async function handlePaste(event: ClipboardEvent) {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        event.preventDefault();
        const file = item.getAsFile();
        if (file) {
          // Reuse file select logic
          const reader = new FileReader();
          reader.onload = (e) => {
            const id = crypto.randomUUID();
            const dataUrl = e.target?.result as string;
            const filename = `pasted-${Date.now()}.png`;
            attachedFiles.push({
              id,
              mediaType: file.type,
              dataUrl,
              key: "",
              url: "",
              filename,
              uploading: true
            });
            uploadFile(id, dataUrl, filename);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  }

  onMount(() => {
    focusChatInput();
    startSound = new Audio("/assets/begin.mp3");
    finishSound = new Audio("/assets/typing.wav");

    handleModelSelection();

    controller = new AbortController();
    signal = controller.signal;
  });

  onDestroy(() => {
    if (browser) {
      if (startSound) {
        startSound.pause();
        startSound.remove();
      }
      if (finishSound) {
        finishSound.pause();
        finishSound.remove();
      }

      if (!$newConversation) resetAudio();
      conversationStore.set(null);
    }
  });

  function handleModelSelection() {
    if (!selectedModelId && modelGroups) {
      const storedModelId = localStorage.getItem("selectedModelId");
      if (storedModelId) {
        // Check if stored model exists in current modelGroups
        const modelExists = modelGroups.some((group) =>
          [...group.models, ...group.deprecatedModels].some((m) => m.id === storedModelId)
        );
        if (modelExists) {
          selectedModelId = storedModelId;
        } else {
          // Default to first model
          selectedModelId = modelGroups[0]?.models[0]?.id;
        }
      } else {
        // Default to first model
        selectedModelId = modelGroups[0]?.models[0]?.id;
      }
    }
  }

  function handleModelSelect(modelId: string) {
    selectedModelId = modelId;
    localStorage.setItem("selectedModelId", modelId);
  }

  function setVoiceMessage(message: string) {
    voiceMessage = message;
  }

  function resetAudio() {
    ttsProps.set(null);
    currentAudioUrl.set(null);
    downloadUrl.set("");
    audioFilename.set("");
    controller?.abort();

    controller = new AbortController();
    signal = controller.signal;
  }

  $effect(() => {
    if (voiceMessage) {
      chat.sendMessage(
        { text: voiceMessage },
        {
          body: {
            modelId: selectedModelId,
            agentId: agent?.id,
            conversationId: $conversationStore?.id,
            thinking
          }
        }
      );
    }
  });

  function resetConversation() {
    chat.messages = initialMessages || [];
    resetAudio();
    handleModelSelection();

    if (page.url.pathname === "/") {
      conversationStore.set(null);
    }
  }

  afterNavigate(async () => {
    if (!$newConversation) resetConversation();
    followups = [];
    await tick();
    focusChatInput();
  });

  $effect(() => {
    if (initialMessages) {
      chat.messages = initialMessages;
    }
  });

  async function handleEdit(
    id: string,
    parts: UIMessagePart<UIDataTypes, UITools>[],
    regenerate: boolean = true
  ) {
    const messageIndex = chat.messages.findIndex((message) => message.id === id);

    if (messageIndex === -1) return;

    const message = chat.messages[messageIndex];

    const updatedMessages = chat.messages.slice(0, messageIndex);

    const editedMessage = {
      ...message,
      parts,
      id: regenerate ? uuidv4() : id
    };
    updatedMessages.push(editedMessage);

    chat.messages = updatedMessages;

    await tick();

    if (regenerate) {
      chat.regenerate({
        body: {
          modelId: selectedModelId,
          agentId: agent?.id,
          conversationId: $conversationStore?.id,
          editedMessageId: id,
          thinking
        }
      });
    } else {
      const res = await fetch(`/api/conversations/${$conversationStore?.id}/messages/${id}`, {
        method: "PUT",
        body: JSON.stringify({ parts })
      });

      if (!res.ok) {
        toast.error("Failed to update message.");
      }

      client.invalidateQueries({ queryKey: ["conversations"] });
    }
  }

  function importConversation() {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.style.display = "none"; // Optionally hide the input element
    fileInput.accept = "application/json";

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];

      if (!file) return;

      const reader = new FileReader();

      reader.onload = async (event) => {
        const json = event.target?.result as string;
        const data = JSON.parse(json);
        const modelId = selectedModelId;

        if (!modelId || !json) return;

        try {
          const response = await fetch(`/api/conversations/import`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ data, modelId })
          });

          if (response.ok) {
            const conversation = await response.json();
            client.invalidateQueries({ queryKey: ["conversations"] });
            await goto(
              `${conversation.agentId ? "/agents/" + conversation.agentId : ""}/conversations/${conversation.id}`
            );
          } else {
            toast.error("Failed to import conversation.");
          }
        } catch (error) {
          console.error("Error importing conversation:", error);
        }
      };

      reader.readAsText(file); // Start reading the file once it's selected
    });

    fileInput.click();
  }

  $effect(() => {
    if (chat.status === "streaming" && !voiceMessage) {
      startSound.play();
    }
  });
</script>

<svelte:window
  onkeydown={(e) => {
    handleFocusChatInput(e);
    handleCopyLastMessage(e);
  }}
/>

<ModelSelector modelGroups={modelGroups || []} bind:selectedModelId onSelect={handleModelSelect} />

{#if apiKeys?.elevenlabs && $voices}
  <TtsSettings />
{/if}

<section>
  <div class="chat-list">
    {#if visibleMessageCount < chat.messages.length}
      <div class="load-buttons mb-2 flex space-x-2">
        <Button
          class="load-more-button"
          onclick={loadMoreMessages}
          aria-label="Load previous messages"
        >
          Load More Messages
        </Button>
        <Button class="load-all-button" onclick={loadAllMessages} aria-label="Load all messages">
          Load All Messages
        </Button>
      </div>
    {/if}

    {#each visibleMessages as message (message.id)}
      <Message
        {message}
        siblings={getMessageSiblings($conversationStore?.messages, message.id)}
        onEdit={handleEdit}
        isLoading={chat.status === "streaming" || chat.status === "submitted"}
        isLastMessage={message.id === chat.messages.at(-1)?.id}
      />
    {/each}
  </div>
  <div class="chat-actions flex space-x-2">
    {#if chat.status === "streaming" || chat.status === "submitted"}
      <Button onclick={chat.stop}>Stop generating</Button>
    {/if}
    {#if chat.messages.length > 1 && chat.messages.at(-1)?.role === "assistant" && chat.status !== "streaming" && chat.status !== "submitted"}
      <Button
        onclick={() => {
          followups = [];
          chat.regenerate({
            body: {
              modelId: selectedModelId,
              agentId: agent?.id,
              conversationId: $conversationStore?.id,
              regenerate: true,
              thinking
            }
          });
        }}>Regenerate</Button
      >
      <Button
        class="ml-2"
        onclick={() => followupsMutation.mutate()}
        disabled={followupsMutation.isPending}
      >
        {#if followupsMutation.isPending}
          Loading suggestions...
        {:else}
          Suggest Follow-ups
        {/if}
      </Button>
    {/if}
    {#if chat.status === "error"}
      <p class="error">There was an error while getting a response from the AI.</p>
      <p>{chat.error?.message}</p>
      <Button
        onclick={() =>
          chat.regenerate({
            body: {
              modelId: selectedModelId,
              agentId: agent?.id,
              conversationId: $conversationStore?.id,
              thinking
            }
          })}>Try again</Button
      >
    {/if}
  </div>

  {#if followups.length}
    <div class="sr-only" role="alert">
      <p>
        {followups.length} follow-up suggestion{followups.length > 1 ? "s" : ""} loaded.
      </p>
    </div>
    <div class="followup-suggestions mb-2 flex space-x-2">
      {#each followups as suggestion (suggestion)}
        <Button
          variant="outline"
          onclick={() => {
            chatInput = suggestion;
            focusChatInput();
          }}
        >
          {suggestion}
        </Button>
      {/each}
    </div>
  {/if}

  <form
    onsubmit={(e) => {
      e.preventDefault();

      // Check if any files are still uploading
      if (attachedFiles.some((f) => f.uploading)) {
        toast.error("Please wait for uploads to complete");
        return;
      }

      followups = [];

      // Build file parts for AI (using presigned URLs)
      const fileParts: FileUIPart[] = attachedFiles.map((file) => ({
        type: "file" as const,
        url: file.url, // 24h presigned URL for AI
        mediaType: file.mediaType,
        filename: file.filename
      }));

      // Build file parts for storage (R2 keys)
      const storageParts: Array<{
        type: "file";
        key: string;
        mediaType: string;
        filename: string;
      }> = attachedFiles.map((file) => ({
        type: "file" as const,
        key: file.key, // Store R2 key in DB
        mediaType: file.mediaType,
        filename: file.filename
      }));

      // Send message with files using new API
      chat.sendMessage(
        {
          text: chatInput,
          ...(fileParts.length > 0 && { files: fileParts })
        },
        {
          body: {
            modelId: selectedModelId,
            agentId: agent?.id,
            conversationId: $conversationStore?.id,
            thinking,
            // Pass storage parts so server can save R2 keys to DB
            storageParts: storageParts.length > 0 ? storageParts : undefined
          }
        }
      );

      // Track storage parts for this message (for new conversation creation)
      if (!$conversationStore && storageParts.length > 0) {
        // The message will be added to chat.messages, we need to track its storage parts
        // We'll use the message index as a temporary key
        const messageIndex = chat.messages.length - 1;
        messageStorageParts.set(messageIndex.toString(), storageParts);
      }

      chatInput = "";
      attachedFiles = [];
    }}
    bind:this={chatForm}
  >
    <!-- Hidden file input -->
    <input
      bind:this={fileInputRef}
      type="file"
      accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
      multiple
      style="display: none;"
      onchange={handleFileSelect}
    />

    <!-- Image preview section -->
    {#if attachedFiles.length > 0}
      <div class="attached-files mb-2 flex flex-wrap gap-2">
        {#each attachedFiles as file (file.id)}
          <div class="relative">
            <img src={file.dataUrl} alt={file.filename} class="h-20 w-20 rounded object-cover" />
            {#if file.uploading}
              <div
                class="absolute inset-0 flex items-center justify-center rounded bg-black bg-opacity-50"
              >
                <span class="text-xs text-white">Uploading...</span>
              </div>
            {/if}
            <button
              type="button"
              onclick={() => removeFile(file.id)}
              class="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
              aria-label="Remove {file.filename}"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clip-rule="evenodd"
                />
              </svg>
            </button>
          </div>
        {/each}
      </div>
    {/if}

    <div class="chat-input-container flex gap-2">
      {#if selectedModel()?.supportsImages !== false}
        <Button
          type="button"
          variant="outline"
          onclick={() => fileInputRef?.click()}
          disabled={chat.status === "streaming" || chat.status === "submitted"}
          aria-label="Attach images"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z"
              clip-rule="evenodd"
            />
          </svg>
        </Button>
      {/if}
      <Textarea
        bind:value={chatInput}
        onkeydown={handleMessageSubmit}
        onpaste={handlePaste}
        placeholder={agent ? `Message ${agent.name}:` : "Type your message:"}
        class="chat-input flex-1"
        rows={1}
        cols={200}
      />
    </div>
  </form>

  {#if selectedModel()?.reasoningType === ReasoningType.Hybrid}
    <div class="text-sm text-gray-500">
      <Toggle bind:pressed={thinkingMode.current}>Think</Toggle>
    </div>
  {/if}
  {#if apiKeys?.elevenlabs && chat.status !== "streaming" && chat.status !== "submitted"}
    <Recorder {setVoiceMessage} />
  {/if}

  {#if !$conversationStore}
    <div class="import-conversation">
      <Button onclick={importConversation}>Import conversation</Button>
    </div>
  {/if}
</section>

<style>
  .chat-list {
    display: flex;
    flex-direction: column;
    max-height: 500px;
    overflow-y: auto;
    padding: 1rem;
  }
</style>
