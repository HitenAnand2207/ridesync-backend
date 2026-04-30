import TelegramBot from 'node-telegram-bot-api';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { redis } from '../config/redis';

let bot: TelegramBot | null = null;

export const getTelegramBot = (): TelegramBot | null => {
  if (!env.telegram.botToken) {
    console.log('[TELEGRAM] No bot token configured');
    return null;
  }

  if (!bot) {
    bot = new TelegramBot(env.telegram.botToken, { polling: true });
    console.log('✅ Telegram bot started');
    setupBotHandlers(bot);
  }

  return bot;
};

const setupBotHandlers = (bot: TelegramBot) => {
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId,
      `👋 Welcome to *RideSync Bot!*\n\nTo connect your account:\n1. Go to your RideSync profile\n2. Click *"Connect Telegram"*\n3. You'll get a 6-digit code\n4. Send it here as: \`/connect 123456\`\n\n🚗 *RideSync — Share cabs. Split the fare.*`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.onText(/\/connect (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const code = match?.[1]?.trim();

    if (!code) {
      bot.sendMessage(chatId, '❌ Please send your code like: `/connect 123456`', { parse_mode: 'Markdown' });
      return;
    }

    const userId = await redis.get(`telegram_connect:${code}`);

    if (!userId) {
      bot.sendMessage(chatId, '❌ Invalid or expired code. Please get a new code from your RideSync profile.');
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      bot.sendMessage(chatId, '❌ Account not found. Please register on RideSync first.');
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { telegramChatId: chatId.toString() },
    });

    await redis.del(`telegram_connect:${code}`);

    bot.sendMessage(chatId,
      `✅ *Connected successfully!*\n\nHey ${user.name}, your Telegram is now linked to RideSync!\n\nYou'll get instant notifications when:\n• Your group goes live\n• Someone joins your group\n• A member leaves\n• Group is cancelled\n\n🚗 *RideSync — Share cabs. Split the fare.*`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    const user = await prisma.user.findFirst({
      where: { telegramChatId: chatId.toString() },
    });

    if (!user) {
      bot.sendMessage(chatId, '❌ No RideSync account connected.\n\nGo to your profile and click *"Connect Telegram"*.', { parse_mode: 'Markdown' });
      return;
    }

    bot.sendMessage(chatId,
      `✅ Connected as *${user.name}*\n📧 ${user.email}`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.onText(/\/disconnect/, async (msg) => {
    const chatId = msg.chat.id;
    const user = await prisma.user.findFirst({
      where: { telegramChatId: chatId.toString() },
    });

    if (!user) {
      bot.sendMessage(chatId, '❌ No account connected.');
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { telegramChatId: null },
    });

    bot.sendMessage(chatId, '✅ Disconnected from RideSync.');
  });

  bot.on('polling_error', (err) => {
    console.error('[TELEGRAM] Polling error:', err.message);
  });
};

export const sendTelegramMessage = async (
  chatId: string,
  message: string
): Promise<void> => {
  const b = getTelegramBot();
  if (!b) return;

  try {
    await b.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    console.log(`[TELEGRAM] Message sent to ${chatId}`);
  } catch (err: any) {
    console.error(`[TELEGRAM] Failed to send to ${chatId}:`, err.message);
  }
};

export const buildTelegramMessage = (data: {
  origin: string;
  destination: string;
  departureTime: string;
  share: number;
  totalSlots: number;
  filledSlots: number;
  organizerName: string;
  organizerPhone?: string | null;
  olaDeepLink: string;
  uberDeepLink: string;
  isOrganizer: boolean;
  eventType: 'GROUP_CREATED' | 'MEMBER_JOINED' | 'MEMBER_LEFT' | 'GROUP_CANCELLED';
}): string => {
  const time = new Date(data.departureTime).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const header = {
    GROUP_CREATED: `🚗 *Your group is live!*`,
    MEMBER_JOINED: `👋 *New member joined!*`,
    MEMBER_LEFT: `❌ *A member left the group*`,
    GROUP_CANCELLED: `⚠️ *Group cancelled*`,
  }[data.eventType];

  let message = `${header}

📍 *Route:* ${data.origin} → ${data.destination}
🕐 *Departure:* ${time}
💰 *Your share:* ₹${data.share}
👥 *Slots:* ${data.filledSlots}/${data.totalSlots} filled
👤 *Organizer:* ${data.organizerName}${data.organizerPhone ? ` · ${data.organizerPhone}` : ''}`;

  if (data.isOrganizer && data.eventType !== 'GROUP_CANCELLED') {
    message += `

🟠 [Book on Ola](${data.olaDeepLink})
⚫ [Book on Uber](${data.uberDeepLink})`;
  }

  message += `

_Pay your share to the organizer via UPI._
_RideSync — Share cabs. Split the fare._`;

  return message;
};