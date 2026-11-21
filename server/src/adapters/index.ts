import type { Channel } from '../models/application.model';
import { assistedAdapter } from './assisted.adapter';
import { emailAdapter } from './email.adapter';
import { env } from '../config/env';
import { formAdapter } from './form.adapter';
import { liveApply } from './live/session';
import type { ChannelAdapter } from './types';

/** Forms go through the visible JAVI browser unless APPLY_BROWSER=headless. */
const liveFormAdapter: ChannelAdapter = { channel: 'form', apply: liveApply };

const ADAPTERS: Record<Channel, ChannelAdapter> = {
  email: emailAdapter,
  form: env.APPLY_BROWSER === 'live' ? liveFormAdapter : formAdapter,
  assisted: assistedAdapter,
};

export const adapterFor = (channel: Channel): ChannelAdapter => ADAPTERS[channel];
