<script lang="ts">
  import SignUp from "clerk-sveltekit/client/SignUp.svelte";
</script>

<svelte:head>
  <title>Sign Up | ChatLounge</title>
  <meta name="description" content="Sign up for ChatLounge." />
</svelte:head>

<div>
  <SignUp redirectUrl="/" />
</div>
