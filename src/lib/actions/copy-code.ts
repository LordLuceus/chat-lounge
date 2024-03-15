import type { Action } from "svelte/action";

export const copyCodeBlocks: Action<HTMLElement, { content: string }> = (node) => {
  function addButtons() {
    const codeBlocks: NodeListOf<HTMLElement> = node.querySelectorAll("pre code");

    codeBlocks.forEach((block: HTMLElement) => {
      // Check if the code block already has a copy button
      if (!block.parentNode?.querySelector("button.copy-button")) {
        const button: HTMLButtonElement = document.createElement("button");
        button.innerText = "Copy code";
        button.className = "copy-button"; // Add a class to easily identify the button
        button.style.position = "absolute";
        button.style.top = "0.5rem";
        button.style.right = "0.5rem";
        button.onclick = () => copyToClipboard(block.innerText, button);

        (block.parentNode as HTMLElement).style.position = "relative";
        block.parentNode!.appendChild(button);
      }
    });
    return codeBlocks;
  }

  const codeBlocks: NodeListOf<HTMLElement> = addButtons();

  return {
    destroy() {
      codeBlocks.forEach((block: HTMLElement) => {
        const button = block.parentNode?.querySelector("button.copy-button"); // Use the class to select the button
        if (button) {
          block.parentNode!.removeChild(button);
        }
      });
    },
    update() {
      addButtons(); // This will now only add buttons if they don't already exist
    }
  };
};

const copyToClipboard = async (text: string, button: HTMLButtonElement) => {
  try {
    await navigator.clipboard.writeText(text);
    const originalText: string = button.innerText;
    button.innerText = "Copied!";
    setTimeout(() => {
      button.innerText = originalText;
    }, 2000); // Revert the button label back to "Copy" after 2 seconds
  } catch (err) {
    console.error("Failed to copy: ", err);
  }
};
