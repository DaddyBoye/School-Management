import emailjs from '@emailjs/browser';

const SERVICE_ID = 'service_pkd98sh';
const TEMPLATE_ID = 'template_3286nmq';
const PUBLIC_KEY = '9AOnjD8Zhbsd5oN6I';

export const sendEmail = async (
    toEmail: string,
    toName: string,
    schoolName: string,
    password: string,
    loginUrl: string,
    supportEmail: string,
    fromName: string
  ) => {
    console.log('Attempting to send email...');
    console.log('Recipient:', toEmail);
    console.log('School Name:', schoolName);
    console.log('Support Email:', supportEmail);
  
    try {
      const response = await emailjs.send(
        SERVICE_ID,
        TEMPLATE_ID,
        {
          to_email: toEmail,
          to_name: toName,
          schoolName: schoolName,
          password: password,
          loginUrl: loginUrl,
          supportEmail: supportEmail,
          from_name: fromName,
          currentYear: new Date().getFullYear().toString(),
        },
        PUBLIC_KEY
      );
  
      console.log('Email sent successfully:', response);
      return response;
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  };