import prisma from "$lib/prisma";

export const setDefaultVoice = async (userId: string, voiceId: string) => {
  const existingPreferences = await prisma.preference.findFirst({
    where: { userId }
  });

  if (existingPreferences) {
    return prisma.preference.update({
      where: { id: existingPreferences.id },
      data: { defaultVoiceId: voiceId }
    });
  }

  return prisma.preference.create({
    data: {
      defaultVoiceId: voiceId,
      userId
    }
  });
};

export const getPreferences = async (userId: string) => {
  return prisma.preference.findFirst({
    where: { userId }
  });
};
