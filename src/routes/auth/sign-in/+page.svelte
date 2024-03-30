<script lang="ts">
  import SignIn from "clerk-sveltekit/client/SignIn.svelte";
</script>

<svelte:head>
  <title>Sign In | ChatMate</title>
  <meta name="description" content="Sign in to ChatMate." />
</svelte:head>

<div>
  <SignIn redirectUrl="/" />
</div>
