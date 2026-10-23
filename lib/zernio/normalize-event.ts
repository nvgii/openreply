import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { commentCreatedAtIso } from '@/lib/automation/activation';
import type { parseCommentEvents } from '@/lib/meta/webhook';

type InstagramPayload = Parameters<typeof parseCommentEvents>[0];

// A weird timestamp must not drop an otherwise valid event. Unknown shapes
// are ignored, and the comment is handled as if no time was sent.
const optionalInstant = z.preprocess(
  (value) => (typeof value === 'string' || typeof value === 'number' ? value : undefined),
  z.union([z.string(), z.number()]).optional(),
);

const envelopeSchema = z.object({
  id: z.string().min(1),
  event: z.string(),
  account: z.object({ id: z.string(), platform: z.literal('instagram') }),
  comment: z.object({
    id: z.string().min(1), platformPostId: z.string().min(1), text: z.string(),
    author: z.object({ id: z.string().min(1), username: z.string().optional() }),
    createdTime: optionalInstant, createdAt: optionalInstant, timestamp: optionalInstant,
  }).optional(),
  message: z.object({
    platformMessageId: z.string().min(1), direction: z.enum(['incoming', 'outgoing']),
    text: z.string().nullable(), sender: z.object({ id: z.string().min(1) }),
  }).optional(),
  conversation: z.object({ participantId: z.string().nullish() }).optional(),
  metadata: z.object({ postbackPayload: z.string().optional(), postbackTitle: z.string().optional() }).optional(),
  statusAt: z.string().optional(),
});

export function verifyZernioSignature({ rawBody, signature, secret }: {
  rawBody: string; signature: string | null; secret: string;
}): boolean {
  if (!signature || !secret || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest();
  return timingSafeEqual(Buffer.from(signature, 'hex'), expected);
}

export function normalizeZernioEvent({ payload, account }: {
  payload: unknown; account: { zernioAccountId: string | null; instagramId: string };
}): InstagramPayload | null {
  const parsed = envelopeSchema.safeParse(payload);
  if (!parsed.success || parsed.data.account.id !== account.zernioAccountId) return null;
  const { event, comment, message, metadata, conversation, statusAt } = parsed.data;
  // Comment events only: a missing creation time must not become "now", or a
  // redelivered old comment looks new and gets a second DM. Message events
  // still record when we received them; they are not compared to activatedAt.
  const commentCreatedAt = event === 'comment.received' && comment
    ? commentCreatedAtIso(comment.createdTime ?? comment.createdAt ?? comment.timestamp)
    : undefined;
  const entry: InstagramPayload['entry'][number] = {
    id: account.instagramId,
    time: commentCreatedAt ? Date.parse(commentCreatedAt) : event === 'comment.received' ? 0 : Date.now(),
  };
  if (event === 'comment.received' && comment) {
    entry.changes = [{ field: 'comments', value: { id: comment.id, text: comment.text, from: comment.author, media: { id: comment.platformPostId }, ...(commentCreatedAt ? { created_time: commentCreatedAt } : {}) } }];
  } else if (event === 'message.received' && message?.direction === 'incoming') {
    const sender = { id: message.sender.id };
    entry.messaging = [metadata?.postbackPayload
      ? { sender, postback: { mid: message.platformMessageId, payload: metadata.postbackPayload, title: metadata.postbackTitle } }
      : { sender, message: { mid: message.platformMessageId, text: message.text ?? '' } }];
  } else if (event === 'message.read' && conversation?.participantId) {
    const watermark = statusAt ? Date.parse(statusAt) : undefined;
    entry.messaging = [{ sender: { id: conversation.participantId }, read: { watermark: watermark !== undefined && Number.isFinite(watermark) ? watermark : undefined } }];
  } else {
    return null;
  }
  return { object: 'instagram', entry: [entry] };
}
