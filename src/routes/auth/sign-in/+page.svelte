<script lang="ts">
  import SignIn from "clerk-sveltekit/client/SignIn.svelte";
</script>

<svelte:head>
  <title>Sign In | ChatLounge</title>
  <meta name="description" content="Sign in to ChatLounge." />
</svelte:head>

<div>
  <SignIn redirectUrl="/" />
</div>
