import nodemailer from 'nodemailer';
import logger from './logger.js';

let transporter: nodemailer.Transporter;

export const initEmail = async () => {
  const host = process.env.EMAIL_HOST;
  const port = process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : 587;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports (using STARTTLS)
      auth: {
        user,
        pass,
      },
    });
    logger.info(`SMTP Email transporter initialized for host: ${host}`);
  } else {
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      logger.info(`Ethereal test Email transporter initialized (User: ${testAccount.user})`);
    } catch (err) {
      logger.error('Failed to initialize fallback Ethereal transporter:', err);
    }
  }
};

export const sendEmail = async ({ to, subject, html }: { to: string, subject: string, html: string }) => {
  if (!transporter) await initEmail();

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || '"Rabbit 4.0" <no-reply@rabbit.com>',
    to,
    subject,
    html,
  });

  logger.info(`Email sent: ${info.messageId}`);
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    logger.info(`Email Preview URL: ${previewUrl}`);
  }
};
