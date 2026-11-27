import { v4 } from 'uuid';
import {
    CONFIRMATION_PREFIX,
    FORGOT_PASSWORD_PREFIX
} from '../common/constants/index.js';
import { redis } from '../common/redis.js';
import { Resend } from 'resend';

export async function sendEmail(email: string, url: string, subject: string) {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
        from: 'Online Judge <judge@namanarora.xyz>',
        to: [email],
        subject,
        html: `<a href="${url}">${url}</a>`
    });

    if (error) {
        return console.error({ error });
    }

    console.log({ data });
}

export async function createConfirmationUrl(userId: number) {
    const token = v4();

    await redis.set(CONFIRMATION_PREFIX + token, userId, 'EX', 3600 * 24 * 3);

    return `${process.env.CLIENT_URL}/confirm/${token}`;
}

export async function createForgotPasswordUrl(userId: number) {
    const token = v4();

    await redis.set(FORGOT_PASSWORD_PREFIX + token, userId, 'EX', 3600 * 5);

    return `${process.env.CLIENT_URL}/reset-password/${token}`;
}
