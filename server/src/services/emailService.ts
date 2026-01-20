export const sendEmail = async ({ to, subject, html }: { to: string, subject: string, html: string }) => {
    // Abstraction for Email Provider (Resend / SendGrid / Supabase SMTP)
    console.log(`[Email Service] To: ${to} | Subject: ${subject}`);
    console.log(`[Email Service] Body: ${html}`);

    // In a real implementation, you would call your provider here:
    // await resend.emails.send({ ... })
    // For now, we simulate success.
    return true;
};
