import { env } from "$env/dynamic/private";
import { fail } from "@sveltejs/kit";
import { Resend } from "resend";
import { superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import type { Actions, PageServerLoad } from "./$types";
import { contactSchema } from "./schema";

export const load: PageServerLoad = async () => {
  return {
    form: await superValidate(zod(contactSchema))
  };
};

export const actions: Actions = {
  default: async ({ request }) => {
    const form = await superValidate(request, zod(contactSchema));

    if (!form.valid) {
      return fail(400, { form });
    }

    const resend = new Resend(env.RESEND_API_KEY);

    try {
      const { error } = await resend.emails.send({
        from: "Contact Form <contact@mail.chatlounge.app>",
        to: [env.CONTACT_EMAIL],
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
