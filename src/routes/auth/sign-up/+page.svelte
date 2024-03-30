<script lang="ts">
  import SignUp from "clerk-sveltekit/client/SignUp.svelte";
</script>

<svelte:head>
  <title>Sign Up | ChatMate</title>
  <meta name="description" content="Sign up for ChatMate." />
</svelte:head>

<div>
  <SignUp redirectUrl="/" />
</div>
