export const generateAudioFilename = (text: string, extension: string = "mp3") => {
  if (typeof text !== "string") {
    throw new Error("Invalid input: text must be a string.");
  }

  // Sanitize the text to create a safe filename:
  // Replace any character that's not alphanumeric, a hyphen, or a space with an underscore.
  // Then trim to remove leading/trailing whitespace and replace spaces with underscores.
  const sanitizedText = text
    .replace(/[^a-zA-Z0-9 -]/g, "_")
    .trim()
    .replace(/\s+/g, "_");

  // Truncate the text to ensure the filename is not excessively long.
  // We choose 100 characters because it's within common filesystem limits and provides enough context.
  const maxLength = 100;
  const truncatedText = sanitizedText.slice(0, maxLength);

  // Ensure the filename has the correct extension.
  const filename = `${truncatedText}.${extension}`;

  return filename;
};
