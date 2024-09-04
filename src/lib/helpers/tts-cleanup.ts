export function ttsCleanup(text: string): string {
  // Remove code blocks
  text = removeCodeBlocks(text);

  // Define patterns for Markdown-specific characters and constructs
  const patterns = [
    /([*_`])/g, // Match *, _, and ` used typically for bold, italic, and code
    /\[([^\]]*?)\]\([^)]*?\)/g, // Improved regex to match Markdown links [Text](Link)
    /(#+\s*)/g // Match headers, any # followed by optional whitespace
  ];

  // Loop through each pattern and replace it with the appropriate replacement
  patterns.forEach((pattern) => {
    if (pattern.source === /\[([^\]]*?)\]\([^)]*?\)/g.source) {
      // Check pattern source for link pattern
      text = text.replace(pattern, (match, p1) => p1); // Use captured group to return the link text
    } else {
      text = text.replace(pattern, ""); // For other patterns, just remove them
    }
  });

  return text;
}

function removeCodeBlocks(markdown: string): string {
  // Match code blocks delimited by triple backticks (```)
  const codeBlockRegex = /```[\s\S]*?```/g;

  // Replace all code blocks with empty strings
  return markdown.replace(codeBlockRegex, "");
}
