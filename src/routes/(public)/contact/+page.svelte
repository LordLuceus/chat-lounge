<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import * as Form from "$lib/components/ui/form";
  import { Input } from "$lib/components/ui/input";
  import { Textarea } from "$lib/components/ui/textarea";
  import { toast } from "svelte-sonner";
  import { superForm } from "sveltekit-superforms";
  import { zodClient } from "sveltekit-superforms/adapters";
  import type { PageData } from "./$types";
  import { contactSchema } from "./schema";

  interface Props {
    data: PageData;
  }

  const { data }: Props = $props();

  const form = superForm(data.form, {
    validators: zodClient(contactSchema),
    onUpdated: ({ form }) => {
      if (form.message) {
        if (form.message.type === "success") {
          toast.success(form.message.text);
        } else if (form.message.type === "error") {
          toast.error(form.message.text);
        }
      }
    }
  });

  const { form: formData, enhance } = form;
</script>

<svelte:head>
  <title>Contact Us | ChatLounge</title>
  <meta
    name="description"
    content="Have a question or feedback? Contact ChatLounge and we'll get back to you as soon as possible."
  />
</svelte:head>

<div class="container mx-auto max-w-2xl px-4 py-8">
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-3xl">Contact Us</Card.Title>
      <Card.Description>
        Have a question or feedback? We'd love to hear from you. Fill out the form below and we'll
        get back to you as soon as possible.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <form method="POST" use:enhance class="space-y-6">
        <Form.Field {form} name="name">
          <Form.Control>
            {#snippet children({ props })}
              <Form.Label>Name</Form.Label>
              <Input {...props} bind:value={$formData.name} type="text" placeholder="Your name" />
            {/snippet}
          </Form.Control>
          <Form.FieldErrors />
        </Form.Field>

        <Form.Field {form} name="email">
          <Form.Control>
            {#snippet children({ props })}
              <Form.Label>Email</Form.Label>
              <Input
                {...props}
                bind:value={$formData.email}
                type="email"
                placeholder="your.email@example.com"
              />
            {/snippet}
          </Form.Control>
          <Form.FieldErrors />
        </Form.Field>

        <Form.Field {form} name="subject">
          <Form.Control>
            {#snippet children({ props })}
              <Form.Label>Subject</Form.Label>
              <Input
                {...props}
                bind:value={$formData.subject}
                type="text"
                placeholder="What is this about?"
              />
            {/snippet}
          </Form.Control>
          <Form.FieldErrors />
        </Form.Field>

        <Form.Field {form} name="message">
          <Form.Control>
            {#snippet children({ props })}
              <Form.Label>Message</Form.Label>
              <Textarea
                {...props}
                bind:value={$formData.message}
                placeholder="Tell us more..."
                rows={8}
                class="resize-y"
              />
            {/snippet}
          </Form.Control>
          <Form.Description>
            Please provide as much detail as possible so we can better assist you.
          </Form.Description>
          <Form.FieldErrors />
        </Form.Field>

        <Form.Button class="w-full">Send Message</Form.Button>
      </form>
    </Card.Content>
  </Card.Root>
</div>
