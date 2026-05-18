import nodemailer from 'nodemailer';
import logger from './logger.js';

let transporter: nodemailer.Transporter;

export const initEmail = async () => {
  if (process.env.NODE_ENV === 'development') {
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
    logger.info('Ethereal Email transporter initialized');
  } else {
    // SES or other prod config
    transporter = nodemailer.createTransport({
      // host: process.env.EMAIL_HOST,
      // ...
    });
  }
};

export const sendEmail = async ({ to, subject, html }: { to: string, subject: string, html: string }) => {
  if (!transporter) await initEmail();

  const info = await transporter.sendMail({
    from: '"Rabbit 4.0" <no-reply@rabbit.com>',
    to,
    subject,
    html,
  });

  if (process.env.NODE_ENV === 'development') {
    logger.info(`Email sent: ${info.messageId}`);
    logger.info(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
  }
};
