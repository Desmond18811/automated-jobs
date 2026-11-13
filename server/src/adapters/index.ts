import type { Channel } from '../models/application.model';
import { assistedAdapter } from './assisted.adapter';
import { emailAdapter } from './email.adapter';
import { formAdapter } from './form.adapter';
import type { ChannelAdapter } from './types';

const ADAPTERS: Record<Channel, ChannelAdapter> = {
  email: emailAdapter,
  form: formAdapter,
  assisted: assistedAdapter,
};

export const adapterFor = (channel: Channel): ChannelAdapter => ADAPTERS[channel];
