import { env } from "$env/dynamic/private";
import { fail } from "@sveltejs/kit";
import { Resend } from "resend";
import { superValidate } from "sveltekit-superforms";
import { zod4 } from "sveltekit-superforms/adapters";
import type { Actions, PageServerLoad } from "./$types";
import { contactSchema } from "./schema";

export const load: PageServerLoad = async () => {
  return {
    form: await superValidate(zod4(contactSchema))
  };
};

export const actions: Actions = {
  default: async ({ request }) => {
    const form = await superValidate(request, zod4(contactSchema));

    if (!form.valid) {
      return fail(400, { form });
    }

    const resendApiKey = env.RESEND_API_KEY;
    const contactEmail = env.CONTACT_EMAIL;

    if (!resendApiKey || !contactEmail) {
      console.error("Contact form is not configured: RESEND_API_KEY or CONTACT_EMAIL is missing");
      return fail(500, {
        form,
        message: {
          type: "error" as const,
          text: "Failed to send message. Please try again later."
        }
      });
    }

    const resend = new Resend(resendApiKey);

    try {
      const { error } = await resend.emails.send({
        from: "Contact Form <contact@mail.chatlounge.app>",
        to: [contactEmail],
        subject: `Contact Form: ${form.data.subject}`,
        replyTo: form.data.email,
        html: `
					<h2>New Contact Form Submission</h2>
					<p><strong>From:</strong> ${form.data.name}</p>
					<p><strong>Email:</strong> ${form.data.email}</p>
					<p><strong>Subject:</strong> ${form.data.subject}</p>
					<hr />
					<p><strong>Message:</strong></p>
					<p>${form.data.message.replace(/\n/g, "<br>")}</p>
				`
      });

      if (error) {
        console.error("Resend error:", error);
        return fail(500, {
          form,
          message: {
            type: "error" as const,
            text: "Failed to send message. Please try again later."
          }
        });
      }

      return {
        form,
        message: {
          type: "success" as const,
          text: "Thank you for your message! We'll get back to you soon."
        }
      };
    } catch (error) {
      console.error("Error sending email:", error);
      return fail(500, {
        form,
        message: {
          type: "error" as const,
          text: "Failed to send message. Please try again later."
        }
      });
    }
  }
};
